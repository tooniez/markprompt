import {
  add,
  isToday,
  isSameDay,
  startOfDay,
  endOfDay,
  parseISO,
  formatISO,
} from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import useSWR from 'swr';

import {
  DateCountHistogramEntry,
  Project,
  PromptQueryStat,
  ReferenceWithOccurrenceCount,
} from '@/types/types';

import useProject from './use-project';
import useTeam from './use-team';
import { canViewInsights } from '../stripe/tiers';
import { REFERENCE_TIMEZONE, fetcher } from '../utils';

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

export const dateRangeToDateRangeZonedTime = (dateRangeUTC: DateRange) => {
  return {
    from:
      dateRangeUTC.from &&
      utcToZonedTime(dateRangeUTC.from, REFERENCE_TIMEZONE),
    to: dateRangeUTC.to && utcToZonedTime(dateRangeUTC.to, REFERENCE_TIMEZONE),
  };
};

export const fixedRangeToDateRangeZonedTime = (
  range: FixedDateRange | undefined,
): DateRange => {
  return dateRangeToDateRangeZonedTime({
    from: getFixedDateRangeStart(
      typeof range === 'number' && !isNaN(range)
        ? range
        : FixedDateRange.PAST_3_MONTHS,
    ),
    to: endOfDay(new Date()),
  });
};

const getStoredRangeOrDefaultZonedTime = (
  projectId: Project['id'] | undefined,
): DateRange => {
  if (projectId) {
    const storedFixedRange = localStorage.getItem(
      `${projectId}:insights:date-range`,
    );
    try {
      if (storedFixedRange) {
        return fixedRangeToDateRangeZonedTime(parseInt(storedFixedRange));
      }
    } catch {
      // Do nothing
    }
  }
  return fixedRangeToDateRangeZonedTime(FixedDateRange.PAST_3_MONTHS);
};

export default function useInsights() {
  const { team } = useTeam();
  const { project } = useProject();
  const [page, setPage] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    if (project?.id) {
      setDateRange(getStoredRangeOrDefaultZonedTime(project.id));
    }
  }, [project?.id]);

  useEffect(() => {
    if (!dateRange || !project?.id) {
      return;
    }
    const fixedDateRange = dateRangeToFixedRange(dateRange);
    if (fixedDateRange) {
      localStorage.setItem(
        `${project?.id}:insights:date-range`,
        String(fixedDateRange),
      );
    }
    // When switching date ranges, reset page to 0
    setPage(0);
  }, [dateRange, project?.id]);

  const fromISO = dateRange?.from && formatISO(dateRange?.from);
  const toISO = dateRange?.to && formatISO(dateRange?.to);
  const limit = team && canViewInsights(team) ? 20 : 3;

  const {
    data,
    mutate: mutateQueries,
    error: queriesError,
  } = useSWR(
    project?.id && fromISO && toISO
      ? `/api/project/${project.id}/insights/queries?page=${page}&from=${fromISO}&to=${toISO}&limit=${limit}`
      : null,
    fetcher<{ queries: PromptQueryStat[] }>,
  );

  const { data: topReferences, error: topReferencesError } = useSWR(
    project?.id && fromISO && toISO
      ? `/api/project/${
          project.id
        }/insights/references?from=${fromISO}&to=${toISO}&limit=${
          team && canViewInsights(team) ? 20 : 2
        }`
      : null,
    fetcher<ReferenceWithOccurrenceCount[]>,
  );

  // Important: queriesHistogramResponse returns bins with timestamps in UTC.
  // So for instance, if there is an event on 7/19 at 1pm in PST time zone,
  // the histogram will return 7/19 00:00 in UTC, which is correct. We should
  // treat that as 7/19 in local time zone without the time info, otherwise
  // it would map to 7/18 in PST time.
  const { data: queriesHistogramResponse, error: queriesHistogramError } =
    useSWR(
      project?.id && fromISO && toISO
        ? `/api/project/${project.id}/insights/queries-histogram?from=${fromISO}&to=${toISO}`
        : null,
      fetcher<{ date: string; count: number }[]>,
    );

  console.log(
    'queriesHistogramResponse',
    JSON.stringify(queriesHistogramResponse, null, 2),
  );
  // Parse all dates here, once and for all
  const queriesHistogram = useMemo(() => {
    return queriesHistogramResponse?.map(
      (d) =>
        ({
          count: d.count,
          date: parseISO(d.date),
        } as DateCountHistogramEntry),
    );
  }, [queriesHistogramResponse]);

  return {
    queries: data?.queries,
    topReferences,
    queriesHistogram,
    dateRange,
    setDateRange,
    page,
    setPage,
    mutateQueries,
    loadingQueries: !data?.queries && !queriesError,
    loadingTopReferences: !topReferences && !topReferencesError,
    loadingQueriesHistogram: !queriesHistogram && !queriesHistogramError,
    hasMorePages: data?.queries?.length === limit,
  };
}
