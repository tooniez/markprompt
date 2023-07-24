import { ColumnDef } from '@tanstack/react-table';
import { parseISO } from 'date-fns';
import { ArrowDown, ArrowUp, PanelRightIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Card } from '@/components/dashboard/Card';
import QueryStat from '@/components/dialogs/project/QueryStat';
import { QueriesDataTable } from '@/components/insights/queries/table';
import { QueriesHistogram } from '@/components/insights/queries-histogram';
import { TopReferences } from '@/components/insights/top-references';
import { ProjectSettingsLayout } from '@/components/layouts/ProjectSettingsLayout';
import Button from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Tag } from '@/components/ui/Tag';
import { processQueryStats } from '@/lib/api';
import { formatShortDateTimeInTimeZone } from '@/lib/date';
import useInsights from '@/lib/hooks/use-insights';
import useProject from '@/lib/hooks/use-project';
import useTeam from '@/lib/hooks/use-team';
import { canViewInsights, getAccessibleInsightsType } from '@/lib/stripe/tiers';
import { useDebouncedState } from '@/lib/utils.react';
import { DbQueryStat, PromptQueryStat } from '@/types/types';

export const PromptStatusTag = ({ noResponse }: { noResponse: boolean }) => {
  return (
    <Tag color={noResponse ? 'orange' : 'green'}>
      {noResponse ? 'No response' : 'Answered'}
    </Tag>
  );
};

const Insights = () => {
  const { project } = useProject();
  const { team } = useTeam();
  const {
    queries,
    mutateQueries,
    loadingQueries,
    topReferences,
    loadingTopReferences,
    queriesHistogram,
    loadingQueriesHistogram,
    dateRange,
    setDateRange,
    page,
    setPage,
    hasMorePages,
  } = useInsights();
  const [isProcessingQueryStats, setProcessingQueryStats] = useDebouncedState(
    false,
    1000,
  );
  const [currentQueryStatId, setCurrentQueryStatId] = useState<
    DbQueryStat['id'] | undefined
  >(undefined);
  const [queryStatDialogOpen, setQueryStatDialogOpen] = useState(false);

  const columns = useMemo(() => {
    return [
      // {
      //   id: 'select',
      //   header: ({ table }) => (
      //     <Checkbox
      //       checked={table.getIsAllPageRowsSelected()}
      //       indeterminate={table.getIsSomeRowsSelected()}
      //       onChange={table.getToggleAllRowsSelectedHandler()}
      //       aria-label="Select all"
      //     />
      //   ),
      //   cell: ({ row }) => (
      //     <Checkbox
      //       checked={row.getIsSelected()}
      //       onChange={row.getToggleSelectedHandler()}
      //       aria-label="Select row"
      //     />
      //   ),
      //   enableSorting: false,
      //   enableHiding: false,
      // },
      {
        accessorKey: 'prompt',
        header: ({ column }) => {
          const sorted = column.getIsSorted();
          return (
            <Button
              className="p-0 text-neutral-300"
              noStyle
              onClick={() => column.toggleSorting(sorted === 'asc')}
            >
              <div className="flex flex-row items-center gap-2">
                Question
                {sorted === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : sorted === 'desc' ? (
                  <ArrowDown className="h-3 w-3" />
                ) : null}
              </div>
            </Button>
          );
        },
        cell: ({ row }) => {
          return (
            <div className="group relative flex w-full">
              <div className="overflow-hidden truncate text-neutral-300">
                {row.getValue('prompt')}
              </div>
              <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center opacity-0 transition duration-100 group-hover:opacity-100">
                <Button
                  buttonSize="xs"
                  variant="plain"
                  Icon={PanelRightIcon}
                  onClick={() => {
                    setCurrentQueryStatId(row.original.id);
                    setQueryStatDialogOpen(true);
                  }}
                >
                  Open
                </Button>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'no_response',
        header: ({ column }) => {
          const sorted = column.getIsSorted();
          return (
            <Button
              className="p-0 text-neutral-300"
              noStyle
              onClick={() => column.toggleSorting(sorted === 'asc')}
            >
              <div className="flex flex-row items-center gap-2">
                Status
                {sorted === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : sorted === 'desc' ? (
                  <ArrowDown className="h-3 w-3" />
                ) : null}
              </div>
            </Button>
          );
        },
        cell: ({ row }) => {
          const noResponse = !!row.getValue('no_response');
          return <PromptStatusTag noResponse={noResponse} />;
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => {
          const sorted = column.getIsSorted();
          return (
            <Button
              className="p-0 text-neutral-300"
              noStyle
              onClick={() => column.toggleSorting(sorted === 'asc')}
            >
              <div className="flex flex-row items-center gap-2">
                Date
                {sorted === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : sorted === 'desc' ? (
                  <ArrowDown className="h-3 w-3" />
                ) : null}
              </div>
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = formatShortDateTimeInTimeZone(
            parseISO(row.getValue('created_at')),
          );
          return (
            <div className="overflow-hidden truncate whitespace-nowrap text-sm text-neutral-500">
              {date}
            </div>
          );
        },
      },
      // {
      //   id: 'actions',
      //   enableHiding: false,
      //   cell: ({ row }) => {
      //     const payment = row.original;

      //     return (
      //       <DropdownMenu.Root>
      //         <DropdownMenu.Trigger asChild>
      //           <Button noStyle className="flex items-center">
      //             <span className="sr-only">Open menu</span>
      //             <MoreHorizontal className="h-4 w-4 text-neutral-500" />
      //           </Button>
      //         </DropdownMenu.Trigger>
      //         <DropdownMenu.Content align="end">
      //           <DropdownMenu.Label>Actions</DropdownMenu.Label>
      //           <DropdownMenu.Item
      //             onClick={() => navigator.clipboard.writeText(payment.id)}
      //           >
      //             Copy payment ID
      //           </DropdownMenu.Item>
      //           <DropdownMenu.Separator />
      //           <DropdownMenu.Item>View customer</DropdownMenu.Item>
      //           <DropdownMenu.Item>View payment details</DropdownMenu.Item>
      //         </DropdownMenu.Content>
      //       </DropdownMenu.Root>
      //     );
      //   },
      // },
    ] as ColumnDef<PromptQueryStat>[];
  }, []);

  useEffect(() => {
    if (!team || !project?.id) {
      return;
    }
    const insightsType = getAccessibleInsightsType(team);
    if (!insightsType) {
      console.info('No processing insights');
      // Don't process insights unless on the adequate plan.
      return;
    }

    let stopProcessing = false;

    const process = async () => {
      if (stopProcessing) {
        setProcessingQueryStats(false);
        return;
      }
      try {
        console.debug('Start processing query stats');
        const res = await processQueryStats(project.id);
        await mutateQueries();
        console.debug('Process query stats response:', JSON.stringify(res));

        if (res.allProcessed) {
          setProcessingQueryStats(false);
        } else {
          // Don't show processing every time the page is opened,
          // while checking processing state. Only show processing
          // after a first round-trip, where it's confirmed we're
          // not done processing stats.
          setProcessingQueryStats(true);
          process();
        }
      } catch (e) {
        console.error('Error processing stats', e);
        process();
      }
    };

    process();

    return () => {
      stopProcessing = true;
    };
  }, [project?.id, setProcessingQueryStats, team, mutateQueries]);

  return (
    <ProjectSettingsLayout
      title="Insights"
      titleComponent={
        <div className="flex items-center">
          Insights
          {isProcessingQueryStats && (
            <>
              {' '}
              <Tag size="sm" color="fuchsia" className="ml-2">
                Processing
              </Tag>
            </>
          )}
        </div>
      }
      width="2xl"
    >
      <div className="flex cursor-not-allowed justify-start">
        <DateRangePicker
          disabled={team && !canViewInsights(team)}
          range={dateRange}
          setRange={setDateRange}
        />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="col-span-2">
          <Card title="Latest questions">
            <QueriesDataTable
              loading={loadingQueries}
              columns={columns}
              data={queries || []}
              showUpgradeMessage={team && !canViewInsights(team)}
              page={page}
              setPage={setPage}
              hasMorePages={hasMorePages}
            />
          </Card>
        </div>
        <div className="flex flex-col gap-8">
          <Card
            title="New questions"
            accessory={
              queriesHistogram ? (
                <div className="text-sm text-neutral-500">
                  In selected range:{' '}
                  <span className="font-medium text-neutral-100">
                    {queriesHistogram.reduce((acc, q) => acc + q.count, 0)}
                  </span>
                </div>
              ) : (
                <></>
              )
            }
          >
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
          </Card>
          <Card title="Most cited sources">
            {!loadingTopReferences && topReferences?.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">
                No references cited in this time range.
              </p>
            ) : (
              <div className="mt-4">
                <TopReferences
                  loading={loadingTopReferences}
                  topReferences={topReferences || []}
                  showUpgradeMessage={team && !canViewInsights(team)}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
      <QueryStat
        queryStatId={currentQueryStatId}
        open={queryStatDialogOpen}
        setOpen={setQueryStatDialogOpen}
      />
    </ProjectSettingsLayout>
  );
};

export default Insights;
