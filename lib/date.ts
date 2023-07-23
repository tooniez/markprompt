import { differenceInDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { DateRange } from 'react-day-picker';

const now = new Date();

export const REFERENCE_TIMEZONE =
  typeof Intl === 'object'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

export const getHistogramBinSize = (dateRange: DateRange) => {
  const numDays = differenceInDays(
    dateRange.to || new Date(),
    dateRange.from || new Date(),
  );

  if (numDays < 2) {
    // If interval is shorter than 2 days, bin by hour hour
    return 'hour';
  } else if (numDays < 31) {
    // If interval is shorter than 31 days, bin by day
    return 'day';
  } else if (numDays < 95) {
    // If interval is shorter than 95 days, bin by week
    return 'week';
  } else {
    // Bin by month
    return 'month';
  }
};

export const formatShortDateTimeInTimeZone = (date: Date) => {
  // Short date and time
  // Jun 12, 8:20 PM
  // Jun 12 2022, 8:20 PM
  return formatInTimeZone(
    date,
    REFERENCE_TIMEZONE,
    `MMM d${date.getFullYear() !== now.getFullYear() ? ', yyyy' : ''}, h:mm a`,
  );
};
