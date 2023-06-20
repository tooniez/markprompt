import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { remark } from 'remark';
import strip from 'strip-markdown';

import { track } from '@/lib/posthog';
import { isSKTestKey, safeParseNumber } from '@/lib/utils';
import { Database } from '@/types/supabase';
import { SourceType } from '@/types/types';

const MAX_SEARCH_RESULTS = 20;

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

type FTSResult = {
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

type SearchResult = {
  path: string;
  meta: any;
  score: number;
  source: {
    type: SourceType;
    data?: any;
  };
  sections: { meta?: any; content: string }[];
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
  const limit = Math.min(
    MAX_SEARCH_RESULTS,
    safeParseNumber(req.query.limit as string, 10),
  );

  if (!query || query.trim() === '') {
    return res.status(200).json({
      data: [],
    });
  }

  let searchFunctionName:
    | 'fts_with_private_dev_api_key'
    | 'fts_with_public_api_key';
  let keyParams: any = {};
  if (isSKTestKey(req.query.projectKey as string)) {
    searchFunctionName = 'fts_with_private_dev_api_key';
    keyParams = { private_dev_api_key_param: req.query.projectKey as string };
  } else {
    searchFunctionName = 'fts_with_public_api_key';
    keyParams = { public_api_key_param: req.query.projectKey as string };
  }

  const ts = Date.now();

  const {
    data: _data,
    error,
  }: {
    data: FTSResult[] | null | any;
    error: { message: string; code: string } | null;
  } = await supabaseAdmin.rpc(searchFunctionName, {
    search_term: query,
    match_count: limit,
    ...keyParams,
  });

  console.log('[SUPABASE] Took', Date.now() - ts);

  if (error || !_data) {
    return res
      .status(400)
      .json({ error: error?.message || 'Error retrieving sections' });
  }

  if (_data.project_id) {
    track(_data.project_id, 'search', { projectId: _data.project_id });
  }

  const data = _data as FTSResult[];

  const resultsByFile: { [key: string]: SearchResult } = {};
  for (const result of data) {
    resultsByFile[result.file_id] = {
      path: result.file_path,
      meta: result.file_meta,
      // Score is not returned currently
      // score: result.score,
      score: 0,
      source: {
        type: result.source_type,
        ...(result.source_data ? { data: result.source_data } : {}),
      },
      sections: [
        ...(resultsByFile[result.file_id]?.sections || []),
        {
          ...(result.section_meta ? { meta: result.section_meta } : {}),
          content: await createKWICSnippet(result.section_content || '', query),
        },
      ],
    };
  }

  return res.status(200).json({
    data: Object.values(resultsByFile),
  });
}
