import useSWR from 'swr';

import { DbTeam } from '@/types/types';

import useUser from './use-user';
import { fetcher } from '../utils';

export default function useTeams() {
  const { user } = useUser();
  const {
    data: teams,
    mutate,
    error,
  } = useSWR(user?.id ? '/api/teams' : null, fetcher<DbTeam[]>);

  const loading = !teams && !error;

  return { loading, teams, mutate };
}
