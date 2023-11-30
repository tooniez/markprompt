import React, { FC, ReactNode, createContext, useState } from 'react';
import Balancer from 'react-wrap-balancer';

import { ContactSalesDialog } from '@/components/dialogs/public/ContactDialog';
import Footer from '@/components/pages/Footer';
import { useContactDialogContext } from '@/lib/context/contact-dialog';
import { SystemStatus } from '@/types/types';

import { LargeSection } from './Pages';
import { MenuLarge } from '../pages/sections/home/MenuLarge';
import { SharedHead } from '../pages/SharedHead';

export const MarkdocContext = createContext<any>(undefined);

type LandingLayoutProps = {
  pageTitle: string;
  heading?: string;
  subheading?: string;
  stars: number;
  status: SystemStatus;
  children?: ReactNode;
};

export const LandingLayout: FC<LandingLayoutProps> = ({
  pageTitle,
  heading,
  subheading,
  stars,
  status,
  children,
}) => {
  const { setContactDialogOpen } = useContactDialogContext();

  return (
    <>
      <SharedHead title={pageTitle} />
      <div className="relative flex w-full flex-col items-center justify-center">
        <MenuLarge onContactDialogOpen={() => setContactDialogOpen(true)} />
      </div>
      {(heading || subheading) && (
        <LargeSection>
          <div className="relative z-10 grid grid-cols-1 pt-24 text-neutral-100 sm:grid-cols-2">
            <div>
              {heading && (
                <h1 className="text-left text-3xl font-semibold text-neutral-100 sm:mt-20 sm:text-4xl sm:leading-[130%]">
                  <Balancer>{heading}</Balancer>
                </h1>
              )}
            </div>
          </div>
          {subheading && (
            <h2 className="text-left text-xl text-neutral-500 sm:mt-4 sm:text-2xl">
              <Balancer>{subheading}</Balancer>
            </h2>
          )}
        </LargeSection>
      )}
      {children}
      <Footer stars={stars} status={status} />
    </>
  );
};
