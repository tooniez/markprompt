import { useSession } from '@supabase/auth-helpers-react';
import cn from 'classnames';
import Link from 'next/link';

import { DiscordIcon } from '../icons/Discord';
import { GitHubIcon } from '../icons/GitHub';
import { MarkpromptIcon } from '../icons/Markprompt';
import { DocsPrompt } from '../ui/DocsPrompt';

export default function LandingNavbar({
  noAnimation,
}: {
  noAnimation?: boolean;
}) {
  const session = useSession();

  return (
    <div
      className={cn('flex h-24 flex-row items-center gap-6 py-8', {
        'animate-slide-down-delayed': !noAnimation,
      })}
    >
      <div className="flex flex-none flex-row items-center gap-4 text-white">
        <a href="https://motif.land">
          <MarkpromptIcon className="mx-auto h-10 w-10 text-white" />
          {/* <MotifIcon className="h-8 w-8 select-none text-neutral-100" /> */}
        </a>{' '}
        <Link
          href="/"
          className="text-lg font-semibold transition hover:opacity-80"
        >
          Markprompt
        </Link>
      </div>
      <div className="flex-grow" />
      <Link
        className="hidden transform whitespace-nowrap text-sm font-medium text-white opacity-60 hover:opacity-100 md:block"
        href="/#pricing"
      >
        Pricing
      </Link>
      <Link
        className="hidden transform whitespace-nowrap text-sm font-medium text-white opacity-60 hover:opacity-100 sm:block"
        href="/blog"
      >
        Blog
      </Link>
      <Link
        className="hidden transform whitespace-nowrap text-sm font-medium text-white opacity-60 hover:opacity-100 sm:block"
        href="/docs"
      >
        Docs
      </Link>
      <DocsPrompt>
        <button
          className="hidden transform whitespace-nowrap text-sm font-medium text-white opacity-60 outline-none hover:opacity-100 sm:block"
          aria-label="Ask docs"
        >
          Ask docs...
        </button>
      </DocsPrompt>

      {session ? (
        <Link
          className="button-glow flex flex-row items-center gap-3 rounded-md px-4 py-2 text-sm font-semibold transition dark:bg-white dark:text-neutral-900 hover:dark:bg-neutral-300"
          href="/"
        >
          Go to app
        </Link>
      ) : (
        <>
          <Link
            className="hidden transform whitespace-nowrap text-sm font-medium text-white opacity-60 hover:opacity-100 sm:block"
            href="/signup"
          >
            Sign up
          </Link>
          <Link
            className="button-glow flex flex-row items-center gap-3 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition dark:bg-white dark:text-neutral-900 hover:dark:bg-neutral-300"
            href="/login"
          >
            Sign in
          </Link>
        </>
      )}
      <a
        className="hidden transform text-sm font-medium text-white opacity-60 hover:opacity-100 md:block"
        href="https://github.com/motifland/markprompt"
      >
        <GitHubIcon className="h-5 w-5" />
      </a>
      <a
        className="hidden transform text-sm font-medium text-white opacity-60 hover:opacity-100 md:block"
        href="https://discord.gg/MBMh4apz6X"
      >
        <DiscordIcon className="h-5 w-5" />
      </a>
    </div>
  );
}
