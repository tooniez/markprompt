import * as Dialog from '@radix-ui/react-dialog';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import Button from '@/components/ui/Button';
import { ErrorLabel } from '@/components/ui/Forms';
import { NoAutoInput } from '@/components/ui/Input';
import { setSourceData } from '@/lib/api';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import { getConnectionId } from '@/lib/integrations/nango';
import { getNangoClientInstance } from '@/lib/integrations/nango.client';
import { DbSource, Project } from '@/types/types';

import { SyncStep, addSourceAndNangoConnection } from './shared';
import { Step, ConnectSourceStepState } from './Step';
import SourceDialog from '../SourceDialog';

const nango = getNangoClientInstance();

const ConnectStep = ({
  projectId,
  state,
  onDidConnect,
}: {
  projectId: Project['id'];
  state: ConnectSourceStepState;
  onDidConnect: (source: DbSource) => void;
}) => {
  const { mutate: mutateSources } = useSources();

  const connect = useCallback(async () => {
    try {
      const newSource = await addSourceAndNangoConnection(
        nango,
        projectId,
        'notion-pages',
      );
      if (!newSource) {
        toast.error('Error connecting Notion');
        return;
      }
      toast.success('Connected to Notion');
      await mutateSources();
      onDidConnect(newSource);
    } catch (e: any) {
      toast.error(`Error connecting to Notion: ${e.message || e}.`);
    }
  }, [onDidConnect, projectId, mutateSources]);

  return (
    <Step
      title="Authorize"
      description="Sign in to Notion and select pages in your workspace to sync."
      state={state}
    >
      <Button
        variant="cta"
        buttonSize="sm"
        onClick={connect}
        disabled={state === 'not_started' || state === 'complete'}
      >
        {state === 'complete' ? 'Authorized' : 'Authorize Notion'}
      </Button>
    </Step>
  );
};

const ConfigureStep = ({
  projectId,
  source,
  state,
  onSkipClicked,
}: {
  projectId: Project['id'];
  source: DbSource | undefined;
  state: ConnectSourceStepState;
  onSkipClicked: () => void;
}) => {
  const { mutate: mutateSources } = useSources();

  return (
    <Step
      title="Configure"
      description="Configure the source. You can always change the configuration later."
      state={state}
    >
      <Formik
        initialValues={{ displayName: '' }}
        validateOnMount
        onSubmit={async (values, { setSubmitting }) => {
          if (!projectId || !source) {
            return;
          }

          setSubmitting(true);
          await setSourceData(projectId, source.id, {
            ...(source.data as any),
            displayName: values.displayName,
          });
          setSubmitting(false);
          toast.success('Source configuration updated');
          await mutateSources();
        }}
      >
        {({ isSubmitting, isValid }) => (
          <Form className="flex h-full flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex flex-row items-center gap-2">
                <p className="text-sm font-medium text-neutral-300">
                  Display name (optional)
                </p>
              </div>
              <div className="flex flex-row gap-2">
                <Field
                  className="flex-grow"
                  type="text"
                  name="displayName"
                  inputSize="sm"
                  as={NoAutoInput}
                  disabled={isSubmitting || state === 'not_started'}
                />
              </div>
              <ErrorMessage name="identifier" component={ErrorLabel} />
            </div>
            <div className="flex flex-row gap-2">
              <Button
                className="flex-none"
                disabled={!isValid || state === 'not_started'}
                loading={isSubmitting}
                variant="plain"
                buttonSize="sm"
                type="submit"
              >
                Save
              </Button>
              <Button
                className="flex-none"
                disabled={state === 'not_started'}
                variant="ghost"
                buttonSize="sm"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onSkipClicked();
                }}
              >
                Skip
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Step>
  );
};

const NotionPagesOnboardingDialog = ({
  open,
  onOpenChange,
  source: defaultSource,
  children,
}: {
  open?: boolean;
  source?: DbSource;
  onOpenChange?: (open: boolean) => void;
  openPricingAsDialog?: boolean;
  onDidAddSource?: () => void;
  children?: ReactNode;
}) => {
  const { project } = useProject();
  const [source, setSource] = useState<DbSource | undefined>(undefined);
  const [didSkipConfiguration, setDidSkipConfiguration] = useState(false);

  useEffect(() => {
    setSource(defaultSource);
  }, [defaultSource]);

  if (!project?.id) {
    return <></>;
  }

  const connectionId = source?.id ? getConnectionId(source.id) : undefined;

  return (
    <SourceDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={children && <Dialog.Trigger asChild>{children}</Dialog.Trigger>}
      title="Connect Notion"
      description="Select pages to sync from your Notion workspaces."
    >
      <ConnectStep
        projectId={project.id}
        state={source ? 'complete' : 'in_progress'}
        onDidConnect={(source) => setSource(source)}
      />
      <ConfigureStep
        projectId={project.id}
        source={source}
        state={source ? 'in_progress' : 'not_started'}
        onSkipClicked={() => {
          setDidSkipConfiguration;
        }}
      />
      <SyncStep
        projectId={project.id}
        integrationId="notion-pages"
        connectionId={connectionId}
        state={source && didSkipConfiguration ? 'in_progress' : 'not_started'}
      />
    </SourceDialog>
  );
};

export default NotionPagesOnboardingDialog;
