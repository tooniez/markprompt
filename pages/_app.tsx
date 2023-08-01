import '@/styles/globals.css';

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { Analytics } from '@vercel/analytics/react';
import * as Fathom from 'fathom-client';
import { NextComponentType, NextPageContext } from 'next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { useRouter } from 'next/router';
import { ThemeProvider } from 'next-themes';
import { ReactNode, useEffect, useState } from 'react';
import { SWRConfig } from 'swr';

import { Toaster } from '@/components/ui/Toaster';
import { ManagedAppContext } from '@/lib/context/app';
import { ManagedConfigContext } from '@/lib/context/config';
import { ManagedTrainingContext } from '@/lib/context/training';
import useUser from '@/lib/hooks/use-user';
import { getAppHost } from '@/lib/utils.edge';

const inter = Inter({ subsets: ['latin'] });

interface CustomAppProps<P = any> extends AppProps<P> {
  Component: NextComponentType<NextPageContext, any, P> & {
    getLayout?: (page: ReactNode) => JSX.Element;
    title?: string;
  };
}

export default function App({ Component, pageProps }: CustomAppProps) {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());

  useEffect(() => {
    const origin = getAppHost();
    if (!process.env.NEXT_PUBLIC_FATHOM_SITE_ID || !origin) {
      return;
    }

    Fathom.load(process.env.NEXT_PUBLIC_FATHOM_SITE_ID, {
      includedDomains: [origin],
    });

    function onRouteChangeComplete() {
      Fathom.trackPageview();
    }
    router.events.on('routeChangeComplete', onRouteChangeComplete);

    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={inter.className}>
      <SWRConfig
        value={{
          dedupingInterval: 10000,
        }}
      >
        <ThemeProvider defaultTheme="dark" attribute="class">
          <SessionContextProvider
            supabaseClient={supabase}
            initialSession={(pageProps as any).initialSession}
          >
            <ManagedAppContext>
              <ManagedTrainingContext>
                <ManagedConfigContext>
                  <Component {...pageProps}></Component>
                  {!(Component as any).hideChat && <PromptOutsideOnboarding />}
                  <Toaster />
                </ManagedConfigContext>
              </ManagedTrainingContext>
            </ManagedAppContext>
          </SessionContextProvider>
        </ThemeProvider>
        <Analytics />
      </SWRConfig>
    </main>
  );
}

export const PromptOutsideOnboarding = () => {
  const { user } = useUser();

  // Don't show chat in the bottom left during onboarding.
  if (user && !user.has_completed_onboarding) {
    return <></>;
  }
  return <></>;
};
