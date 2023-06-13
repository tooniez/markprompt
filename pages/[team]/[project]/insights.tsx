import { ProjectSettingsLayout } from '@/components/layouts/ProjectSettingsLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import useInsights, {
  defaultInsightsDateRange,
} from '@/lib/hooks/use-insights';

const Insights = () => {
  const { dateRange, setDateRange } = useInsights();

  return (
    <ProjectSettingsLayout
      title="Insights"
      width="xl"
      titleComponent={<div className="flex items-center">Insights</div>}
    >
      <DateRangePicker
        range={dateRange ?? defaultInsightsDateRange}
        setRange={setDateRange}
      />
    </ProjectSettingsLayout>
  );
};

export default Insights;
