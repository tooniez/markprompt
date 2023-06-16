import { addMonths } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import useSWR from 'swr';

import {
  DateCountHistogramEntry,
  PromptQueryStat,
  ReferenceWithOccurrenceCount,
  SerializedDateRange,
} from '@/types/types';

import useProject from './use-project';
import useTeam from './use-team';
import { useLocalStorage } from './utils/use-localstorage';
import { canViewAccessFullInsights } from '../stripe/tiers';
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
  from: addMonths(new Date(), -1),
  to: new Date(),
};
const defaultSerializedDateRange = serializeRange(defaultInsightsDateRange);

export default function useInsights() {
  const { team } = useTeam();
  const { project } = useProject();
  const [page, setPage] = useState(0);

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

  const setDateRange = useCallback(
    (range: DateRange | undefined) => {
      if (range) {
        setSerializedRange(serializeRange(range));
      }
    },
    [setSerializedRange],
  );

  const {
    data: queries,
    mutate,
    error: queriesError,
  } = useSWR(
    project?.id && serializedRange?.from && serializedRange?.to
      ? `/api/project/${project.id}/insights/queries?page=${page}&from=${
          serializedRange?.from
        }&to=${serializedRange?.to}&limit=${
          team && canViewAccessFullInsights(team) ? 50 : 3
        }`
      : null,
    fetcher<PromptQueryStat[]>,
  );

  const loadingQueries = !queries && !queriesError;

  const { data: topReferences, error: topReferencesError } = useSWR(
    project?.id && serializedRange?.from && serializedRange?.to
      ? `/api/project/${project.id}/insights/references?from=${
          serializedRange?.from
        }&to=${serializedRange?.to}&limit=${
          team && canViewAccessFullInsights(team) ? 20 : 2
        }`
      : null,
    fetcher<ReferenceWithOccurrenceCount[]>,
  );

  const loadingTopReferences = !topReferences && !topReferencesError;

  const { data: queriesHistogram, error: queriesHistogramError } = useSWR(
    project?.id && serializedRange?.from && serializedRange?.to
      ? `/api/project/${project.id}/insights/queries-histogram?from=${serializedRange?.from}&to=${serializedRange?.to}`
      : null,
    fetcher<DateCountHistogramEntry[]>,
  );

  const loadingQueriesHistogram = !queriesHistogram && !queriesHistogramError;

  return {
    queries,
    topReferences,
    loadingQueries,
    loadingTopReferences,
    queriesHistogram,
    loadingQueriesHistogram,
    dateRange,
    setDateRange,
    page,
    setPage,
    mutate,
  };
}
