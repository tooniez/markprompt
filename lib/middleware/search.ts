import { NextRequest, NextResponse } from 'next/server';

import { ApiError, Project } from '@/types/types';

import {
  getProjectIdFromKey,
  getProjectIdFromToken,
  noProjectForTokenResponse,
  noTokenOrProjectKeyResponse,
} from './common';
import { checkSearchRateLimits } from '../rate-limits';
import { createServiceRoleSupabaseClient } from '../supabase';
import { getAuthorizationToken, truncateMiddle } from '../utils';

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createServiceRoleSupabaseClient();

export default async function SearchMiddleware(req: NextRequest) {
  const mts: any[] = [];
  let ts = Date.now();

  // if (process.env.NODE_ENV === 'production') {
  //   // Check that IP is present and not rate limited
  //   if (!req.ip) {
  //     return new Response('Forbidden', { status: 403 });
  //   }

  //   const rateLimitIPResult = await checkSearchRateLimits({
  //     value: req.ip,
  //     type: 'ip',
  //   });

  //   if (!rateLimitIPResult.result.success) {
  //     console.error(
  //       `[SEARCH] [RATE-LIMIT] IP ${req.ip}, origin: ${req.headers.get(
  //         'origin',
  //       )}`,
  //     );
  //     return new Response('Too many requests', { status: 429 });
  //   }
  // }

  // const requesterOrigin = req.headers.get('origin');
  // const requesterHost = requesterOrigin && removeSchema(requesterOrigin);

  // if (requesterHost) {
  //   // Browser requests. Check that origin is not rate-limited.
  //   const rateLimitHostnameResult = await checkSearchRateLimits({
  //     value: requesterHost,
  //     type: 'hostname',
  //   });

  //   if (!rateLimitHostnameResult.result.success) {
  //     console.error(
  //       `[SEARCH] [RATE-LIMIT] IP: ${req.ip}, origin: ${requesterOrigin}`,
  //     );
  //     return new Response('Too many requests', { status: 429 });
  //   }
  // }

  const token = getAuthorizationToken(req.headers.get('Authorization'));
  const projectKey = req.nextUrl.searchParams.get('projectKey');

  if (!token && !projectKey) {
    return noTokenOrProjectKeyResponse;
  }

  let projectId: Project['id'] | undefined = undefined;

  mts.push({ checkRateLimits: Date.now() - ts });
  ts = Date.now();

  if (token) {
    // If authorization token is present, use this to find the project id
    const rateLimitResult = await checkSearchRateLimits({
      value: token,
      type: 'token',
    });

    if (!rateLimitResult.result.success) {
      console.error(
        `[SEARCH] [RATE-LIMIT] IP: ${req.ip}, token: ${truncateMiddle(
          token,
          2,
          2,
        )}`,
      );
      return new Response('Too many requests', { status: 429 });
    }

    const res = NextResponse.next();
    projectId = await getProjectIdFromToken(req, res, supabaseAdmin, token);

    if (!projectId) {
      return noProjectForTokenResponse;
    }
  }

  if (projectKey) {
    try {
      projectId = await getProjectIdFromKey(supabaseAdmin, projectKey);

      // Now that we have a project id, we need to check that the
      // the project has whitelisted the domain the request comes from.
      // Admin Supabase needed here, as the projects table is subject to RLS.
      // We bypass this check if the key is a test key or if the request
      // comes from the app host (e.g. markprompt.com/s/[key]]).
      // await checkWhitelistedDomainIfProjectKey(
      //   supabaseAdmin,
      //   projectKey,
      //   projectId,
      //   requesterHost,
      // );
    } catch (e) {
      const apiError = e as ApiError;
      return new Response(apiError.message, { status: apiError.code });
    }
  }

  mts.push({ getProjectId: Date.now() - ts });
  ts = Date.now();

  if (!projectId) {
    return new Response(
      'No project found matching the provided key or authorization token.',
      { status: 401 },
    );
  }

  // We pass the query string as part of the rewritten response.
  // This is the only way I found to pass along GET query params to the
  // API handler function.
  return NextResponse.rewrite(
    new URL(
      `/api/v1/search${
        req.nextUrl.search
      }&projectId=${projectId}&mts=${JSON.stringify(mts)}`,
      req.url,
    ),
  );
}
