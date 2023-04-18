import type { SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { PostgrestError } from '@supabase/supabase-js';

import { Database } from '@/types/supabase';
import {
  DbUser,
  GitHubSourceDataType,
  MotifSourceDataType,
  OAuthProvider,
  Project,
  Source,
  SourceType,
} from '@/types/types';

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

export const getOrCreateSource = async (
  supabase: SupabaseClient,
  projectId: Project['id'],
  type: SourceType,
  data: any | undefined,
): Promise<Source['id']> => {
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

  return newSourceData?.id;
};

export const getSource = async (
  supabase: SupabaseClient<Database>,
  projectId: Project['id'],
  sourceType: SourceType,
  data: any,
): Promise<Source | undefined> => {
  const { data: sourcesOfType, error } = await supabase
    .from('sources')
    .select('*')
    .match({ project_id: projectId, type: sourceType });

  if (error || !sourcesOfType || sourcesOfType.length === 0) {
    return undefined;
  }

  switch (sourceType) {
    case 'file-upload':
    case 'api-upload':
      return sourcesOfType[0];
    case 'github':
      return sourcesOfType.find((s) => {
        const _data = s.data as GitHubSourceDataType;
        return _data.url && _data.url === data.url;
      });
    case 'motif': {
      return sourcesOfType.find((s) => {
        const _data = s.data as MotifSourceDataType;
        return _data.projectId && _data.projectId === data.projectId;
      });
    }
  }
};

export const getChecksums = async (
  supabase: SupabaseClient,
  sourceId: Source['id'],
) => {
  const { data } = await supabase
    .from('files')
    .select('path,checksum')
    .eq('source_id', sourceId);
  return data || [];
};
