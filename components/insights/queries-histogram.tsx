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
  endOfDay,
} from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { FC, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

import { DateCountHistogramEntry } from '@/types/types';

import BarChart from '../charts/bar-chart';
import { SkeletonTable } from '../ui/Skeletons';
import { REFERENCE_TIMEZONE } from '@/lib/utils';

type QueriesHistogramProps = {
  data: DateCountHistogramEntry[];
  dateRange?: DateRange;
  loading?: boolean;
};

const getHistogram = (
  data: DateCountHistogramEntry[],
  dateRange: DateRange,
  granularity: 'hours' | 'days' | 'weeks' | 'months',
) => {
  if (!dateRange?.from || !dateRange?.to) {
    return [];
  }

  const binFunction =
    granularity === 'hours'
      ? eachHourOfInterval
      : granularity === 'days'
      ? eachDayOfInterval
      : granularity === 'weeks'
      ? eachWeekOfInterval
      : eachMonthOfInterval;

  const compareFunction =
    granularity === 'hours'
      ? isSameHour
      : granularity === 'days'
      ? isSameDay
      : granularity === 'weeks'
      ? isSameWeek
      : isSameMonth;

  const bins = binFunction({
    start: dateRange.from,
    end: dateRange.to,
  }).map((b) => utcToZonedTime(b, REFERENCE_TIMEZONE));

  return bins.map((bin) => {
    let count = 0;
    for (const entry of data) {
      if (compareFunction(entry.date, bin)) {
        console.log(
          'Same day',
          JSON.stringify(entry.date),
          JSON.stringify(bin),
        );
        count += 1;
      } else {
        console.log(
          'Not same day',
          JSON.stringify(entry.date),
          JSON.stringify(bin),
        );
      }
    }
    // for
    // const countInBin = data
    //   .filter((d) => {
    //     try {
    //       console.log('Is same day?', d.date, h, compareFunction(d.date, h));
    //       return compareFunction(d.date, h);
    //     } catch {
    //       return false;
    //     }
    //   })
    //   .reduce((acc, d) => {
    //     return acc + d.count;
    //   }, 0);
    return {
      start: startOfDay(bin).getTime(),
      end: endOfDay(bin).getTime(),
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
      return getHistogram(data, dateRange, 'hours');
    } else if (numDays < 31) {
      // If interval is shorter than 31 days, display day histogram
      return getHistogram(data, dateRange, 'days');
    } else if (numDays < 95) {
      // If interval is shorter than 95 days, display weeks histogram
      return getHistogram(data, dateRange, 'weeks');
    } else {
      // Display months histogram
      return getHistogram(data, dateRange, 'months');
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
