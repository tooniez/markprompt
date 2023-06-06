import { useRouter } from 'next/router';
import useSWR from 'swr';

import { Team } from '@/types/types';

import useTeams from './use-teams';
import { PlanDetails } from '../stripe/tiers';
import { fetcher } from '../utils';

export default function useTeam() {
  const router = useRouter();
  const { teams } = useTeams();
  const teamId = teams?.find((t) => t.slug === router.query.team)?.id;
  const {
    data: team,
    mutate,
    error,
  } = useSWR(teamId ? `/api/team/${teamId}` : null, fetcher<Team>);

  const loading = !team && !error;

  const planDetails = team?.plan_details as PlanDetails;

  return { team, planDetails, loading, mutate };
}
