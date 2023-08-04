import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import JSZip from 'jszip';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Octokit } from 'octokit';

import { getOrRefreshAccessToken } from '@/lib/integrations/github.edge';
import { extractRepoContentFromZip } from '@/lib/integrations/github.node';
import { compress } from '@/lib/utils';
import { Database } from '@/types/supabase';
import { OAuthToken, PathContentData } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | Buffer;

const allowedMethods = ['POST'];

const PAYLOAD_MAX_SIZE_BYTES = 4_000_000;

const getCompressedPayloadUntilLimit = (files: PathContentData[]) => {
  const filesToSend: PathContentData[] = [];
  for (const file of files) {
    filesToSend.push(file);
    const compressed = Buffer.from(
      compress(JSON.stringify({ files: filesToSend, capped: true })),
    );
    if (compressed.length >= PAYLOAD_MAX_SIZE_BYTES) {
      // We've gone above the limit
      filesToSend.pop();
      return Buffer.from(
        compress(JSON.stringify({ files: filesToSend, capped: true })),
      );
    }
  }
  return Buffer.from(compress(JSON.stringify({ files: filesToSend })));
};

const fetchRepo = async (
  owner: string,
  repo: string,
  branch: string,
  accessToken: string | undefined,
) => {
  const octokit = new Octokit(accessToken ? { auth: accessToken } : {});

  const info = await octokit.request(
    'GET /repos/{owner}/{repo}/zipball/{ref}',
    {
      owner,
      repo,
      ref: branch,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  return fetch(
    info.url,
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabase = createServerSupabaseClient<Database>({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  let accessToken: OAuthToken | undefined = undefined;
  try {
    accessToken = await getOrRefreshAccessToken(session.user.id, supabase);
  } catch {
    // Do nothing
  }

  let githubRes;

  const branchToFetch = req.body.branch || 'main';
  try {
    console.info(
      `Trying to fetch main branch of ${req.body.owner}/${req.body.repo}...`,
    );
    // Fetch branch. If none is specified, fetch main branch.
    githubRes = await fetchRepo(
      req.body.owner,
      req.body.repo,
      branchToFetch,
      accessToken?.access_token || undefined,
    );
  } catch (e) {
    console.error(`Error fetching ${branchToFetch} branch:`, e);
  }

  if (githubRes?.status !== 200 && branchToFetch === 'main') {
    // If the previous fetch failed, fallback to the master branch,
    // but only we were trying to fetch the main branch. If another
    // branch was specified explicitly, we should error.
    try {
      console.info('Trying master branch instead...');
      // If main branch doesn't exist, fallback to master
      githubRes = await fetchRepo(
        req.body.owner,
        req.body.repo,
        'master',
        accessToken?.access_token || undefined,
      );
    } catch (e) {
      console.error('Error fetching master branch:', e);
    }
  }

  if (githubRes?.status !== 200) {
    return res.status(404).json({
      error:
        'Failed to download repository. Make sure the "main" or "master" branch is accessible, or specify a branch explicitly.',
    });
  }

  console.info('Fetched GitHub archive for', req.body.owner, req.body.repo);

  const ab = await githubRes.arrayBuffer();
  const jsZip = new JSZip();
  const zip = await jsZip.loadAsync(ab);

  // First, we load all the files, taking into account the start
  // offset if provided.
  const files = await extractRepoContentFromZip(
    zip.files,
    req.body.offset ?? 0,
    req.body.includeGlobs,
    req.body.excludeGlobs,
  );

  // Then, we compute the compressed size. It needs to be < 4MB to
  // meet the Vercel limits:
  // https://vercel.com/docs/concepts/limits/overview.
  // If we're below the limit, which we will be most of the time,
  // we send it as is.
  let compressed = Buffer.from(compress(JSON.stringify({ files })));

  console.info('Repo size:', compressed.length);

  if (compressed.length < PAYLOAD_MAX_SIZE_BYTES) {
    return res.status(200).send(compressed);
  }

  // If not, build up the payload one page at a time until we hit the
  // upper bound.
  compressed = getCompressedPayloadUntilLimit(files);

  return res.status(200).send(compressed);
}
