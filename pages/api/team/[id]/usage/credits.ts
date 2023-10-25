import { OpenAIChatCompletionsModelId } from '@markprompt/core';
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
import {
  getCompletionCredits,
  getCompletionsAllowance,
} from '@/lib/stripe/tiers';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { DbTeam, ModelUsageInfo } from '@/types/types';

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
      const credits: number | null = await get(getTeamCreditsKey(teamId));

      if (!credits) {
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

        const { usagePeriod } = getCompletionsAllowance({
          stripe_price_id: teamData.stripe_price_id,
          plan_details: teamData.plan_details,
        });

        let startDate: Date;
        if (usagePeriod === 'yearly' && teamData.billing_cycle_start) {
          startDate = parseISO(teamData.billing_cycle_start);
        } else {
          startDate = startOfMonth(new Date());
        }

        // const { data } = await supabaseAdmin.rpc(
        //   'get_accumulated_query_stats_token_count',
        //   {
        //     team_id: teamId,
        //     from_tz: formatISO(startDate),
        //     to_tz: formatISO(endOfMonth(startDate)),
        //   },
        // );

        // if (!data) {
        //   credits = 0;
        // } else {
        //   const modelUsageInfos: ModelUsageInfo[] = data.flatMap((row) => {
        //     const infos: ModelUsageInfo[] = [];
        //     if (row.retrieval_model) {
        //       infos.push({
        //         model: row.retrieval_model as OpenAIChatCompletionsModelId,
        //         tokens: {
        //           prompt_tokens: row.total_retrieval_prompt_tokens,
        //           completion_tokens: row.total_retrieval_completion_tokens,
        //         },
        //       });
        //     }
        //     if (row.completion_model) {
        //       infos.push({
        //         model: row.completion_model as OpenAIChatCompletionsModelId,
        //         tokens: {
        //           prompt_tokens: row.total_completion_prompt_tokens,
        //           completion_tokens: row.total_completion_completion_tokens,
        //         },
        //       });
        //     }
        //     return infos;
        //   });

        //   credits = getCompletionCredits(modelUsageInfos) || 0;
        // }

        // Set in cache (with a 1-day expiration)
        await setWithExpiration(
          getTeamCreditsKey(teamId),
          credits,
          DAY_IN_SECONDS,
        );
      }

      return res.status(200).json({ credits: credits || 0 });
    }

    return res.status(400).end();
  },
);
