import { useCallback } from 'react';
import useSWR from 'swr';

import { DbSource, DbSyncQueue } from '@/types/types';

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
    fetcher<
      Pick<DbSyncQueue, 'source_id' | 'created_at' | 'ended_at' | 'status'>[]
    >,
    { refreshInterval: 1000 },
  );

  const loading = !sources && !error;

  return {
    sources: (sources || []) as DbSource[],
    syncQueues,
    mutateSyncQueues,
    loading,
    mutate,
  };
}
