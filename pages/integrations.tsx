import cn from 'classnames';
import Link from 'next/link';
import { FC, JSXElementConstructor, ReactNode } from 'react';
import Balancer from 'react-wrap-balancer';

import { AlgoliaIcon } from '@/components/icons/brands/Algolia';
import { FrontIcon } from '@/components/icons/brands/Front';
import { HubspotIcon } from '@/components/icons/brands/Hubspot';
import { JiraIcon } from '@/components/icons/brands/Jira';
import { NotionIcon } from '@/components/icons/brands/Notion';
import { SalesforceIcon } from '@/components/icons/brands/Salesforce';
import { SlackIcon } from '@/components/icons/brands/Slack';
import { ZendeskIcon } from '@/components/icons/brands/Zendesk';
import { DiscordIcon } from '@/components/icons/Discord';
import { GitHubIcon } from '@/components/icons/GitHub';
import LandingNavbar from '@/components/layouts/LandingNavbar';
import { SharedHead } from '@/components/pages/SharedHead';
import Button from '@/components/ui/Button';
import { Pattern } from '@/components/ui/Pattern';
import { Tag } from '@/components/ui/Tag';
import { ContactWindow } from '@/components/user/ChatWindow';

type IntegrationSpec = {
  name: string;
  description: string;
  Icon: JSXElementConstructor<any>;
  status?: 'dev' | 'soon';
  href?: string;
};

const integrations: IntegrationSpec[] = [
  {
    name: 'GitHub',
    description: 'Sync files in your repo',
    Icon: GitHubIcon,
  },
  {
    name: 'Salesforce Knowledge',
    description: 'Sync your knowledge articles',
    Icon: SalesforceIcon,
  },
  {
    name: 'Salesforce Case',
    description: 'Sync your cases',
    Icon: SalesforceIcon,
  },
  {
    name: 'Zendesk Articles',
    description: 'Sync your knowledge articles',
    Icon: ZendeskIcon,
    status: 'dev',
  },
  {
    name: 'Zendesk Drafts',
    description: 'Automatically draft customer replies',
    Icon: ZendeskIcon,
  },
  {
    name: 'Zendesk Bot',
    description: 'Answer customers automatically',
    Icon: ZendeskIcon,
    status: 'soon',
  },
  {
    name: 'Atlassian Jira',
    description: 'Sync your knowledge articles',
    Icon: JiraIcon,
    status: 'dev',
  },
  {
    name: 'Front Drafts',
    description: 'Automatically draft customer replies',
    Icon: FrontIcon,
    status: 'soon',
  },
  {
    name: 'Notion',
    description: 'Sync your workspace pages',
    Icon: NotionIcon,
  },
  {
    name: 'Hubspot',
    description: 'Sync your knowledge articles',
    Icon: HubspotIcon,
    status: 'soon',
  },
  {
    name: 'Algolia',
    description: 'Combine LLM prompts with instant search',
    Icon: AlgoliaIcon,
    href: '/blog/algolia',
  },
  {
    name: 'Discord',
    description: 'Answer customers automatically',
    Icon: DiscordIcon,
  },
  {
    name: 'Slack',
    description: 'Answer customers automatically',
    Icon: SlackIcon,
    status: 'dev',
  },
];

const Card: FC<IntegrationSpec> = ({
  name,
  description,
  status,
  href,
  Icon,
}) => {
  const Comp = href
    ? ({ className, children }: { className: string; children: ReactNode }) => {
        return (
          <Link
            className={cn(
              className,
              'no-underline transition hover:bg-neutral-1000',
            )}
            href={href}
          >
            {children}
          </Link>
        );
      }
    : 'div';

  return (
    <Comp className="not-prose rounded-md border border-neutral-900 p-6">
      <div className="flex flex-row items-center gap-4">
        <div className="flex h-12 flex-none items-center justify-center">
          <Icon className="w-8 flex-none text-white" />
        </div>
        <div className="flex flex-col gap-1 overflow-hidden">
          <h3 className="overflow-hidden truncate whitespace-nowrap text-base font-semibold text-neutral-100">
            {name}
          </h3>
          {status && (
            <Tag color={status === 'dev' ? 'orange' : 'sky'}>
              {status === 'dev' ? 'In development' : 'Soon'}
            </Tag>
          )}
        </div>
      </div>
      <h3 className="mt-4 text-sm font-normal text-neutral-500">
        {description}
      </h3>
    </Comp>
  );
};

const Integrations = () => {
  return (
    <>
      <SharedHead
        title="Integrations"
        ogImage="https://markprompt.com/static/cover-integrations.png"
      />
      <div className="relative mx-auto min-h-screen w-full">
        <Pattern />
        <div className="fixed top-0 left-0 right-0 z-30 h-24 bg-black/30 backdrop-blur">
          <div className="mx-auto max-w-screen-xl px-6 sm:px-8">
            <LandingNavbar noAnimation />
          </div>
        </div>
        <div className="prose prose-invert relative mx-auto min-h-screen w-full max-w-screen-xl px-6 pt-40 pb-48 sm:px-8">
          <h1 className="gradient-heading mb-4 text-center text-3xl leading-[36px] tracking-[-0.6px] sm:text-5xl sm:leading-[64px]">
            Integrations
          </h1>
          <p className="mx-auto mt-4 max-w-screen-sm text-center text-lg text-neutral-500 sm:text-xl">
            <Balancer>
              Connect data sources and deploy across all distribution channels
              using integrations with your existing tools.
            </Balancer>
          </p>
          <div className="mt-12 flex justify-center">
            <ContactWindow
              closeOnClickOutside
              Component={
                <Button
                  variant="cta"
                  buttonSize="lg"
                  aria-label="Request integration"
                >
                  Request integration
                </Button>
              }
            />
          </div>
          <div className="mx-auto mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {integrations.map((integration, i) => {
              return <Card key={`${integration.name}-${i}`} {...integration} />;
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Integrations;
