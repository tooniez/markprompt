import { InferGetStaticPropsType } from 'next';
import { FC } from 'react';

import LandingPage from '@/components/pages/Landing';

import { getStaticProps as _getStaticProps } from './index';

export const getStaticProps = _getStaticProps;

const Home: FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  stars,
  status,
}) => {
  return <LandingPage stars={stars} status={status} />;
};

export default Home;
