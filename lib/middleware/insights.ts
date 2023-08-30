import { NextRequest, NextResponse } from 'next/server';

import { Project } from '@/types/types';

import {
  getProjectIdFromToken,
  noProjectForTokenResponse,
  noTokenResponse,
} from './common';
import { checkInsightsRateLimits } from '../rate-limits';
import { createServiceRoleSupabaseClient } from '../supabase';
import { getAuthorizationToken, truncateMiddle } from '../utils';

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createServiceRoleSupabaseClient();

export default async function InsightsMiddleware(req: NextRequest) {
  const token = getAuthorizationToken(req.headers.get('Authorization'));

  if (!token) {
    return noTokenResponse;
  }

  let projectId: Project['id'] | undefined = undefined;

  // If authorization token is present, use this to find the project id
  const rateLimitResult = await checkInsightsRateLimits({
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

  // We pass the query string as part of the rewritten response.
  // This is the only way I found to pass along GET query params to the
  // API handler function.
  return NextResponse.rewrite(
    new URL(
      `/api${req.nextUrl.pathname}${req.nextUrl.search}&projectId=${projectId}`,
      req.url,
    ),
  );
}
