import { parseISO } from 'date-fns';
import { useCallback } from 'react';
import useSWR from 'swr';

import { DbSource, DbSyncQueueOverview } from '@/types/types';

import useProject from './use-project';
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

  const { data: syncQueues, mutate: mutateSyncQueues } = useSWR(
    project?.id ? `/api/project/${project.id}/sources/syncs` : null,
    fetcher<DbSyncQueueOverview[]>,
    { refreshInterval: 1000 },
  );

  const loading = !sources && !error;

  const getSortedSyncQueuesForSource = useCallback(
    (sourceId: DbSource['id']) => {
      return (syncQueues || [])
        .filter((q) => q.source_id === sourceId)
        .sort(
          (a, b) =>
            parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime(),
        );
    },
    [syncQueues],
  );

  return {
    sources: (sources || []) as DbSource[],
    syncQueues,
    mutateSyncQueues,
    getSortedSyncQueuesForSource,
    loading,
    mutate,
  };
}
