import { addMonths } from 'date-fns';
import {
  add,
  format,
  isToday,
  isSameDay,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import useSWR from 'swr';

import {
  DateCountHistogramEntry,
  Project,
  PromptQueryStat,
  ReferenceWithOccurrenceCount,
  SerializedDateRange,
} from '@/types/types';

import useProject from './use-project';
import useTeam from './use-team';
import { useLocalStorage } from './utils/use-localstorage';
import { canViewInsights } from '../stripe/tiers';
import { fetcher } from '../utils';

export enum FixedDateRange {
  TODAY = 0,
  PAST_7_DAYS = 1,
  PAST_4_WEEKS = 2,
  PAST_3_MONTHS = 3,
  PAST_12_MONTHS = 4,
}

const getFixedDateRangeStart = (range: FixedDateRange) => {
  switch (range) {
    case FixedDateRange.TODAY:
      return startOfDay(new Date());
    case FixedDateRange.PAST_7_DAYS:
      return startOfDay(add(new Date(), { days: -7 }));
    case FixedDateRange.PAST_4_WEEKS:
      return startOfDay(add(new Date(), { weeks: -4 }));
    case FixedDateRange.PAST_3_MONTHS:
      return startOfDay(add(new Date(), { months: -3 }));
    case FixedDateRange.PAST_12_MONTHS:
      return startOfDay(add(new Date(), { months: -12 }));
  }
};

export const dateRangeToFixedRange = (
  range: DateRange | undefined,
): FixedDateRange | undefined => {
  if (!range) {
    return FixedDateRange.PAST_3_MONTHS;
  }

  const start = range.from;
  const end = range.to;

  if (!start || !end || !isToday(end)) {
    return undefined;
  }

  for (const rangeKey of Object.keys(FixedDateRange)) {
    if (isNaN(Number(rangeKey))) {
      const range = FixedDateRange[rangeKey as keyof typeof FixedDateRange];
      if (isSameDay(start, getFixedDateRangeStart(range))) {
        return range;
      }
    }
  }

  return FixedDateRange.PAST_3_MONTHS;
};

export const fixedRangeToDateRange = (
  range: FixedDateRange | undefined,
): DateRange => {
  return {
    from: getFixedDateRangeStart(
      typeof range !== 'undefined' ? range : FixedDateRange.PAST_3_MONTHS,
    ),
    to: endOfDay(new Date()),
  };
};

// const serializeRange = (range: DateRange) => {
//   return {
//     from: range.from?.getTime(),
//     to: range.to?.getTime(),
//   };
// };

// const deserializeRange = (range: {
//   from: number | undefined;
//   to: number | undefined;
// }): DateRange => {
//   return {
//     from: range.from ? new Date(range.from) : undefined,
//     to: range.to ? new Date(range.to) : undefined,
//   };
// };

// export const defaultInsightsDateRange = {
//   from: addMonths(new Date(), -1),
//   to: new Date(),
// };
// const defaultSerializedDateRange = serializeRange(defaultInsightsDateRange);

const getStoredRange = (projectId: Project['id'] | undefined): DateRange => {
  if (projectId) {
    const storedFixedRange = localStorage.getItem(
      `${projectId}:insights:date-range`,
    );
    try {
      if (storedFixedRange) {
        return fixedRangeToDateRange(parseInt(storedFixedRange));
      }
    } catch {
      // Do nothing
    }
  }
  return fixedRangeToDateRange(FixedDateRange.PAST_3_MONTHS);
};

export default function useInsights() {
  const { team } = useTeam();
  const { project } = useProject();
  const [page, setPage] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    fixedRangeToDateRange(FixedDateRange.PAST_3_MONTHS),
  );

  useEffect(() => {
    if (project?.id) {
      setDateRange(getStoredRange(project.id));
    }
  }, [project?.id]);

  useEffect(() => {
    if (dateRange && project?.id) {
      const fixedDateRange = dateRangeToFixedRange(dateRange);
      localStorage.setItem(
        `${project?.id}:insights:date-range`,
        String(fixedDateRange),
      );
    }
  }, [dateRange, project?.id]);

  const from = dateRange?.from?.getTime();
  const to = dateRange?.to?.getTime();

  const {
    data: queries,
    mutate,
    error: queriesError,
  } = useSWR(
    project?.id && from && to
      ? `/api/project/${
          project.id
        }/insights/queries?page=${page}&from=${from}&to=${to}&limit=${
          team && canViewInsights(team) ? 20 : 3
        }`
      : null,
    fetcher<PromptQueryStat[]>,
  );

  const loadingQueries = !queries && !queriesError;

  const { data: topReferences, error: topReferencesError } = useSWR(
    project?.id && from && to
      ? `/api/project/${
          project.id
        }/insights/references?from=${from}&to=${to}&limit=${
          team && canViewInsights(team) ? 20 : 2
        }`
      : null,
    fetcher<ReferenceWithOccurrenceCount[]>,
  );

  const loadingTopReferences = !topReferences && !topReferencesError;

  const { data: queriesHistogram, error: queriesHistogramError } = useSWR(
    project?.id && from && to
      ? `/api/project/${project.id}/insights/queries-histogram?from=${from}&to=${to}`
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
