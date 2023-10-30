import cn from 'classnames';
import { useState } from 'react';
import Balancer from 'react-wrap-balancer';

import { Blurs } from '@/components/ui/Blurs';
import Button from '@/components/ui/Button';
import { ListItem } from '@/components/ui/ListItem';
import { Segment } from '@/components/ui/Segment';
import { ContactWindow } from '@/components/user/ChatWindow';
import {
  DEFAULT_TIERS,
  PLACEHOLDER_ENTERPRISE_TIER,
  Tier,
} from '@/lib/stripe/tiers';

const PricingCard = ({
  tier,
  highlight,
  cta,
  ctaHref,
  contactCTA,
  onCtaClick,
  priceLabel,
}: {
  tier: Tier;
  highlight?: boolean;
  cta?: string;
  ctaHref?: string;
  contactCTA?: string;
  onCtaClick?: () => void;
  priceLabel?: string;
}) => {
  const [showAnnual, setShowAnnual] = useState(true);
  const hasMonthlyOption = !!tier.price?.monthly;

  return (
    <div
      className={cn(
        'relative flex w-full flex-col items-center gap-4 rounded-lg bg-neutral-1100 py-12 backdrop-blur',
        {
          'border border-neutral-900 shadow-2xl': !highlight,
          'shadow-box': highlight,
        },
      )}
    >
      {highlight && (
        <div className="absolute inset-0 z-[-1]">
          <div className="glow-border glow-border-fuchsia glow-border-founded-lg absolute inset-0 z-0 rounded-lg" />
        </div>
      )}
      <div className="absolute inset-0 rounded-lg bg-neutral-1100" />
      <h2 className="z-10 flex-none px-4 text-2xl font-semibold text-neutral-300 md:px-6">
        {tier.name}
      </h2>
      <div className="relative z-10 flex h-16 w-full flex-col items-center px-4 md:px-6">
        <p className="mt-0 text-center text-base text-neutral-500">
          {tier.description}
        </p>
        {hasMonthlyOption && (
          <div className="absolute -bottom-2 flex items-center">
            <div>
              <Segment
                size="sm"
                items={['Monthly', 'Yearly']}
                selected={showAnnual ? 1 : 0}
                id="billing-period"
                onChange={(i) => setShowAnnual(i === 1)}
              />
            </div>
          </div>
        )}
      </div>
      <div className="z-10 flex h-20 w-full items-center justify-center bg-neutral-900/0 px-4 sm:h-24 md:px-6">
        <div className="relative -mt-4 flex w-full flex-col items-center">
          <p className="text-[36px] font-semibold text-neutral-300 sm:text-[28px] md:text-[36px]">
            {priceLabel ?? (
              <>
                $
                {tier.price?.[
                  showAnnual || !hasMonthlyOption ? 'yearly' : 'monthly'
                ]?.amount || 0}
                <span className="text-base font-normal text-neutral-500">
                  /month
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="z-10 flex w-full flex-grow flex-col gap-1">
        <ul className="flex w-full flex-col gap-1 px-4 md:px-6">
          {tier.items?.map((item, i) => {
            return (
              <ListItem
                size="sm"
                variant="discreet"
                key={`pricing-${tier.name}-${i}`}
              >
                {item}
              </ListItem>
            );
          })}
        </ul>
      </div>
      <div className="z-10 mt-4 w-full px-4 md:px-6">
        {contactCTA ? (
          <ContactWindow
            closeOnClickOutside
            Component={
              <Button
                className="w-full"
                variant={highlight ? 'fuchsia' : 'plain'}
                href={undefined}
              >
                {contactCTA}
              </Button>
            }
          />
        ) : (
          <Button
            className="w-full"
            variant={highlight ? 'fuchsia' : 'plain'}
            href={ctaHref ?? (!onCtaClick ? '/signup' : undefined)}
            onClick={(e) => {
              e.preventDefault();
              onCtaClick?.();
            }}
          >
            {cta}
          </Button>
        )}
      </div>
    </div>
  );
};

const PricingSection = () => {
  return (
    <div className="relative flex flex-col items-center">
      <h2
        id="pricing"
        className="gradient-heading mt-40 pt-8 text-center text-4xl"
      >
        <Balancer>Pricing that scales as you grow</Balancer>
      </h2>
      <p className="mx-auto mt-4 max-w-screen-sm text-center text-lg text-neutral-500">
        Start for free, no credit card required.
      </p>
      <div className="relative mt-16 grid w-full max-w-screen-md grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-2">
        <Blurs />
        <PricingCard
          tier={DEFAULT_TIERS.find((t) => t.id === 'hobby')!}
          cta="Get started with Hobby"
          priceLabel="Free"
        />
        {/* <PricingCard
    tier={DEFAULT_TIERS.find((t) => t.id === 'starter')!}
    cta="Get started with Starter"
  /> */}
        {/* <PricingCard
    tier={DEFAULT_TIERS.find((t) => t.id === 'pro')!}
    highlight
    cta="Get started with Pro"
  /> */}
        <PricingCard
          tier={PLACEHOLDER_ENTERPRISE_TIER}
          contactCTA="Book a demo"
          priceLabel="Custom"
        />
      </div>
    </div>
  );
};

export default PricingSection;
