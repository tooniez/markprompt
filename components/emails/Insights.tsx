import { Container, Heading, Img, Section } from '@react-email/components';
import { FC } from 'react';

import { Tier } from '@/lib/stripe/tiers';

import { Wrapper } from './templates/Shared';

type InsightsEmailProps = {
  preview: string;
  withHtml: boolean;
  tierId: Tier['id'];
};

const getPlanName = (tierId: Tier['id']) => {
  switch (tierId) {
    case 'hobby':
      return 'Free plan';
    case 'starter':
      return 'Starter plan';
    case 'pro':
      return 'Pro plan';
    case 'placeholder-enterprise':
      return 'Enterprise plan';
    case 'custom':
      return 'Custom plan';
  }
};

// We create the email component as a standalone component, instead of
// creating it in the page itself, to avoid hydration errors (we
// import the component dynamically with SSR = false).
export const InsightsEmail: FC<InsightsEmailProps> = ({
  preview,
  withHtml,
  tierId,
}) => {
  return (
    <Wrapper
      preview={preview}
      bodyClassName="my-auto mx-auto bg-white p-8 font-sans"
      withHtml={withHtml}
    >
      <Container className="mx-auto w-full max-w-[720px] border-separate p-8">
        <Section>
          <Img
            src="https://res.cloudinary.com/djp21wtxm/image/upload/v1689959311/Email_u1tegg.png"
            width={50}
            height={50}
            alt="Markprompt logo"
          />
        </Section>
        <Heading className="mt-8 text-xl font-bold">Weekly report</Heading>
        <Heading className="mt-8 text-lg font-bold">Usage</Heading>
        <Heading className="mt-2 text-sm">{getPlanName(tierId)}</Heading>
      </Container>
    </Wrapper>
  );
};

export default InsightsEmail;
