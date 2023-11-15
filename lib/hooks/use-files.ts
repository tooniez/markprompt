import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { isPresent } from 'ts-is-present';

import { DbFileWithoutContent, DbSource } from '@/types/types';

import useProject from './use-project';
import useSources from './use-sources';
import { useLocalStorage } from './utils/use-localstorage';
import { fetcher, formatUrl } from '../utils';

export default function useFiles() {
  const { project } = useProject();
  const { sources } = useSources();
  const [page, setPage] = useState(0);

  // Using a non-primitive value, like an array, causes the useLocalStorage
  // effect to trigger infinitely.
  const [storedSourcesString, setStoredSourcesString] = useLocalStorage<
    string | undefined
  >(!project?.id ? null : `${project?.id}:data:filters:sources`, undefined);

  const pageSize = 50;

  const sourceIdsFilter = useMemo(() => {
    if (!storedSourcesString) {
      return [];
    }
    return JSON.parse(storedSourcesString) as string[];
  }, [storedSourcesString]);

  const {
    data: paginatedFiles,
    mutate,
    error,
  } = useSWR(
    project?.id
      ? formatUrl(`/api/project/${project.id}/files`, {
          limit: `${pageSize}`,
          page: `${page || 0}`,
          ...(sourceIdsFilter?.length > 0
            ? { sourceIdsFilter: JSON.stringify(sourceIdsFilter) }
            : {}),
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

  useEffect(() => {
    if (!storedSourcesString || sources?.length === 0) {
      return;
    }
    const sourceIds = sources?.map((s) => s.id) || [];
    const availableSources = (JSON.parse(storedSourcesString) || []).filter(
      (s: string) => sourceIds.includes(s),
    );
    if (availableSources.length !== storedSourcesString?.length) {
      setStoredSourcesString(JSON.stringify(availableSources));
    }
  }, [setStoredSourcesString, sources, storedSourcesString]);

  const setSourceIdsFilter = useCallback(
    (ids: DbSource['id'][]) => {
      setStoredSourcesString(JSON.stringify(ids));
    },
    [setStoredSourcesString],
  );

  return {
    paginatedFiles,
    numFiles,
    loading,
    mutate,
    page,
    pageSize,
    hasMorePages,
    setPage,
    sourceIdsFilter,
    setSourceIdsFilter,
    mutateCount,
  };
}
