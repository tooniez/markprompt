import { Card } from '@/components/dashboard/Card';
import { columns } from '@/components/insights/queries/columns';
import { QueriesDataTable } from '@/components/insights/queries/table';
import { ProjectSettingsLayout } from '@/components/layouts/ProjectSettingsLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import useInsights, {
  defaultInsightsDateRange,
} from '@/lib/hooks/use-insights';

const Insights = () => {
  const { dateRange, setDateRange, queries } = useInsights();

  return (
    <ProjectSettingsLayout title="Insights" width="xl">
      <div className="flex justify-start">
        <DateRangePicker
          range={dateRange ?? defaultInsightsDateRange}
          setRange={setDateRange}
        />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="col-span-2">
          <Card title="Prompts">
            <QueriesDataTable columns={columns} data={queries || []} />
          </Card>
        </div>
        <Card title="Most cited references">asd</Card>
      </div>
    </ProjectSettingsLayout>
  );
};

export default Insights;
