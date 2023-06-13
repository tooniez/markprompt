import { addDays } from 'date-fns';
import { useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

import { ProjectSettingsLayout } from '@/components/layouts/ProjectSettingsLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import useProject from '@/lib/hooks/use-project';
import { useLocalStorage } from '@/lib/hooks/utils/use-localstorage';
import { SerializedDateRange } from '@/types/types';

const serializeRange = (range: DateRange) => {
  return {
    from: range.from?.getTime(),
    to: range.to?.getTime(),
  };
};

const deserializeRange = (range: {
  from: number | undefined;
  to: number | undefined;
}): DateRange => {
  return {
    from: range.from ? new Date(range.from) : undefined,
    to: range.to ? new Date(range.to) : undefined,
  };
};

const defaultDateRange = { from: addDays(new Date(), -7), to: new Date() };
const defaultSerializedDateRange = serializeRange(defaultDateRange);

const Insights = () => {
  const { project } = useProject();

  const [serializedRange, setSerializedRange] = useLocalStorage<
    SerializedDateRange | undefined
  >(
    !project?.id ? null : `${project.id}:insights:date-range`,
    defaultSerializedDateRange,
  );

  const range = useMemo(() => {
    if (!serializedRange?.from && !serializedRange?.to) {
      return undefined;
    }
    return deserializeRange({
      from: serializedRange?.from,
      to: serializedRange?.to,
    });
  }, [serializedRange?.from, serializedRange?.to]);

  console.log('range', JSON.stringify(range, null, 2));
  useEffect(() => {
    console.log(project?.id, serializedRange);
  }, [project?.id, serializedRange]);

  return (
    <ProjectSettingsLayout
      title="Insights"
      width="xl"
      titleComponent={<div className="flex items-center">Insights</div>}
    >
      <DateRangePicker
        range={range ?? defaultDateRange}
        setRange={(range: DateRange | undefined) => {
          if (range) {
            setSerializedRange(serializeRange(range));
          }
        }}
      />
    </ProjectSettingsLayout>
  );
};

export default Insights;
