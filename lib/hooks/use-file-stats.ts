import useSWR from 'swr';

import { FileStats } from '@/types/types';

import useTeam from './use-team';
import { fetcher } from '../utils';

export default function useFileStats() {
  const { team } = useTeam();
  const {
    data: fileStats,
    mutate,
    error,
  } = useSWR(
    team?.id ? `/api/team/${team.id}/file-stats` : null,
    fetcher<FileStats>,
  );

  const loading = !fileStats && !error;

  console.log('fileStats', JSON.stringify(fileStats, null, 2));
  return { fileStats, loading, mutate };
}
