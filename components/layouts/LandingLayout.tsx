import React, { FC, ReactNode, createContext } from 'react';
import Balancer from 'react-wrap-balancer';

import Footer from '@/components/pages/Footer';
import { ManagedContactDialogContext } from '@/lib/context/contact-dialog';
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
  exludePostfixFromTitle?: boolean;
  animateNavbar?: boolean;
  children?: ReactNode;
};

const LandingLayoutWithoutContext: FC<LandingLayoutProps> = ({
  pageTitle,
  heading,
  subheading,
  stars,
  status,
  exludePostfixFromTitle,
  animateNavbar,
  children,
}) => {
  return (
    <>
      <SharedHead
        title={pageTitle}
        exludePostfixFromTitle={exludePostfixFromTitle}
      />
      <div className="relative flex w-full flex-col items-center justify-center">
        <MenuLarge animated={animateNavbar} />
      </div>
      {(heading || subheading) && (
        <LargeSection>
          <div className="relative grid grid-cols-1 pt-24 text-neutral-100 sm:grid-cols-2">
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

export const LandingLayout: FC<any> = (props) => {
  return (
    <ManagedContactDialogContext>
      <LandingLayoutWithoutContext {...props} />
    </ManagedContactDialogContext>
  );
};
