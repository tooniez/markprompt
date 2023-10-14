import { formatISO, parseISO } from 'date-fns';
import { useCallback, useMemo } from 'react';
import useSWR from 'swr';

import { DbSource, DbSyncQueueOverview } from '@/types/types';

import useProject from './use-project';
import {
  getConnectionId,
  getIntegrationId,
  getSyncId,
} from '../integrations/nango';
import { triggerSync } from '../integrations/nango.client';
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

  const syncSource = useCallback(
    async (source: DbSource, mutate: boolean) => {
      if (!project?.id) {
        return;
      }

      const connectionId = getConnectionId(source);
      const integrationId = getIntegrationId(source);

      if (!connectionId || !integrationId) {
        return;
      }

      if (mutate) {
        const syncQueuesForSource = getSortedSyncQueuesForSource(source.id);
        const lastSyncQueue =
          syncQueuesForSource?.length > 0
            ? syncQueuesForSource[syncQueuesForSource.length - 1]
            : undefined;

        const currentSyncQueue: DbSyncQueueOverview = lastSyncQueue
          ? {
              ...lastSyncQueue,
              status: 'running',
            }
          : {
              source_id: source.id,
              created_at: formatISO(new Date()),
              ended_at: null,
              status: 'running',
            };

        const otherSyncQueues = (syncQueues || []).filter(
          (q) => q.source_id !== source.id,
        );

        mutateSyncQueues([...otherSyncQueues, currentSyncQueue]);
      }

      await triggerSync(project.id, integrationId, connectionId, [
        getSyncId(integrationId),
      ]);
    },
    [getSortedSyncQueuesForSource, mutateSyncQueues, project?.id, syncQueues],
  );

  const syncAllSources = useCallback(async () => {}, []);

  return {
    sources: (sources || []) as DbSource[],
    syncQueues,
    syncSource,
    syncAllSources,
    mutateSyncQueues,
    getSortedSyncQueuesForSource,
    isOneSourceSyncing,
    loading,
    mutate,
  };
}
