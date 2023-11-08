import cn from 'classnames';
import { ChevronLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { FC, JSXElementConstructor, ReactNode } from 'react';
import Balancer from 'react-wrap-balancer';

import { AlgoliaIcon } from '@/components/icons/brands/Algolia';
import { FrontIcon } from '@/components/icons/brands/Front';
import { HubSpotIcon } from '@/components/icons/brands/HubSpotIcon';
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

const Page = () => {
  return (
    <>
      <SharedHead
        title="Salesforce Case AI Drafts"
        ogImage="https://markprompt.com/static/cover-integrations.png"
      />
      <div className="relative mx-auto min-h-screen w-full">
        <Pattern />
        <div className="fixed top-0 left-0 right-0 z-30 h-24 bg-black/30 backdrop-blur">
          <div className="mx-auto max-w-screen-xl px-6 sm:px-8">
            <LandingNavbar noAnimation />
          </div>
        </div>
        <div className="relative mx-auto min-h-screen w-full max-w-screen-xl px-6 pb-48 sm:px-8">
          <div className="flex flex-row items-center gap-2 pt-32 text-left text-sm text-neutral-500 transition hover:text-neutral-400">
            <ChevronLeft className="h-4 w-4" />
            <Link href="/integrations">Back to integrations</Link>
          </div>
          <h1 className="gradient-heading mb-4 pt-16 text-center text-2xl sm:text-4xl">
            AI Draft Assistant for Salesforce Case
          </h1>
          <p className="mx-auto mt-4 max-w-screen-sm text-center text-neutral-500 sm:text-lg">
            <Balancer>
              Automatically draft replies in Salesforce Case, based on the
              current conversation and connected data sources.
            </Balancer>
          </p>
          <div className="not-prose mt-12 flex justify-center">
            <Button
              variant="cta"
              buttonSize="lg"
              aria-label="Install app"
              Icon={Download}
              href="https://login.salesforce.com/packaging/installPackage.apexp?p0=04tHn000000uNmAIAU"
              target="_blank"
              rel="noreferrer"
            >
              Install app
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Page;
