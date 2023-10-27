import useSWR from 'swr';

import { FileStats } from '@/types/types';

import useTeam from './use-team';
import {
  getEmbeddingTokensAllowance,
  isInifiniteEmbeddingsTokensAllowance as _isInifiniteEmbeddingsTokensAllowance,
  INFINITE_TOKEN_ALLOWANCE,
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

  const numTokensPerTeamRemainingAllowance =
    numTokensPerTeamAllowance === INFINITE_TOKEN_ALLOWANCE
      ? INFINITE_TOKEN_ALLOWANCE
      : Math.max(0, numTokensPerTeamAllowance - (fileStats?.tokenCount || 0));

  const isInfiniteEmbeddingsTokensAllowance =
    _isInifiniteEmbeddingsTokensAllowance(numTokensPerTeamAllowance);

  const canAddMoreContent =
    numTokensPerTeamRemainingAllowance === INFINITE_TOKEN_ALLOWANCE ||
    numTokensPerTeamRemainingAllowance > 0;
  return {
    numTokensInTeam: fileStats?.tokenCount || 0,
    numTokensPerTeamAllowance,
    numTokensPerTeamRemainingAllowance,
    isInfiniteEmbeddingsTokensAllowance,
    canAddMoreContent,
    loading,
    mutate,
  };
}
