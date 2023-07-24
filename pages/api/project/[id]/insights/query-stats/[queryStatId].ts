import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

import { Database } from '@/types/supabase';
import { DbQueryStat, PromptQueryStatFull } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | PromptQueryStatFull;

const allowedMethods = ['GET'];

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

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('query_stats')
      .select('id,created_at,prompt,response,no_response,feedback,meta')
      .eq('id', req.query.queryStatId as DbQueryStat['id'])
      .eq('processed', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'No matching query stat found.' });
    }

    return res.status(200).json(data);
  }

  return res.status(400).end();
}
