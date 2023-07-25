import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { parseISO } from 'date-fns';
import type { NextApiRequest, NextApiResponse } from 'next';
import { remark } from 'remark';
import { Resend } from 'resend';
import { CreateEmailResponse } from 'resend/build/src/emails/interfaces';
import strip from 'strip-markdown';

import { getTemplate } from '@/lib/email';
import { canSendEmails } from '@/lib/middleware/email';
import { Database } from '@/types/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

type Data = {
  data?: CreateEmailResponse;
  emails?: string[];
  error?: string;
  done?: boolean;
};

const allowedMethods = ['POST'];

const RUN_AGAINST_PROD = true;

const SUPABASE_ADMIN_NEXT_PUBLIC_SUPABASE_URL = RUN_AGAINST_PROD
  ? process.env.NEXT_PUBLIC_SUPABASE_URL_PRODUCTION___WARNING___
  : process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_ADMIN_SERVICE_ROLE_KEY = RUN_AGAINST_PROD
  ? process.env.___WARNING___SUPABASE_SERVICE_ROLE_KEY_PRODUCTION
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const getProductionSupabaseAdminLocally = () => {
  // This code is for running against the Supabase production instance
  // locally. We deliberately use keys with warnings to ensure we don't
  // accidentally copy paste this code elsewhere.
  return createClient<Database>(
    SUPABASE_ADMIN_NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_ADMIN_SERVICE_ROLE_KEY || '',
  );
};

const productionSupabaseAdmin = getProductionSupabaseAdminLocally();

// Notes: we've built this handler to make it possible to run
// locally. In particular, it uses the client Supabase instance
// to fetch session data (à priori on localhost), and the
// admin Supabase instance specifically with production keys,
// to run the user fetching/updating on the production database.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Use the session-based Supabase client here. This is required for the
  // canSendEmails check, which looks at the session active user.
  const localSupabaseClient = createServerSupabaseClient<Database>({
    req,
    res,
  });
  const _canSendEmails = await canSendEmails(localSupabaseClient);

  if (!_canSendEmails) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const emailId = req.body.emailId;
  if (!emailId) {
    return res.status(400).json({ error: 'Please provide an emailId.' });
  }

  const { data } = await productionSupabaseAdmin
    .from('users')
    .select('id,email')
    .not('last_email_id', 'eq', req.body.emailId)
    // .eq('email', 'michael@motif.land')
    .limit(1);

  const emails = (data || []).map((d) => d.email);
  // const emails = ['michael@motif.land'];

  if (emails.length === 0) {
    return res.status(200).json({ done: true });
  }

  const markdown = req.body.markdown;

  const react = getTemplate(req.body.templateId)({
    date: parseISO(req.body.date),
    markdown,
    preview: req.body.preview,
    withHtml: true,
  });

  // Make sure the unsubscribe Markdown is also included in the plain text
  // version, but keep the verbatim Markdown as we don't want to strip away
  // the unsubscribe link.
  const text =
    String(await remark().use(strip).process(markdown)) +
    '\n\nUnsubscribe link: {{{RESEND_UNSUBSCRIBE_URL}}}';

  console.log('Sending to', JSON.stringify(emails, null, 2));

  try {
    const resendData = await resend.emails.send({
      from: `${process.env.MARKPROMPT_NEWSLETTER_SENDER_NAME!} <${process.env
        .MARKPROMPT_NEWSLETTER_SENDER_EMAIL!}>`,
      reply_to: process.env.MARKPROMPT_NEWSLETTER_REPLY_TO!,
      to: emails,
      subject: req.body.subject,
      text,
      react,
    });

    const ids = (data || []).map((d) => d.id);

    console.log('ids', JSON.stringify(ids, null, 2));

    await productionSupabaseAdmin
      .from('users')
      .update({ last_email_id: emailId })
      .in('id', ids);

    res.status(200).json({ data: resendData, emails });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: JSON.stringify(error), emails });
  }
}
