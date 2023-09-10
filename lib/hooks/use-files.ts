import { useState } from 'react';
import useSWR from 'swr';

import { DbFileWithoutContent } from '@/types/types';

import useProject from './use-project';
import { fetcher, formatUrl } from '../utils';

export default function useFiles() {
  const { project } = useProject();
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const {
    data: paginatedFiles,
    mutate,
    error,
  } = useSWR(
    project?.id
      ? formatUrl(`/api/project/${project.id}/files`, {
          limit: `${pageSize}`,
          page: `${page || 0}`,
        })
      : null,
    fetcher<DbFileWithoutContent[]>,
  );

  const { data: countData, mutate: mutateCount } = useSWR(
    project?.id ? `/api/project/${project.id}/files/count` : null,
    fetcher<{ count: number }>,
  );

  const loading = !paginatedFiles && !error;
  const numFiles = countData?.count || 0;
  const hasMorePages = (page + 1) * pageSize < numFiles;

  return {
    paginatedFiles,
    numFiles,
    loading,
    mutate,
    page,
    pageSize,
    hasMorePages,
    setPage,
    mutateCount,
  };
}
