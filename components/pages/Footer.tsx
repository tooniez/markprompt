import Link from 'next/link';

// import { DiscordIcon } from '@/components/icons/Discord';
import { GitHubIcon } from '@/components/icons/GitHub';
import { XIcon } from '@/components/icons/X';
import { SystemStatus } from '@/types/types';

import { SystemStatusButton } from '../ui/SystemStatusButton';

const formatNumStars = (stars: number) => {
  if (stars > 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return stars;
};

const Footer = ({ stars, status }: { stars: number; status: SystemStatus }) => {
  return (
    <div className="relative z-0 mx-auto max-w-screen-xl pt-8 sm:pt-16">
      <div className="mt-16 grid grid-cols-1 items-center gap-8 border-t border-neutral-900/50 px-6 pt-12 pb-20 sm:px-8 sm:py-12 lg:grid-cols-3">
        <div className="flex flex-col items-center justify-center gap-6 text-sm text-neutral-500 sm:flex-row lg:justify-start">
          <SystemStatusButton status={status} />
          <div className="flex flex-row items-center justify-center gap-6 px-6 sm:justify-start sm:px-0">
            <Link className="home-ghost-button" href="/legal/terms">
              Terms
            </Link>
            <Link className="home-ghost-button" href="/legal/privacy">
              Privacy
            </Link>
            <a
              className="home-ghost-button"
              href="https://github.com/orgs/motifland/projects/3/views/3"
              rel="noreferrer"
              target="_blank"
            >
              Roadmap
            </a>
          </div>
        </div>
        <div className="hidden flex-row items-baseline justify-center gap-1 text-center text-sm text-neutral-500 lg:flex"></div>
        <div className="mr-0 flex flex-row items-center justify-center gap-4 text-neutral-700 lg:justify-end">
          <a
            className="home-button-ring group flex flex-row items-center gap-2 rounded-md border border-neutral-900 bg-neutral-1000 px-3 py-2 text-sm outline-none transition hover:bg-neutral-950"
            target="_blank"
            rel="noreferrer"
            aria-label={`Star on GitHub ${formatNumStars(stars)}`}
            href="https://github.com/motifland/markprompt"
          >
            <GitHubIcon className="h-4 w-4 text-neutral-300" />
            <span className="font-medium text-neutral-300">Star on GitHub</span>
            <span className="ml-2 text-neutral-500">
              {formatNumStars(stars)}
            </span>
          </a>
          <a
            className="home-icon-button"
            href="https://x.com/markprompt"
            aria-label="Follow Markprompt on Twitter"
            target="_blank"
            rel="noreferrer"
          >
            <XIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Footer;
