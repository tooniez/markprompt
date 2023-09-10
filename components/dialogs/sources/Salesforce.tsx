import Nango from '@nangohq/frontend';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { track } from '@vercel/analytics';
import {
  ErrorMessage,
  Field,
  Form,
  Formik,
  FormikErrors,
  FormikValues,
} from 'formik';
import { ChevronDown, ChevronUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FC, ReactNode, useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';

import Button from '@/components/ui/Button';
import { ErrorLabel } from '@/components/ui/Forms';
import { NoAutoInput } from '@/components/ui/Input';
import { SelectItem } from '@/components/ui/Select';
import { addSource, deleteSource } from '@/lib/api';
import useGitHub from '@/lib/hooks/integrations/use-github';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import useTeam from '@/lib/hooks/use-team';
import useUsage from '@/lib/hooks/use-usage';
import useUser from '@/lib/hooks/use-user';
import useOAuth from '@/lib/hooks/utils/use-oauth';
import { getLabelForSource } from '@/lib/utils';
import { Project } from '@/types/types';

const Loading = <p className="p-4 text-sm text-neutral-500">Loading...</p>;

const DocsLimit = dynamic(() => import('@/components/files/DocsLimit'), {
  loading: () => Loading,
});

const nango = new Nango({
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  publicKey: process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY!,
});

const _addSource = async (
  projectId: Project['id'],
  instanceUrl: string,
  mutate: () => void,
) => {
  try {
    const newSource = await addSource(projectId, 'salesforce', {
      instanceUrl,
    });
    await mutate();
    toast.success(
      `The source ${getLabelForSource(
        newSource,
        true,
      )} has been added to the project.`,
    );
  } catch (e) {
    console.error(e);
    toast.error(`${e}`);
  }
};

type ConnectButtonProps = {
  projectId: Project['id'];
  instanceUrl: string;
  onComplete?: () => void;
  clearPrevious?: boolean;
};

const ConnectButton: FC<ConnectButtonProps> = ({
  projectId,
  instanceUrl,
  onComplete,
  clearPrevious,
}) => {
  const { sources, mutate } = useSources();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      className="flex-none"
      variant="plain"
      buttonSize="sm"
      type="submit"
      loading={loading}
      onClick={async () => {
        track('connect private github repo', { projectId });
        setLoading(true);
        if (clearPrevious) {
          for (const source of sources) {
            await deleteSource(projectId, source.id);
          }
        }
        await _addSource(projectId, instanceUrl, mutate);
        setLoading(false);
        onComplete?.();
      }}
    >
      Connect
    </Button>
  );
};

type SalesforceSourceProps = {
  clearPrevious?: boolean;
  openPricingAsDialog?: boolean;
  onDidAddSource: () => void;
};

const SalesforceSource: FC<SalesforceSourceProps> = ({
  clearPrevious,
  onDidAddSource,
}) => {
  const { project } = useProject();
  const { user } = useUser();
  const { sources, mutate } = useSources();
  const { showAuthPopup, githubAccessToken } = useOAuth();
  const { isInfiniteEmbeddingsTokensAllowance } = useUsage();
  const {
    repositories,
    tokenState,
    loading: loadingRepositories,
  } = useGitHub();
  const [supabase] = useState(() => createBrowserSupabaseClient());

  const connect = useCallback(
    (environment: 'Production' | 'Sandbox', instanceUrl: string) => {
      if (!project?.id || !instanceUrl) {
        return;
      }

      const providerConfigKey =
        environment === 'Production'
          ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            process.env.NEXT_PUBLIC_NANGO_INTEGRATION_KEY_SALESFORCE!
          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            process.env.NEXT_PUBLIC_NANGO_INTEGRATION_KEY_SALESFORCE_SANDBOX!;
      const connectionId =
        environment === 'Production'
          ? `salesforce-${project.id}`
          : `salesforce-sandbox-${project.id}`;

      nango
        .auth(providerConfigKey, connectionId, {
          params: { instance_url: instanceUrl },
        })
        .then((result: any) => {
          // { providerConfigKey: string; connectionId: string }
          console.log(
            'providerConfigKey',
            JSON.stringify(result.providerConfigKey, null, 2),
          );
          console.log(
            'connectionId',
            JSON.stringify(result.connectionId, null, 2),
          );
        })
        .catch((err: { message: string; type: string }) => {
          toast.error(`Error connecting to Salesforce: ${err.message}.`);
        });
    },
    [project?.id],
  );

  if (!user) {
    return <></>;
  }

  return (
    <>
      <Formik
        initialValues={{
          environment: 'Production' as 'Production' | 'Sandbox',
          instanceUrl: 'https://mindbody--eos1.sandbox.lightning.force.com',
        }}
        validateOnMount
        validate={async (values) => {
          const errors: FormikErrors<FormikValues> = {};
          if (!values.instanceUrl) {
            errors.repoUrl = 'Please provide an instance URL';
          }
          return errors;
        }}
        onSubmit={async (values, { setSubmitting }) => {
          if (!project || !values.instanceUrl) {
            return;
          }
          setSubmitting(true);
          await connect(values.environment, values.instanceUrl);
          setSubmitting(false);
          // await _addSource(project.id, values.instanceUrl, mutate);
          // setSubmitting(false);
          // onDidAddSource();
        }}
      >
        {({ isSubmitting, isValid, values, setFieldValue }) => (
          <Form className="h-full flex-grow">
            <div className="flex h-full flex-grow flex-col gap-2">
              <div className="h-flex-none flex flex-col gap-1 px-4">
                <p className="mb-1 flex-none pt-4 text-sm font-medium text-neutral-300">
                  Environment
                </p>
                <div className="flex flex-none flex-row gap-2">
                  <Select.Root
                    value={values.environment}
                    onValueChange={(value) => {
                      setFieldValue('environment', value);
                    }}
                  >
                    <Select.Trigger
                      className="button-ring flex w-full flex-row items-center gap-2 rounded-md border border-neutral-900 py-1.5 px-3 text-sm text-neutral-300 outline-none"
                      aria-label="Theme"
                    >
                      <div className="flex-grow truncate whitespace-nowrap text-left">
                        <Select.Value placeholder="Pick an environment" />
                      </div>
                      <Select.Icon className="flex-none text-neutral-500">
                        <ChevronDown className="h-4 w-4" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content
                        className="overflow-hidden rounded-md border border-neutral-800 bg-neutral-900"
                        style={{
                          zIndex: 100,
                        }}
                      >
                        <Select.ScrollUpButton className="flex h-10 items-center justify-center">
                          <ChevronUp className="h-4 w-4" />
                        </Select.ScrollUpButton>
                        <Select.Viewport>
                          <Select.Group>
                            <SelectItem value="Production">
                              Production
                            </SelectItem>
                            <SelectItem value="Sandbox">Sandbox</SelectItem>
                          </Select.Group>
                        </Select.Viewport>
                        <Select.ScrollDownButton className="flex items-center justify-center p-2">
                          <ChevronDown className="h-4 w-4" />
                        </Select.ScrollDownButton>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
                <p className="mb-1 flex-none pt-4 text-sm font-medium text-neutral-300">
                  Instance URL
                </p>
                <div className="flex flex-none flex-row gap-2">
                  <Field
                    className="flex-grow"
                    type="text"
                    name="instanceUrl"
                    inputSize="sm"
                    as={NoAutoInput}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex flex-none flex-row gap-2 pt-4">
                  <Button
                    className="flex-none"
                    disabled={!isValid}
                    loading={isSubmitting}
                    variant="cta"
                    buttonSize="sm"
                    type="submit"
                  >
                    Connect
                  </Button>
                </div>
                <ErrorMessage name="repoUrl" component={ErrorLabel} />
                {!isInfiniteEmbeddingsTokensAllowance && (
                  <div className="mt-2 rounded-md border border-neutral-900">
                    <DocsLimit />
                  </div>
                )}
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};

const SalesforceAddSourceDialog = ({
  openPricingAsDialog,
  onDidAddSource,
  children,
}: {
  openPricingAsDialog?: boolean;
  onDidAddSource?: () => void;
  children: ReactNode;
}) => {
  const { team } = useTeam();
  const { project } = useProject();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
        <Dialog.Content className="animate-dialog-slide-in dialog-content flex h-[90%] max-h-[720px] w-[90%] max-w-[500px] flex-col">
          <Dialog.Title className="dialog-title flex-none">
            Connect Salesforce Knowledge
          </Dialog.Title>
          <div className="dialog-description flex flex-none flex-col gap-2 border-b border-neutral-900 pb-4">
            <p>Sync content from a Salesforce Knowledge base.</p>
          </div>
          <div className="flex-grow">
            <SalesforceSource
              openPricingAsDialog={openPricingAsDialog}
              onDidAddSource={() => {
                setDialogOpen(false);
                onDidAddSource?.();
              }}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SalesforceAddSourceDialog;
