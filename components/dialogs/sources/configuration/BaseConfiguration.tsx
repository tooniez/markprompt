import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { parseISO } from 'date-fns';
import dynamic from 'next/dynamic';
import { FC, JSXElementConstructor, ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

import Button from '@/components/ui/Button';
import { CTABar } from '@/components/ui/SettingsCard';
import { Tag } from '@/components/ui/Tag';
import { formatShortDateTimeInTimeZone } from '@/lib/date';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import {
  getIntegrationId,
  getIntegrationName,
  getSyncData,
} from '@/lib/integrations/nango';
import { triggerSyncs } from '@/lib/integrations/nango.client';
import { fetcher } from '@/lib/utils';
import {
  DbSource,
  DbSyncQueue,
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
  const { latestSyncQueues, syncSources } = useSources();
  const [syncStarted, setSyncStarted] = useState(false);
  const [showRemoveSourceDialog, setShowRemoveSourceDialog] = useState(false);

  const { data: allSyncQueuesForSource, error } = useSWR(
    project?.id && source?.id
      ? `/api/project/${project.id}/sources/syncs/${source?.id}`
      : null,
    fetcher<DbSyncQueue[]>,
  );

  const currentStatus = useMemo(() => {
    return latestSyncQueues?.find((q) => q.source_id === source?.id)?.status;
  }, [latestSyncQueues, source?.id]);

  const loadingSyncQueues = !allSyncQueuesForSource && !error;

  const lastCompletedSyncDate = useMemo(() => {
    return allSyncQueuesForSource?.find((q) => q.status === 'complete')
      ?.ended_at;
  }, [allSyncQueuesForSource]);

  const lastSyncQueue = allSyncQueuesForSource?.[0];

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

  const integrationId = getIntegrationId(source);

  return (
    <SourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      Accessory={
        currentStatus ? (
          getTagForSyncQueue(currentStatus)
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
            {integrationId && (
              <div className="FormField mb-8">
                <p className="FormLabel">Source</p>
                <div className="flex flex-row items-center gap-2 overflow-hidden">
                  {Icon && (
                    <Icon className="h-5 w-5 flex-none text-neutral-500" />
                  )}
                  <div className="flex-grow overflow-hidden truncate text-sm text-neutral-300">
                    {getIntegrationName(integrationId)}
                  </div>
                </div>
              </div>
            )}
            {children}
            <div className="mt-12 border-t border-neutral-900 pt-4" />
            <Button
              buttonSize="sm"
              variant="textDanger"
              noPadding
              light
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
              <SyncQueueLogs
                loading={loadingSyncQueues}
                syncQueues={allSyncQueuesForSource}
              />
            </div>
          </Tabs.Content>
        </Tabs.Root>
        <div className="flex-none">
          <CTABar>
            <div className="flex flex-grow flex-row items-center gap-2">
              <div className="flex-grow">
                {lastCompletedSyncDate && (
                  <p className="animate-fade-in text-xs text-neutral-500">
                    Last sync completed on{' '}
                    {formatShortDateTimeInTimeZone(
                      parseISO(lastCompletedSyncDate),
                    )}
                  </p>
                )}
              </div>
              <Button
                className="flex-none"
                loading={syncStarted}
                disabled={lastSyncQueue?.status === 'running'}
                variant="cta"
                buttonSize="sm"
                onClick={() => syncSources([source], setSyncStarted)}
              >
                {lastSyncQueue?.status === 'running'
                  ? 'Initiating sync...'
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
