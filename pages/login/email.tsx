import Head from 'next/head';

import EmailAuthPage from '@/components/user/EmailAuthPage';

const EmailLogin = () => {
  return (
    <>
      <Head>
        <title>Sign in | Markprompt</title>
      </Head>
      <EmailAuthPage />
    </>
  );
};

export default EmailLogin;
