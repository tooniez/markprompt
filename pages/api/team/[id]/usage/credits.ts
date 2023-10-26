import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { endOfMonth, formatISO, parseISO, startOfMonth } from 'date-fns';
import type { NextApiRequest, NextApiResponse } from 'next';

import { withTeamAdminAccess } from '@/lib/middleware/common';
import {
  DAY_IN_SECONDS,
  get,
  getTeamCreditsKey,
  setWithExpiration,
} from '@/lib/redis';
import { getTierDetails } from '@/lib/stripe/tiers';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { safeParseJSON } from '@/lib/utils.edge';
import { Database } from '@/types/supabase';
import { CreditsInfo, DbTeam } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | CreditsInfo;

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
      let creditsInfo = await get<CreditsInfo>(getTeamCreditsKey(teamId));

      if (!creditsInfo) {
        const { data: teamData } = await supabaseAdmin
          .from('teams')
          .select('billing_cycle_start,stripe_price_id,plan_details')
          .match({ id: teamId })
          .limit(1)
          .maybeSingle();

        if (!teamData) {
          return res
            .status(401)
            .json({ error: 'Unable to retrieve team data' });
        }

        const tierDetails = getTierDetails({
          stripe_price_id: teamData.stripe_price_id,
          plan_details: teamData.plan_details,
        });

        let startDate: Date;
        if (
          tierDetails.quotas?.usagePeriod === 'yearly' &&
          teamData.billing_cycle_start
        ) {
          startDate = parseISO(teamData.billing_cycle_start);
        } else {
          startDate = startOfMonth(new Date());
        }

        creditsInfo = {
          usagePeriod: tierDetails.quotas?.usagePeriod || 'monthly',
        };

        if (tierDetails.quotas?.perModelCompletions) {
          for (const model of Object.keys(
            tierDetails.quotas?.perModelCompletions,
          )) {
            const { data } = await supabaseAdmin.rpc(
              'count_team_credits_for_completions_model',
              {
                team_id: teamId,
                from_tz: formatISO(startDate),
                to_tz: formatISO(endOfMonth(startDate)),
                model,
              },
            );

            if (data) {
              creditsInfo = {
                ...creditsInfo,
                completionCreditsPerModel: {
                  ...creditsInfo?.completionCreditsPerModel,
                  [model]: data?.[0]?.count || 0,
                },
              };
            }
          }
        } else {
          const { data } = await supabaseAdmin.rpc('count_team_credits', {
            team_id: teamId,
            from_tz: formatISO(startDate),
            to_tz: formatISO(endOfMonth(startDate)),
          });
          creditsInfo = { ...creditsInfo, credits: data?.[0]?.count || 0 };
        }

        // Set in cache (with a 1-day expiration)
        await setWithExpiration(
          getTeamCreditsKey(teamId),
          JSON.stringify(creditsInfo),
          DAY_IN_SECONDS,
        );
        console.log('Got from DB', JSON.stringify(creditsInfo, null, 2));
      } else {
        console.log('Got from cache', JSON.stringify(creditsInfo, null, 2));
      }

      return res.status(200).json(creditsInfo);
    }

    return res.status(400).end();
  },
);
