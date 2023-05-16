import { useSession } from '@supabase/auth-helpers-react';
import cn from 'classnames';
import Link from 'next/link';

import emitter, { EVENT_OPEN_CHAT } from '@/lib/events';

import { DiscordIcon } from '../icons/Discord';
import { GitHubIcon } from '../icons/GitHub';
import { MarkpromptIcon } from '../icons/Markprompt';

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
        <Link href="/">
          <MarkpromptIcon className="mx-auto h-10 w-10 text-white" />
        </Link>{' '}
        <Link
          href="/"
          className="hidden text-lg font-semibold transition hover:opacity-80 lg:block"
        >
          Markprompt
        </Link>
      </div>
      <div className="flex-grow" />
      <Link
        className="hidden transform whitespace-nowrap text-sm font-medium text-white opacity-60 hover:opacity-100 sm:block"
        href="/resources/overview"
      >
        Why Markprompt
      </Link>
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
      {/* <DocsPrompt> */}
      <button
        onClick={() => emitter.emit(EVENT_OPEN_CHAT)}
        className="hidden transform whitespace-nowrap text-sm font-medium text-white opacity-60 outline-none hover:opacity-100 sm:block"
        aria-label="Ask docs"
      >
        Contact us
      </button>
      {/* </DocsPrompt> */}

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
        className="hidden transform text-sm font-medium text-white opacity-60 hover:opacity-100 lg:block"
        href="https://github.com/motifland/markprompt"
      >
        <GitHubIcon className="h-5 w-5" />
      </a>
      <a
        className="hidden transform text-sm font-medium text-white opacity-60 hover:opacity-100 lg:block"
        href="https://discord.gg/MBMh4apz6X"
      >
        <DiscordIcon className="h-5 w-5" />
      </a>
    </div>
  );
}
