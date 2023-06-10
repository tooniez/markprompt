import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { track } from '@/lib/posthog';
import { isSKTestKey, safeParseNumber } from '@/lib/utils';
import { Database } from '@/types/supabase';
import { Project, SourceType } from '@/types/types';

const MAX_SEARCH_RESULTS = 20;

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

type FileSectionContentInfo = {
  project_id: string;
  file_id: string;
  file_path: string;
  file_meta?: {
    title?: string;
  };
  section_content: string;
  section_meta?: {
    leadHeading?: {
      depth?: number;
      value: string;
    };
  };
  source_type: SourceType;
  source_data: any;
  score: number;
};

type Data =
  | {
      status?: string;
      error?: string;
    }
  | { data: FileSectionContentInfo[] };

const allowedMethods = ['GET'];

const createKWICSnippet = (
  content: string,
  searchTerm: string,
  maxLength = 200,
) => {
  const trimmedContent = content.trim().replace(/\n/g, ' ');
  const index = trimmedContent.indexOf(searchTerm);

  if (index === -1) {
    return trimmedContent.slice(0, maxLength);
  }

  const rawSnippet = trimmedContent.slice(
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
  const limit = Math.min(
    MAX_SEARCH_RESULTS,
    safeParseNumber(req.query.limit as string, 10),
  );

  if (!query || query.trim() === '') {
    return res.status(200).json({
      data: [],
    });
  }

  const token: string | undefined = req.query.token as string;
  let publicApiKey: string | undefined = undefined;
  let privateDevApiKey: string | undefined = undefined;
  if (isSKTestKey(req.query.projectKey as string)) {
    privateDevApiKey = req.query.projectKey as string;
  } else {
    publicApiKey = req.query.projectKey as string;
  }

  const ts = Date.now();

  const {
    data: _data,
    error,
  }: {
    data: FileSectionContentInfo[] | null | any;
    error: { message: string; code: string } | null;
  } = await supabaseAdmin.rpc('full_text_search', {
    search_term: query,
    match_count: limit,
    token_param: token,
    public_api_key_param: publicApiKey,
    private_dev_api_key_param: privateDevApiKey,
  });

  console.log('!!! Took', Date.now() - ts);

  if (error || !_data) {
    return res
      .status(400)
      .json({ error: error?.message || 'Error retrieving sections' });
  }

  if (_data.project_id) {
    track(_data.project_id, 'search', { projectId: _data.project_id });
  }

  const data = _data as FileSectionContentInfo[];

  const resultsByFile: { [key: string]: FileSectionContentInfo } = data.reduce(
    (acc: any, value: any) => {
      const {
        file_id,
        file_path,
        file_meta,
        section_content,
        section_meta,
        source_type,
        source_data,
        score,
      } = value;
      return {
        ...acc,
        [file_id]: {
          path: file_path,
          meta: file_meta,
          score,
          source: {
            type: source_type,
            ...(source_data ? { data: source_data } : {}),
          },
          sections: [
            ...(acc[file_id]?.sections || []),
            {
              ...(section_meta ? { meta: section_meta } : {}),
              content: createKWICSnippet(section_content || '', query),
            },
          ],
        },
      };
    },
    {} as any,
  );

  return res.status(200).json({
    data: Object.values(resultsByFile),
  });
}
