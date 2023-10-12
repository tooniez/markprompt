import * as Dialog from '@radix-ui/react-dialog';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import Button from '@/components/ui/Button';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import { getConnectionId } from '@/lib/integrations/nango';
import { getNangoClientInstance } from '@/lib/integrations/nango.client';
import { DbSource, Project } from '@/types/types';

import { SyncStep, addSourceAndNangoConnection } from './shared';
import { Step, ConnectSourceStepState } from './Step';
import { NotionPagesSettings } from '../settings/NotionPages';
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
  const [isLoading, setLoading] = useState(false);

  const connect = useCallback(async () => {
    try {
      setLoading(true);
      const newSource = await addSourceAndNangoConnection(
        nango,
        projectId,
        'notion-pages',
      );

      setLoading(false);

      if (!newSource) {
        toast.error('Error connecting to Notion');
        return;
      }

      await mutateSources();
      onDidConnect(newSource);
      toast.success('Connected to Notion');
    } catch (e: any) {
      setLoading(false);
      if (e?.type === 'callback_err') {
        // This is the error that is thrown when the user closes or
        // cancels the auth popup. No need to show an error here
        toast.error(`Connection canceled`);
        return;
      }
      toast.error(`Error connecting to Notion`);
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
        loading={isLoading}
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
  onCompletedOrSkipped,
}: {
  projectId: Project['id'];
  source: DbSource | undefined;
  state: ConnectSourceStepState;
  onCompletedOrSkipped: () => void;
}) => {
  return (
    <Step
      title="Configure"
      description="Configure the source. You can always change the configuration later."
      state={state}
    >
      <NotionPagesSettings
        projectId={projectId}
        source={source}
        forceDisabled={state === 'not_started'}
        showSkip={true}
        onDidCompletedOrSkip={onCompletedOrSkipped}
      />
    </Step>
  );
};

const NotionPagesOnboardingDialog = ({
  open,
  onOpenChange,
  source: defaultSource,
  children,
}: {
  source?: DbSource;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  openPricingAsDialog?: boolean;
  onDidAddSource?: () => void;
  children?: ReactNode;
}) => {
  const { project } = useProject();
  const [source, setSource] = useState<DbSource | undefined>(undefined);
  const [didCompleteConfiguration, setDidCompleteConfiguration] =
    useState(false);

  useEffect(() => {
    setSource(defaultSource);
  }, [defaultSource]);

  if (!project?.id) {
    return <></>;
  }

  const connectionId = source?.id ? getConnectionId(source) : undefined;

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
        state={
          didCompleteConfiguration
            ? 'complete'
            : source
            ? 'in_progress'
            : 'not_started'
        }
        onCompletedOrSkipped={() => {
          setDidCompleteConfiguration(true);
        }}
      />
      <SyncStep
        projectId={project.id}
        integrationId="notion-pages"
        connectionId={connectionId}
        state={
          source && didCompleteConfiguration ? 'in_progress' : 'not_started'
        }
      />
    </SourceDialog>
  );
};

export default NotionPagesOnboardingDialog;
