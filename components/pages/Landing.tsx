import * as Slider from '@radix-ui/react-slider';
import Spline from '@splinetool/react-spline';
import cn from 'classnames';
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

import { SharedHead } from './SharedHead';
import { AnalyticsExample } from '../examples/analytics';
import { Playground } from '../files/Playground';
import { DiscordIcon } from '../icons/Discord';
import { ListItem } from '../ui/ListItem';
import { Segment } from '../ui/Segment';

const demoPrompt = 'How do I publish a component?';

const demoResponse = `To publish a component on Acme, follow these steps:

- At the root of your project, open or create a file named \`index.js\`, and add the following lines (you can add as many components as you need):

\`\`\`js
import Component1 from "/path/to/component1
import Component2 from "/path/to/component2

export {
  Component1,
  Component2,
  // ...
}
\`\`\`

- Then, head over to the Component Library, accessible via the sidebar.
- Navigate to the Publish tab, and set a new semantic version. It must be higher than the previous one.
- Hit "Publish".
`;

const demoReferences = ['Getting Started', 'Publishing', 'Components'];

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
        'flex w-full flex-col items-center gap-4 rounded-lg bg-black/50 py-12 backdrop-blur',
        {
          'border border-neutral-900 shadow-2xl': !highlight,
          'shadow-box border border-fuchsia-900': highlight,
        },
      )}
    >
      <h2 className="flex-none px-4 text-3xl font-semibold text-neutral-300 md:px-8">
        {tier.name}
      </h2>
      <div className="relative flex h-16 w-full flex-col items-center px-4 md:px-8">
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
      <div className="flex h-20 w-full items-center justify-center bg-neutral-900/0 px-4 sm:h-24 md:px-8">
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
      <div className="flex w-full flex-grow flex-col gap-1">
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
      <div className="mt-4 w-full px-4 md:px-8">
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
            <div className="col-span-3">
              <h1 className="gradient-heading mt-16 text-left text-4xl leading-[36px] tracking-[-0.6px] sm:mt-28 sm:text-6xl sm:leading-[64px]">
                <Balancer>
                  Enterprise-grade AI chatbots for your website and docs
                </Balancer>
              </h1>
              <p className="z-20 mx-auto mt-8 max-w-screen-md text-left text-base dark:text-neutral-500 sm:mt-4 sm:text-lg">
                Connect any source of content, from public websites to private
                GitHub repos, configure the design and tone, and paste the code
                to your website. In minutes, you have a chatbot that answers all
                your customers&apos; questions. If not, you will get notified
                and can take action.
              </p>
              <div className="flex flex-col items-start justify-start gap-4 pt-8 sm:flex-row sm:items-center">
                <Button variant="cta" buttonSize="lg" href="/signup">
                  Start for free
                </Button>
                <Button
                  className="hidden sm:block"
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
              <p className="pt-8 text-left text-sm text-neutral-700 sm:pt-16 sm:text-base">
                Live with
              </p>
              <div className="flex flex-row items-center justify-start gap-8 overflow-x-auto pt-4 sm:items-center sm:gap-12 sm:pt-6">
                <CalIcon className="w-[72px] text-neutral-500 sm:w-[90px]" />
                <AngeListIcon className="w-[72px] text-neutral-500 sm:w-[90px]" />
                <ReploIcon className="w-[72px] text-neutral-500 sm:w-[90px]" />
              </div>
            </div>
            <div className="relative z-0 col-span-2 hidden h-full sm:block">
              <div className="absolute top-0 bottom-0 left-[-100px] right-[-100px] mt-[-30%] overflow-visible">
                <Spline scene="https://prod.spline.design/JjuAUS8iM07Bemju/scene.splinecode" />
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

          <div className="shadow-box relative mx-auto mt-24 h-[500px] w-full max-w-screen-sm overflow-hidden rounded-2xl shadow-primary-500/10">
            <Playground
              isDemoMode
              isDark={true}
              theme={{ ...defaultTheme, dimensions: { radius: '16px' } }}
              playing={autoplayPlayground}
              demoPrompt={demoPrompt}
              demoResponse={demoResponse}
              demoReferences={demoReferences}
              placeholder={CONFIG_DEFAULT_VALUES.placeholder}
              iDontKnowMessage={CONFIG_DEFAULT_VALUES.iDontKnowMessage}
              referencesHeading={CONFIG_DEFAULT_VALUES.referencesHeading}
              loadingHeading={CONFIG_DEFAULT_VALUES.loadingHeading}
              getReferenceInfo={(id) => {
                return { name: id, href: undefined };
              }}
            />
            <div
              ref={playgroundAnchorRef}
              className="pointer-events-none absolute right-0 bottom-32 h-2 w-2 opacity-0"
            />
          </div>
          <h2 className="gradient-heading mt-40 text-center text-4xl">
            As easy as 1, 2
          </h2>
          <p className="mx-auto mt-4 max-w-screen-md text-center text-lg dark:text-neutral-500">
            Sync your Markdown/Markdoc/MDX/HTML/text files from a GitHub repo or
            a website, drag and drop them in the dashboard, or upload them
            programmatically. Wait a little for the training to complete, then
            use our React component, or fetch completions via our streaming API.
            Use the model that suits your needs—all OpenAI{' '}
            <a
              href="https://platform.openai.com/docs/models/moderation"
              className="subtle-underline"
            >
              completion models
            </a>{' '}
            are supported, including GPT-4.
          </p>
          <div className="mt-12 grid grid-cols-1 items-center justify-center gap-12 sm:grid-cols-2 sm:gap-0">
            <div className="flex h-full flex-col items-center">
              <div className="flex w-full flex-grow sm:px-12">
                <div className="mx-auto flex flex-grow items-center justify-center rounded-lg border border-neutral-900 bg-neutral-1000 px-4 py-12 text-sm">
                  <div className="pointer-events-none flex flex-row items-center gap-2  sm:flex-col md:flex-row">
                    <div className="flex flex-grow flex-row items-center gap-4 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 pr-8">
                      <GitHubIcon className="h-4 w-4 flex-none text-neutral-600" />
                      <p className="flex-grow truncate text-neutral-300 ">
                        github.com/acme/docs
                      </p>
                    </div>
                    <div className="button-glow-color flex-none rounded-md border-transparent bg-fuchsia-600 px-4 py-2 text-center text-white sm:w-full md:w-min">
                      Train
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative flex h-32 w-full flex-none flex-col items-center">
                <div className="absolute right-0 z-0 h-[48px] w-1/2 border-b border-dashed border-neutral-800" />
                <div className="absolute top-0 left-0 z-0 h-[48px] w-1/2 border-b border-dashed border-neutral-800" />
                <div className="absolute left-0 z-10 h-[54px] w-1/2 bg-gradient-to-l from-neutral-1100/0 to-neutral-1100" />
                <div className="h-[40px] border-r border-dashed border-neutral-800" />
                <div className="z-20 h-4 w-4 rounded-full border-4 border-neutral-800 bg-neutral-300" />
                <div className="relative mt-4 flex w-full flex-none flex-col items-center font-medium text-neutral-300">
                  Train
                  <p className="absolute inset-x-0 top-6 mx-auto mt-2 h-20 max-w-xs text-center text-sm font-normal text-neutral-500">
                    <Balancer ratio={0.5}>
                      Sync a GitHub repo, drag and drop files, or post via HTTP.
                    </Balancer>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex h-full flex-col items-center">
              <div className="flex w-full flex-grow px-0 sm:px-12">
                <div className="mx-auto flex w-full items-center justify-center overflow-hidden rounded-lg border border-neutral-900 bg-neutral-1000 px-4 py-12 text-sm">
                  <Code
                    className="code-small-md"
                    language="jsx"
                    code={reactCode}
                  />
                </div>
              </div>
              <div className="relative flex h-32 w-full flex-none flex-col items-center">
                <div className="absolute top-0 left-0 z-0 h-[48px] w-1/2 border-b border-dashed border-neutral-800" />
                <div className="absolute top-0 right-0 z-0 h-[48px] w-1/2 border-b border-dashed border-neutral-800" />
                <div className="absolute right-0 z-10 h-[54px] w-1/2 bg-gradient-to-r from-neutral-1100/0 to-neutral-1100" />
                <div className="h-[40px] border-r border-dashed border-neutral-800" />
                <div className="z-20 h-4 w-4 rounded-full border-4 border-neutral-800 bg-neutral-300" />
                <div className="relative mt-4 flex w-full flex-none flex-col items-center font-medium text-neutral-300">
                  Prompt
                  <p className="absolute inset-x-0 top-6 mx-auto mt-2 h-20 max-w-xs text-center text-sm font-normal text-neutral-500">
                    Use the{' '}
                    <a
                      className="subtle-underline"
                      href="https://github.com/motifland/markprompt-js"
                    >
                      Markprompt React or Web component
                    </a>
                    , or fetch via a readable stream.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <h2 className="gradient-heading mt-40 text-center text-4xl">
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
