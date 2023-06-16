import { parseISO } from 'date-fns';
import { FC, useMemo } from 'react';

import { DateCountHistogramEntry } from '@/types/types';

import ResponsizeAreaChart from '../charts/area-chart';
import { SkeletonTable } from '../ui/Skeletons';

type QueriesHistogramProps = {
  data: DateCountHistogramEntry[];
  loading?: boolean;
};

export const QueriesHistogram: FC<QueriesHistogramProps> = ({
  data,
  loading,
}) => {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: parseISO(d.date).getTime(),
      value: d.count,
    }));
  }, [data]);
  return (
    <div className="relative flex h-[200px] flex-col gap-2">
      <SkeletonTable loading={loading} />
      {data?.length > 0 && (
        <ResponsizeAreaChart data={chartData} height={180} />
      )}
    </div>
  );
};
