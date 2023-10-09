import type { SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { PostgrestError, User, createClient } from '@supabase/supabase-js';
import { isPresent } from 'ts-is-present';

import { Database, Json } from '@/types/supabase';
import {
  DbUser,
  GitHubSourceDataType,
  MotifSourceDataType,
  OAuthProvider,
  Project,
  DbSource,
  SourceType,
  DbTeam,
  WebsiteSourceDataType,
  PromptQueryStat,
  DbQueryFilter,
  QueryFilterComparisonOperation,
  QueryFilterLogicalOperation,
  NangoSourceDataType,
  DbFile,
} from '@/types/types';

import { DEFAULT_MARKPROMPT_CONFIG } from './constants';
import { MarkpromptConfig } from './schema';
import {
  INFINITE_TOKEN_ALLOWANCE,
  PlanDetails,
  TeamTierInfo,
  getEmbeddingTokensAllowance,
} from './stripe/tiers';
import { generateKey } from './utils';

export const getBYOOpenAIKey = async (
  supabaseAdmin: SupabaseClient<Database>,
  projectId: Project['id'],
): Promise<string | undefined> => {
  const { data } = await supabaseAdmin
    .from('projects')
    .select('openai_key')
    .eq('id', projectId)
    .limit(1)
    .select()
    .maybeSingle();

  return data?.openai_key || undefined;
};

export const getProjectConfigData = async (
  supabaseAdmin: SupabaseClient<Database>,
  projectId: Project['id'],
): Promise<{
  teamId: DbTeam['id'] | undefined;
  byoOpenAIKey: string | undefined;
  markpromptConfig: MarkpromptConfig;
}> => {
  const { data } = await supabaseAdmin
    .from('projects')
    .select('team_id,openai_key,markprompt_config')
    .eq('id', projectId)
    .limit(1)
    .select()
    .maybeSingle();

  // We cannot use Ajv in edge runtimes, so use non-typesafe
  // parsing and assume the format is correct. Cf.
  // https://github.com/vercel/next.js/discussions/47063
  const markpromptConfig = (data?.markprompt_config ||
    JSON.parse(DEFAULT_MARKPROMPT_CONFIG)) as MarkpromptConfig;

  return {
    teamId: data?.team_id,
    byoOpenAIKey: data?.openai_key || undefined,
    markpromptConfig: markpromptConfig,
  };
};

export const getTeamTierInfo = async (
  supabaseAdmin: SupabaseClient<Database>,
  projectId: Project['id'],
): Promise<TeamTierInfo | undefined> => {
  const { data } = await supabaseAdmin
    .from('teams')
    .select('stripe_price_id,plan_details,projects!inner (id)')
    .match({ 'projects.id': projectId })
    .limit(1)
    .maybeSingle();

  return data
    ? {
        stripe_price_id: data.stripe_price_id,
        plan_details: data.plan_details as PlanDetails,
      }
    : undefined;
};

export const getTeamSlugAndStripeCustomerId = async (
  supabaseAdmin: SupabaseClient<Database>,
  teamId: DbTeam['id'],
): Promise<{ slug: string; stripeCustomerId: string | null } | undefined> => {
  const { data } = await supabaseAdmin
    .from('teams')
    .select('slug,stripe_customer_id')
    .eq('id', teamId)
    .limit(1)
    .maybeSingle();

  return data
    ? {
        slug: data.slug,
        stripeCustomerId: data.stripe_customer_id,
      }
    : undefined;
};

export const setGitHubAuthState = async (
  supabase: SupabaseClient<Database>,
  userId: DbUser['id'],
): Promise<string> => {
  const state = generateKey();
  const { data } = await supabase
    .from('user_access_tokens')
    .select('id')
    .match({ user_id: userId, provider: 'github' })
    .limit(1)
    .maybeSingle();
  if (data) {
    await supabase
      .from('user_access_tokens')
      .update({ state })
      .eq('id', data.id);
  } else {
    await supabase
      .from('user_access_tokens')
      .insert([{ user_id: userId, state, provider: 'github' }]);
  }
  return state;
};

export const deleteUserAccessToken = async (
  supabase: SupabaseClient<Database>,
  userId: DbUser['id'],
  provider: OAuthProvider,
): Promise<PostgrestError | null> => {
  const { error } = await supabase
    .from('user_access_tokens')
    .delete()
    .match({ user_id: userId, provider });
  return error;
};

export const getProjectIdFromSource = async (
  supabaseAdmin: SupabaseClient<Database>,
  sourceId: DbSource['id'],
): Promise<Project['id'] | undefined> => {
  const { data } = await supabaseAdmin
    .from('sources')
    .select('project_id')
    .eq('id', sourceId)
    .limit(1)
    .maybeSingle();
  return data?.project_id || undefined;
};

export const getOrCreateSource = async (
  supabase: SupabaseClient<Database>,
  projectId: Project['id'],
  type: SourceType,
  data: any | undefined,
): Promise<DbSource['id']> => {
  const source = await getSource(supabase, projectId, type, data);

  if (source?.id) {
    return source.id;
  }

  const { data: newSourceData } = await supabase
    .from('sources')
    .insert([{ project_id: projectId, type }])
    .select('id')
    .limit(1)
    .maybeSingle();

  return newSourceData!.id;
};

export const getSource = async (
  supabase: SupabaseClient<Database>,
  projectId: Project['id'],
  sourceType: SourceType,
  data: any,
): Promise<DbSource | undefined> => {
  const { data: sources, error } = await supabase
    .from('sources')
    .select('*')
    .match({ project_id: projectId, type: sourceType });

  if (error || !sources || sources.length === 0) {
    return undefined;
  }

  switch (sourceType) {
    case 'file-upload':
    case 'api-upload':
      return sources[0];
    case 'github':
      return sources.find((s) => {
        const _data = s.data as GitHubSourceDataType;
        return _data.url === data.url && _data.branch === data.branch;
      });
    case 'nango':
      return sources.find((s) => {
        const _data = s.data as NangoSourceDataType;
        return _data.identifier === data.identifier;
      });
    case 'motif': {
      return sources.find((s) => {
        const _data = s.data as MotifSourceDataType;
        return (
          _data.projectDomain && _data.projectDomain === data.projectDomain
        );
      });
    }
    case 'website': {
      return sources.find((s) => {
        const _data = s.data as WebsiteSourceDataType;
        return _data.url && _data.url === data.url;
      });
    }
  }
};

export const getChecksums = async (
  supabase: SupabaseClient<Database>,
  sourceId: DbSource['id'],
) => {
  const { data } = await supabase
    .from('files')
    .select('path,checksum')
    .eq('source_id', sourceId);
  return data || [];
};

export const getProjectTeam = async (
  supabase: SupabaseClient<Database>,
  projectId: Project['id'],
): Promise<DbTeam | undefined> => {
  const { data: projectData } = await supabase
    .from('projects')
    .select('team_id')
    .eq('id', projectId)
    .limit(1)
    .maybeSingle();
  if (projectData?.team_id) {
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', projectData.team_id)
      .limit(1)
      .maybeSingle();
    return teamData || undefined;
  }

  return undefined;
};

export const getTeamUsageInfoByTeamOrProject = async (
  supabase: SupabaseClient<Database>,
  teamOrProjectId: { teamId?: DbTeam['id']; projectId?: Project['id'] },
): Promise<{
  stripe_price_id: string | null;
  team_token_count: number;
  plan_details: Json | null;
}> => {
  // eslint-disable-next-line prefer-const
  let { data, error } = await supabase
    .from('v_team_project_usage_info')
    .select('stripe_price_id,team_token_count,plan_details')
    .eq(
      teamOrProjectId.teamId ? 'team_id' : 'project_id',
      teamOrProjectId.teamId ?? teamOrProjectId.projectId,
    )
    .limit(1)
    .maybeSingle();

  // Important: data will be null in the above query if no content has been
  // indexed. In that case, just fetch the team plan details.
  if (!data || error) {
    const { data: teamProjectInfoData } = await supabase
      .from('v_team_project_info')
      .select('stripe_price_id,plan_details')
      .eq(
        teamOrProjectId.teamId ? 'team_id' : 'project_id',
        teamOrProjectId.teamId ?? teamOrProjectId.projectId,
      )
      .limit(1)
      .maybeSingle();

    if (teamProjectInfoData) {
      data = { ...teamProjectInfoData, team_token_count: 0 };
    }
  }

  return {
    stripe_price_id: data?.stripe_price_id || null,
    team_token_count: data?.team_token_count || 0,
    plan_details: data?.plan_details || null,
  };
};

export const getTokenAllowanceInfo = async (
  supabase: SupabaseClient<Database>,
  teamOrProjectId: { teamId?: DbTeam['id']; projectId?: Project['id'] },
): Promise<{
  numRemainingTokensOnPlan: number;
  usedTokens: number;
  tokenAllowance: number;
}> => {
  const teamUsageInfo = await getTeamUsageInfoByTeamOrProject(
    supabase,
    teamOrProjectId,
  );
  const usedTokens = teamUsageInfo?.team_token_count || 0;
  const tokenAllowance = getEmbeddingTokensAllowance({
    stripe_price_id: teamUsageInfo?.stripe_price_id,
    plan_details: teamUsageInfo?.plan_details as PlanDetails,
  });
  const numRemainingTokensOnPlan =
    tokenAllowance === INFINITE_TOKEN_ALLOWANCE
      ? 1_000_000_000
      : Math.max(0, tokenAllowance - usedTokens);
  return { numRemainingTokensOnPlan, usedTokens, tokenAllowance };
};

export const getJoinedTeams = async (
  supabase: SupabaseClient<Database>,
  userId: DbUser['id'],
): Promise<DbTeam[]> => {
  const { data, error } = await supabase
    .from('memberships')
    .select('user_id, teams (*)')
    .match({ user_id: userId });

  if (error) {
    throw new Error(error.message);
  }

  return (data?.map((d) => d.teams) || []) as DbTeam[];
};

export const getTeamProjectIds = async (
  supabase: SupabaseClient<Database>,
  teamId: DbTeam['id'],
): Promise<Project['id'][]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .match({ team_id: teamId });

  if (error) {
    throw new Error(error.message);
  }

  return (data?.map((d) => d.id) || []) as DbTeam['id'][];
};

export const hasUserAccessToProject = async (
  supabase: SupabaseClient<Database>,
  userId: User['id'],
  projectId: Project['id'],
): Promise<boolean> => {
  const response = await supabase
    .rpc('is_project_accessible_to_user', {
      user_id: userId,
      project_id: projectId,
    })
    .limit(1)
    .maybeSingle();
  return !!response.data?.has_access;
};

export const hasUserAdminAccessToTeam = async (
  supabase: SupabaseClient<Database>,
  userId: User['id'],
  teamId: DbTeam['id'],
): Promise<boolean> => {
  const { count: membershipCount } = await supabase
    .from('memberships')
    .select('id', { count: 'exact' })
    .match({ user_id: userId, team_id: teamId, type: 'admin' });
  return !!(membershipCount && membershipCount > 0);
};

export const SUPPORTED_QUERY_FILTER_COMPARISON_OPERATIONS: string[] =
  Object.values(QueryFilterComparisonOperation);

const SUPPORTED_QUERY_FILTER_LOGICAL_OPERATIONS: string[] = Object.values(
  QueryFilterLogicalOperation,
);

const isValidQueryFilters = (filters: DbQueryFilter[]) => {
  return (
    filters.length === 0 ||
    filters.every(
      (f) =>
        SUPPORTED_QUERY_FILTER_COMPARISON_OPERATIONS.includes(f[0]) ||
        SUPPORTED_QUERY_FILTER_LOGICAL_OPERATIONS.includes(f[0]),
    )
  );
};

export const getQueryStats = async (
  supabase: SupabaseClient<Database>,
  projectId: Project['id'],
  fromISO: string,
  toISO: string,
  limit: number,
  page: number,
  filters: DbQueryFilter[],
): Promise<{
  error: PostgrestError | null;
  queries: PromptQueryStat[] | null;
}> => {
  if (!isValidQueryFilters(filters || [])) {
    const message = `Invalid filters. Filters may only contains the following operators: ${JSON.stringify(
      [
        ...SUPPORTED_QUERY_FILTER_COMPARISON_OPERATIONS,
        ...SUPPORTED_QUERY_FILTER_LOGICAL_OPERATIONS,
      ],
    )}`;
    return {
      error: { message, details: message, hint: message, code: '' },
      queries: null,
    };
  }

  // Cf. https://github.com/orgs/supabase/discussions/3080#discussioncomment-1282318 to dynamically add filters
  const allFilters: any[] = [
    ['eq', 'project_id', projectId],
    ['or', 'processed_state.eq.processed,processed_state.eq.skipped'],
    ...filters,
    ['gte', 'created_at', fromISO],
    ['lte', 'created_at', toISO],
    ['not', 'decrypted_prompt', 'is', null],
    ['neq', 'decrypted_prompt', ''],
    ['order', 'created_at', { ascending: false }],
    ['range', page * limit, (page + 1) * limit - 1],
  ].filter(isPresent);

  const supabaseWithFilters = allFilters.reduce((acc, [fn, ...args]) => {
    return acc[fn](...args);
  }, supabase.from('v_insights_query_stats').select('id,conversation_id,created_at,decrypted_prompt,no_response,feedback'));

  const { data, error } = await supabaseWithFilters;

  if (error) {
    return { error, queries: null };
  }

  const queries = (data || []).map((q: any) => {
    const { decrypted_prompt, ...rest } = q;
    return { ...rest, prompt: decrypted_prompt } as PromptQueryStat;
  });

  return { queries, error: null };
};

// Important: two files may have the same nangoId, in case where
// the same source (e.g. Salesforce Knowledge) was added twice (say with
// different filters). They are therefore distinguished by their sourceId.
export const getFileBySourceAndNangoId = async (
  supabase: SupabaseClient<Database>,
  sourceId: DbSource['id'],
  nangoFileId: string,
): Promise<DbFile | undefined> => {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('source_id', sourceId)
    .eq('internal_metadata->>nangoId', nangoFileId)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return data;
};

// Important: two files may have the same nangoId, in case where
// the same source (e.g. Salesforce Knowledge) was added twice (say with
// different filters). They are therefore distinguished by their sourceId.
export const bacthDeleteFileBySourceAndNangoId = async (
  supabase: SupabaseClient<Database>,
  sourceId: DbSource['id'],
  nangoFileIds: string[],
) => {
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('source_id', sourceId)
    .in('internal_metadata->>nangoId', nangoFileIds);
  if (error) {
    throw new Error(`${error}`);
  }
};

export const getPublicAnonSupabase = () => {
  return createClient<Database>(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
};

export const createServiceRoleSupabaseClient = () => {
  return createClient<Database>(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
};
