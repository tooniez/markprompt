import { useSession } from '@supabase/auth-helpers-react';
import { XIcon } from 'lucide-react';
import Link from 'next/link';

import { GitHubIcon } from '@/components/icons/GitHub';
import { MarkpromptIcon } from '@/components/icons/Markprompt';

export const MenuLarge = ({
  onContactDialogOpen,
}: {
  onContactDialogOpen: () => void;
}) => {
  const session = useSession();
  return (
    <div className="fade-in-slide-down absolute inset-x-0 top-0 flex justify-center p-6 sm:px-8 md:py-12">
      <div className="flex w-full max-w-screen-lg flex-row items-center gap-2 sm:gap-2">
        <div className="flex flex-none flex-row items-center gap-3 text-sm text-white">
          <MarkpromptIcon className="mx-auto h-10 w-10" />
          <span className="font-medium tracking-wide">Markprompt</span>
        </div>
        <div className="flex-grow" />
        <Link
          className="home-ghost-button hidden flex-none md:block"
          href="/integrations"
        >
          Integrations
        </Link>
        <Link
          className="home-ghost-button hidden flex-none sm:block"
          href="/pricing"
        >
          Pricing
        </Link>
        <Link
          className="home-ghost-button hidden flex-none sm:block"
          href="/blog"
        >
          Blog
        </Link>
        <Link
          className="home-ghost-button hidden flex-none sm:block"
          href="/docs"
        >
          Docs
        </Link>
        <Link
          className="home-ghost-button hidden flex-none sm:block"
          href="/about"
        >
          About
        </Link>
        <button
          className="home-ghost-button hidden flex-none cursor-pointer outline-none sm:block"
          onClick={() => {
            onContactDialogOpen();
          }}
        >
          Contact us
        </button>
        {session ? (
          <Link
            className="home-ghost-button mx-2 flex-none select-none"
            data-highlighted="true"
            href="/"
          >
            Go to app
          </Link>
        ) : (
          <Link
            className="home-ghost-button flex-none select-none"
            href="/login"
          >
            Sign in
          </Link>
        )}
        <a
          className="home-icon-button hidden md:block"
          href="https://github.com/motifland/markprompt"
          aria-label="Markprompt on GitHub"
          target="_blank"
          rel="noreferrer"
        >
          <GitHubIcon className="h-5 w-5" />
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
  );
};
