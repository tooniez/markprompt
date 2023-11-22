import cn from 'classnames';
import { parseISO, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { FC, useMemo, useState } from 'react';
import useSWR from 'swr';

import { SkeletonTable } from '@/components/ui/Skeletons';
import {
  formatShortDateTimeInTimeZone,
  formatSystemDateTime,
} from '@/lib/date';
import { fetcher, pluralize } from '@/lib/utils';
import {
  DbSource,
  DbSyncQueue,
  DbSyncQueueLog,
  DbSyncQueueOverview,
  LogLevel,
  Project,
} from '@/types/types';

import { LogLevelTag, getTagForSyncQueue } from './utils';

type LogMessagesProps = {
  projectId: Project['id'];
  syncQueueId: DbSyncQueueOverview['id'];
};

type LogMessage = {
  level: LogLevel;
  message: string;
  timestamp: string;
};

const LogMessages: FC<LogMessagesProps> = ({ projectId, syncQueueId }) => {
  const { data: logs, error } = useSWR(
    projectId && syncQueueId
      ? `/api/project/${projectId}/syncs/${syncQueueId}/logs`
      : null,
    fetcher<DbSyncQueueLog[]>,
  );

  const loading = !logs && !error;

  return (
    <div className="relative flex w-full flex-col pb-4">
      {loading && (
        <div className="h-[130px] w-full p-4">
          <div className="relative">
            <SkeletonTable onDark loading={loading} />
          </div>
        </div>
      )}
      <div className="px-4 pt-4 text-xs">
        {logs?.map((log: LogMessage, i) => {
          return (
            <div
              key={`log-${i}`}
              className="flex flex-row gap-4 border-l border-neutral-800 py-2 pl-4"
            >
              <div className="w-[120px] flex-none whitespace-nowrap font-mono text-xs text-neutral-100">
                {formatShortDateTimeInTimeZone(parseISO(log.timestamp))}
              </div>
              <div className="w-[70px] flex-none whitespace-nowrap text-xs">
                <LogLevelTag level="warn" />
              </div>
              <div className="flex-grow font-mono text-neutral-100">
                {log.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type LogEntryProps = {
  projectId: Project['id'];
  syncQueue: DbSyncQueueOverview;
};

const LogEntry: FC<LogEntryProps> = ({ projectId, syncQueue }) => {
  const [isOpen, setOpen] = useState(false);

  const duration = useMemo(() => {
    const start = parseISO(syncQueue.created_at);
    if (!syncQueue.ended_at) {
      return undefined;
    }

    const end = parseISO(syncQueue.ended_at);
    const diff = differenceInMinutes(end, start);
    if (diff < 1) {
      return `${pluralize(
        differenceInSeconds(end, start),
        'second',
        'seconds',
      )}`;
    } else {
      return `${pluralize(diff, 'minute', 'minutes')}`;
    }
  }, [syncQueue.created_at, syncQueue.ended_at]);

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className="flex w-full cursor-pointer flex-row items-center gap-4 px-4  py-2 transition hover:bg-neutral-900"
        onClick={() => {
          setOpen((o) => !o);
        }}
      >
        <div className="w-[160px] flex-none whitespace-nowrap font-mono text-xs text-neutral-400">
          {formatSystemDateTime(parseISO(syncQueue.created_at))}
        </div>
        <div className="w-[160px] flex-none whitespace-nowrap font-mono text-xs text-neutral-400">
          {duration}
        </div>
        <div className="flex-grow items-center">
          {getTagForSyncQueue(syncQueue.status)}
        </div>
        <ChevronRight
          className={cn(
            'z-0 h-4 w-4 flex-none transform text-neutral-500 transition',
            {
              'rotate-90': isOpen,
            },
          )}
        />
      </div>
      {isOpen && (
        <LogMessages projectId={projectId} syncQueueId={syncQueue.id} />
      )}
    </div>
  );
};

type SyncQueueLogsProps = {
  projectId: Project['id'];
  sourceId: DbSource['id'];
};

export const SyncQueueLogs: FC<SyncQueueLogsProps> = ({
  projectId,
  sourceId,
}) => {
  const { data: syncQueues, error } = useSWR(
    projectId && sourceId
      ? `/api/project/${projectId}/sources/${sourceId}/syncs/overview`
      : null,
    fetcher<DbSyncQueueOverview[]>,
  );

  const loading = !syncQueues && !error;

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
    <div className="h-full">
      {syncQueues && syncQueues?.length > 0 ? (
        <div className="relative flex h-full w-full flex-col items-center overflow-y-auto pb-8 text-neutral-300">
          <div className="sticky top-0 z-10 mb-4 flex w-full flex-row items-center gap-4 border-b border-neutral-900 bg-neutral-1000 py-2 px-4 pb-2 text-xs text-neutral-500">
            <div className="w-[160px] flex-none">Started</div>
            <div className="w-[160px] flex-none">Duration</div>
            <div className="flex-grow items-center">Status</div>
          </div>
          {syncQueues.map((q, i) => {
            return (
              <LogEntry
                key={`sync-queue-${i}`}
                projectId={projectId}
                syncQueue={q}
              />
            );
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
