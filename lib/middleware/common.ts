import { SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest } from 'next';
import { NextRequest, NextResponse } from 'next/server';

import { Database } from '@/types/supabase';
import { ApiError, Project } from '@/types/types';

import {
  get,
  getIsDomainWhitelistedForProjectKey,
  getProjectIdByKey,
  setWithExpiration,
} from '../redis';
import { isSKTestKey, truncateMiddle } from '../utils';
import { isAppHost } from '../utils.edge';

export const noTokenResponse = new NextResponse(
  JSON.stringify({
    success: false,
    message:
      'An authorization token needs to be provided. Head over to the Markprompt dashboard and get one under the project settings.',
  }),
  { status: 401, headers: { 'content-type': 'application/json' } },
);

export const noTokenOrProjectKeyResponse = new NextResponse(
  JSON.stringify({
    success: false,
    message:
      'An authorization token or a project key needs to be provided. Head over to the Markprompt dashboard and get one under the project settings. Read more on https://markprompt.com/docs.',
  }),
  { status: 401, headers: { 'content-type': 'application/json' } },
);

export const noProjectForTokenResponse = new NextResponse(
  JSON.stringify({
    success: false,
    message:
      'No project was found matching the provided token. Head over to the Markprompt dashboard and get a valid token under the project settings.',
  }),
  { status: 401, headers: { 'content-type': 'application/json' } },
);

export const getProjectIdFromToken = async (
  req: NextRequest,
  res: NextResponse,
  supabase: SupabaseClient<Database>,
  token: string,
) => {
  // In un-authed scenarios, supabase needs to have service_role
  // access as the tokens table has RLS.
  const { data } = await supabase
    .from('tokens')
    .select('project_id')
    .eq('value', token)
    .maybeSingle();

  return data?.project_id;
};

// Cf. https://stackoverflow.com/questions/68338838/how-to-get-the-ip-address-of-the-client-from-server-side-in-next-js-app
export const getRequesterIp = (req: NextApiRequest) => {
  const forwarded = req.headers['x-forwarded-for'];

  return typeof forwarded === 'string'
    ? forwarded.split(/, /)[0]
    : req.socket.remoteAddress;
};

export const getProjectIdFromKey = async (
  supabaseAdmin: SupabaseClient<Database>,
  projectKey: string,
): Promise<Project['id']> => {
  const redisKey = getProjectIdByKey(projectKey);
  const projectId = await get(redisKey);
  if (projectId) {
    return projectId;
  }

  const _isSKTestKey = isSKTestKey(projectKey);

  // Admin Supabase needed here, as the projects table is subject to RLS
  const { data } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq(_isSKTestKey ? 'private_dev_api_key' : 'public_api_key', projectKey)
    .limit(1)
    .maybeSingle();

  if (!data?.id) {
    console.error('Project not found', truncateMiddle(projectKey || ''));
    throw new ApiError(
      404,
      `No project with projectKey ${truncateMiddle(
        projectKey,
      )} was found. Please provide a valid project key. You can obtain your project key in the Markprompt dashboard, under project settings.`,
    );
  }

  // Cache for 24 hours
  await setWithExpiration(redisKey, data.id, 60 * 60 * 24);
  return data.id;
};

const isDomainWhitelisted = async (
  supabaseAdmin: SupabaseClient<Database>,
  projectId: Project['id'],
  requesterHost: string | null,
): Promise<boolean> => {
  if (!requesterHost) {
    return false;
  }
  const redisKey = getIsDomainWhitelistedForProjectKey(
    projectId,
    requesterHost,
  );
  const cachedIsDomainWhitelisted = await get(redisKey);
  if (cachedIsDomainWhitelisted !== null) {
    return cachedIsDomainWhitelisted === JSON.stringify(true);
  }

  const { count } = await supabaseAdmin
    .from('domains')
    .select('id', { count: 'exact' })
    .match({ project_id: projectId, name: requesterHost });
  const _isDomainWhitelisted = count !== null && count > 0;

  // Store in cache for 24 hours
  await setWithExpiration(
    redisKey,
    JSON.stringify(_isDomainWhitelisted),
    60 * 60 * 24,
  );

  return _isDomainWhitelisted;
};

export const checkWhitelistedDomainIfProjectKey = async (
  supabaseAdmin: SupabaseClient<Database>,
  projectKey: string,
  projectId: Project['id'],
  requesterHost: string | null,
) => {
  if (!isSKTestKey(projectKey) && !isAppHost(requesterHost!)) {
    const isWhitelisted = await isDomainWhitelisted(
      supabaseAdmin,
      projectId,
      requesterHost,
    );

    if (!isWhitelisted) {
      throw new ApiError(
        401,
        `The domain ${requesterHost} is not allowed to access completions for the project with key ${truncateMiddle(
          projectKey,
        )}. If you need to access completions from a non-whitelisted domain, such as localhost, use a test project key instead.`,
      );
    }
  }
};
