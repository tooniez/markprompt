import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

import { withTeamAdminAccess } from '@/lib/middleware/common';
import {
  DAY_IN_SECONDS,
  del,
  get,
  getTeamCreditsKey,
  setWithExpiration,
} from '@/lib/redis';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { safeParseInt, safeParseIntOrUndefined } from '@/lib/utils.edge';
import { Database } from '@/types/supabase';
import { DbTeam } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | { credits: number };

const allowedMethods = ['GET'];

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createServiceRoleSupabaseClient();

export default withTeamAdminAccess(
  allowedMethods,
  async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    if (!req.method || !allowedMethods.includes(req.method)) {
      res.setHeader('Allow', allowedMethods);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
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
      // Fetch from cache (1 day expiration)
      await del(getTeamCreditsKey(teamId));
      console.log('Got', await get(getTeamCreditsKey(teamId)));
      let credits = safeParseIntOrUndefined(
        await get(getTeamCreditsKey(teamId)),
      );

      console.log('Got credits', credits);
      if (!credits) {
        credits = 40;

        // Set in cache (with a 1-day expiration)
        console.log(
          'Setting',
          JSON.stringify(credits),
          typeof JSON.stringify(credits),
        );
        await setWithExpiration(
          getTeamCreditsKey(teamId),
          String(120),
          DAY_IN_SECONDS,
        );
        const got = await get(getTeamCreditsKey(teamId));
        console.log('Got', got, typeof got);
      }
      // const { data: occurrences, error } = await supabaseAdmin.rpc(
      //   'get_team_num_completions',
      //   {
      //     team_id: teamId,
      //     from_tz: req.query.from as string,
      //     to_tz: req.query.to as string,
      //   },
      // );

      // if (error) {
      //   return res.status(400).json({ error: error.message });
      // }

      // if (!occurrences || occurrences.length === 0) {
      //   return res.status(404).json({ error: 'No results found.' });
      // }

      return res.status(200).json({ credits: 20 });
    }

    return res.status(400).end();
  },
);
