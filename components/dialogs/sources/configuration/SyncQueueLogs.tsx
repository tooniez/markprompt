import { parseISO } from 'date-fns';
import { FC, useMemo } from 'react';
import useSWR from 'swr';

import { SkeletonTable } from '@/components/ui/Skeletons';
import { Tag } from '@/components/ui/Tag';
import { formatSystemDateTime } from '@/lib/date';
import useProject from '@/lib/hooks/use-project';
import { fetcher } from '@/lib/utils';
import { DbSource, DbSyncQueue, DbSyncQueueOverview } from '@/types/types';

export const getTagForSyncQueue = (syncQueue: DbSyncQueueOverview) => {
  switch (syncQueue.status) {
    case 'complete':
      return <Tag color="green">Synced</Tag>;
    case 'canceled':
      return <Tag color="orange">Canceled</Tag>;
    case 'errored':
      return <Tag color="red">Errored</Tag>;
    case 'running':
      return <Tag color="fuchsia">Running</Tag>;
  }
};

type LogEntryProps = {
  syncQueue: DbSyncQueue;
};

const LogEntry: FC<LogEntryProps> = ({ syncQueue }) => {
  return (
    <div className="flex w-full flex-row items-center gap-2">
      <div className="w-[160px] flex-none whitespace-nowrap font-mono text-xs text-neutral-300">
        {formatSystemDateTime(parseISO(syncQueue.created_at))}
      </div>
      <div className="flex w-[100px] flex-none items-center">
        {getTagForSyncQueue(syncQueue)}
      </div>
      <div className="flex-grow overflow-hidden truncate font-mono text-xs text-neutral-300">
        {syncQueue.logs.map((log: any, i) => {
          return <p key={`log-${syncQueue.id}`}>{log.message}</p>;
        })}
      </div>
    </div>
  );
};

type SyncQueueLogsProps = {
  sourceId?: DbSource['id'];
};

export const SyncQueueLogs: FC<SyncQueueLogsProps> = ({ sourceId }) => {
  const { project } = useProject();

  const { data: syncQueues, error } = useSWR(
    project?.id && sourceId
      ? `/api/project/${project.id}/sources/syncs/${sourceId}`
      : null,
    fetcher<DbSyncQueue[]>,
  );

  const loading = !syncQueues && !error;

  const sortedSyncQueues = useMemo(() => {
    if (!sourceId) {
      return [];
    }
    return (syncQueues || [])
      .filter((q) => q.source_id === sourceId)
      .sort(
        (a, b) =>
          parseISO(b.created_at).getTime() - parseISO(b.created_at).getTime(),
      );
  }, [sourceId, syncQueues]);

  if (loading) {
    return (
      <div className="min-h-[200px] p-4">
        <div className="relative">
          <SkeletonTable onDark loading />
        </div>
      </div>
    );
  }

  return (
    <div>
      {sortedSyncQueues?.length > 0 ? (
        <div className="flex w-full flex-col items-center gap-4 p-4">
          <div className="flex w-full flex-row items-center gap-2 border-b border-neutral-900 pb-2 text-xs text-neutral-500">
            <div className="w-[160px] flex-none">Started</div>
            <div className="flex w-[100px] flex-none items-center">Status</div>
            <div className="flex-grow overflow-hidden truncate">Message</div>
          </div>
          {sortedSyncQueues.map((q, i) => {
            return <LogEntry key={`sync-queue-${i}`} syncQueue={q} />;
          })}
        </div>
      ) : (
        <p className="p-4 text-sm text-neutral-500">
          No sync has been initiated. Press &ldquo;Sync now&rdquo; to start a
          sync.
        </p>
      )}
    </div>
  );
};
