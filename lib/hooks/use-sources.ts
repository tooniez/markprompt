import useSWR from 'swr';

import { Source } from '@/types/types';

import { fetcher } from '../utils';
import useProject from './use-project';

export default function useSources() {
  const { project } = useProject();
  const {
    data: sources,
    mutate,
    error,
  } = useSWR(
    project?.id ? `/api/project/${project.id}/sources` : null,
    fetcher<Source[]>,
  );

  const loading = !sources && !error;

  return { sources: (sources || []) as Source[], loading, mutate };
}
