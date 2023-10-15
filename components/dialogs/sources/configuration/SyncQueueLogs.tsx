import { parseISO } from 'date-fns';
import { FC } from 'react';

import { SkeletonTable } from '@/components/ui/Skeletons';
import { Tag } from '@/components/ui/Tag';
import { formatSystemDateTime } from '@/lib/date';
import { DbSyncQueue, DbSyncQueueOverview } from '@/types/types';

export const getTagForSyncQueue = (status: DbSyncQueueOverview['status']) => {
  switch (status) {
    case 'complete':
      return <Tag color="green">Synced</Tag>;
    case 'canceled':
      return <Tag color="orange">Canceled</Tag>;
    case 'errored':
      return <Tag color="red">Errored</Tag>;
    case 'running':
      return <Tag color="fuchsia">Syncing</Tag>;
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
        {getTagForSyncQueue(syncQueue.status)}
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
  loading: boolean;
  syncQueues: DbSyncQueue[] | undefined;
};

export const SyncQueueLogs: FC<SyncQueueLogsProps> = ({
  loading,
  syncQueues,
}) => {
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
      {syncQueues && syncQueues?.length > 0 ? (
        <div className="flex w-full flex-col items-center gap-4 p-4">
          <div className="flex w-full flex-row items-center gap-2 border-b border-neutral-900 pb-2 text-xs text-neutral-500">
            <div className="w-[160px] flex-none">Started</div>
            <div className="flex w-[100px] flex-none items-center">Status</div>
            <div className="flex-grow overflow-hidden truncate">Message</div>
          </div>
          {syncQueues.map((q, i) => {
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
