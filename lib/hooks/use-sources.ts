import useSWR from 'swr';

import { DbSource } from '@/types/types';

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

  const loading = !sources && !error;

  return { sources: (sources || []) as DbSource[], loading, mutate };
}
