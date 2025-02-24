import useSWR from 'swr';

import { DbFileWithoutContent } from '@/types/types';

import useProject from './use-project';
import { fetcher } from '../utils';

export default function useFiles() {
  const { project } = useProject();
  const {
    data: files,
    mutate,
    error,
  } = useSWR(
    project?.id ? `/api/project/${project.id}/files` : null,
    fetcher<DbFileWithoutContent[]>,
  );

  const loading = !files && !error;

  return { files, loading, mutate };
}
