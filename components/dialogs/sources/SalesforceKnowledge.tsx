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
import { FC, ReactNode, useCallback } from 'react';
import { toast } from 'react-hot-toast';

import Button from '@/components/ui/Button';
import { ErrorLabel } from '@/components/ui/Forms';
import { NoAutoInput } from '@/components/ui/Input';
import { NoAutoTextArea } from '@/components/ui/TextArea';
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
  setMetadata,
  sourceExists,
  triggerSync,
} from '@/lib/integrations/nango.client';
import {
  SalesforceEnvironment,
  SalesforceNangoMetadata,
  getKnowledgeIntegrationId,
} from '@/lib/integrations/salesforce';
import { getLabelForSource } from '@/lib/utils';

import SourceDialog from './SourceDialog';

const Loading = <p className="p-4 text-sm text-neutral-500">Loading...</p>;

const DocsLimit = dynamic(() => import('@/components/files/DocsLimit'), {
  loading: () => Loading,
});

const nango = getNangoClientInstance();

type SalesforceKnowledgeSourceProps = {
  clearPrevious?: boolean;
  openPricingAsDialog?: boolean;
  onDidAddSource: () => void;
};

const identifierRegex = /^[a-zA-Z0-9-]+$/;

const prepareFields = (input: string) => {
  return input.split(',').map((v) => v.trim());
};

const SalesforceKnowledgeSource: FC<SalesforceKnowledgeSourceProps> = ({
  onDidAddSource,
}) => {
  const { project } = useProject();
  const { user } = useUser();
  const { mutate: mutateSources } = useSources();
  const { isInfiniteEmbeddingsTokensAllowance } = useUsage();

  const connectAndAddSource = useCallback(
    async (
      identifier: string,
      environment: SalesforceEnvironment,
      instanceUrl: string,
      metadata: SalesforceNangoMetadata,
    ) => {
      if (!project?.id || !instanceUrl) {
        return;
      }

      try {
        const integrationId = getKnowledgeIntegrationId(environment);

        const newSource = await addSource(project.id, 'nango', {
          integrationId,
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
          const result = await nango.auth(integrationId, connectionId, {
            params: { instance_url: instanceUrl },
          });

          if ('message' in result) {
            // Nango AuthError
            throw new Error(result.message);
          }

          // Once the connection has been created, set the connection
          // metadata (such as the query filters).
          await setMetadata(project.id, integrationId, connectionId, metadata);

          // Now that the metadata is set, we are ready to sync.
          await triggerSync(project.id, integrationId, connectionId, [
            getSyncId(integrationId),
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
          await deleteConnection(
            project.id,
            getKnowledgeIntegrationId(environment),
            newSource.id,
          );
          await deleteSource(project.id, newSource.id);
          toast.error(`Error connecting to Salesforce: ${e.message || e}.`);
        }
      } catch (e: any) {
        toast.error(`Error connecting to Salesforce: ${e.message || e}.`);
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
        initialValues={{
          identifier: '',
          environment: 'production' as SalesforceEnvironment,
          instanceUrl: '',
          customFields: '',
          filters: '',
          titleMapping: '',
          contentMapping: '',
          pathMapping: '',
          metadataFields: '',
        }}
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

          if (!values.instanceUrl) {
            errors.instanceUrl = 'Please provide an instance URL';
          }

          return errors;
        }}
        onSubmit={async (values, { setSubmitting }) => {
          if (!project || !values.instanceUrl) {
            return;
          }
          setSubmitting(true);
          const identifier = values.identifier.replace(/[^a-zA-Z0-9-]/g, '');
          await connectAndAddSource(
            identifier,
            values.environment,
            values.instanceUrl,
            {
              customFields: prepareFields(values.customFields),
              filters: values.filters,
              mappings: {
                title: values.titleMapping,
                content: values.contentMapping,
                path: values.pathMapping,
              },
              metadataFields: prepareFields(values.metadataFields),
            },
          );
          setSubmitting(false);
          onDidAddSource();
        }}
      >
        {({ isSubmitting, isValid, values, setFieldValue }) => (
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
              <p className="mb-1 pt-4 text-sm font-medium text-neutral-300">
                Environment
              </p>
              <div className="flex flex-row gap-2 pt-2">
                <RadioGroup.Root
                  className="flex flex-row items-center gap-6"
                  defaultValue={values.environment}
                  aria-label="Select environment"
                  onValueChange={(value) => {
                    setFieldValue('environment', value);
                  }}
                >
                  <div className="flex flex-row items-center gap-2">
                    <RadioGroup.Item
                      className="RadioGroupItem"
                      value="production"
                      id="production"
                    >
                      <RadioGroup.Indicator className="RadioGroupIndicator" />
                    </RadioGroup.Item>
                    <label
                      className="select-none pl-1 text-sm text-white"
                      htmlFor="production"
                    >
                      Production
                    </label>
                  </div>
                  <div className="flex flex-row items-center gap-2">
                    <RadioGroup.Item
                      className="RadioGroupItem"
                      value="sandbox"
                      id="sandbox"
                    >
                      <RadioGroup.Indicator className="RadioGroupIndicator" />
                    </RadioGroup.Item>
                    <label
                      className="select-none pl-1 text-sm text-white"
                      htmlFor="sandbox"
                    >
                      Sandbox
                    </label>
                  </div>
                </RadioGroup.Root>
              </div>
              <p className="mb-1 pt-4 text-sm font-medium text-neutral-300">
                Instance URL
              </p>
              <div className="flex flex-row gap-2">
                <Field
                  className="flex-grow"
                  type="text"
                  name="instanceUrl"
                  inputSize="sm"
                  as={NoAutoInput}
                  disabled={isSubmitting}
                />
              </div>
              <ErrorMessage name="instanceUrl" component={ErrorLabel} />
              <p className="mb-1 pt-4 text-sm font-medium text-neutral-300">
                Custom fields (comma separated)
              </p>
              <div className="flex flex-row gap-2">
                <Field
                  className="h-[60px] flex-grow font-mono text-xs"
                  type="text"
                  name="customFields"
                  placeholder={`Example: Language, IsPrivate, ArticleBody, UrlName`}
                  textAreaSize="sm"
                  as={NoAutoTextArea}
                  disabled={isSubmitting}
                />
              </div>
              <div className="mb-1 flex flex-row items-center gap-2 pt-4">
                <p className="flex-grow overflow-hidden truncate text-sm font-medium text-neutral-300">
                  Filters (SOQL WHERE clause)
                </p>
                <a
                  className="subtle-underline flex-none whitespace-nowrap text-sm font-normal text-neutral-300"
                  href="https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_conditionexpression.htm"
                  rel="noreferrer"
                  target="_blank"
                >
                  Learn more
                </a>
              </div>
              <div className="flex flex-row gap-2">
                <Field
                  className="h-[120px] flex-grow font-mono text-xs"
                  type="text"
                  name="filters"
                  placeholder={`Example: Language = 'en_US' AND IsPrivate = false`}
                  textAreaSize="sm"
                  as={NoAutoTextArea}
                  disabled={isSubmitting}
                />
              </div>
              <p className="pt-4 text-sm font-medium text-neutral-300">
                Mappings
              </p>
              <p className="pb-2 text-sm text-neutral-500">
                Specify how your object fields should map to files.
              </p>
              <div className="grid grid-cols-4 items-center gap-2">
                <p className="text-sm text-neutral-300">Title</p>
                <Field
                  className="col-span-3 font-mono text-xs"
                  type="text"
                  name="titleMapping"
                  placeholder={`Example: Title`}
                  inputSize="sm"
                  as={NoAutoInput}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-neutral-300">Content</p>
                <Field
                  className="col-span-3 font-mono text-xs"
                  type="text"
                  name="contentMapping"
                  placeholder={`Example: ArticleBody`}
                  inputSize="sm"
                  as={NoAutoInput}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-neutral-300">Path</p>
                <Field
                  className="col-span-3 font-mono text-xs"
                  type="text"
                  name="pathMapping"
                  placeholder={`Example: UrlName`}
                  inputSize="sm"
                  as={NoAutoInput}
                  disabled={isSubmitting}
                />
              </div>
              <p className="pt-4 text-sm font-medium text-neutral-300">
                Metadata fields (comma separated)
              </p>
              <p className="pb-2 text-sm text-neutral-500">
                Specify custom fields to include in the file metadata.
              </p>
              <div className="flex flex-row gap-2">
                <Field
                  className="h-[60px] flex-grow font-mono text-xs"
                  type="text"
                  name="metadataFields"
                  placeholder={`Example: Id, Language`}
                  textAreaSize="sm"
                  as={NoAutoTextArea}
                  disabled={isSubmitting}
                />
              </div>
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

const SalesforceKnowledgeAddSourceDialog = ({
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
      title="Connect Salesforce Knowledge"
      description="Sync content from a Salesforce Knowledge base."
    >
      <SalesforceKnowledgeSource
        openPricingAsDialog={openPricingAsDialog}
        onDidAddSource={() => {
          onOpenChange?.(false);
          onDidAddSource?.();
        }}
      />
    </SourceDialog>
  );
};

export default SalesforceKnowledgeAddSourceDialog;
