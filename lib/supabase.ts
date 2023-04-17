import type { SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { PostgrestError } from '@supabase/supabase-js';

import { DbUser, OAuthProvider, Project, Source } from '@/types/types';

import { generateKey } from './utils';

export const getBYOOpenAIKey = async (
  supabaseAdmin: SupabaseClient,
  projectId: Project['id'],
) => {
  const { data: openAIKeyData } = await supabaseAdmin
    .from('projects')
    .select('openai_key')
    .eq('id', projectId)
    .limit(1)
    .select()
    .maybeSingle();

  return openAIKeyData?.openai_key || undefined;
};

export const setGitHubAuthState = async (
  supabase: SupabaseClient,
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
  supabase: SupabaseClient,
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
  supabaseAdmin: SupabaseClient,
  sourceId: Source['id'],
): Promise<Project['id'] | undefined> => {
  const { data } = await supabaseAdmin
    .from('sources')
    .select('project_id')
    .eq('id', sourceId)
    .limit(1)
    .maybeSingle();
  return data?.project_id || undefined;
};

export const getOrCreateUploadSourceId = async (
  supabase: SupabaseClient,
  projectId: Project['id'],
): Promise<Source['id']> => {
  const { data } = await supabase
    .from('sources')
    .select('id')
    .match({ project_id: projectId, source: 'upload' })
    .limit(1)
    .maybeSingle();

  if (data?.id) {
    return data.id;
  }

  const { data: newSourceData, error } = await supabase
    .from('sources')
    .insert([{ project_id: projectId, source: 'upload' }])
    .select('id')
    .limit(1)
    .maybeSingle();

  return newSourceData?.id;
};
