import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { DbTeam, TeamStats } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | TeamStats[];

const allowedMethods = ['GET'];

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createServiceRoleSupabaseClient();

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

  const teamId = req.query.id as DbTeam['id'];

  if (req.method === 'GET') {
    const { data: stats, error } = await supabaseAdmin.rpc('get_team_stats', {
      team_id: teamId,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!stats) {
      return res.status(404).json({ error: 'No results found.' });
    }

    return res.status(200).json(stats);
  }

  return res.status(400).end();
}
