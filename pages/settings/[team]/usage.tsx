import * as Progress from '@radix-ui/react-progress';
import cn from 'classnames';
import { formatISO } from 'date-fns';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { sum } from 'lodash-es';
import { InfinityIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import useSWR from 'swr';

import { TeamSettingsLayout } from '@/components/layouts/TeamSettingsLayout';
import {
  TableBody,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import {
  FixedDateRange,
  dateRangeToFixedRange,
  getStoredRangeOrDefaultZonedTime,
} from '@/lib/date';
import useTeam from '@/lib/hooks/use-team';
import {
  MAX_EMBEDDINGS_TOKEN_ALLOWANCE,
  getEmbeddingTokensAllowance,
} from '@/lib/stripe/tiers';
import { fetcher } from '@/lib/utils';
import { TeamStats } from '@/types/types';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

dayjs.extend(duration);

const Usage = () => {
  const { team } = useTeam();
  // const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  // const {
  //   data: fileStats,
  //   mutate,
  //   error,
  // } = useSWR(
  //   team?.id ? `/api/team/${team.id}/file-stats` : null,
  //   fetcher<FileStats>,
  // );

  // const { data: projectsUsage, error } = useSWR(
  //   team?.id
  //     ? `/api/team/${
  //         team.id
  //       }/token-histograms?startDate=${interval.startDate.format()}&endDate=${interval.endDate.format()}`
  //     : null,
  //   fetcher<ProjectUsageHistogram[]>,
  // );

  useEffect(() => {
    if (!team?.id) {
      return;
    }
    setDateRange(
      getStoredRangeOrDefaultZonedTime(
        `${team.id}:usage:date-range`,
        FixedDateRange.MONTH_TO_DATE,
      ),
    );
  }, [team?.id]);

  useEffect(() => {
    if (!dateRange || !team?.id) {
      return;
    }
    const fixedDateRange = dateRangeToFixedRange(dateRange);
    if (fixedDateRange) {
      localStorage.setItem(
        `${team.id}:usage:date-range`,
        String(fixedDateRange),
      );
    }
  }, [dateRange, team?.id]);

  const fromISO = dateRange?.from && formatISO(dateRange?.from);
  const toISO = dateRange?.to && formatISO(dateRange?.to);

  const { data: queryStats, error: queryStatsError } = useSWR(
    team?.id && fromISO && toISO ? `/api/team/${team.id}/usage/stats` : null,
    fetcher<TeamStats[]>,
  );

  // Parse all dates here, once and for all
  // const queriesHistogram = useMemo(() => {
  //   return queriesHistogramResponse?.map(
  //     (d) =>
  //       ({
  //         date: parseISO(d.date),
  //         count: d.occurrences,
  //       } as DateCountHistogramEntry),
  //   );
  // }, [queriesHistogramResponse]);

  const loadingQueryStats = !queryStats && !queryStatsError;
  // const monthRange = useMemo(() => {
  //   const teamCreationDate = dayjs(team?.inserted_at);
  //   const numMonthsSinceTeamCreation = Math.max(
  //     1,
  //     Math.floor(dayjs.duration(dayjs().diff(teamCreationDate)).asMonths()),
  //   );
  //   const baseMonth = dayjs().startOf('month');
  //   return Array.from(Array(numMonthsSinceTeamCreation).keys()).map((n) => {
  //     return baseMonth.add(-n, 'months');
  //   });
  // }, [team?.inserted_at]);

  // const loading = !projectsUsage && !error;

  // const barChartData: BarChartData[] = useMemo(() => {
  //   const dayCounts =
  //     projectsUsage?.reduce((acc, value) => {
  //       for (const entry of value.histogram) {
  //         const key = dayjs(entry.date).valueOf();
  //         const count = acc[key] || 0;
  //         acc[key] = count + entry.count;
  //       }
  //       return acc;
  //     }, {} as { [key: number]: number }) || {};

  //   const numDays = Math.max(
  //     1,
  //     Math.floor(
  //       dayjs.duration(interval.endDate.diff(interval.startDate)).asDays(),
  //     ),
  //   );

  //   return Array.from(Array(numDays).keys()).map((n) => {
  //     const date = interval.startDate.add(n, 'days');
  //     const timestamp = date.valueOf();
  //     const value = dayCounts[timestamp] || 0;
  //     return {
  //       start: timestamp,
  //       end: date.add(1, 'days').valueOf(),
  //       value,
  //     };
  //   });
  // }, [projectsUsage, interval]);

  // const monthlyUsedQueries = useMemo(() => {
  //   return barChartData.reduce((acc, key) => {
  //     return acc + key.value;
  //   }, 0);
  // }, [barChartData]);

  // const monthyCompletionsAllowance =
  //   (team && getMonthlyCompletionsAllowance(team)) || 0;

  // const monthlyUsedQueriesPercentage =
  //   Math.min(
  //     100,
  //     Math.round((monthlyUsedQueries / monthyCompletionsAllowance) * 100),
  //   ) || 0;

  const numUsedEmbeddingsTokens = sum(
    (queryStats || []).map((s) => s.num_tokens),
  );
  const numAllowedEmbeddingsTokens = team
    ? getEmbeddingTokensAllowance(team)
    : 0;
  const embeddingsTokensPercentage =
    Math.min(
      100,
      Math.round((numUsedEmbeddingsTokens / numAllowedEmbeddingsTokens) * 100),
    ) || 0;

  return (
    <TeamSettingsLayout
      title="Usage"
      titleComponent={<div className="flex items-center">Usage</div>}
    >
      <h2 className="text-lg font-bold text-neutral-100">Content</h2>
      <div className="flex justify-start text-neutral-100">
        {!queryStats || queryStats?.length === 0 ? (
          <p className="text-sm text-neutral-500">No projects created.</p>
        ) : (
          <Table>
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queryStats.map((s) => {
                return (
                  <TableRow key={s.project_id}>
                    <TableCell noIndent>
                      <Link
                        className="subtle-underline"
                        href={`/${team?.slug}/${s.project_slug}`}
                      >
                        {s.project_name}
                      </Link>
                    </TableCell>
                    <TableCell>{s.num_files}</TableCell>
                    <TableCell>{s.num_file_sections}</TableCell>
                    <TableCell>{s.num_tokens}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell noIndent className="text-neutral-500">
                  Total
                </TableCell>
                <TableCell>{sum(queryStats.map((s) => s.num_files))}</TableCell>
                <TableCell>
                  {sum(queryStats.map((s) => s.num_file_sections))}
                </TableCell>
                <TableCell>
                  {numUsedEmbeddingsTokens}
                  <span className="text-neutral-500">
                    /
                    {numAllowedEmbeddingsTokens ===
                    MAX_EMBEDDINGS_TOKEN_ALLOWANCE ? (
                      <InfinityIcon className="inline-block h-4 w-4" />
                    ) : (
                      numAllowedEmbeddingsTokens
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <Progress.Root
                    // Fix overflow clipping in Safari
                    // https://gist.github.com/domske/b66047671c780a238b51c51ffde8d3a0
                    style={{ transform: 'translateZ(0)' }}
                    className="translate- relative h-2 flex-grow overflow-hidden rounded-full bg-neutral-800"
                    value={10}
                  >
                    <Progress.Indicator
                      className={cn(
                        'h-full w-full transform duration-500 ease-in-out',
                        {
                          'bg-sky-400': embeddingsTokensPercentage <= 70,
                          'bg-amber-400':
                            embeddingsTokensPercentage > 70 &&
                            embeddingsTokensPercentage <= 90,
                          'bg-red-400': embeddingsTokensPercentage > 90,
                        },
                      )}
                      style={{
                        transform: `translateX(-${
                          100 - Math.max(2, embeddingsTokensPercentage)
                        }%)`,
                      }}
                    />
                  </Progress.Root>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
      <h2 className="mt-8 text-lg font-bold text-neutral-100">Completions</h2>
      <div className="mt-4 flex cursor-not-allowed justify-start">
        <DateRangePicker
          range={dateRange}
          setRange={setDateRange}
          defaultRange={FixedDateRange.MONTH_TO_DATE}
        />
      </div>
      {/* <BarChart
        data={barChartData}
        isLoading={!!loading}
        interval="30d"
        height={180}
        countLabel="queries"
      />
      <h2 className="mt-12 text-base font-bold">Monthly usage</h2>
      <div className="mt-1 flex h-10 w-1/2 flex-row items-center gap-4">
        <Progress.Root
          // Fix overflow clipping in Safari
          // https://gist.github.com/domske/b66047671c780a238b51c51ffde8d3a0
          style={{ transform: 'translateZ(0)' }}
          className="translate- relative h-2 flex-grow overflow-hidden rounded-full bg-neutral-800"
          value={monthlyUsedQueriesPercentage}
        >
          <Progress.Indicator
            className={cn('h-full w-full transform duration-500 ease-in-out', {
              'bg-sky-400': monthlyUsedQueriesPercentage <= 70,
              'bg-amber-400':
                monthlyUsedQueriesPercentage > 70 &&
                monthlyUsedQueriesPercentage <= 90,
              'bg-red-400': monthlyUsedQueriesPercentage > 90,
            })}
            style={{
              transform: `translateX(-${100 - monthlyUsedQueriesPercentage}%)`,
            }}
          />
        </Progress.Root>
        <span className="text-sm text-neutral-500">
          {monthlyUsedQueries} out of {monthyCompletionsAllowance} queries
        </span>
        {team?.slug && (
          <Button
            href={`/settings/${team.slug}/plans`}
            variant="bordered"
            buttonSize="sm"
          >
            Upgrade
          </Button>
        )}
      </div> */}
    </TeamSettingsLayout>
  );
};

export default Usage;
