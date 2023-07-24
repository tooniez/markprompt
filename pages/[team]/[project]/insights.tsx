import { useEffect } from 'react';

import { Card } from '@/components/dashboard/Card';
import { columns } from '@/components/insights/queries/columns';
import { QueriesDataTable } from '@/components/insights/queries/table';
import { QueriesHistogram } from '@/components/insights/queries-histogram';
import { TopReferences } from '@/components/insights/top-references';
import { ProjectSettingsLayout } from '@/components/layouts/ProjectSettingsLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Tag } from '@/components/ui/Tag';
import { processQueryStats } from '@/lib/api';
import useInsights from '@/lib/hooks/use-insights';
import useProject from '@/lib/hooks/use-project';
import useTeam from '@/lib/hooks/use-team';
import { canViewInsights, getAccessibleInsightsType } from '@/lib/stripe/tiers';
import { useDebouncedState } from '@/lib/utils.react';

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
    };

    console.debug('Start processing query stats');
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
    </ProjectSettingsLayout>
  );
};

export default Insights;
