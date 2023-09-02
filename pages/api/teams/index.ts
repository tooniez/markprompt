import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  createServiceRoleSupabaseClient,
  getJoinedTeams,
} from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { DbTeam } from '@/types/types';

import { getAvailableTeamSlug } from '../slug/generate-team-slug';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | DbTeam[]
  | DbTeam;

const allowedMethods = ['GET', 'POST'];

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

  if (req.method === 'GET') {
    try {
      const teams = await getJoinedTeams(supabase, session.user.id);
      return res.status(200).json(teams);
    } catch (error) {
      console.error('Error getting team:', (error as any).message);
      return res.status(400).json({ error: (error as any).message });
    }
  } else if (req.method === 'POST') {
    const { candidateSlug, isPersonal, ...rest } = req.body;
    const slug = await getAvailableTeamSlug(supabaseAdmin, candidateSlug);

    // We must use the admin database here, because RLS prevents a
    // user from selecting a team before they have been added as
    // members.
    const { data, error } = await supabaseAdmin
      .from('teams')
      .insert([
        { ...rest, is_personal: isPersonal, slug, created_by: session.user.id },
      ])
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error creating team:', error.message);
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(400).json({ error: 'Unable to create team' });
    }

    // Automatically add the creator of the team as an admin member.
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert([{ user_id: session.user.id, team_id: data.id, type: 'admin' }]);

    if (membershipError) {
      return res.status(400).json({ error: membershipError.message });
    }

    return res.status(200).json(data);
  }

  return res.status(200).json({ status: 'ok' });
}
