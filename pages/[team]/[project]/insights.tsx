import { addDays } from 'date-fns';
import { useMemo } from 'react';
import { DateRange } from 'react-day-picker';

import { ProjectSettingsLayout } from '@/components/layouts/ProjectSettingsLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import useProject from '@/lib/hooks/use-project';
import { useLocalStorage } from '@/lib/hooks/utils/use-localstorage';
import { SerializedDateRange } from '@/types/types';

const defaultDateRange = {
  from: addDays(new Date(), -20),
  to: new Date(),
};

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

const Insights = () => {
  const { project } = useProject();

  const [serializedRange, setSerializedRange] = useLocalStorage<
    SerializedDateRange | undefined
  >(
    `${project?.id ?? 'undefined'}:insights:date-range4`,
    serializeRange(defaultDateRange),
  );

  const range = undefined;
  // const range = useMemo(() => {
  //   console.log('MEMO', serializedRange?.from && !serializedRange?.to);
  //   if (!serializedRange?.from && !serializedRange?.to) {
  //     return undefined;
  //   }
  //   return deserializeRange({
  //     from: serializedRange?.from,
  //     to: serializedRange?.to,
  //   });
  // }, [serializedRange?.from, serializedRange?.to]);

  return (
    <ProjectSettingsLayout
      title="Insights"
      width="xl"
      titleComponent={<div className="flex items-center">Insights</div>}
    >
      <DateRangePicker
        range={range}
        setRange={(range: DateRange | undefined) => {
          // if (range) {
          //   setSerializedRange(serializeRange(range));
          // }
        }}
      />
    </ProjectSettingsLayout>
  );
};

export default Insights;
