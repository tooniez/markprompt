import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { FC } from 'react';

import { BlogLayout } from '@/components/layouts/BlogLayout';
import { SharedHead } from '@/components/pages/SharedHead';
import { getMarkdocStaticProps } from '@/lib/pages';

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: { content: '' },
    revalidate: 60,
  };
  // return getMarkdocStaticProps(process.env.MOTIF_BLOG_PROMPT_PAGE_ID!);
};

const BlogPage: FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  content,
  toc,
}) => {
  return (
    <>
      <SharedHead
        title="Markprompt Blog"
        coverUrl="https://markprompt.com/static/cover-docs.png"
      />
      Hello
    </>
  );
};

export default BlogPage;
