import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { add, endOfMonth, formatISO, parseISO, startOfMonth } from 'date-fns';
import type { NextApiRequest, NextApiResponse } from 'next';

import { withTeamAdminAccess } from '@/lib/middleware/common';
import {
  HOUR_IN_SECONDS,
  get,
  getTeamCreditsKey,
  setWithExpiration,
} from '@/lib/redis';
import { getTierDetails } from '@/lib/stripe/tiers';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { CompletionsUsageInfo, DbTeam } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | CompletionsUsageInfo;

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
      // Fetch from cache (1 hour expiration)
      let creditsInfo = await get<CompletionsUsageInfo>(
        getTeamCreditsKey(teamId),
      );

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
        let endDate: Date;
        if (
          tierDetails.quotas?.usagePeriod === 'yearly' &&
          teamData.billing_cycle_start
        ) {
          startDate = parseISO(teamData.billing_cycle_start);
          endDate = add(startDate, { years: 1 });
        } else {
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(startDate);
        }

        creditsInfo = {
          usagePeriod: tierDetails.quotas?.usagePeriod || 'monthly',
        };

        const completionsQuotas = tierDetails.quotas?.completions;
        if (
          completionsQuotas?.['all'] ||
          // Backwards compatibility
          typeof completionsQuotas === 'number'
        ) {
          const { data } = await supabaseAdmin.rpc('count_team_credits', {
            team_id: teamId,
            from_tz: formatISO(startDate),
            to_tz: formatISO(endDate),
          });
          let allowance;
          if (typeof completionsQuotas === 'number') {
            // Backwards compatibility
            allowance = completionsQuotas;
          } else {
            allowance = completionsQuotas?.['all'] || 0;
          }
          creditsInfo = {
            ...creditsInfo,
            completions: {
              all: {
                allowance,
                used: data?.[0]?.count || 0,
              },
            },
          };
        } else if (tierDetails.quotas?.completions) {
          for (const model of Object.keys(tierDetails.quotas.completions)) {
            const { data } = await supabaseAdmin.rpc(
              'count_team_credits_for_completions_model',
              {
                team_id: teamId,
                from_tz: formatISO(startDate),
                to_tz: formatISO(endDate),
                model,
              },
            );

            if (data) {
              const allowance = (tierDetails.quotas.completions as any)[
                model
              ] as number;
              creditsInfo = {
                ...creditsInfo,
                completions: {
                  ...creditsInfo?.completions,
                  [model]: { allowance, used: data?.[0]?.count || 0 },
                },
              };
            }
          }
        }

        // Set in cache (with a 1-hour expiration)
        await setWithExpiration(
          getTeamCreditsKey(teamId),
          JSON.stringify(creditsInfo),
          HOUR_IN_SECONDS,
        );
      }

      return res.status(200).json(creditsInfo);
    }
  },
);
