import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { parseISO } from 'date-fns';
import dynamic from 'next/dynamic';
import { FC, JSXElementConstructor, ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';

import Button from '@/components/ui/Button';
import { CTABar } from '@/components/ui/SettingsCard';
import { Tag } from '@/components/ui/Tag';
import { formatShortDateTimeInTimeZone } from '@/lib/date';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import {
  getConnectionId,
  getIntegrationId,
  getIntegrationName,
  getSyncId,
} from '@/lib/integrations/nango';
import { triggerSync } from '@/lib/integrations/nango.client';
import {
  DbSource,
  NangoSourceDataType,
  SourceConfigurationView,
} from '@/types/types';

import { SyncQueueLogs, getTagForSyncQueue } from './SyncQueueLogs';
import SourceDialog from '../SourceDialog';

const RemoveSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/RemoveSource'),
);

type BaseConfigurationDialogProps = {
  source?: DbSource;
  defaultView?: SourceConfigurationView;
  Icon?: JSXElementConstructor<any>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

export const BaseConfigurationDialog: FC<BaseConfigurationDialogProps> = ({
  source,
  defaultView,
  Icon,
  open,
  onOpenChange,
  children,
}) => {
  const { project } = useProject();
  const { getSortedSyncQueuesForSource } = useSources();
  const [syncStarted, setSyncStarted] = useState(false);
  const [showRemoveSourceDialog, setShowRemoveSourceDialog] = useState(false);

  const sortedSyncQueues = useMemo(() => {
    if (!source?.id) {
      return [];
    }
    return getSortedSyncQueuesForSource(source.id);
  }, [getSortedSyncQueuesForSource, source]);

  const { lastSyncQueue, lastSuccessfulSyncQueue } = useMemo(() => {
    if (!source?.id) {
      return { lastSyncQueue: undefined, lastSuccessfulSyncQueue: undefined };
    }
    const lastSyncQueue =
      sortedSyncQueues?.length > 0
        ? sortedSyncQueues[sortedSyncQueues.length - 1]
        : undefined;
    const successfulSyncs = sortedSyncQueues.filter(
      (s) => s.status === 'complete',
    );
    const lastSuccessfulSyncQueue =
      successfulSyncs?.length > 0
        ? successfulSyncs[successfulSyncs.length - 1]
        : undefined;
    return { lastSyncQueue, lastSuccessfulSyncQueue };
  }, [sortedSyncQueues, source]);

  const title = useMemo(() => {
    if (source?.type !== 'nango') {
      return 'Configuration';
    }
    const data = source?.data as NangoSourceDataType;
    return data?.displayName || getIntegrationName(data.integrationId);
  }, [source]);

  if (!project?.id || !source) {
    return <></>;
  }

  return (
    <SourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      Icon={Icon}
      Accessory={
        lastSyncQueue ? (
          getTagForSyncQueue(lastSyncQueue)
        ) : (
          <Tag color="orange">Not synced</Tag>
        )
      }
    >
      <div className="flex h-full flex-col">
        <Tabs.Root
          className="TabsRoot flex-grow overflow-hidden"
          defaultValue={defaultView || 'configuration'}
        >
          <Tabs.List className="TabsList" aria-label="Configure source">
            <Tabs.Trigger className="TabsTrigger" value="configuration">
              Configuration
            </Tabs.Trigger>
            <Tabs.Trigger className="TabsTrigger" value="logs">
              Logs
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content
            className="TabsContent flex-grow overflow-y-auto px-4 py-8"
            value="configuration"
          >
            {children}
            <div className="mt-12 border-t border-neutral-900 pt-8" />
            <Button
              buttonSize="sm"
              variant="plainDanger"
              onClick={() => {
                setShowRemoveSourceDialog(true);
              }}
            >
              Remove source
            </Button>
          </Tabs.Content>
          <Tabs.Content
            className="TabsContent flex-grow overflow-y-auto"
            value="logs"
          >
            <div className="TabsContent flex-grow overflow-y-auto">
              <SyncQueueLogs sourceId={source.id} />
            </div>
          </Tabs.Content>
        </Tabs.Root>
        <div className="flex-none">
          <CTABar>
            <div className="flex flex-grow flex-row items-center gap-2">
              {lastSuccessfulSyncQueue?.ended_at && (
                <p className="flex-grow text-xs text-neutral-500">
                  Last sync completed on{' '}
                  {formatShortDateTimeInTimeZone(
                    parseISO(lastSuccessfulSyncQueue.ended_at),
                  )}
                </p>
              )}
              <Button
                className="flex-none"
                loading={syncStarted}
                disabled={lastSyncQueue?.status === 'running'}
                variant="cta"
                buttonSize="sm"
                onClick={async () => {
                  const integrationId = getIntegrationId(source);
                  const connectionId = getConnectionId(source);

                  if (!integrationId || !connectionId) {
                    return;
                  }

                  setSyncStarted(true);
                  await triggerSync(project.id, integrationId, connectionId, [
                    getSyncId(integrationId),
                  ]);
                  setSyncStarted(false);
                  toast.success('Sync initiated');
                }}
              >
                {lastSyncQueue?.status === 'running'
                  ? 'Syncing...'
                  : 'Sync now'}
              </Button>
            </div>
          </CTABar>
        </div>
      </div>
      <Dialog.Root
        open={!!showRemoveSourceDialog}
        onOpenChange={() => setShowRemoveSourceDialog(false)}
      >
        <RemoveSourceDialog
          projectId={project.id}
          source={source}
          onComplete={() => setShowRemoveSourceDialog(false)}
        />
      </Dialog.Root>
    </SourceDialog>
  );
};
