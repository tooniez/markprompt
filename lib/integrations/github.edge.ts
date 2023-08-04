import { SupabaseClient, User } from '@supabase/supabase-js';

import { Database } from '@/types/supabase';
import { ApiError, OAuthToken } from '@/types/types';

export const getOrRefreshAccessToken = async (
  userId: User['id'],
  supabase: SupabaseClient<Database>,
): Promise<OAuthToken | undefined> => {
  if (!process.env.NEXT_PUBLIC_GITHUB_APP_CLIENT_ID) {
    throw new ApiError(400, 'Invalid GitHub client id.');
  }

  const { data, error } = await supabase
    .from('user_access_tokens')
    .select('*')
    .match({ user_id: userId, provider: 'github' })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error retrieving access token:', error.message);
    throw new ApiError(400, 'Unable to retrieve access token.');
  }

  if (!data || !data.refresh_token_expires || !data.expires) {
    return undefined;
  }

  const now = Date.now();
  if (data.refresh_token_expires < now || !data.refresh_token) {
    throw new ApiError(400, 'Refresh token has expired. Please sign in again.');
  }

  if (data.expires >= now) {
    return data;
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_GITHUB_APP_CLIENT_ID,
      client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
    }),
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new ApiError(
      500,
      'Could not refresh access token. Please sign in again',
    );
  }

  const accessTokenInfo = await res.json();

  const { data: refreshedData, error: refreshError } = await supabase
    .from('user_access_tokens')
    .update({
      access_token: accessTokenInfo.access_token,
      expires: now + accessTokenInfo.expires_in * 1000,
      refresh_token: accessTokenInfo.refresh_token,
      refresh_token_expires:
        now + accessTokenInfo.refresh_token_expires_in * 1000,
      scope: accessTokenInfo.scope,
    })
    .eq('id', data.id)
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (refreshError) {
    console.error('Error saving updated token:', refreshError.message);
  }

  if (refreshedData) {
    return refreshedData;
  }

  return undefined;
};
