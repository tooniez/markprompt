import * as Dialog from '@radix-ui/react-dialog';
import {
  ErrorMessage,
  Field,
  Form,
  Formik,
  FormikErrors,
  FormikValues,
} from 'formik';
import { FC, ReactNode, useCallback } from 'react';
import { toast } from 'react-hot-toast';

import DocsLimit from '@/components/files/DocsLimit';
import Button from '@/components/ui/Button';
import { ErrorLabel } from '@/components/ui/Forms';
import { NoAutoInput } from '@/components/ui/Input';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { addSource, deleteSource } from '@/lib/api';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import useUsage from '@/lib/hooks/use-usage';
import useUser from '@/lib/hooks/use-user';
import { getConnectionId, getSyncId } from '@/lib/integrations/nango';
import {
  deleteConnection,
  getNangoClientInstance,
  sourceExists,
  triggerSync,
} from '@/lib/integrations/nango.client';
import { getLabelForSource } from '@/lib/utils';

import SourceDialog from './SourceDialog';

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
        const connectionId = getConnectionId(newSource);
        try {
          if (!connectionId) {
            throw new Error('Not a connected source');
          }

          const result = await nango.auth(INTEGRATION_ID, connectionId);

          if ('message' in result) {
            // Nango AuthError
            throw new Error(result.message);
          }

          // Now that the metadata is set, we are ready to sync.
          await triggerSync(project.id, INTEGRATION_ID, connectionId, [
            getSyncId(INTEGRATION_ID),
          ]);

          await mutateSources();

          toast.success(
            `The source ${getLabelForSource(
              newSource,
              true,
            )} has been added to the project.`,
          );
        } catch (e: any) {
          // If there is an error, make sure to delete the connection
          if (connectionId) {
            await deleteConnection(project.id, INTEGRATION_ID, connectionId);
          }
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
  open,
  onOpenChange,
  openPricingAsDialog,
  onDidAddSource,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  openPricingAsDialog?: boolean;
  onDidAddSource?: () => void;
  children?: ReactNode;
}) => {
  return (
    <SourceDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={children && <Dialog.Trigger asChild>{children}</Dialog.Trigger>}
      title="Connect Notion"
      description="Select pages to sync from your Notion workspace."
    >
      <NotionPagesSource
        openPricingAsDialog={openPricingAsDialog}
        onDidAddSource={() => {
          onOpenChange?.(false);
          onDidAddSource?.();
        }}
      />
    </SourceDialog>
  );
};

export default NotionPagesAddSourceDialog;
