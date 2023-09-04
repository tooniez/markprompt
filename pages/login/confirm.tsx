import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { MarkpromptIcon } from '@/components/icons/Markprompt';
import Button from '@/components/ui/Button';

const ConfirmLogin = () => {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Confirm sign in | Markprompt</title>
      </Head>
      <div className="px-6 sm:px-8">
        <div className="mx-auto w-min">
          <Link href="/" className="outline-none">
            <MarkpromptIcon className="mx-auto mt-16 h-16 w-16 text-white outline-none" />
          </Link>
        </div>
        <div className="mx-auto mt-16 max-w-sm pb-2">
          {!router.query?.confirmation_url ? (
            <p className="text-center text-sm text-neutral-500">
              Invalid login
            </p>
          ) : (
            <>
              <p className="mt-16 mb-4 text-center text-sm text-neutral-500">
                You are about to sign in to Markprompt
              </p>
              <Button
                className="w-full"
                variant="plain"
                href={router.query.confirmation_url as string}
              >
                Confirm sign in
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ConfirmLogin;

// export default EmailLogin;

// import Head from 'next/head';
// import { useRouter } from 'next/router';
// import { useEffect } from 'react';

// const ConfirmLogin = () => {
//   const router = useRouter();

//   useEffect(() => {
//     if (!router.query?.confirmation_url) {
//       return;
//     }
//     window.location.href = router.query.confirmation_url as string;
//     // console.log('IN HERE', router.query.confirmation_url);
//     // router.push(router.query.confirmation_url as string);
//   }, [router]);

//   return (
//     <>
//       <Head>
//         <title>Markprompt</title>
//       </Head>

//       <p className="p-8 text-center text-sm text-neutral-500">Signing in...</p>
//     </>
//   );
// };

// export default ConfirmLogin;
