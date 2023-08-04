import { useRouter } from 'next/router';
import useSWR from 'swr';

import { DbFile } from '@/types/types';

import useProject from './use-project';
import { fetcher } from '../utils';

export default function useFile() {
  const router = useRouter();
  const { project } = useProject();

  const {
    data: file,
    mutate,
    error,
  } = useSWR(
    project?.id && router.query?.fileId
      ? `/api/project/${project.id}/files/${router.query?.fileId}`
      : null,
    fetcher<DbFile[]>,
  );

  const loading = !file && !error;

  return { file, loading, mutate };
}
