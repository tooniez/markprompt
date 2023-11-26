import cn from 'classnames';
import { FC, useState } from 'react';

import { SystemStatus } from '@/types/types';

import Footer from './Footer';
import { Agents } from './sections/home/Agents';
import { Companies } from './sections/home/Companies';
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

// const Overlay = ({visible}: {visible: boolean}) => {
//   return <div
//     className={cn('pointer-events-none fixed inset-0 z-20 transition', {
//       'opacity-0': !contactDialogOpen,
//       'opacity-100': contactDialogOpen,
//     })}
//   >
//     <div className="fixed inset-x-0 bottom-0 h-40 bg-gradient-to-t from-neutral-900 to-neutral-900/0"></div>
//     <div className="fixed inset-y-0 left-0 w-40 bg-gradient-to-r from-neutral-900 to-neutral-900/0"></div>
//     <div className="fixed inset-y-0 right-0 w-40 bg-gradient-to-l from-neutral-900 to-neutral-900/0"></div>
//   </div>;
// };

const LandingPage: FC<LandingPageProps> = ({ stars, status }) => {
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  return (
    <>
      <SharedHead
        title="Markprompt | AI infrastructure for customer support"
        exludePostfixFromTitle
      />
      <Hero onContactDialogOpen={() => setContactDialogOpen(true)} />
      <div className="h-20 md:h-32" />
      <Companies />
      <div className="h-20 md:h-32" />
      <Agents />
      <div className="h-20 md:h-40" />
      <ExpertKnowledge />
      {/* <Integrations /> */}

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
