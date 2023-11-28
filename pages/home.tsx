import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { FC, useState } from 'react';

import { ContactSalesDialog } from '@/components/dialogs/public/ContactDialog';
import Footer from '@/components/pages/Footer';
import { Agents } from '@/components/pages/sections/home/Agents';
import { Companies } from '@/components/pages/sections/home/Companies';
import { Developers } from '@/components/pages/sections/home/Developers';
import { ExpertKnowledge } from '@/components/pages/sections/home/ExpertKnowledge';
import { Hero } from '@/components/pages/sections/home/Hero';
import { Integrations } from '@/components/pages/sections/home/Integrations';
import { Ready } from '@/components/pages/sections/home/Ready';
import { SharedHead } from '@/components/pages/SharedHead';
import { getIndexPageStaticProps } from '@/lib/pages';

export const getStaticProps: GetStaticProps = getIndexPageStaticProps;

const Home: FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  stars,
  status,
}) => {
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
      <div className="h-20 md:h-40" />
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

export default Home;
