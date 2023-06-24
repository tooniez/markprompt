import { useSession } from '@supabase/auth-helpers-react';
import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { FC, memo } from 'react';

import AppPage from '@/components/pages/App';
import LandingPage from '@/components/pages/Landing';

import { getSystemStatus } from './api/status';

export interface RawDomainStats {
  timestamp: number;
}

const repo = 'https://api.github.com/repos/motifland/markprompt';

export const getStaticProps: GetStaticProps = async () => {
  let stars = 1900;
  try {
    // Sometimes, the GitHub fetch call fails, so update the current star
    // count value regularly, as a fallback
    const json = await fetch(repo).then((r) => r.json());
    stars = json.stargazers_count || 1900;
  } catch {
    // Do nothing
  }

  const status = await getSystemStatus();

  return {
    props: { stars, status },
    revalidate: 60,
  };
};

const Index: FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  stars,
  status,
}) => {
  const session = useSession();

  if (!session) {
    return <LandingPage stars={stars} status={status} />;
  } else {
    return <AppPage />;
  }
};

export default memo(Index);
