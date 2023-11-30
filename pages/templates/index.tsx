import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { FC } from 'react';

import LandingPage from '@/components/pages/Landing';
import { getIndexPageStaticProps } from '@/lib/pages';

type Template = {
  name: number;
  slug: number;
};

export const getStaticProps = (async (context) => {
  const res = await fetch(
    'https://api.github.com/repos/motifland/examples/git/trees/main',
    {
      method: 'GET',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
        accept: 'application/vnd.github+json',
      },
    },
  );
  const repo = await res.json();

  return { props: { examples: [] } };
}) satisfies GetStaticProps<{
  examples: Template[];
}>;

const Templates: FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  examples,
}) => {
  return <div>Examples</div>;
  // return <LandingPage stars={stars} status={status} />;
};

export default Templates;
