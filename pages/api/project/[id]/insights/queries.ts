import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import type { NextApiRequest, NextApiResponse } from 'next';

import { safeParseInt } from '@/lib/utils.edge';
import { Database } from '@/types/supabase';
import { Project, PromptQueryStat } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | { queries: PromptQueryStat[] };

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

  const supabase = createServerSupabaseClient<Database>({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectId = req.query.id as Project['id'];

  if (req.method === 'GET') {
    const limit = Math.min(safeParseInt(req.query.limit as string, 50), 50);
    const page = safeParseInt(req.query.page as string, 0);
    const { data: queries, error } = await supabaseAdmin
      .from('query_stats')
      .select('id,created_at,prompt,no_response,feedback')
      .eq('project_id', projectId)
      .or('processed_state.eq.processed,processed_state.eq.skipped')
      .gte('created_at', req.query.from)
      .lte('created_at', req.query.to)
      .not('prompt', 'is', null)
      .neq('prompt', '')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * (limit - 1));

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!queries) {
      return res.status(404).json({ error: 'No results found.' });
    }

    return res.status(200).json({ queries: queries });
  }

  return res.status(400).end();
}
