import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { FC, ReactNode, useState } from 'react';
import Balancer from 'react-wrap-balancer';

import { ContactSalesDialog } from '@/components/dialogs/public/ContactDialog';
import Footer from '@/components/pages/Footer';
import { MenuLarge } from '@/components/pages/sections/home/MenuLarge';
import { ButtonNormal } from '@/components/pages/sections/home/shared';
import { SharedHead } from '@/components/pages/SharedHead';
import { getIndexPageStaticProps } from '@/lib/pages';

export const getStaticProps: GetStaticProps = getIndexPageStaticProps;

const Card = ({
  title,
  description,
  cta,
  ctaHref,
  ctaAction,
  children,
}: {
  title: string;
  description: string;
  cta?: string;
  ctaHref?: string;
  ctaAction?: () => void;
  children?: ReactNode;
}) => {
  return (
    <div className="grid grid-cols-2 rounded-lg border border-neutral-900 bg-neutral-1000 shadow-2xl">
      <div className="flex flex-col items-start gap-4 p-6">
        <h2 className="text-2xl font-bold text-neutral-100">{title}</h2>
        <p className="text-base text-neutral-500">{description}</p>
        <ButtonNormal
          as={ctaHref ? 'Link' : 'button'}
          href={ctaHref}
          onClick={ctaAction}
        >
          {cta}
        </ButtonNormal>
      </div>
      <div className="p-2">
        <div className="h-full w-full rounded bg-neutral-950">{children}</div>
      </div>
    </div>
  );
};
const Pricing: FC<InferGetStaticPropsType<typeof getIndexPageStaticProps>> = ({
  stars,
  status,
}) => {
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  return (
    <>
      <SharedHead title="Pricing" />
      <div className="relative flex w-full flex-col items-center justify-center">
        <div className="absolute inset-x-0 top-0 z-0 flex h-[calc(100vh-200px)] bg-gradient-to-br from-neutral-1000 to-neutral-1100 antialiased sm:h-screen">
          <div className="home-dots absolute inset-0 z-0" />
          <div className="absolute inset-x-0 bottom-0 z-10 h-[400px] bg-gradient-to-t from-neutral-1100 to-neutral-1100/0" />
        </div>
        <MenuLarge onContactDialogOpen={() => setContactDialogOpen(true)} />
        <div className="relative z-10 mx-auto w-full max-w-screen-lg pt-32 text-neutral-100">
          <h1 className="pb-8 text-left text-3xl font-semibold text-neutral-100 sm:mt-20 sm:text-4xl md:-mr-8">
            <Balancer>Pricing tied to measurable outcomes</Balancer>
          </h1>
          <div className="mt-8 grid w-full grid-cols-2 gap-6">
            <Card
              title="Starter"
              description="To get started building"
              cta="Get started"
              ctaHref="/login"
            ></Card>
            <Card
              title="Enterprise"
              description="To get started building"
              cta="Contact sales"
              ctaAction={() => setContactDialogOpen(true)}
            ></Card>
          </div>
        </div>
      </div>
      <Footer stars={stars} status={status} />
      <ContactSalesDialog
        open={contactDialogOpen}
        setOpen={setContactDialogOpen}
      />
    </>
  );
};

export default Pricing;
