import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { MarkpromptIcon } from '@/components/icons/Markprompt';
import Button from '@/components/ui/Button';

const ConfirmSignup = () => {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Confirm sign up | Markprompt</title>
      </Head>
      <div className="px-6 sm:px-8">
        <div className="mx-auto w-min">
          <Link href="/" className="outline-none">
            <MarkpromptIcon className="mx-auto mt-16 h-16 w-16 text-white outline-none" />
          </Link>
        </div>
        <div className="mx-auto mt-16 max-w-sm pb-2">
          {!router.query?.token ? (
            <p className="text-center text-sm text-neutral-500">
              Invalid signup link
            </p>
          ) : (
            <>
              <p className="mt-16 mb-4 text-center text-sm text-neutral-500">
                You are about to sign up to Markprompt
              </p>
              <Button
                className="w-full"
                variant="plain"
                href={`${process.env
                  .NEXT_PUBLIC_SUPABASE_URL!}/auth/v1/verify?token=${
                  router.query.token as string
                }&type=invite&redirect_to=https://markprompt.com/`}
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

export default ConfirmSignup;
