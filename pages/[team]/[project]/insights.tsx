import { Card } from '@/components/dashboard/Card';
import { columns } from '@/components/insights/queries/columns';
import { QueriesDataTable } from '@/components/insights/queries/table';
import { TopReferences } from '@/components/insights/top-references';
import { ProjectSettingsLayout } from '@/components/layouts/ProjectSettingsLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import useInsights, {
  defaultInsightsDateRange,
} from '@/lib/hooks/use-insights';
import useTeam from '@/lib/hooks/use-team';
import { canViewAccessFullInsights } from '@/lib/stripe/tiers';

const Insights = () => {
  const { team } = useTeam();
  const {
    loadingQueries,
    loadingTopReferences,
    dateRange,
    setDateRange,
    queries,
    topReferences,
  } = useInsights();

  return (
    <ProjectSettingsLayout title="Insights" width="xl">
      <div className="flex cursor-not-allowed justify-start">
        <DateRangePicker
          disabled={team && !canViewAccessFullInsights(team)}
          range={dateRange ?? defaultInsightsDateRange}
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
                showUpgradeMessage={team && !canViewAccessFullInsights(team)}
              />
            )}
          </Card>
        </div>
        <Card title="Most cited references">
          {!loadingTopReferences && topReferences?.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">
              No references cited in this time range.
            </p>
          ) : (
            <div className="mt-4">
              <TopReferences
                loading={loadingTopReferences}
                topReferences={topReferences || []}
                showUpgradeMessage={team && !canViewAccessFullInsights(team)}
              />
            </div>
          )}
        </Card>
      </div>
    </ProjectSettingsLayout>
  );
};

export default Insights;
