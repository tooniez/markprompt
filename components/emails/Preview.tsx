import { formatISO, parseISO } from 'date-fns';
import { FC, useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';

import Button from '@/components/ui/Button';
import { TemplateId, getTemplate } from '@/lib/email';

type EmailPreviewProps = {
  title: string;
  markdown: string;
  preview: string;
  date: string;
  templateId: TemplateId;
  emailId: string;
};

export const EmailPreview: FC<EmailPreviewProps> = ({
  title: subject,
  markdown,
  preview,
  date,
  templateId,
  emailId,
}) => {
  const [sending, setSending] = useState(false);
  const _date = parseISO(date);

  const Template = getTemplate(templateId);

  const sendBatch = useCallback(
    async (num = 0, processed = 0) => {
      console.debug(`Sending batch ${num}`);
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          markdown,
          preview,
          templateId,
          emailId,
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
        return;
      }

      const json = await res.json();
      console.debug('Response:', JSON.stringify(json, null, 2));
      if (json.done) {
        toast.error('Emails have been sent!');
      } else {
        await sendBatch(num + 1, processed + (json.emails || []).length);
      }
    },
    [_date, emailId, markdown, preview, subject, templateId],
  );

  return (
    <>
      <div className="relative flex min-h-screen w-full justify-center overflow-y-auto px-8 pt-8 pb-[200px]">
        <div className="fixed inset-0 z-0 bg-neutral-900" />
        <div className="z-10 w-full max-w-screen-lg overflow-hidden rounded-md bg-neutral-50 px-20 py-8 shadow-xl">
          <div className="mx-auto max-w-[480px] border border-dashed border-neutral-200 bg-white p-0 text-neutral-900">
            <Template date={_date} markdown={markdown} preview={preview} />
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
              await sendBatch();
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
