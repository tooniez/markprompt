import Head from 'next/head';
import { FC } from 'react';

type SharedHeadProps = {
  title: string;
  description?: string;
  ogImage?: string;
};

export const SharedHead: FC<SharedHeadProps> = ({
  title,
  description,
  ogImage,
}) => {
  const _ogImage = ogImage ?? 'https://markprompt.com/static/cover.png';
  return (
    <Head>
      <title>{title}</title>
      <meta property="og:title" content="Markprompt" />
      <meta
        name="description"
        content={
          description || 'AI infrastructure for customer experience teams'
        }
        key="desc"
      />
      <meta
        property="og:description"
        content={
          description || 'AI infrastructure for customer experience teams'
        }
      />

      <meta property="og:url" content="https://markprompt.com/" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:image" content={_ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="markprompt.com" />
      <meta property="twitter:url" content="https://markprompt.com/" />
      <meta name="twitter:title" content={title} />
      <meta
        name="twitter:description"
        content={
          description || 'AI infrastructure for customer experience teams'
        }
      />
      <meta name="twitter:image" content={_ogImage} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Head>
  );
};
