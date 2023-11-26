import { Canvas } from '@react-three/fiber';
import { EffectComposer, HueSaturation } from '@react-three/postprocessing';
import { useSession } from '@supabase/auth-helpers-react';
import cn from 'classnames';
import Link from 'next/link';
import { BlendFunction } from 'postprocessing';
import { useEffect, useState } from 'react';
import Balancer from 'react-wrap-balancer';

import { ContactSalesDialog } from '@/components/dialogs/public/ContactDialog';
import { YCIcon } from '@/components/icons/brands/YC';
import { GitHubIcon } from '@/components/icons/GitHub';
import { MarkpromptIcon } from '@/components/icons/Markprompt';
import { XIcon } from '@/components/icons/X';
import { ContactWindow } from '@/components/user/ChatWindow';
import emitter, { EVENT_OPEN_CONTACT } from '@/lib/events';
import usePrefersReducedMotion from '@/lib/hooks/utils/use-reduced-motion';

import Wave from './wave/Wave';

export const Hero = () => {
  const session = useSession();
  const [animated, setAnimated] = useState(true);
  const [joinButtonHover, setJoinButtonHover] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const handleVisibilityChange = () => {
      setAnimated(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <>
      <div className="relative flex h-screen w-full items-center justify-center bg-gradient-to-br from-neutral-1000 to-neutral-1100 antialiased">
        <div className="home-dots absolute inset-0" />
        <div
          className="fade-in-slide-down absolute inset-x-0 top-0 flex justify-center px-8 py-8 sm:py-12"
          style={{
            animationDelay: '700ms',
          }}
        >
          <div className="flex w-full max-w-screen-lg flex-row items-center gap-2 sm:gap-2">
            <div className="flex flex-none flex-row items-center gap-3 text-sm text-white">
              <MarkpromptIcon className="mx-auto h-10 w-10" />
              <span className="font-medium tracking-wide">Markprompt</span>
            </div>
            <div className="flex-grow" />
            <Link
              className="home-ghost-button hidden flex-none sm:block"
              href="/integrations"
            >
              Integrations
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
            <a
              className="home-ghost-button hidden flex-none cursor-pointer sm:block"
              onClick={() => {
                setSalesDialogOpen(true);
              }}
            >
              Contact us
            </a>
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
                className="home-ghost-button mx-2 flex-none select-none"
                data-highlighted="true"
                href="/login"
              >
                Sign in
              </Link>
            )}
            <a
              className="home-icon-button"
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
        <div className="z-10 -mt-32 flex w-full flex-col items-center px-8 sm:-mt-24">
          <h1 className="fade-in-slide-down home-gradient-text w-full pb-8 text-center text-5xl font-semibold tracking-[-0.6px] sm:text-6xl md:text-[80px]">
            {/* leading-[2.5rem] md:leading-[72px]  */}
            <Balancer>AI for customer support</Balancer>
          </h1>
          <p
            className="fade-in-slide-up mb-12 max-w-screen-sm text-center text-xl text-neutral-200 sm:text-2xl"
            style={{
              animationDelay: '200ms',
            }}
          >
            <Balancer>
              Automate customer support, scale without increasing headcount, and
              deliver exceptional user experiences.
            </Balancer>
          </p>
          <div
            className="fade-in-slide-up-long"
            style={{
              animationDelay: '400ms',
            }}
          >
            <a
              className="select-none rounded-lg border-0 bg-white px-5 py-3 font-medium text-neutral-900 outline-none ring-sky-500 ring-offset-4 ring-offset-neutral-900 transition hover:ring focus:ring"
              href="https://meetings.hubspot.com/markprompt/demo"
              target="_blank"
              rel="noreferrer"
              onMouseEnter={() => {
                setJoinButtonHover(true);
              }}
              onMouseLeave={() => {
                setJoinButtonHover(false);
              }}
            >
              Book a demo
            </a>
          </div>
        </div>
        <div className="fade-in-slide-up absolute inset-x-0 bottom-0 z-0 h-[65%] transform duration-500">
          <Canvas
            camera={{
              position: [
                0.1912020407052579, -4.037434449482079, 1.8383531942382878,
              ],
            }}
          >
            <ambientLight color="white" intensity={0.5} />
            <directionalLight color="white" position={[0.5, 0, 0.866]} />
            <Wave
              showPoints={!joinButtonHover}
              animate={animated && !prefersReducedMotion}
            />
            <EffectComposer multisampling={8}>
              <HueSaturation
                blendFunction={BlendFunction.NORMAL}
                hue={0}
                saturation={0.8}
              />
            </EffectComposer>
          </Canvas>
        </div>
        <div
          className="fade-in-slide-up-long pointer-events-none absolute inset-x-0 bottom-0 flex h-[240px] flex-row items-end justify-center gap-2 bg-gradient-to-t from-neutral-1100 to-neutral-1100/0 px-8 text-neutral-300"
          style={{
            animationDelay: '200ms',
          }}
        >
          <div className="mb-8 flex flex-row items-center gap-2 rounded-full bg-neutral-1100/50 px-6 py-2.5 text-sm">
            Backed by <YCIcon className="h-6 w-6" /> Combinator
          </div>
        </div>
        {/* <div
          className="fade-in-slide-up-long absolute inset-x-0 bottom-0 flex h-[100px] flex-row items-center justify-center gap-16 bg-white px-8 text-neutral-400"
          style={{
            animationDelay: '200ms',
          }}
        >
          <AngelListIcon className="w-[90px]" />
          <PlotlyIcon className="w-[110px]" />
          <CalIcon className="w-[90px]" />
          <SemgrepIcon className="mt-1 w-[125px]" />
          <SkeduloIcon className="w-[110px]" />
        </div> */}
      </div>
      {/* Cover canvas boundaries to prevent glitches */}
      <div
        className={cn('pointer-events-none fixed inset-0 z-20 transition', {
          'opacity-0': !requestDialogOpen && !salesDialogOpen,
          'opacity-100': requestDialogOpen || salesDialogOpen,
        })}
      >
        <div className="fixed inset-x-0 bottom-0 h-40 bg-gradient-to-t from-neutral-900 to-neutral-900/0"></div>
        <div className="fixed inset-y-0 left-0 w-40 bg-gradient-to-r from-neutral-900 to-neutral-900/0"></div>
        <div className="fixed inset-y-0 right-0 w-40 bg-gradient-to-l from-neutral-900 to-neutral-900/0"></div>
      </div>
      <ContactSalesDialog open={salesDialogOpen} setOpen={setSalesDialogOpen} />
      {/* <RequestAccessDialog
        open={requestDialogOpen}
        setOpen={setRequestDialogOpen}
      />
      <ContactSalesDialog open={salesDialogOpen} setOpen={setSalesDialogOpen} /> */}
    </>
  );
};
