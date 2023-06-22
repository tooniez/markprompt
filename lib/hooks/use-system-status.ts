import useSWR from 'swr';

import { SystemStatus } from '@/types/types';

import { fetcher } from '../utils';

export default function useSystemStatus() {
  const { data: status } = useSWR('/api/status', fetcher<SystemStatus>, {
    refreshInterval: 10 * 60 * 1000,
  });

  return { status: status || 'operational' };
}
