import {
  SupabaseClient,
  createMiddlewareSupabaseClient,
} from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

import { Database } from '@/types/supabase';

const authorizedUsers = JSON.parse(
  process.env.MARKPROMPT_AUTHORIZED_EMAIL_USERS || '[]',
);

export const canSendEmails = async (supabase: SupabaseClient<Database>) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.email && authorizedUsers.includes(session.user.email);
};

export default async function EmailMiddleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createMiddlewareSupabaseClient({ req, res });

  const _canSendEmails = await canSendEmails(supabase);

  if (!_canSendEmails) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}
