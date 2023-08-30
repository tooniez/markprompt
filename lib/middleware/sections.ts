import { NextRequest, NextResponse } from 'next/server';

import { track } from '@/lib/posthog';

import {
  getProjectIdFromToken,
  noProjectForTokenResponse,
  noTokenResponse,
} from './common';
import { checkSectionsRateLimits } from '../rate-limits';
import { createServiceRoleSupabaseClient } from '../supabase';
import { getAuthorizationToken, truncateMiddle } from '../utils';

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createServiceRoleSupabaseClient();

export default async function MatchSectionsMiddleware(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !req.ip) {
    return new Response('Forbidden', { status: 403 });
  }

  const token = getAuthorizationToken(req.headers.get('Authorization'));

  if (!token) {
    return noTokenResponse;
  }

  if (process.env.NODE_ENV === 'production' && req.ip) {
    // Apply rate limiting here already based on IP. After that, apply rate
    // limiting on requester token.
    const rateLimitIPResult = await checkSectionsRateLimits({
      value: req.ip,
      type: 'ip',
    });

    if (!rateLimitIPResult.result.success) {
      console.error(
        `[SECTIONS] [RATE-LIMIT] IP ${req.ip}, token: ${truncateMiddle(
          token,
          2,
          2,
        )}`,
      );
      return new Response('Too many requests', { status: 429 });
    }
  }

  // Apply rate-limit here already, before looking up the project id,
  // which requires a database lookup.
  const rateLimitResult = await checkSectionsRateLimits({
    value: token,
    type: 'token',
  });

  if (!rateLimitResult.result.success) {
    console.error(
      `[SECTIONS] [RATE-LIMIT] IP: ${req.ip}, token ${truncateMiddle(
        token,
        2,
        2,
      )}`,
    );
    return new Response('Too many requests', { status: 429 });
  }

  const res = NextResponse.next();

  const projectId = await getProjectIdFromToken(req, res, supabaseAdmin, token);

  if (!projectId) {
    return noProjectForTokenResponse;
  }

  track(projectId, 'get sections', { projectId });

  return NextResponse.rewrite(
    new URL(`/api/v1/sections/${projectId}`, req.url),
  );
}
