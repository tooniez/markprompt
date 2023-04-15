import { ArchiveIcon } from '@radix-ui/react-icons';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import {
  ErrorMessage,
  Field,
  Form,
  Formik,
  FormikErrors,
  FormikValues,
} from 'formik';
import { groupBy } from 'lodash-es';
import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import { GitHubIcon } from '@/components/icons/GitHub';
import Button from '@/components/ui/Button';
import { ErrorLabel } from '@/components/ui/Forms';
import { NoAutoInput } from '@/components/ui/Input';
import { isGitHubRepoAccessible } from '@/lib/github';
import useGitHub from '@/lib/hooks/integrations/use-github';
import useUser from '@/lib/hooks/use-user';
import useOAuth from '@/lib/hooks/utils/use-oauth';
import { setGitHubAuthState } from '@/lib/supabase';

type GitHubStateIdle = { state: 'idle' };
type GitHubStateChecking = { state: 'checking' };
type GitHubStateInaccessible = { state: 'inaccessible' };
type GitHubStateNoFile = { state: 'no_files' };
type GitHubStateReady = { state: 'ready'; numFiles: number };

type GitHubState =
  | GitHubStateIdle
  | GitHubStateChecking
  | GitHubStateInaccessible
  | GitHubStateNoFile
  | GitHubStateReady;

const ConnectButton = () => {
  return (
    <Button className="flex-none" variant="plain" buttonSize="sm" type="submit">
      Connect
    </Button>
  );
};

const GitHub = () => {
  const { showAuthPopup, githubAccessToken } = useOAuth();
  const { user } = useUser();
  const {
    repositories,
    tokenState,
    loading: loadingRepositories,
  } = useGitHub();
  const [supabase] = useState(() => createBrowserSupabaseClient());

  const repositoriesByOwner = useMemo(() => {
    return groupBy(repositories, 'owner');
  }, [repositories]);

  if (!user) {
    return <></>;
  }

  return (
    <>
      <Formik
        initialValues={{ repoUrl: '' }}
        validateOnMount
        validate={async (values) => {
          const errors: FormikErrors<FormikValues> = {};
          if (values.repoUrl) {
            const isAccessible = await isGitHubRepoAccessible(
              values.repoUrl,
              githubAccessToken?.access_token || undefined,
            );
            if (!isAccessible) {
              errors.repoUrl = 'Repository is not accessible';
            }
          }
          return errors;
        }}
        onSubmit={async (values, { setSubmitting }) => {
          // _updateProject(values, setSubmitting);
        }}
      >
        {({ isSubmitting, isValid }) => (
          <Form className="h-full flex-grow">
            <div className="flex h-full flex-grow flex-col gap-2">
              <div className="h-flex-none mt-4 flex flex-col gap-1 px-4">
                <p className="mb-1 flex-none text-sm font-medium text-neutral-300">
                  Repository URL
                </p>
                <div className="flex flex-none flex-row gap-2">
                  <Field
                    className="flex-grow"
                    type="text"
                    name="repoUrl"
                    inputSize="sm"
                    as={NoAutoInput}
                    disabled={isSubmitting}
                  />
                  <Button
                    className="flex-none"
                    disabled={!isValid}
                    loading={isSubmitting}
                    variant="plain"
                    buttonSize="sm"
                    type="submit"
                  >
                    Connect
                  </Button>
                </div>
                <ErrorMessage name="repoUrl" component={ErrorLabel} />
              </div>
              <p className="mb-1 mt-6 flex-none px-4 text-sm font-medium text-neutral-300">
                Your repositories
              </p>
              {(tokenState === 'no_token' || tokenState === 'expired') && (
                <div className="px-4">
                  <p className="text-sm text-neutral-500">
                    Connect your GitHub account to sync private repositories.
                  </p>
                  <div>
                    <Button
                      className="mt-2"
                      variant="plain"
                      buttonSize="sm"
                      Icon={tokenState === 'no_token' ? GitHubIcon : undefined}
                      onClick={async () => {
                        const state = await setGitHubAuthState(
                          supabase,
                          user.id,
                        );
                        const authed = await showAuthPopup('github', state);
                        if (authed) {
                          toast.success('Authorization has been granted.');
                        }
                      }}
                    >
                      {tokenState === 'no_token'
                        ? 'Authorize GitHub'
                        : 'Re-authorize'}
                    </Button>
                  </div>
                </div>
              )}
              <div className="relative flex h-full flex-grow flex-col gap-2">
                {!loadingRepositories &&
                  (!repositories || repositories.length === 0) && (
                    <p className="px-4 text-sm text-neutral-500">
                      No repositories found
                    </p>
                  )}
                <div className="absolute inset-0 flex flex-col gap-4 overflow-y-auto p-4">
                  {loadingRepositories && (
                    <div className="flex animate-pulse flex-col gap-4">
                      <div className="h-4 w-48 rounded bg-neutral-900" />
                      <div className="h-8 rounded bg-neutral-900" />
                      <div className="h-8 rounded bg-neutral-900" />
                      <div className="h-8 rounded bg-neutral-900" />
                    </div>
                  )}
                  {!loadingRepositories &&
                    Object.keys(repositoriesByOwner)?.map((owner) => {
                      const repositories = repositoriesByOwner[owner];
                      return (
                        <div key={owner}>
                          <p className="mb-4 text-xs uppercase text-neutral-500">
                            {owner}
                          </p>
                          <div className="flex flex-col gap-2">
                            {repositories.map((repo) => (
                              <div
                                key={repo.name}
                                className="flex flex-row items-center gap-3"
                              >
                                <ArchiveIcon className="h-4 w-4 flex-none text-neutral-500" />
                                <span className="flex-grow text-sm font-medium text-neutral-300">
                                  {repo.name}
                                </span>
                                <ConnectButton />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default GitHub;
