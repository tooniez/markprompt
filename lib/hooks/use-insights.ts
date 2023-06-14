import { addDays } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import useSWR from 'swr';

import {
  Project,
  PromptQueryStat,
  ReferenceWithOccurrenceCount,
  SerializedDateRange,
} from '@/types/types';

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

  const {
    data: queries,
    mutate,
    error,
  } = useSWR(
    project?.id && serializedRange?.from && serializedRange?.to
      ? `/api/project/${project.id}/insights/queries?page=${page}&from=${serializedRange?.from}&to=${serializedRange?.to}`
      : null,
    fetcher<PromptQueryStat[]>,
  );

  const { data: topReferences } = useSWR(
    project?.id && serializedRange?.from && serializedRange?.to
      ? `/api/project/${project.id}/insights/references?from=${serializedRange?.from}&to=${serializedRange?.to}`
      : null,
    fetcher<ReferenceWithOccurrenceCount[]>,
  );

  console.log('topReferences', JSON.stringify(topReferences, null, 2));

  const loading = !queries && !error;

  const setDateRange = useCallback(
    (range: DateRange | undefined) => {
      if (range) {
        setSerializedRange(serializeRange(range));
      }
    },
    [setSerializedRange],
  );

  return { loading, queries, dateRange, setDateRange, page, setPage, mutate };
}
