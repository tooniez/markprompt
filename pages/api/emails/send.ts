import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
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

const SENDER_EMAIL = `${process.env
  .MARKPROMPT_NEWSLETTER_EMAIL_SENDER_NAME!} <${process.env
  .MARKPROMPT_NEWSLETTER_EMAIL_SENDER_EMAIL!}>`;

type Data = {
  data?: CreateEmailResponse;
  error?: string;
};

const allowedMethods = ['POST'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabase = createServerSupabaseClient<Database>({ req, res });
  const _canSendEmails = await canSendEmails(supabase);

  if (!_canSendEmails) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const recipients = ['michael@motif.land'];

  const markdown = req.body.markdown;
  const unsubscribeMarkdown = req.body.unsubscribeMarkdown;

  const react = getTemplate(req.body.templateId)({
    date: parseISO(req.body.date),
    markdown,
    unsubscribeMarkdown,
    preview: req.body.preview,
    withHtml: true,
  });

  // Make sure the unsubscribe Markdown is also included in the plain text
  // version, but keep the verbatim Markdown as we don't want to strip away
  // the unsubscribe link.
  const text =
    String(await remark().use(strip).process(markdown)) +
    '\n\n' +
    unsubscribeMarkdown;

  try {
    const data = await resend.emails.send({
      from: SENDER_EMAIL,
      to: recipients,
      subject: req.body.subject,
      text,
      react,
    });

    res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: JSON.stringify(error) });
  }
}
