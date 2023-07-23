import {
  eachHourOfInterval,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInDays,
  isSameHour,
  isSameDay,
  isSameWeek,
  isSameMonth,
  startOfDay,
  endOfHour,
  endOfDay,
  endOfWeek,
  endOfMonth,
} from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { FC, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

import { REFERENCE_TIMEZONE } from '@/lib/utils';
import { DateCountHistogramEntry, DateGranularity } from '@/types/types';

import BarChart from '../charts/bar-chart';
import { SkeletonTable } from '../ui/Skeletons';

type QueriesHistogramProps = {
  data: DateCountHistogramEntry[];
  dateRange?: DateRange;
  loading?: boolean;
};

const getHistogram = (
  data: DateCountHistogramEntry[],
  dateRange: DateRange,
  granularity: DateGranularity,
) => {
  if (!dateRange?.from || !dateRange?.to) {
    return [];
  }

  let binFunction: (interval: Interval) => Date[];
  let compareFunction: (
    dateLeft: Date | number,
    dateRight: Date | number,
  ) => boolean;
  let endOfBinFuntion: (date: Date | number) => Date;

  switch (granularity) {
    case 'hour': {
      binFunction = eachHourOfInterval;
      compareFunction = isSameHour;
      endOfBinFuntion = endOfHour;
      break;
    }
    case 'day': {
      binFunction = eachDayOfInterval;
      compareFunction = isSameDay;
      endOfBinFuntion = endOfDay;
      break;
    }
    case 'week': {
      binFunction = eachWeekOfInterval;
      compareFunction = isSameWeek;
      endOfBinFuntion = endOfWeek;
      break;
    }
    default: {
      binFunction = eachMonthOfInterval;
      compareFunction = isSameMonth;
      endOfBinFuntion = endOfMonth;
      break;
    }
  }

  const bins = binFunction({
    start: dateRange.from,
    end: dateRange.to,
  }).map((b) => utcToZonedTime(b, REFERENCE_TIMEZONE));

  return bins.map((bin) => {
    let count = 0;
    for (const entry of data) {
      if (compareFunction(entry.date, bin)) {
        count += entry.count;
      }
    }
    return {
      start: startOfDay(bin).getTime(),
      end: endOfBinFuntion(bin).getTime(),
      value: count,
    };
  });
};

export const QueriesHistogram: FC<QueriesHistogramProps> = ({
  data,
  dateRange,
  loading,
}) => {
  const chartData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return [];
    }

    const numDays = differenceInDays(
      dateRange.to || new Date(),
      dateRange.from || new Date(),
    );

    if (numDays < 2) {
      // If interval is shorter than 2 days, display hour histogram
      return getHistogram(data, dateRange, 'hour');
    } else if (numDays < 31) {
      // If interval is shorter than 31 days, display day histogram
      return getHistogram(data, dateRange, 'day');
    } else if (numDays < 95) {
      // If interval is shorter than 95 days, display week histogram
      return getHistogram(data, dateRange, 'week');
    } else {
      // Display months histogram
      return getHistogram(data, dateRange, 'month');
    }
  }, [dateRange, data]);

  return (
    <div className="relative flex h-[200px] flex-col gap-2">
      <SkeletonTable loading={loading} />
      {data?.length > 0 && (
        <BarChart data={chartData} height={180} interval="7d" />
      )}
    </div>
  );
};
