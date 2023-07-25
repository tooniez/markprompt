import {
  Button,
  Container,
  Column,
  Heading,
  Hr,
  Img,
  Link,
  Row,
  Section,
  Text,
} from '@react-email/components';
import { format } from 'date-fns';
import { FC } from 'react';

import { MarkdownContainer } from './MarkdownContainer';
import { Wrapper } from './Shared';

type MonthlyUpdateTemplateProps = {
  date: Date;
  markdown: string;
  preview: string;
  withHtml?: boolean;
};

export const SocialCard = ({
  name,
  cta,
  href,
  icon,
}: {
  name: string;
  cta: string;
  href: string;
  icon: string;
}) => {
  return (
    <>
      <Img
        className="mb-2 opacity-40"
        src={icon}
        width={20}
        height={20}
        alt={`${name} logo`}
      />
      <Link
        href={href}
        className="inline-block max-w-full truncate overflow-ellipsis whitespace-nowrap text-xs font-semibold text-neutral-900 underline"
      >
        {cta}
      </Link>
    </>
  );
};

export const MonthlyUpdateTemplate: FC<MonthlyUpdateTemplateProps> = ({
  date,
  markdown,
  preview,
  withHtml,
}) => {
  return (
    <Wrapper
      preview={preview}
      bodyClassName="my-auto mx-auto bg-white p-8 font-sans"
      withHtml={withHtml}
    >
      <Container className="mx-auto w-full max-w-[720px] bg-white">
        <Section>
          <Img
            src="https://res.cloudinary.com/djp21wtxm/image/upload/v1689959311/Email_u1tegg.png"
            width={50}
            height={50}
            alt="Markprompt logo"
          />
        </Section>
        <Heading className="mt-8 text-xl font-bold">
          Markprompt Update
          <span className="font-normal text-neutral-500">
            {' '}
            — {format(date, 'MMMM yyyy')}
          </span>
        </Heading>
        <Section className="prose prose-sm">
          <MarkdownContainer markdown={markdown} />
        </Section>
        <Hr className="mt-8 border-neutral-200" />
        <Section className="mt-8">
          <Row>
            <Column align="left">
              <SocialCard
                name="Twitter"
                cta="Follow on Twitter"
                href="https://twitter.com/markprompt"
                icon="https://res.cloudinary.com/djp21wtxm/image/upload/v1689902910/Twitter_ibapjo.png"
              />
            </Column>
            <Column align="left">
              <SocialCard
                name="Discord"
                cta="Discuss on Discord"
                href="https://discord.gg/MBMh4apz6X"
                icon="https://res.cloudinary.com/djp21wtxm/image/upload/v1689902910/Discord_dxo3pd.png"
              />
            </Column>
            <Column align="left">
              <SocialCard
                name="GitHub"
                cta="Fork on GitHub"
                href="https://github.com/motifland/markprompt"
                icon="https://res.cloudinary.com/djp21wtxm/image/upload/v1689902910/GitHub_rsxnul.png"
              />
            </Column>
          </Row>
        </Section>
        <Section className="mt-8">
          <Row>
            <Column className="text-sm font-semibold" align="left">
              Supercharge your content with AI
            </Column>
            <Column align="right">
              <Button
                pX={10}
                pY={10}
                className="flex-none rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white no-underline"
                href="https://markprompt.com"
              >
                Get started
              </Button>
            </Column>
          </Row>
        </Section>
        <Hr className="mt-8 border-neutral-200" />
        <Section className="mt-6 text-xs text-neutral-500">
          <Text>
            Motif Land Inc, 2261 Market Street #4059, San Francisco CA, 94114
          </Text>
          <Text>
            You are receiving this email because you signed up at{' '}
            <Link
              className="text-neutral-500 underline"
              href="https://markprompt.com"
            >
              markprompt.com
            </Link>
            .
          </Text>
        </Section>
        <Text>
          You are receiving this email because you signed up at{' '}
          <Link href="https://markprompt.com" className="underline">
            markprompt.com
          </Link>
          .{' '}
          <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}" className="underline">
            Unsubscribe
          </Link>
          .
        </Text>
      </Container>
    </Wrapper>
  );
};
