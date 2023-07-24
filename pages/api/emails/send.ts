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

type Data = {
  data?: CreateEmailResponse;
  emails?: string[];
  error?: string;
  done?: boolean;
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

  const emailId = req.body.emailId;
  if (!emailId) {
    return res.status(400).json({ error: 'Please provide an emailId.' });
  }

  // const { data } = await supabase
  //   .from('users')
  //   .select('id,email')
  //   .not('last_email_id', 'eq', req.body.emailId)
  //   .limit(40);

  // const emails = (data || []).map((d) => d.email);
  const emails = ['michael@motif.land'];

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
    '\n\n{{{RESEND_UNSUBSCRIBE_URL}}}';

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

    // const ids = (data || []).map((d) => d.id);

    // await supabase
    //   .from('users')
    //   .update({ last_email_id: emailId })
    //   .in('id', ids);

    res.status(200).json({ data: resendData, emails });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: JSON.stringify(error), emails });
  }
}
