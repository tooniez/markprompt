import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { stripIndent } from 'common-tags';
import type { NextApiRequest, NextApiResponse } from 'next';
import { isPresent } from 'ts-is-present';

import {
  APPROX_CHARS_PER_TOKEN,
  CONTEXT_TOKENS_CUTOFF_GPT_3_5_TURBO,
} from '@/lib/constants';
import {
  getJoinedTeams,
  getProjectConfigData,
  getTeamProjectIds,
} from '@/lib/supabase';
import { recordProjectTokenCount } from '@/lib/tinybird';
import {
  approximatedTokenCount,
  getCompletionsResponseText,
  getCompletionsUrl,
} from '@/lib/utils';
import { safeParseInt } from '@/lib/utils.edge';
import { Database } from '@/types/supabase';
import {
  DbTeam,
  DbUser,
  OpenAIModelIdWithType,
  Project,
  QueryStatsProcessingResponseData,
  geLLMInfoFromModel,
} from '@/types/types';
import {
  getEmbeddingTokensAllowance,
  getMonthlyCompletionsAllowance,
} from '@/lib/stripe/tiers';

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

type UserUsageStats = {
  teamUsageStats: TeamUsageStats[];
};

type TeamUsageStats = {
  numMonthlyAllowedCompletions: number;
  numAllowedEmbeddings: number;
  projectUsageStats: ProjectUsageStats[];
};

type ProjectUsageStats = {
  projectName: string;
  projectSlug: string;
  numMonthlyUserCompletions: number;
  numEmbeddings: number;
  numFilesIndexed: number;
  latestQuestions: string[];
  topThemes: string[];
  numQuestionsAsked: number;
  numQuestionsUnanswered: number;
  numQuestionsDownvoted: number;
  numQuestionsUpvoted: number;
  mostCitedSources: string[];
};

const getProjectUsageStats = async (
  supabase: SupabaseClient<Database>,
  projectId: Project['id'],
): Promise<ProjectUsageStats> => {
  const teams = await getJoinedTeams(supabase, userId);
  return {
    projectName: string;
    projectSlug: string;
    numMonthlyUserCompletions: number;
    numEmbeddings: number;
    numFilesIndexed: number;
    latestQuestions: string[];
    topThemes: string[];
    numQuestionsAsked: number;
    numQuestionsUnanswered: number;
    numQuestionsDownvoted: number;
    numQuestionsUpvoted: number;
    mostCitedSources: string[];
  };
};

const getTeamUsageStats = async (
  supabase: SupabaseClient<Database>,
  team: DbTeam,
): Promise<TeamUsageStats> => {
  const projectIds = await getTeamProjectIds(supabase, team.id);
  return {
    numMonthlyAllowedCompletions: await getMonthlyCompletionsAllowance(team),
    numAllowedEmbeddings: await getEmbeddingTokensAllowance(team),
    projectUsageStats: await Promise.all(
      projectIds.map(async (projectId) =>
        getProjectUsageStats(supabase, projectId),
      ),
    ),
  };
};

const getUserUsageStats = async (
  supabase: SupabaseClient<Database>,
  userId: DbUser['id'],
): Promise<UserUsageStats> => {
  const teams = await getJoinedTeams(supabase, userId);
  return {
    teamUsageStats: await Promise.all(
      teams.map(async (team) => getTeamUsageStats(supabase, team)),
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

  const { data } = await supabaseAdmin
    .from('v_users_with_pending_weekly_update_email')
    .select('id,email,config')
    .limit(20);

  if (!data) {
    return res.status(200).send({ status: 'ok' });
  }

  for (const user of data) {
    if (!user.id) {
      continue;
    }
    const stats = await getUserUsageStats(supabaseAdmin, user.id);
    await sendEmail(user, stats);
    await updateConfig(user);
  }

  return res.status(200).send({ status: 'ok' });
}
