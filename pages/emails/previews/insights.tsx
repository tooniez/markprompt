import { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';
import { FC, useCallback, useState } from 'react';

import { PreviewWrapper } from '@/components/emails/PreviewWrapper';

// SSR = false to avoid hydration warnings.
const InsightsEmail = dynamic(() => import('@/components/emails/Insights'), {
  ssr: false,
});

export const getStaticProps: GetStaticProps = async () => {
  const tierId = 'hobby';
  return {
    props: {
      subject: 'Test subject',
      preview: 'Preview email text',
      tierId,
    },
    revalidate: 60,
  };
};

const PreviewPage: FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  subject,
  preview,
  tierId,
}) => {
  const [sending, setSending] = useState(false);
  // const _date = parseISO(date);

  const sendBatch = useCallback(async (num = 0, processed = 0) => {
    // console.debug(`Sending batch ${num}`);
    // const res = await fetch('/api/emails/send', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     subject,
    //     markdown,
    //     preview,
    //     templateId,
    //     emailId: EMAIL_ID,
    //     date: formatISO(_date),
    //   }),
    //   headers: {
    //     'Content-Type': 'application/json',
    //     accept: 'application/json',
    //   },
    // });
    // if (!res.ok) {
    //   console.error(await res.text());
    //   toast.error('Error sending emails, see console logs');
    //   return;
    // }
    // const json = await res.json();
    // console.debug('Response:', JSON.stringify(json, null, 2));
    // if (json.done) {
    //   toast.error('Emails have been sent!');
    // } else {
    //   await sendBatch(num + 1, processed + (json.emails || []).length);
    // }
  }, []);

  return (
    <PreviewWrapper
      title="Insights Email Preview"
      width="sm"
      onSendClick={async () => {
        setSending(true);
        await sendBatch();
        setSending(false);
      }}
      sending={sending}
      InfoPanel={
        <div
          className="grid w-full grid-cols-2 gap-y-2 gap-x-4 truncate text-sm"
          style={{
            gridTemplateColumns: 'auto 1fr',
          }}
        >
          <div>Subject</div>
          <div className="font-bold">{subject}</div>
          <div>Preview</div>
          <div className="font-bold">{preview}</div>
        </div>
      }
    >
      <InsightsEmail preview={preview} withHtml={false} tierId={tierId} />
    </PreviewWrapper>
  );
};

export default PreviewPage;
