import * as Slider from '@radix-ui/react-slider';
import { Application } from '@splinetool/runtime';
import cn from 'classnames';
import { MessageCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import Balancer from 'react-wrap-balancer';

import { AngeListIcon } from '@/components/icons/AngelList';
import { CalIcon } from '@/components/icons/Cal';
import { GitHubIcon } from '@/components/icons/GitHub';
import { MarkpromptIcon } from '@/components/icons/Markprompt';
import { MotifIcon } from '@/components/icons/Motif';
import { ReploIcon } from '@/components/icons/Replo';
import { TwitterIcon } from '@/components/icons/Twitter';
import LandingNavbar from '@/components/layouts/LandingNavbar';
import { Blurs } from '@/components/ui/Blurs';
import Button from '@/components/ui/Button';
import { Code } from '@/components/ui/Code';
import { Pattern } from '@/components/ui/Pattern';
import { CONFIG_DEFAULT_VALUES } from '@/lib/context/config';
import {
  modelLabels,
  PricedModel,
  TierDetails,
  TIERS,
} from '@/lib/stripe/tiers';
import { defaultTheme } from '@/lib/themes';
import { capitalize } from '@/lib/utils';

import StepsSection from './sections/Steps';
import { SharedHead } from './SharedHead';
import { AnalyticsExample } from '../examples/analytics';
import { Playground } from '../files/Playground';
import { DiscordIcon } from '../icons/Discord';
import { ListItem } from '../ui/ListItem';
import { Segment } from '../ui/Segment';
import { Tag } from '../ui/Tag';
import colors from 'tailwindcss/colors';

const demoPrompt = 'What is Markprompt?';

const demoResponse = `Markprompt is three things:

- A set of API endpoints that allow you to train your content and create a prompt to ask questions to it, for instance for a docs site.
- A [web dashboard](https://markprompt.com/) that makes it easy to do the above. The dashboard also allows you to set up syncing with a GitHub repo or a website, drag and drop files to train, manage access keys, and visualize stats on how users query your content.
- A set of UI components (currently [React](/docs#react) and [Web Component](#web-component)) that make it easy to integrate a prompt on your existing site.

Markprompt is [open source](https://github.com/motifland/markprompt), so you are free to host the dashboard and model backend on your own premises. We also warmly welcome [contributions](https://github.com/motifland/markprompt/pulls).`;

const demoReferenceIds = ['docs'];

const reactCode = `
import { Markprompt } from "markprompt"

function MyPrompt() {
  return <Markprompt model="gpt-4" />
}
`.trim();

const PricingCard = ({
  tier,
  model,
  highlight,
  cta,
  ctaHref,
  customPrice,
}: {
  tier: TierDetails;
  model: PricedModel;
  highlight?: boolean;
  cta: string;
  ctaHref?: string;
  customPrice?: string;
}) => {
  const [priceStep, setPriceStep] = useState(0);
  const [showAnnual, setShowAnnual] = useState(true);
  const hasMonthlyOption =
    tier.prices && tier.prices?.some((p) => p.price?.monthly);
  // const quotas = tier.prices[priceStep].quota;
  // const quotaModels = Object.keys(quotas) as PricedModel[];

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
      <h2 className="z-10 flex-none px-4 text-3xl font-semibold text-neutral-300 md:px-8">
        {tier.name}
      </h2>
      <div className="relative z-10 flex h-16 w-full flex-col items-center px-4 md:px-8">
        <p className="mt-0 text-center text-lg dark:text-neutral-500">
          {tier.description}
        </p>
        {hasMonthlyOption && (
          <div className="absolute -bottom-2 flex items-center">
            <div>
              <Segment
                size="sm"
                items={['Monthly', 'Annually']}
                selected={showAnnual ? 1 : 0}
                id="billing-period"
                onChange={(i) => setShowAnnual(i === 1)}
              />
            </div>
          </div>
        )}
      </div>
      <div className="z-10 flex h-20 w-full items-center justify-center bg-neutral-900/0 px-4 sm:h-24 md:px-8">
        {tier.prices && (
          <div className="relative -mt-4 flex w-full flex-col items-center">
            <p className="text-[44px] font-semibold text-neutral-300 sm:text-[32px] md:text-[44px]">
              {customPrice ?? (
                <>
                  $
                  {tier.prices[priceStep].price?.[
                    showAnnual || !hasMonthlyOption ? 'yearly' : 'monthly'
                  ]?.amount || 0}
                  <span className="text-base font-normal text-neutral-700">
                    /month
                  </span>
                </>
              )}
            </p>
            {/* <Flashing active={quotaModels.findIndex((m) => m === model)}>
              {quotaModels.map((model) => {
                return (
                  <p
                    key={`pricing-quota-${tier.name}-${priceStep}-${model}`}
                    className="rounded-full bg-sky-600/10 px-3 py-0.5 text-sm text-sky-500"
                  >
                    {formatNumQueries(quotas[model])}
                  </p>
                );
              })}
            </Flashing> */}
            <>
              {tier.prices.length > 1 && (
                <Slider.Root
                  onValueChange={([p]) => {
                    setPriceStep(p);
                  }}
                  className="absolute inset-x-4 -bottom-7 flex h-5 select-none items-center md:inset-x-8 md:mt-2"
                  defaultValue={[0]}
                  min={0}
                  max={tier.prices.length - 1}
                  step={1}
                  aria-label="Price"
                >
                  <Slider.Track className="relative h-1 flex-grow rounded-full bg-fuchsia-900/50">
                    <Slider.Range className="absolute h-full rounded-full bg-fuchsia-700" />
                  </Slider.Track>
                  <Slider.Thumb className="block h-4 w-4 rounded-full bg-white" />
                </Slider.Root>
              )}
            </>
          </div>
        )}
      </div>
      <div className="z-10 flex w-full flex-grow flex-col gap-1">
        <ul className="flex w-full flex-col gap-1 px-4 md:px-8">
          {tier.items.map((item, i) => {
            return (
              <ListItem variant="discreet" key={`pricing-${tier.name}-${i}`}>
                {typeof item === 'string' ? item : item[model]}
              </ListItem>
            );
          })}
        </ul>
        {tier.notes && (
          <ul className="mt-4 flex w-full flex-grow flex-col gap-1 px-4 md:px-8">
            {tier.notes.map((note, i) => {
              return (
                <li
                  className="text-xs text-neutral-500"
                  key={`note-${note}-${i}`}
                >
                  {note}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="z-10 mt-4 w-full px-4 md:px-8">
        <Button
          className="w-full"
          variant={highlight ? 'fuchsia' : 'plain'}
          href={ctaHref ?? '/signup'}
        >
          {cta}
        </Button>
      </div>
    </div>
  );
};

type LandingPageProps = {
  stars: number;
};

const useOnScreen = (ref: any) => {
  const [isIntersecting, setIntersecting] = useState(false);

  const observer = useMemo(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    return new IntersectionObserver(([entry]) =>
      setIntersecting(entry.isIntersecting),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  useEffect(() => {
    if (!ref.current || !observer) {
      return;
    }
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [observer, ref]);

  return isIntersecting;
};

const formatNumStars = (stars: number) => {
  if (stars > 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return stars;
};

const LandingPage: FC<LandingPageProps> = ({ stars }) => {
  const [model, setModel] = useState<PricedModel>('gpt-3.5-turbo');
  const playgroundAnchorRef = useRef<HTMLDivElement | null>(null);
  const isInputVisible = useOnScreen(playgroundAnchorRef);
  const [autoplayPlayground, setAutoplayPlayground] = useState(false);

  const modelNames = [
    modelLabels['gpt-3.5-turbo'],
    modelLabels['gpt-4'],
    modelLabels['byo'],
  ];

  useEffect(() => {
    if (isInputVisible) {
      setAutoplayPlayground(true);
    }
  }, [isInputVisible]);

  // useEffect(() => {
  //   const canvas: any = document.getElementById('animation-canvas');
  //   if (canvas) {
  //     const app = new Application(canvas);
  //     app.load('https://prod.spline.design/JjuAUS8iM07Bemju/scene.splinecode');
  //   }
  // }, []);

  return (
    <>
      <SharedHead title="Markprompt | Enterprise-grade AI chatbots for your website and docs" />
      {/* <div className="z-40 bg-fuchsia-700 py-1.5 px-6 sm:px-8">
        <Link
          href="/blog/markprompt-qa"
          className="mx-auto block max-w-screen-xl text-center text-xs font-medium transition hover:opacity-80"
        >
          Read our Q&A with Tom Johnson on the future of docs and how Markprompt
          fits in →
        </Link>
      </div> */}
      <div className="relative z-0 mx-auto min-h-screen max-w-screen-xl px-6 sm:px-8">
        <Pattern />
        <LandingNavbar />
        <div className="animate-slide-up">
          <div className="grid grid-cols-1 gap-8 sm:min-h-[calc(100vh-100px)] sm:grid-cols-5">
            <div className="col-span-3 mt-16 sm:mt-24">
              <Link href="/blog/introducing-website-sources">
                <Tag size="base" color="sky">
                  Introducing website sources →
                </Tag>
              </Link>
              <h1 className="gradient-heading mt-6 mr-[-50px] text-left text-4xl leading-[36px] tracking-[-0.6px] sm:text-6xl sm:leading-[64px]">
                <Balancer>
                  Enterprise-grade AI chatbots for your website and docs
                </Balancer>
              </h1>
              <p className="z-20 mt-8 mr-[40px] max-w-screen-md text-left text-base dark:text-neutral-500 sm:mt-4 sm:text-lg">
                <Balancer ratio={0.5}>
                  Connect any source of content, from public websites to private
                  GitHub repos, configure the design and tone, and paste the
                  code to your website. In minutes, you have a chatbot that
                  answers all your customers&apos; questions. If not, you will
                  get notified and can take action.
                </Balancer>
              </p>
              <div className="flex flex-col items-start justify-start gap-4 pt-8 sm:flex-row sm:items-center">
                <Button variant="cta" buttonSize="lg" href="/signup">
                  Start for free
                </Button>
                <div className="hidden sm:block">
                  <Button
                    variant="plain"
                    buttonSize="lg"
                    href="https://github.com/motifland/markprompt"
                    Icon={GitHubIcon}
                  >
                    Star on GitHub
                    <span className="ml-2 text-neutral-600">
                      {formatNumStars(stars)}
                    </span>
                  </Button>
                </div>
              </div>
              <p className="pt-8 text-left text-sm text-neutral-700 sm:pt-8 sm:text-base">
                Live with
              </p>
              <div className="flex flex-row items-center justify-start gap-8 overflow-x-auto pt-4 sm:items-center sm:gap-12 sm:pt-4">
                <CalIcon className="w-[72px] text-neutral-500 sm:w-[90px]" />
                <AngeListIcon className="w-[72px] text-neutral-500 sm:w-[90px]" />
                <ReploIcon className="w-[72px] text-neutral-500 sm:w-[90px]" />
              </div>
            </div>
            <div className="z-0 col-span-2 hidden h-full sm:block">
              <div className="animate-scale-bounce relative ml-[-100px] block h-[90%] w-[calc(100%+200px)] transform-gpu">
                <canvas id="animation-canvas" />
              </div>
            </div>
          </div>
          {/* <a
            href="https://twitter.com/markprompt"
            className="mx-auto mt-20 flex w-min flex-row items-center gap-2 whitespace-nowrap rounded-full bg-primary-900/20 px-4 py-1 text-sm font-medium text-primary-400 transition hover:bg-primary-900/30"
          >
            <TwitterIcon className="h-4 w-4" />
            Introducing Markprompt
          </a> */}
        </div>
      </div>
      <div className="grid-background-sm grid-background-dark relative z-0 mx-auto bg-neutral-1000 px-6 py-24 sm:px-8 sm:py-32">
        <div className="glow-border-founded-lg glow-border-white-alt glow-border relative mx-auto h-[500px] w-full max-w-screen-md rounded-lg">
          <div className="absolute inset-0 z-0 rounded-xl border-2 bg-transparent" />
          <Playground
            isDemoMode
            isDark={true}
            hideCloseButton
            theme={{
              ...defaultTheme,
              colors: {
                ...defaultTheme.colors,
                dark: {
                  ...defaultTheme.colors.dark,
                  border: '#ffffff10',
                },
              },
              dimensions: { radius: '8px' },
            }}
            playing={autoplayPlayground}
            demoPrompt={demoPrompt}
            demoResponse={demoResponse}
            demoReferenceIds={demoReferenceIds}
            placeholder={CONFIG_DEFAULT_VALUES.placeholder}
            iDontKnowMessage={CONFIG_DEFAULT_VALUES.iDontKnowMessage}
            referencesHeading={CONFIG_DEFAULT_VALUES.referencesHeading}
            loadingHeading={CONFIG_DEFAULT_VALUES.loadingHeading}
            getReferenceInfo={(id) => {
              return { name: capitalize(id), href: id };
            }}
          />
          <div
            ref={playgroundAnchorRef}
            className="pointer-events-none absolute right-0 bottom-32 h-2 w-2 opacity-0"
          />
        </div>
        <div className="mx-auto mt-8 flex w-full max-w-screen-md justify-end">
          <div className="rounded-full border border-sky-500 bg-sky-600 p-3 shadow">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
      <StepsSection />
      <div className="relative z-0 mx-auto min-h-screen max-w-screen-xl px-6 pt-24 sm:px-8">
        <h2 className="gradient-heading mt-64 text-center text-4xl">
          Track usage, get feedback, improve content
        </h2>
        <p className="mx-auto mt-4 max-w-screen-sm text-center text-lg dark:text-neutral-500">
          Your users will be asking lots of questions, and will be expecting
          quality answers. Use Markprompt&apos;s feedback and analytics features
          to pinpoint shortcomings in your content, and improve your content.
        </p>
        <div className="relative mt-20 h-[600px] w-full overflow-hidden rounded-lg border border-neutral-900">
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-8">
            <p className="flex flex-row items-center whitespace-nowrap rounded-full border border-neutral-800 bg-black/80 px-4 py-2 text-lg font-medium text-neutral-300">
              Coming soon!
            </p>
          </div>
          <div className="sticky inset-x-0 top-0 z-10 flex h-12 flex-none flex-row items-center gap-4 border-b border-neutral-900 px-4 py-2">
            <MarkpromptIcon className="ml-1 h-6 w-6 text-neutral-300" />
            <p className="text-sm text-neutral-500">Acme Inc</p>
          </div>
          <div className="absolute inset-x-0 top-12 bottom-0 z-0 grid w-full flex-grow grid-cols-4">
            <div className="hidden h-full flex-col gap-1 border-r border-neutral-900 px-3 py-3 text-sm text-neutral-500 sm:flex">
              <p className="rounded bg-neutral-900/50 px-2 py-1.5 text-white">
                Home
              </p>
              <p className="px-2 py-1.5">API Keys</p>
              <p className="px-2 py-1.5">Usage</p>
              <p className="px-2 py-1.5">Settings</p>
            </div>
            <div className="z-20 col-span-4 flex flex-col gap-6 p-8 sm:col-span-3">
              <AnalyticsExample />
            </div>
          </div>
        </div>
        <div className="relative flex flex-col items-center">
          <h2
            id="pricing"
            className="gradient-heading mt-40 pt-8 text-center text-4xl"
          >
            Generous free-tier, scale with usage
          </h2>
          <p className="mx-auto mt-4 max-w-screen-sm text-center text-lg dark:text-neutral-500">
            Start for free, no credit card required. Scale as you grow.
          </p>
          {/* <div className="relative mt-8">
            <Segment
              items={modelNames}
              selected={model === 'gpt-4' ? 1 : model === 'byo' ? 2 : 0}
              id="billing-period"
              onChange={(i) =>
                setModel(i === 0 ? 'gpt-3.5-turbo' : i === 1 ? 'gpt-4' : 'byo')
              }
            />
            <p
              className={cn(
                'absolute inset-x-0 -bottom-8 mt-4 transform text-center text-xs text-neutral-600 transition duration-500',
                {
                  'translate-y-0 opacity-100': model === 'byo',
                  'translate-y-1 opacity-0': model !== 'byo',
                },
              )}
            >
              * BYO: Bring your own API key
            </p>
          </div> */}
          <div className="relative mt-16 grid w-full max-w-screen-md grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Blurs />
            <PricingCard
              tier={TIERS.hobby}
              cta="Get started with Hobby"
              model={model}
              customPrice="Free"
            />
            {/* <PricingCard
              tier={TIERS.pro}
              highlight
              cta="Get started with Pro"
              model={model}
            /> */}
            <PricingCard
              tier={TIERS.enterprise}
              highlight
              cta="Contact Sales"
              ctaHref={`mailto:${process.env.NEXT_PUBLIC_SALES_EMAIL!}`}
              model={model}
              customPrice="Custom"
            />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h2 className="gradient-heading mt-40 text-center text-4xl">
            Open source
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center text-lg dark:text-neutral-500">
            The source code is on GitHub, for you to review, run, and contribute
            to if you like!
          </p>
          <div className="mt-12">
            <Button
              variant="plain"
              buttonSize="lg"
              href="https://github.com/motifland/markprompt"
              Icon={GitHubIcon}
            >
              Star on GitHub
              <span className="ml-2 text-neutral-600">
                {formatNumStars(stars)}
              </span>
            </Button>
          </div>
        </div>
        <div className="mt-48 grid grid-cols-1 gap-8 border-t border-neutral-900/50 px-6 pt-12 pb-20 sm:grid-cols-3 sm:py-12 sm:px-8">
          <div></div>
          <div className="flex flex-row items-baseline justify-center gap-1 text-center text-sm text-neutral-500">
            Built by the{' '}
            <MotifIcon className="inline-block h-4 w-4 translate-y-[3px] transform text-neutral-300" />
            <a
              className="border-b border-dotted border-neutral-700 text-neutral-300"
              href="https://motif.land"
            >
              Motif
            </a>{' '}
            team
          </div>
          <div className="mr-0 flex flex-row items-center justify-center gap-4 text-neutral-700 sm:mr-12 sm:justify-end xl:mr-0">
            <a
              className="transition hover:text-neutral-500"
              href="https://github.com/motifland/markprompt"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>
            <a
              className="transition hover:text-neutral-500"
              href="https://twitter.com/markprompt"
            >
              <TwitterIcon className="h-5 w-5" />
            </a>
            <a
              className="transition hover:text-neutral-500"
              href="https://discord.gg/MBMh4apz6X"
            >
              <DiscordIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingPage;
