import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { remark } from 'remark';
import strip from 'strip-markdown';

import { track } from '@/lib/posthog';
import { safeParseNumber } from '@/lib/utils';
import { Database } from '@/types/supabase';
import { SourceType } from '@/types/types';

const MAX_SEARCH_RESULTS = 20;

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

type FTSResult = Database['public']['Functions']['fts']['Returns'][number];

type SearchResultFileData = {
  path: string;
  meta: any;
  source: {
    type: SourceType;
    data?: any;
  };
};

type SearchResult = SearchResultFileData & {
  score: number;
  sections: { content: string; meta?: any }[];
};

type Data =
  | {
      status?: string;
      error?: string;
    }
  | { data: SearchResult[] };

const allowedMethods = ['GET'];

const createKWICSnippet = async (
  content: string,
  searchTerm: string,
  maxLength = 200,
) => {
  // Remove Markdown formatting, remove leadHeading, and trim around
  // the keyword. This creates a snippet suitable for displaying in
  // search results.
  const plainText = String(
    await remark()
      .use(strip, {
        remove: ['heading', 'inlineCode'],
        keep: ['text'],
      })
      .process(content.trim()),
  )
    .replace(/\s+/g, ' ')
    .replace(/\\n/g, ' ');

  const index = plainText.indexOf(searchTerm);

  if (index === -1) {
    return plainText.slice(0, maxLength);
  }

  const rawSnippet = plainText.slice(
    Math.max(0, index - Math.round(maxLength / 2)),
    index + Math.round(maxLength / 2),
  );

  const words = rawSnippet.split(/\s+/);
  if (words.length > 3) {
    return words.slice(1, words.length - 1).join(' ');
  }

  return words.join(' ');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  // Preflight check
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }

  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const params = req.body;

  let config = {};
  try {
    config = JSON.parse((params.config || '') as string);
  } catch {
    // Do nothing
  }

  // Apply rate limits, in additional to middleware rate limits.
  // const rateLimitResult = await checkSearchRateLimits({
  //   value: projectId,
  //   type: 'projectId',
  // });

  // TODO
  // if (!isRequestFromMarkprompt(req.headers.origin)) {
  //   // Search is part of the Enterprise plans when used outside of
  //   // the Markprompt dashboard.
  //   const teamStripeInfo = await getTeamStripeInfo(supabaseAdmin, projectId);
  //   if (
  //     !teamStripeInfo ||
  //     !isAtLeastPro(
  //       teamStripeInfo.stripePriceId,
  //       teamStripeInfo.isEnterprisePlan,
  //     )
  //   ) {
  //     return res.status(401).json({
  //       error: `The search endpoint is only accessible on the Pro and Enterprise plans. Please contact ${process.env.NEXT_PUBLIC_SALES_EMAIL} to get set up.`,
  //     });
  //   }
  // }

  const query = req.query.query as string;
  const projectId = req.query.projectId as string;
  const limit = Math.min(
    MAX_SEARCH_RESULTS,
    safeParseNumber(req.query.limit as string, 10),
  );

  if (!query || query.trim() === '') {
    return res.status(200).json({
      data: [],
    });
  }

  const {
    data: _data,
    error,
  }: {
    data: FTSResult[] | null | any;
    error: { message: string; code: string } | null;
  } = await supabaseAdmin.rpc('fts', {
    search_term: query,
    match_count: limit,
    project_id: projectId,
  });

  if (error || !_data) {
    return res
      .status(400)
      .json({ error: error?.message || 'Error retrieving sections' });
  }

  if (_data.project_id) {
    track(_data.project_id, 'search', { projectId: _data.project_id });
  }

  const data = _data as FTSResult[];

  const fileDatas: { [key: string]: SearchResultFileData } = {};

  const resultsByFile: { [key: string]: SearchResult } = {};
  for (const result of data) {
    const fileId = result.file_id;
    let fileData = fileDatas[fileId];
    if (!fileData) {
      const { data: _fileData, error } = await supabaseAdmin
        .from('files')
        .select('path, meta, sources(data, type)')
        .eq('id', fileId)
        .limit(1)
        .maybeSingle();
      if (!error && _fileData) {
        const source = _fileData.sources as any;
        fileData = {
          path: _fileData.path,
          meta: _fileData.meta,
          source: {
            type: source.type,
            data: source.data,
          },
        };

        fileDatas[fileId] = fileData;
      } else {
        continue;
      }
    }

    resultsByFile[result.file_id] = {
      ...fileData,
      // Score is not returned currently
      score: 0,
      sections: [
        ...(resultsByFile[fileId]?.sections || []),
        {
          ...(result.meta ? { meta: result.meta } : {}),
          content: await createKWICSnippet(result.content || '', query),
        },
      ],
    };
  }

  return res.status(200).json({
    data: Object.values(resultsByFile),
  });
}
