import { createClient } from '@supabase/supabase-js';
import { stripIndent } from 'common-tags';
import type { NextApiRequest, NextApiResponse } from 'next';
import { isPresent } from 'ts-is-present';

import {
  APPROX_CHARS_PER_TOKEN,
  CONTEXT_TOKENS_CUTOFF_GPT_3_5_TURBO,
} from '@/lib/constants';
import { getProjectConfigData } from '@/lib/supabase';
import { recordProjectTokenCount } from '@/lib/tinybird';
import {
  approximatedTokenCount,
  getCompletionsResponseText,
  getCompletionsUrl,
} from '@/lib/utils';
import { safeParseInt } from '@/lib/utils.edge';
import { Database } from '@/types/supabase';
import {
  OpenAIModelIdWithType,
  Project,
  QueryStatsProcessingResponseData,
  geLLMInfoFromModel,
} from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | QueryStatsProcessingResponseData;

const allowedMethods = ['GET'];

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // First in line are projects whose unprocessed prompts are oldest.
  const { data } = await supabaseAdmin
    .from('v_users_with_pending_weekly_update_email')
    .select('email')
    .limit(20);

  console.log('data', JSON.stringify(data, null, 2));

  return res.status(200).send({ status: 'ok' });
}
