import { promises as fs } from 'fs';
import path from 'path';

import { formatISO } from 'date-fns';
import matter from 'gray-matter';
import { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';
import { FC } from 'react';

import { SharedHead } from '@/components/pages/SharedHead';

// SSR: false to avoid hydration warnings.
const EmailPreview = dynamic(() => import('@/components/emails/Preview'), {
  ssr: false,
});

export const getStaticProps: GetStaticProps = async () => {
  const postsDirectory = path.join(process.cwd(), 'resources/newsletters');
  const filePath = path.join(postsDirectory, '2023-07-21-algolia.md');
  const _matter = matter(await fs.readFile(filePath, 'utf8'));
  const frontmatter = _matter.data;
  const markdown = _matter.content.trim();

  return {
    props: {
      markdown,
      title: frontmatter?.title,
      preview: frontmatter?.preview,
      date: formatISO(frontmatter?.date),
      templateId: frontmatter.template,
    },
    revalidate: 60,
  };
};

const PreviewPage: FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  title,
  markdown,
  preview,
  date,
  templateId,
}) => {
  return (
    <>
      <SharedHead title="Email Preview" />
      <EmailPreview
        title={title}
        markdown={markdown}
        preview={preview}
        date={date}
        templateId={templateId}
      />
    </>
  );
};

export default PreviewPage;
