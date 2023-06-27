import useSWR from 'swr';

import { FileStats } from '@/types/types';

import useTeam from './use-team';
import {
  getEmbeddingTokensAllowance,
  isInifiniteEmbeddingsTokensAllowance as _isInifiniteEmbeddingsTokensAllowance,
} from '../stripe/tiers';
import { fetcher } from '../utils';

export default function useUsage() {
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

  const numTokensPerTeamAllowance =
    (team && getEmbeddingTokensAllowance(team)) || 0;

  const numTokensPerTeamRemainingAllowance = Math.max(
    0,
    numTokensPerTeamAllowance - (fileStats?.tokenCount || 0),
  );

  const isInfiniteEmbeddingsTokensAllowance =
    _isInifiniteEmbeddingsTokensAllowance(numTokensPerTeamAllowance);

  return {
    numTokensInTeam: fileStats?.tokenCount || 0,
    numTokensPerTeamAllowance,
    numTokensPerTeamRemainingAllowance,
    isInfiniteEmbeddingsTokensAllowance,
    loading,
    mutate,
  };
}
