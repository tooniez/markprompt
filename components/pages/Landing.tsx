import { FC } from 'react';

import { SystemStatus } from '@/types/types';

import Footer from './Footer';
import { Agents } from './sections/home/Agents';
import { Companies } from './sections/home/Companies';
import { ExpertKnowledge } from './sections/home/ExpertKnowledge';
import { Hero } from './sections/home/Hero';
import { SharedHead } from './SharedHead';

type LandingPageProps = {
  stars: number;
  status: SystemStatus;
};

const LandingPage: FC<LandingPageProps> = ({ stars, status }) => {
  return (
    <>
      <SharedHead
        title="Markprompt | AI infrastructure for customer support"
        exludePostfixFromTitle
      />
      {/* <Hero />
      <div className="h-20 md:h-32" />
      <Companies />
      <div className="h-20 md:h-32" /> */}
      <Agents />
      {/* <div className="h-20 md:h-40" />
      <ExpertKnowledge /> */}

      <Footer stars={stars} status={status} />
    </>
  );
};

export default LandingPage;
