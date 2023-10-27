import { OpenAIChatCompletionsModelId } from '@markprompt/core';
import * as Progress from '@radix-ui/react-progress';
import cn from 'classnames';
import { add, format, formatISO, parseISO } from 'date-fns';
import { sum } from 'lodash-es';
import { InfinityIcon } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import useSWR from 'swr';

import { QueriesHistogram } from '@/components/insights/queries-histogram';
import { TeamSettingsLayout } from '@/components/layouts/TeamSettingsLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
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
  REFERENCE_TIMEZONE,
  dateRangeToFixedRange,
  getHistogramBinSize,
  getStoredRangeOrDefaultZonedTime,
} from '@/lib/date';
import useTeam from '@/lib/hooks/use-team';
import {
  getEmbeddingTokensAllowance,
  INFINITE_TOKEN_ALLOWANCE,
} from '@/lib/stripe/tiers';
import { fetcher, formatUrl } from '@/lib/utils';
import { getModelDisplayName } from '@/lib/utils.nodeps';
import {
  CompletionsUsageInfo,
  DateCountHistogramEntry,
  DbTeam,
  TeamStats,
} from '@/types/types';

type ProgressData = {
  label?: ReactNode | string;
  value: number;
  total: number;
};

const UsageGauge = ({
  progressData,
  loading,
}: {
  progressData?: ProgressData;
  loading?: boolean;
}) => {
  const percentage = progressData
    ? progressData.total === INFINITE_TOKEN_ALLOWANCE
      ? 1
      : Math.min(
          100,
          Math.round((progressData.value / progressData.total) * 100),
        )
    : 0;

  return (
    <>
      <td
        className={cn('whitespace-nowrap pb-2 text-sm', {
          'pr-4': progressData?.label,
        })}
      >
        {progressData?.label || ''}
      </td>
      <td className="pr-4 pb-2">
        <div className="w-16 flex-none">
          <Progress.Root
            // Fix overflow clipping in Safari
            // https://gist.github.com/domske/b66047671c780a238b51c51ffde8d3a0
            style={{ transform: 'translateZ(0)' }}
            className="relative h-2 flex-grow overflow-hidden rounded-full bg-neutral-800"
            value={10}
          >
            <Progress.Indicator
              className={cn(
                'h-full w-full transform duration-500 ease-in-out',
                {
                  'bg-sky-400': percentage <= 70,
                  'bg-amber-400': percentage > 70 && percentage <= 90,
                  'bg-red-400': percentage > 90,
                },
              )}
              style={{
                transform: `translateX(-${100 - Math.max(2, percentage)}%)`,
              }}
            />
          </Progress.Root>
        </div>
      </td>
      <td className="pb-2">
        <p
          className={cn('text-sm text-neutral-400 transition', {
            'opacity-0': loading,
          })}
        >
          {!progressData ? (
            0
          ) : (
            <>
              {progressData.value}/
              {progressData.total === INFINITE_TOKEN_ALLOWANCE ? (
                <InfinityIcon className="inline-block h-4 w-4" />
              ) : (
                progressData.total
              )}
            </>
          )}
        </p>
      </td>
    </>
    // <div className="relative">
    //   <div className="absolute inset-y-0 h-full w-40">
    //     <SkeletonPanel loading={loading} />
    //   </div>
    //   <div
    //     className={cn('flex flex-none flex-row items-center gap-4 transition', {
    //       'opacity-0': loading,
    //     })}
    //   >
    //     {gauge?.label || ''}
    //     <div className="w-16 flex-none">
    //       <Progress.Root
    //         // Fix overflow clipping in Safari
    //         // https://gist.github.com/domske/b66047671c780a238b51c51ffde8d3a0
    //         style={{ transform: 'translateZ(0)' }}
    //         className="relative h-2 flex-grow overflow-hidden rounded-full bg-neutral-800"
    //         value={10}
    //       >
    //         <Progress.Indicator
    //           className={cn(
    //             'h-full w-full transform duration-500 ease-in-out',
    //             {
    //               'bg-sky-400': percentage <= 70,
    //               'bg-amber-400': percentage > 70 && percentage <= 90,
    //               'bg-red-400': percentage > 90,
    //             },
    //           )}
    //           style={{
    //             transform: `translateX(-${100 - Math.max(2, percentage)}%)`,
    //           }}
    //         />
    //       </Progress.Root>
    //     </div>
    //     <p
    //       className={cn('text-sm text-neutral-400 transition', {
    //         'opacity-0': loading,
    //       })}
    //     >
    //       {!gauge ? (
    //         0
    //       ) : (
    //         <>
    //           {gauge.value}/
    //           {gauge.total === INFINITE_TOKEN_ALLOWANCE ? (
    //             <InfinityIcon className="inline-block h-4 w-4" />
    //           ) : (
    //             gauge.total
    //           )}
    //         </>
    //       )}
    //     </p>
    //   </div>
    // </div>
  );
};

const UsageCard = ({
  title,
  progressDataEntries,
  loading,
}: {
  title: ReactNode | string;
  progressDataEntries: ProgressData[];
  loading?: boolean;
}) => {
  return (
    <div className="flex flex-row items-start gap-4 p-4">
      <div className="flex flex-grow flex-col justify-start gap-4">
        <div className="text-sm font-medium text-neutral-100">{title}</div>
        <table className="table-auto border-collapse text-sm">
          <colgroup>
            <col />
            <col />
            <col className="w-full" />
          </colgroup>
          <tbody>
            {progressDataEntries.map((progressData, i) => (
              <tr key={`gauge-${title}-${i}`}>
                <UsageGauge progressData={progressData} loading={loading} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EmbeddingsCredits = ({
  team,
  teamStats,
}: {
  team?: DbTeam;
  teamStats?: TeamStats[];
}) => {
  const numUsedEmbeddingsTokens = sum(
    (teamStats || []).map((s) => s.num_tokens),
  );

  const numAllowedEmbeddingsTokens = team
    ? getEmbeddingTokensAllowance(team)
    : 0;

  return (
    <UsageCard
      loading={!team}
      title="Embeddings"
      progressDataEntries={[
        {
          value: numUsedEmbeddingsTokens,
          total: numAllowedEmbeddingsTokens,
        },
      ]}
    />
  );
};

const CompletionsCredits = ({ team }: { team?: DbTeam }) => {
  const { data, error } = useSWR(
    team?.id ? `/api/team/${team.id}/usage/completions` : null,
    fetcher<CompletionsUsageInfo | undefined>,
  );

  const loading = !data && !error;

  const progressDataEntries: ProgressData[] = useMemo(() => {
    if (!team || !data) {
      return [];
    }

    const _progressDataEntries: ProgressData[] = [];
    if (data.completions) {
      for (const [model, details] of Object.entries(data.completions)) {
        _progressDataEntries.push({
          value: details.used,
          total: details.allowance || 0,
          // Don't show a label if all
          label:
            model === 'all'
              ? undefined
              : getModelDisplayName(model as OpenAIChatCompletionsModelId),
        });
      }
    }

    return _progressDataEntries;
  }, [team, data]);

  return (
    <UsageCard
      loading={loading || !team}
      title={
        <div className="flex flex-row items-center gap-2 overflow-hidden">
          <div className="flex-grow overflow-hidden truncate">
            Message credits
            {data && (
              <span className="ml-2 text-xs font-normal text-neutral-500">
                {data?.usagePeriod === 'monthly'
                  ? '(month to date)'
                  : `${format(
                      parseISO(data.billingCycleStart),
                      'LLL dd, yyyy',
                    )} - ${format(
                      add(parseISO(data.billingCycleStart), { years: 1 }),
                      'LLL dd, yyyy',
                    )}`}
              </span>
            )}
          </div>
        </div>
      }
      progressDataEntries={progressDataEntries}
    />
  );
};

const Usage = () => {
  const { team } = useTeam();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

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

  const { data: teamContentStats } = useSWR(
    team?.id && fromISO && toISO ? `/api/team/${team.id}/usage/stats` : null,
    fetcher<TeamStats[]>,
  );

  const { data: queriesHistogramResponse, error: queriesHistogramError } =
    useSWR(
      team?.id && fromISO && toISO
        ? formatUrl(`/api/team/${team.id}/usage/queries-histogram`, {
            from: fromISO,
            to: toISO,
            tz: REFERENCE_TIMEZONE,
            period: getHistogramBinSize(dateRange),
          })
        : null,
      fetcher<{ date: string; occurrences: number }[]>,
    );

  // Parse all dates here, once and for all
  const queriesHistogram = useMemo(() => {
    return queriesHistogramResponse?.map(
      (d) =>
        ({
          date: parseISO(d.date),
          count: d.occurrences,
        } as DateCountHistogramEntry),
    );
  }, [queriesHistogramResponse]);

  const loadingQueriesHistogram =
    !queriesHistogramResponse && !queriesHistogramError;

  const numUsedEmbeddingsTokens = sum(
    (teamContentStats || []).map((s) => s.num_tokens),
  );

  const numAllowedEmbeddingsTokens = team
    ? getEmbeddingTokensAllowance(team)
    : 0;

  return (
    <TeamSettingsLayout
      title="Usage"
      titleComponent={<div className="flex items-center">Usage</div>}
    >
      <div className="grid grid-cols-2 rounded-md border border-neutral-900 [&>div:not(:first-child)]:border-l [&>div:not(:first-child)]:border-neutral-900">
        <EmbeddingsCredits team={team} teamStats={teamContentStats} />
        <CompletionsCredits team={team} />
      </div>
      <div className="mt-2 flex-none text-right text-xs text-neutral-600 antialiased">
        Updated hourly
      </div>
      <h2 className="mt-6 text-lg font-bold text-neutral-100">Content</h2>
      <div className="flex justify-start text-neutral-100">
        {!teamContentStats || teamContentStats?.length === 0 ? (
          <p className="text-sm text-neutral-500">No projects created.</p>
        ) : (
          <Table>
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamContentStats.map((s) => {
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
                <TableCell>
                  {sum(teamContentStats.map((s) => s.num_files))}
                </TableCell>
                <TableCell>
                  {sum(teamContentStats.map((s) => s.num_file_sections))}
                </TableCell>
                <TableCell>
                  {numUsedEmbeddingsTokens}
                  <span className="text-neutral-500">
                    /
                    {numAllowedEmbeddingsTokens === INFINITE_TOKEN_ALLOWANCE ? (
                      <InfinityIcon className="inline-block h-4 w-4" />
                    ) : (
                      numAllowedEmbeddingsTokens
                    )}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
      <h2 className="mt-8 text-lg font-bold text-neutral-100">Completions</h2>
      <div className="mt-4 flex cursor-not-allowed flex-row items-center justify-start gap-4">
        <div className="flex-grow">
          <DateRangePicker
            range={dateRange}
            setRange={setDateRange}
            defaultRange={FixedDateRange.MONTH_TO_DATE}
          />
        </div>
        <div className="hidden flex-none">
          {queriesHistogram ? (
            <div className="text-sm text-neutral-500">
              In selected range:{' '}
              <span className="font-medium text-neutral-100">
                0{/* {queriesHistogram.reduce((acc, q) => acc + q.count, 0)} */}
              </span>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-8 pb-20">
        {!loadingQueriesHistogram &&
        (!queriesHistogram || queriesHistogram?.length === 0) ? (
          <p className="mt-2 text-sm text-neutral-500">
            No questions asked in this time range.
          </p>
        ) : (
          <QueriesHistogram
            dateRange={dateRange}
            loading={loadingQueriesHistogram}
            data={queriesHistogram || []}
          />
        )}
      </div>
    </TeamSettingsLayout>
  );
};

export default Usage;
