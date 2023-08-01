import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { add, endOfWeek, format, formatISO, startOfWeek } from 'date-fns';
import { flatten, sum, uniq } from 'lodash-es';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { isPresent } from 'ts-is-present';

import InsightsEmail from '@/components/emails/Insights';
import {
  getEmbeddingTokensAllowance,
  getMonthlyCompletionsAllowance,
  getTier,
  getTierName,
} from '@/lib/stripe/tiers';
import { getJoinedTeams, getTeamProjectIds } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import {
  DbTeam,
  DbUser,
  Project,
  QueryStatsProcessingResponseData,
} from '@/types/types';

const resend = new Resend(process.env.RESEND_API_KEY);

type Data =
  | {
      status?: string;
      error?: string;
    }
  | QueryStatsProcessingResponseData;

const allowedMethods = ['GET'];

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

export type UserUsageStats = {
  teamUsageStats: TeamUsageStats[];
};

type TeamUsageStats = {
  name: string;
  slug: string;
  tierName: string;
  numMonthlyAllowedCompletions: number;
  numAllowedEmbeddings: number;
  projectUsageStats: ProjectUsageStats[];
};

type ProjectUsageStats = {
  name: string;
  slug: string;
  numEmbeddingTokens: number;
  numFiles: number;
  numSections: number;
  latestQuestions: string[];
  unansweredQuestions: string[];
  numQuestionsAsked: number;
  numQuestionsUnanswered: number;
  numQuestionsDownvoted: number;
  numQuestionsUpvoted: number;
  mostCitedSources: string[];
};

const getProjectUsageStats = async (
  supabase: SupabaseClient<Database>,
  projectId: Project['id'],
  from: Date,
  to: Date,
): Promise<ProjectUsageStats> => {
  const fromISO = formatISO(from);
  const toISO = formatISO(to);

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('name,slug')
    .eq('id', projectId)
    .limit(1)
    .maybeSingle();

  const { data: queryStats } = await supabase.rpc('get_project_query_stats', {
    project_id: projectId,
    from_tz: formatISO(from),
    to_tz: formatISO(to),
  });

  const { data: references } = await supabase.rpc(
    'get_most_cited_references_stats',
    {
      project_id: projectId,
      from_tz: fromISO,
      to_tz: toISO,
      max_results: 10,
    },
  );

  const { data: fileStats } = await supabase.rpc('get_project_file_stats', {
    project_id: projectId,
  });

  const { data: queries } = await supabaseAdmin
    .from('query_stats')
    .select('prompt,id')
    .eq('project_id', projectId)
    .or('processed_state.eq.processed,processed_state.eq.skipped')
    .gte('created_at', fromISO)
    .lte('created_at', toISO)
    .not('response', 'is', null)
    .not('prompt', 'is', null)
    .neq('prompt', '')
    .neq('prompt', '[REDACTED]')
    .not('no_response', 'is', true)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: unanswered } = await supabaseAdmin
    .from('query_stats')
    .select('prompt')
    .eq('project_id', projectId)
    .or('processed_state.eq.processed,processed_state.eq.skipped')
    .gte('created_at', fromISO)
    .lte('created_at', toISO)
    .eq('no_response', true)
    .not('prompt', 'is', null)
    .neq('prompt', '')
    .neq('prompt', '[REDACTED]')
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    name: project?.name || '',
    slug: project?.slug || '',
    numEmbeddingTokens: fileStats?.[0]?.num_tokens || 0,
    numFiles: fileStats?.[0]?.num_files || 0,
    numSections: fileStats?.[0]?.num_sections || 0,
    latestQuestions: uniq(
      (queries || []).map((q) => q.prompt).filter(isPresent),
    ).slice(0, 10),
    unansweredQuestions: uniq(
      (unanswered || []).map((q) => q.prompt).filter(isPresent),
    ).slice(0, 10),
    numQuestionsAsked: queryStats?.[0]?.num_queries || 0,
    numQuestionsUnanswered: queryStats?.[0]?.num_unanswered || 0,
    numQuestionsUpvoted: queryStats?.[0]?.num_upvotes || 0,
    numQuestionsDownvoted: queryStats?.[0]?.num_downvotes || 0,
    mostCitedSources: (references || []).map((r) => {
      return r.heading ? `${r.heading} - ${r.title}` : r.title;
    }),
  };
};

const getTeamUsageStats = async (
  supabase: SupabaseClient<Database>,
  team: DbTeam,
  from: Date,
  to: Date,
): Promise<TeamUsageStats> => {
  const projectIds = await getTeamProjectIds(supabase, team.id);
  const tierName = getTierName(getTier(team));
  return {
    name: team.name || 'Unnamed',
    slug: team.slug,
    tierName,
    numMonthlyAllowedCompletions: await getMonthlyCompletionsAllowance(team),
    numAllowedEmbeddings: await getEmbeddingTokensAllowance(team),
    projectUsageStats: await Promise.all(
      projectIds.map(async (projectId) =>
        getProjectUsageStats(supabase, projectId, from, to),
      ),
    ),
  };
};

const getUserUsageStats = async (
  supabase: SupabaseClient<Database>,
  userId: DbUser['id'],
  from: Date,
  to: Date,
): Promise<UserUsageStats> => {
  const teams = await getJoinedTeams(supabase, userId);
  return {
    teamUsageStats: await Promise.all(
      teams.map(async (team) => getTeamUsageStats(supabase, team, from, to)),
    ),
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  let users:
    | {
        id: string | null;
        email: string | null;
        config: any;
      }[]
    | null;

  if (req.query.test === '1') {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id,email,config')
      .eq('id', process.env.TEST_USER_ID);

    if (!data || data.length === 0) {
      return res.status(400).send({ error: 'Test user not found' });
    }

    users = [{ id: data[0].id, email: data[0].email, config: data[0].config }];
  } else {
    // const { data: usersResponse } = await supabaseAdmin
    //   .from('v_users_with_pending_weekly_update_email')
    //   .select('id,email,config')
    //   .limit(5);
    // users = usersResponse;

    const { data } = await supabaseAdmin
      .from('users')
      .select('id,email,config')
      .eq('id', process.env.TEST_USER_EMAIL_2);

    if (!data || data.length === 0) {
      return res.status(400).send({ error: 'Test user not found' });
    }

    users = [{ id: data[0].id, email: data[0].email, config: data[0].config }];
  }

  if (!users) {
    return res.status(200).send({ status: 'ok' });
  }

  // We execute the cron job every two minutes on Mondays. So we take
  // as reference date the Monday before.
  const referenceDate = add(new Date(), { days: -7 });
  const from = startOfWeek(referenceDate);
  const to = endOfWeek(referenceDate);

  for (const user of users) {
    if (!user.id || !user.email) {
      continue;
    }
    const stats = await getUserUsageStats(supabaseAdmin, user.id, from, to);

    // Do not send email if there are no teams
    if (stats.teamUsageStats.length === 0) {
      continue;
    }

    const numProjects = sum(
      stats.teamUsageStats.map((s) => s.projectUsageStats.length),
    );

    // Do not send email if there are no projects
    if (numProjects === 0) {
      continue;
    }

    const numFiles = sum(
      flatten(
        stats.teamUsageStats.map((s) =>
          s.projectUsageStats.map((p) => p.numFiles),
        ),
      ),
    );

    console.log('numFiles', JSON.stringify(numFiles, null, 2));

    // Do not send email if there are no files
    if (numFiles === 0) {
      continue;
    }

    try {
      console.info(
        `[EMAIL] Sending weekly update to ${user.email} from ${process.env.MARKPROMPT_WEEKLY_UPDATES_SENDER_NAME}`,
      );
      await resend.emails.send({
        from: `${process.env.MARKPROMPT_WEEKLY_UPDATES_SENDER_NAME!} <${process
          .env.MARKPROMPT_WEEKLY_UPDATES_SENDER_EMAIL!}>`,
        reply_to: process.env.MARKPROMPT_WEEKLY_UPDATES_REPLY_TO!,
        // to: user.email,
        to: process.env.TEST_USER_EMAIL!,
        subject: 'Markprompt Weekly Report',
        react: InsightsEmail({
          preview: `Markprompt weekly report for ${format(
            from,
            'LLL dd',
          )} - ${format(to, 'LLL dd, y')}`,
          withHtml: true,
          stats,
          from,
          to,
        }),
      });

      // Once the email has been sent, update the `lastWeeklyUpdateEmail`
      // to the start of the range of the update, i.e. the beginning
      // of the past week.
      // const { error: updateConfigError } = await supabaseAdmin
      //   .from('users')
      //   .update({
      //     config: {
      //       ...user.config,
      //       lastWeeklyUpdateEmail: formatISO(from),
      //     },
      //   })
      //   .eq('id', user.id);

      // if (updateConfigError) {
      //   console.error(`Error updating user config: ${updateConfigError}`);
      // }
    } catch (e) {
      console.error(`Error sending weekly usage email: ${JSON.stringify(e)}`);
    }
  }

  return res.status(200).send({ status: 'ok' });
}
