import { useSession } from '@supabase/auth-helpers-react';
import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { FC, memo } from 'react';

import AppPage from '@/components/pages/App';
import LandingPage from '@/components/pages/Landing';

export interface RawDomainStats {
  timestamp: number;
}

const repo = 'https://api.github.com/repos/motifland/markprompt';

export const getStaticProps: GetStaticProps = async () => {
  const res = await fetch(repo);
  const json = await res.json();

  // Sometimes, the GitHub fetch call fails, so update the current star
  // count value regularly, as a fallback
  return {
    props: { stars: json.stargazers_count || 1600 },
    revalidate: 600,
  };
};

const Index: FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  stars,
}) => {
  const session = useSession();

  if (!session) {
    return <LandingPage stars={stars} />;
  } else {
    return <AppPage />;
  }
};

export default memo(Index);
