import { Connection } from '@nangohq/node/dist/types';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { parseISO } from 'date-fns';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FC, JSXElementConstructor, ReactNode, useMemo, useState } from 'react';
import useSWR from 'swr';

import Button from '@/components/ui/Button';
import {
  FormField,
  FormHeading,
  FormHeadingGroup,
  FormLabel,
  FormSubHeading,
} from '@/components/ui/Forms';
import { CTABar } from '@/components/ui/SettingsCard';
import { Tag } from '@/components/ui/Tag';
import { formatShortDateTimeInTimeZone } from '@/lib/date';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import {
  getIntegrationEnvironment,
  getIntegrationEnvironmentName,
  getIntegrationId,
  getIntegrationName,
  getSyncData,
} from '@/lib/integrations/nango';
import { fetcher, formatUrl, removeTrailingSlash } from '@/lib/utils';
import { removeSchema } from '@/lib/utils.nodeps';
import {
  DbSource,
  DbSyncQueueOverview,
  NangoSourceDataType,
  SourceConfigurationView,
} from '@/types/types';

import { SyncQueueLogs } from './SyncQueueLogs';
import { SyncQueueTag } from './utils';
import SourceDialog from '../SourceDialog';

const DeleteSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/DeleteSource'),
);

type BaseConfigurationDialogProps = {
  source?: DbSource;
  defaultView?: SourceConfigurationView;
  Icon?: JSXElementConstructor<any>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

const StopSyncButton = ({ source }: { source: DbSource }) => {
  const [isStopping, setStopping] = useState(false);
  const { stopSync } = useSources();

  return (
    <Button
      className="flex-none"
      variant="plain"
      buttonSize="sm"
      loading={isStopping}
      onClick={async () => {
        if (!source) {
          return;
        }
        setStopping(true);
        await stopSync(source);
        setStopping(false);
      }}
    >
      Stop syncing
    </Button>
  );
};

const RetrainOnlyButton = ({ source }: { source: DbSource }) => {
  const [isStarting, setStarting] = useState(false);
  const { retrainOnly } = useSources();

  return (
    <Button
      className="flex-none"
      variant="plain"
      buttonSize="sm"
      loading={isStarting}
      onClick={async () => {
        if (!source) {
          return;
        }
        setStarting(true);
        await retrainOnly(source);
        setStarting(false);
      }}
    >
      Retrain only
    </Button>
  );
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
  const { syncSources, getStatusForSource } = useSources();
  const [syncStarted, setSyncStarted] = useState(false);
  const [showDeleteSourceDialog, setShowDeleteSourceDialog] = useState(false);

  const { data: lastSyncQueue } = useSWR(
    project?.id && source?.id
      ? `/api/project/${project.id}/sources/${source?.id}/syncs/last-sync`
      : null,
    fetcher<DbSyncQueueOverview>,
  );

  const syncData = source && getSyncData(source);

  const { data: connection } = useSWR(
    project?.id && syncData?.integrationId && syncData?.connectionId
      ? formatUrl(
          `/api/project/${project.id}/integrations/nango/get-connection`,
          {
            integrationId: syncData.integrationId,
            connectionId: syncData.connectionId,
          },
        )
      : null,
    fetcher<{ connection: Connection }>,
  );

  const currentStatus = useMemo(() => {
    return source?.id ? getStatusForSource(source.id) : undefined;
  }, [getStatusForSource, source?.id]);

  const title = useMemo(() => {
    if (source?.type !== 'nango') {
      return 'Configuration';
    }
    const data = source?.data as NangoSourceDataType;
    return data?.name || getIntegrationName(data.integrationId);
  }, [source]);

  const integrationId = source && getIntegrationId(source);

  // Proper to integrations like Salesforce
  const integrationEnvironment =
    integrationId && getIntegrationEnvironment(integrationId);
  const instanceUrl = (source?.data as NangoSourceDataType)?.connectionConfig
    ?.instance_url;

  // Proper to integrations like unauthed websites
  const baseUrl = (source?.data as NangoSourceDataType)?.syncMetadata?.baseUrl;

  return (
    <SourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      Accessory={
        currentStatus ? (
          <SyncQueueTag status={currentStatus} />
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
            <div className="FormRoot mb-6 border-b border-neutral-900 pb-6">
              <FormField>
                <FormLabel>Source</FormLabel>
                <div className="flex flex-row items-center gap-2 overflow-hidden">
                  {Icon && (
                    <Icon className="h-5 w-5 flex-none text-neutral-500" />
                  )}
                  <div className="flex-grow overflow-hidden truncate text-sm text-neutral-300">
                    {integrationId ? getIntegrationName(integrationId) : ''}
                  </div>
                </div>
              </FormField>
              {integrationEnvironment && (
                <FormField>
                  <FormLabel>Environment</FormLabel>
                  <div className="truncate text-sm text-neutral-300">
                    {getIntegrationEnvironmentName(integrationEnvironment)}
                  </div>
                </FormField>
              )}
              {instanceUrl && (
                <FormField>
                  <FormLabel>Instance URL</FormLabel>
                  <Link
                    href={instanceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="subtle-underline self-start truncate text-sm text-neutral-300"
                  >
                    {removeTrailingSlash(instanceUrl)}
                  </Link>
                </FormField>
              )}
              {baseUrl && (
                <FormField>
                  <FormLabel>Base URL</FormLabel>
                  <Link
                    href={baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="subtle-underline self-start truncate text-sm text-neutral-300"
                  >
                    {removeSchema(removeTrailingSlash(baseUrl))}
                  </Link>
                </FormField>
              )}
            </div>
            {children}
            <div className="mt-8 flex flex-col items-start gap-2 border-t border-neutral-900 pt-8">
              {connection && source && <RetrainOnlyButton source={source} />}
              <Button
                buttonSize="sm"
                variant="plainDanger"
                onClick={() => {
                  setShowDeleteSourceDialog(true);
                }}
              >
                Delete source
              </Button>
            </div>
          </Tabs.Content>
          <Tabs.Content
            className="TabsContent flex-grow overflow-y-auto"
            value="logs"
          >
            {project?.id && source?.id && (
              <SyncQueueLogs projectId={project.id} sourceId={source.id} />
            )}
          </Tabs.Content>
        </Tabs.Root>
        <div className="flex-none">
          <CTABar>
            <div className="flex flex-grow flex-row items-center gap-2">
              <div className="flex-grow">
                {lastSyncQueue?.created_at && (
                  <p className="animate-fade-in text-xs text-neutral-500">
                    Last sync completed on{' '}
                    {formatShortDateTimeInTimeZone(
                      parseISO(lastSyncQueue.created_at),
                    )}
                  </p>
                )}
              </div>
              {source && currentStatus === 'running' && (
                <StopSyncButton source={source} />
              )}
              <Button
                className="flex-none"
                loading={syncStarted}
                disabled={currentStatus === 'running'}
                variant="cta"
                buttonSize="sm"
                onClick={() => {
                  if (!source) {
                    return;
                  }
                  syncSources([source], setSyncStarted);
                }}
              >
                {currentStatus === 'running' ? 'Syncing...' : 'Sync now'}
              </Button>
            </div>
          </CTABar>
        </div>
      </div>
      {project?.id && source && (
        <Dialog.Root
          open={!!showDeleteSourceDialog}
          onOpenChange={() => setShowDeleteSourceDialog(false)}
        >
          <DeleteSourceDialog
            projectId={project.id}
            source={source}
            onComplete={() => setShowDeleteSourceDialog(false)}
          />
        </Dialog.Root>
      )}
    </SourceDialog>
  );
};
