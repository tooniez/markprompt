import { useState } from 'react';
import useSWR from 'swr';

import { DbFileWithoutContent } from '@/types/types';

import useProject from './use-project';
import { fetcher, formatUrl } from '../utils';

export default function useFiles() {
  const { project } = useProject();
  const [page, setPage] = useState(0);

  const {
    data: paginatedFiles,
    mutate,
    error,
  } = useSWR(
    project?.id
      ? formatUrl(`/api/project/${project.id}/files`, {
          limit: `${50}`,
          page: `${page || 0}`,
        })
      : null,
    fetcher<DbFileWithoutContent[]>,
  );

  const { data: countData } = useSWR(
    project?.id ? `/api/project/${project.id}/files/count` : null,
    fetcher<{ count: number }>,
  );

  const loading = !paginatedFiles && !error;

  return {
    paginatedFiles,
    count: countData?.count || 0,
    loading,
    mutate,
    page,
    setPage,
  };
}
