import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { getRequesterIp } from '@/lib/middleware/common';
import { track } from '@/lib/posthog';
import { checkSearchRateLimits } from '@/lib/rate-limits';
import { isAtLeastPro } from '@/lib/stripe/tiers';
import { getTeamStripeInfo } from '@/lib/supabase';
import { safeParseNumber } from '@/lib/utils';
import { isRequestFromMarkprompt } from '@/lib/utils.edge';
import { Database, Json } from '@/types/supabase';
import { Project } from '@/types/types';

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

type FileSectionContentInfo = {
  content: string | null;
  path: string | null;
  meta: Json | null;
  project_id: string | null;
  source_data: Json | null;
  source_type: Database['public']['Enums']['source_type'] | null;
};

type Data =
  | {
      status?: string;
      error?: string;
    }
  | { data: FileSectionContentInfo[] };

const allowedMethods = ['GET'];

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
  const projectId = req.query.project as Project['id'];
  let config = {};
  try {
    config = JSON.parse((params.config || '') as string);
  } catch {
    // Do nothing
  }

  if (!projectId) {
    console.error(`[INDEXES] Project not found`);
    return res.status(400).json({ error: 'Project not found' });
  }

  // Apply rate limits, in additional to middleware rate limits.
  const rateLimitResult = await checkSearchRateLimits({
    value: projectId,
    type: 'projectId',
  });

  if (!rateLimitResult.result.success) {
    const ip = getRequesterIp(req);
    console.error(`[INDEXES] [RATE-LIMIT] [${projectId}] IP: ${ip}`);
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (!isRequestFromMarkprompt(req.headers.origin)) {
    // Indexes queries are part of the Enterprise plans when used outside of
    // the Markprompt dashboard.
    const teamStripeInfo = await getTeamStripeInfo(supabaseAdmin, projectId);
    if (
      !teamStripeInfo ||
      !isAtLeastPro(
        teamStripeInfo.stripePriceId,
        teamStripeInfo.isEnterprisePlan,
      )
    ) {
      return res.status(401).json({
        error: `The indexes endpoint is only accessible on the Pro plan. Please contact ${process.env.NEXT_PUBLIC_SALES_EMAIL} to get set up.`,
      });
    }
  }

  const query = req.query.query as string;
  const highlight = safeParseNumber(req.query.highlight as string, 1) === 1;
  const limit = safeParseNumber(req.query.limit as string, 10);

  if (!query || query.trim() === '') {
    return res.status(200).json({
      data: [],
    });
  }

  const {
    data: fileSections,
    error,
  }: {
    data: FileSectionContentInfo[] | null;
    error: { message: string; code: string } | null;
  } = await supabaseAdmin
    .from('file_section_content_infos')
    .select('*')
    .like('content', `%${query}%`)
    .eq('project_id', projectId)
    .limit(limit);

  track(projectId, 'search', { projectId });

  if (error || !fileSections) {
    return res
      .status(safeParseNumber(error?.code, 400))
      .json({ error: error?.message || 'Error retrieving sections' });
  }

  return res.status(200).json({
    data: fileSections,
  });
}
