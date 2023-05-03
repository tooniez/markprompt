import Head from 'next/head';

import { NavLayout } from '@/components/layouts/NavLayout';

import PlaygroundDashboard from '../files/PlaygroundDashboard';

const Onboarding = () => {
  return (
    <>
      <Head>
        <title>Get started | Markprompt</title>
      </Head>
      <NavLayout animated={false}>
        <div className="fixed top-[var(--app-navbar-height)] bottom-0 left-0 right-0">
          <PlaygroundDashboard />
        </div>
      </NavLayout>
    </>
  );
};

export default Onboarding;
