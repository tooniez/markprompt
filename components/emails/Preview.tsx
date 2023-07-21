import { formatISO, parseISO } from 'date-fns';
import { FC, useState } from 'react';
import { toast } from 'react-hot-toast';

import Button from '@/components/ui/Button';
import { TemplateId, getTemplate } from '@/lib/email';

type EmailPreviewProps = {
  title: string;
  markdown: string;
  preview: string;
  date: string;
  templateId: TemplateId;
};

const getUnsubscribeMarkdown = (templateId: TemplateId) => {
  switch (templateId) {
    case 'plain':
      return '[Unsubscribe]({{{RESEND_UNSUBSCRIBE_URL}}})  if you do not wish to receive updates from me.';
    case 'monthly_update':
      return 'You are receiving this email because you signed up at [markprompt.com](https://markprompt.com). [Unsubscribe]({{{RESEND_UNSUBSCRIBE_URL}}}).';
  }
};

export const EmailPreview: FC<EmailPreviewProps> = ({
  title: subject,
  markdown,
  preview,
  date,
  templateId,
}) => {
  const [sending, setSending] = useState(false);
  const _date = parseISO(date);

  const Template = getTemplate(templateId);
  const unsubscribeMarkdown = getUnsubscribeMarkdown(templateId);

  return (
    <>
      <div className="relative flex min-h-screen w-full justify-center overflow-y-auto px-8 pt-8 pb-[200px]">
        <div className="fixed inset-0 z-0 bg-neutral-900" />
        <div className="z-10 w-full max-w-screen-lg overflow-hidden rounded-md bg-neutral-50 px-20 py-8 shadow-xl">
          <div className="mx-auto max-w-[480px] border border-dashed border-neutral-200 bg-white p-0 text-neutral-900">
            <Template
              date={_date}
              markdown={markdown}
              unsubscribeMarkdown={unsubscribeMarkdown}
              preview={preview}
            />
          </div>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-end bg-white px-8 py-6 text-neutral-900 shadow-2xl">
          <div
            className="grid w-full grid-cols-2 gap-y-2 gap-x-4 truncate text-sm"
            style={{
              gridTemplateColumns: 'auto 1fr',
            }}
          >
            <div>Template</div>
            <div className="font-bold">{templateId}</div>
            <div>Subject</div>
            <div className="font-bold">{subject}</div>
            <div>Preview</div>
            <div className="font-bold">{preview}</div>
          </div>
          <div className="flex-grow" />
          <Button
            className="flex-none"
            variant="plain"
            loading={sending}
            onClick={async () => {
              setSending(true);
              const res = await fetch('/api/emails/send', {
                method: 'POST',
                body: JSON.stringify({
                  subject,
                  markdown,
                  unsubscribeMarkdown,
                  preview,
                  templateId,
                  date: formatISO(_date),
                }),
                headers: {
                  'Content-Type': 'application/json',
                  accept: 'application/json',
                },
              });
              if (!res.ok) {
                console.error(await res.text());
                toast.error('Error sending emails, see console logs');
              } else {
                toast.error('Emails have been sent!');
              }
              setSending(false);
            }}
          >
            Send
          </Button>
        </div>
      </div>
    </>
  );
};

export default EmailPreview;
