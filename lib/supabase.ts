import type { SupabaseClient } from '@supabase/auth-helpers-nextjs';

import { DbFile, DbUser, Project } from '@/types/types';

import { generateKey } from './utils';

export const getFileAtPath = async (
  supabase: SupabaseClient,
  projectId: Project['id'],
  path: string,
): Promise<DbFile['id'] | undefined> => {
  const { data, error } = await supabase
    .from('files')
    .select('id')
    .match({ project_id: projectId, path })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('Error:', error);
    return undefined;
  }
  return data?.id as DbFile['id'];
};

export const createFile = async (
  supabase: SupabaseClient,
  projectId: Project['id'],
  path: string,
  meta: any,
): Promise<DbFile['id'] | undefined> => {
  const { error, data } = await supabase
    .from('files')
    .insert([{ project_id: projectId, path, meta }])
    .select('id')
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data?.id as DbFile['id'];
};

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
