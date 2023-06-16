import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import type { NextApiRequest, NextApiResponse } from 'next';

import { Database } from '@/types/supabase';
import { Project, PromptQueryHistogram, TimePeriod } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | PromptQueryHistogram[];

const allowedMethods = ['GET'];

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

const getTimePeriod = (param: string): TimePeriod => {
  switch (param) {
    case 'hour':
      return 'hour';
    case 'weekofyear':
      return 'weekofyear';
    case 'month':
      return 'month';
    case 'year':
      return 'year';
    default:
      return 'day';
  }
};

type HistogramTableView =
  | 'v_insights_query_histogram_hour'
  | 'v_insights_query_histogram_day'
  | 'v_insights_query_histogram_week'
  | 'v_insights_query_histogram_month'
  | 'v_insights_query_histogram_year';

const getView = (period: TimePeriod): HistogramTableView => {
  switch (period) {
    case 'hour':
      return 'v_insights_query_histogram_hour';
    case 'day':
      return 'v_insights_query_histogram_day';
    case 'weekofyear':
      return 'v_insights_query_histogram_week';
    case 'month':
      return 'v_insights_query_histogram_month';
    case 'year':
      return 'v_insights_query_histogram_year';
  }
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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectId = req.query.id as Project['id'];

  if (req.method === 'GET') {
    const from = format(
      new Date(parseInt(req.query.from as string)),
      'yyyy-MM-dd',
    );
    const to = format(new Date(parseInt(req.query.to as string)), 'yyyy-MM-dd');
    const period = getTimePeriod(req.query.period as string);

    const { data: queries, error } = await supabaseAdmin
      .from(getView(period))
      .select('date,count')
      .eq('project_id', projectId)
      .gte('date', from)
      .lte('date', to);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!queries) {
      return res.status(404).json({ error: 'No results found.' });
    }

    return res.status(200).json(queries);
  }

  return res.status(400).end();
}
