import { useCallback, useMemo } from 'react';
import useSWR from 'swr';

import { DbSource, DbSyncQueueOverview } from '@/types/types';

import useProject from './use-project';
import { triggerSyncs } from '../integrations/nango.client';
import { fetcher } from '../utils';

export default function useSources() {
  const { project } = useProject();
  const {
    data: sources,
    mutate,
    error,
  } = useSWR(
    project?.id ? `/api/project/${project.id}/sources` : null,
    fetcher<DbSource[]>,
  );

  const { data: latestSyncQueues, mutate: mutateSyncQueues } = useSWR(
    project?.id ? `/api/project/${project.id}/sources/syncs/latest` : null,
    fetcher<DbSyncQueueOverview[]>,
    { refreshInterval: 10000 },
  );

  const loading = !sources && !error;

  const isOneSourceSyncing = useMemo(() => {
    return !!latestSyncQueues?.some((q) => q.status === 'running');
  }, [latestSyncQueues]);

  const syncSources = useCallback(
    async (sources: DbSource[]) => {
      if (!project?.id) {
        return;
      }

      // if (mutate) {
      //   const syncQueuesForSource = getSortedSyncQueuesForSource(source.id);
      //   const lastSyncQueue =
      //     syncQueuesForSource?.length > 0
      //       ? syncQueuesForSource[syncQueuesForSource.length - 1]
      //       : undefined;

      //   const currentSyncQueue: DbSyncQueueOverview = lastSyncQueue
      //     ? {
      //         ...lastSyncQueue,
      //         status: 'running',
      //       }
      //     : {
      //         source_id: source.id,
      //         created_at: formatISO(new Date()),
      //         ended_at: null,
      //         status: 'running',
      //       };

      //   const otherSyncQueues = (syncQueues || []).filter(
      //     (q) => q.source_id !== source.id,
      //   );

      //   mutateSyncQueues([...otherSyncQueues, currentSyncQueue]);
      // }

      await triggerSyncs(project.id, sources);
    },
    [project?.id],
  );

  const syncAllSources = useCallback(async () => {
    if (!sources || sources.length === 0) {
      return;
    }
    return syncSources(sources);
  }, [sources, syncSources]);

  return {
    sources: (sources || []) as DbSource[],
    syncSources,
    syncAllSources,
    latestSyncQueues,
    mutateSyncQueues,
    isOneSourceSyncing,
    loading,
    mutate,
  };
}
