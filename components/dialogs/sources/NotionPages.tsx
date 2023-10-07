import * as Dialog from '@radix-ui/react-dialog';
import * as RadioGroup from '@radix-ui/react-radio-group';
import {
  ErrorMessage,
  Field,
  Form,
  Formik,
  FormikErrors,
  FormikValues,
} from 'formik';
import dynamic from 'next/dynamic';
import { FC, ReactNode, useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';

import Button from '@/components/ui/Button';
import { ErrorLabel } from '@/components/ui/Forms';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { NoAutoInput } from '@/components/ui/Input';
import { addSource, deleteSource } from '@/lib/api';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import useUsage from '@/lib/hooks/use-usage';
import useUser from '@/lib/hooks/use-user';
import { getConnectionId } from '@/lib/integrations/nango';
import {
  deleteConnection,
  getNangoClientInstance,
  sourceExists,
} from '@/lib/integrations/nango.client';
import { getLabelForSource } from '@/lib/utils';

const Loading = <p className="p-4 text-sm text-neutral-500">Loading...</p>;

const DocsLimit = dynamic(() => import('@/components/files/DocsLimit'), {
  loading: () => Loading,
});

const nango = getNangoClientInstance();

type NotionPagesSourceProps = {
  clearPrevious?: boolean;
  openPricingAsDialog?: boolean;
  onDidAddSource: () => void;
};

const identifierRegex = /^[a-zA-Z0-9-]+$/;

const INTEGRATION_ID = 'notion-pages';

const NotionPagesSource: FC<NotionPagesSourceProps> = ({ onDidAddSource }) => {
  const { project } = useProject();
  const { user } = useUser();
  const { mutate: mutateSources } = useSources();
  const { isInfiniteEmbeddingsTokensAllowance } = useUsage();

  const connectAndAddSource = useCallback(
    async (identifier: string) => {
      if (!project?.id) {
        return;
      }

      try {
        const newSource = await addSource(project.id, 'nango', {
          integrationId: INTEGRATION_ID,
          identifier,
        });

        if (!newSource.id) {
          throw new Error('Unable to create source');
        }

        // Create the Nango connection. Note that nango.yaml specifies
        // `auto_start: false` to give us a chance to set the metadata
        // first.
        try {
          const connectionId = getConnectionId(newSource.id);
          const result = await nango.auth(INTEGRATION_ID, connectionId);

          if ('message' in result) {
            // Nango AuthError
            throw new Error(result.message);
          }

          // Now that the metadata is set, we are ready to sync.
          // await triggerSync(project.id, INTEGRATION_ID, connectionId, [
          //   NOTION_PAGES_SYNC_ID,
          // ]);

          await mutateSources();

          toast.success(
            `The source ${getLabelForSource(
              newSource,
              true,
            )} has been added to the project.`,
          );
        } catch (e: any) {
          // If there is an error, make sure to delete the connection
          await deleteConnection(project.id, INTEGRATION_ID, newSource.id);
          await deleteSource(project.id, newSource.id);
          toast.error(`Error connecting to Notion: ${e.message || e}.`);
        }
      } catch (e: any) {
        toast.error(`Error connecting to Notion: ${e.message || e}.`);
      }
    },
    [mutateSources, project?.id],
  );

  if (!user) {
    return <></>;
  }

  return (
    <>
      <Formik
        initialValues={{ identifier: '' }}
        validateOnMount
        validate={async (values) => {
          const errors: FormikErrors<FormikValues> = {};
          if (!project?.id) {
            return;
          }

          const identifier = values.identifier;
          if (!identifier) {
            errors.identifier = 'Please provide an identifier';
          } else {
            if (!identifierRegex.test(identifier)) {
              errors.identifier =
                'Identifier may only contain letters, numbers and dashes';
            } else {
              const exists = await sourceExists(project.id, identifier);
              if (exists) {
                errors.identifier = 'This identifier is already taken';
              }
            }
          }

          return errors;
        }}
        onSubmit={async (values, { setSubmitting }) => {
          if (!project) {
            return;
          }
          setSubmitting(true);
          const identifier = values.identifier.replace(/[^a-zA-Z0-9-]/g, '');
          await connectAndAddSource(identifier);
          setSubmitting(false);
          onDidAddSource();
        }}
      >
        {({ isSubmitting, isValid }) => (
          <Form className="flex h-full flex-col">
            <div className="flex h-full min-h-0 flex-grow flex-col gap-1 overflow-y-auto px-4 pb-8">
              <div className="mb-1 flex flex-row items-center gap-2 pt-4">
                <p className="text-sm font-medium text-neutral-300">
                  Connection unique identifier{' '}
                </p>
                <InfoTooltip
                  message="A unique identifier for your connection"
                  dimmed
                  as="a"
                />
              </div>
              <div className="flex flex-row gap-2">
                <Field
                  className="flex-grow"
                  type="text"
                  name="identifier"
                  inputSize="sm"
                  as={NoAutoInput}
                  disabled={isSubmitting}
                />
              </div>
              <ErrorMessage name="identifier" component={ErrorLabel} />
            </div>
            <div className="flex-none">
              <ErrorMessage name="common" component={ErrorLabel} />
              {!isInfiniteEmbeddingsTokensAllowance && (
                <div className="mt-2 rounded-md border border-neutral-900">
                  <DocsLimit />
                </div>
              )}
            </div>
            <div className="gap-2 border-t border-neutral-900 bg-neutral-1000 p-4">
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
          </Form>
        )}
      </Formik>
    </>
  );
};

const NotionPagesAddSourceDialog = ({
  openPricingAsDialog,
  onDidAddSource,
  children,
}: {
  openPricingAsDialog?: boolean;
  onDidAddSource?: () => void;
  children: ReactNode;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
        <Dialog.Content className="animate-dialog-slide-in dialog-content flex w-[90%] max-w-[500px] flex-col">
          <div className="flex-none">
            <Dialog.Title className="dialog-title flex-none">
              Connect Notion
            </Dialog.Title>
            <div className="dialog-description flex flex-none flex-col gap-2 border-b border-neutral-900 pb-4">
              <p>Sync pages from a Notion workspace.</p>
            </div>
          </div>
          <div className="flex-grow overflow-y-hidden">
            <NotionPagesSource
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

export default NotionPagesAddSourceDialog;
