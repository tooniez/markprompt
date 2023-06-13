import { addDays } from 'date-fns';
import { useCallback, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import useSWR from 'swr';

import { Project, SerializedDateRange } from '@/types/types';

import useProject from './use-project';
import { useLocalStorage } from './utils/use-localstorage';
import { fetcher } from '../utils';

const serializeRange = (range: DateRange) => {
  return {
    from: range.from?.getTime(),
    to: range.to?.getTime(),
  };
};

const deserializeRange = (range: {
  from: number | undefined;
  to: number | undefined;
}): DateRange => {
  return {
    from: range.from ? new Date(range.from) : undefined,
    to: range.to ? new Date(range.to) : undefined,
  };
};

export const defaultInsightsDateRange = {
  from: addDays(new Date(), -7),
  to: new Date(),
};
const defaultSerializedDateRange = serializeRange(defaultInsightsDateRange);

export default function useInsights() {
  const { project } = useProject();

  const [serializedRange, setSerializedRange] = useLocalStorage<
    SerializedDateRange | undefined
  >(
    !project?.id ? null : `${project.id}:insights:date-range`,
    defaultSerializedDateRange,
  );

  const dateRange = useMemo(() => {
    if (!serializedRange?.from && !serializedRange?.to) {
      return undefined;
    }
    return deserializeRange({
      from: serializedRange?.from,
      to: serializedRange?.to,
    });
  }, [serializedRange?.from, serializedRange?.to]);

  const {
    data: insights,
    mutate,
    error,
  } = useSWR(
    project?.id ? `/api/insights/${project.id}` : null,
    fetcher<Project>,
  );

  const loading = !project && !error;

  const setDateRange = useCallback((range: DateRange | undefined) => {
    if (range) {
      setSerializedRange(serializeRange(range));
    }
  }, []);

  return { loading, insights, dateRange, setDateRange, mutate };
}
