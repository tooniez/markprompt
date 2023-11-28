import cn from 'classnames';
import { FC, useState } from 'react';

import { SystemStatus } from '@/types/types';

import Footer from './Footer';
import { Agents } from './sections/home/Agents';
import { Companies } from './sections/home/Companies';
import { Developers } from './sections/home/Developers';
import { ExpertKnowledge } from './sections/home/ExpertKnowledge';
import { Hero } from './sections/home/Hero';
import { Integrations } from './sections/home/Integrations';
import { Ready } from './sections/home/Ready';
import { SharedHead } from './SharedHead';
import { ContactSalesDialog } from '../dialogs/public/ContactDialog';

type LandingPageProps = {
  stars: number;
  status: SystemStatus;
};

const LandingPage: FC<LandingPageProps> = ({ stars, status }) => {
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  return (
    <>
      <SharedHead
        title="Markprompt | AI for customer support"
        exludePostfixFromTitle
      />
      <Hero onContactDialogOpen={() => setContactDialogOpen(true)} />
      <div className="h-20 md:h-32" />
      <Companies />
      <div className="h-20 md:h-32" />
      <Agents />
      <div className="h-20 md:h-40" />
      <ExpertKnowledge />
      <div className="h-20 md:h-40" />
      <Integrations />
      <Developers />
      <div className="h-20 md:h-40" />
      <Ready onContactDialogOpen={() => setContactDialogOpen(true)} />
      <Footer stars={stars} status={status} />
      <ContactSalesDialog
        open={contactDialogOpen}
        setOpen={setContactDialogOpen}
      />
    </>
  );
};

export default LandingPage;
