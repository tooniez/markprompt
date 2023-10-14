import { useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { isPresent } from 'ts-is-present';

import { DbSource, DbSyncQueueOverview } from '@/types/types';

import useFiles from './use-files';
import useProject from './use-project';
import useUsage from './use-usage';
import { getSyncData } from '../integrations/nango';
import { triggerSyncs } from '../integrations/nango.client';
import { fetcher } from '../utils';

export default function useSources() {
  const { project } = useProject();
  const { mutate: mutateFiles } = useFiles();
  const { mutate: mutateFileStats } = useUsage();
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

  const syncAllSources = useCallback(async () => {
    if (!project?.id || !sources || sources.length === 0) {
      return;
    }
    return triggerSyncs(
      project.id,
      sources.map((d) => getSyncData(d)).filter(isPresent),
    );
  }, [project?.id, sources]);

  const syncSources = useCallback(
    (sources: DbSource[], onSyncStateUpdate?: (started: boolean) => void) => {
      if (!project?.id) {
        return;
      }
      const data = sources.map((s) => getSyncData(s)).filter(isPresent);
      if (data.length === 0) {
        return;
      }
      onSyncStateUpdate?.(true);
      const triggerSyncPromise = triggerSyncs(project.id, data);
      toast.promise(triggerSyncPromise, {
        loading: 'Initiating sync...',
        success: () => {
          return 'Sync has been initiated';
        },
        error: 'Error initiating sync',
        finally: () => {
          onSyncStateUpdate?.(false);
        },
      });
    },
    [project?.id],
  );

  return {
    sources: (sources || []) as DbSource[],
    syncAllSources,
    syncSources,
    latestSyncQueues,
    mutateSyncQueues,
    loading,
    mutate,
  };
}
