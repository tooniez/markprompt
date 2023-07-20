import { useEffect } from 'react';

import { Card } from '@/components/dashboard/Card';
import { columns } from '@/components/insights/queries/columns';
import { QueriesDataTable } from '@/components/insights/queries/table';
import { QueriesHistogram } from '@/components/insights/queries-histogram';
import { TopReferences } from '@/components/insights/top-references';
import { ProjectSettingsLayout } from '@/components/layouts/ProjectSettingsLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { processQueryStats } from '@/lib/api';
import useInsights from '@/lib/hooks/use-insights';
import useProject from '@/lib/hooks/use-project';
import useTeam from '@/lib/hooks/use-team';
import { canViewInsights } from '@/lib/stripe/tiers';

const Insights = () => {
  const { project } = useProject();
  const { team } = useTeam();
  const {
    queries,
    loadingQueries,
    topReferences,
    loadingTopReferences,
    queriesHistogram,
    loadingQueriesHistogram,
    dateRange,
    setDateRange,
  } = useInsights();

  useEffect(() => {
    if (!project?.id) {
      return;
    }
    processQueryStats(project.id);
  }, [project?.id]);

  return (
    <ProjectSettingsLayout title="Insights" width="2xl">
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
            {!loadingQueries && queries?.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">
                No questions asked in this time range.
              </p>
            ) : (
              <QueriesDataTable
                loading={loadingQueries}
                columns={columns}
                data={queries || []}
                showUpgradeMessage={team && !canViewInsights(team)}
              />
            )}
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
