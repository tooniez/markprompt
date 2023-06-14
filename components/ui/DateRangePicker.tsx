import * as Popover from '@radix-ui/react-popover';
import cn from 'classnames';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import Button from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';

export const DateRangePicker = ({
  className,
  range,
  setRange,
}: {
  className?: string;
  range?: DateRange;
  setRange?: (range: DateRange | undefined) => void;
}) => {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover.Root>
        <Popover.Trigger asChild>
          <div className="flex items-center justify-center">
            <Button
              variant="plain"
              left
              light
              className={cn(
                'w-[300px] justify-start text-left font-normal',
                !range && 'text-muted-foreground',
              )}
              Icon={(props) => (
                <CalendarIcon
                  {...props}
                  className={cn(props.className, 'text-neutral-500')}
                />
              )}
            >
              {range?.from ? (
                range.to ? (
                  <>
                    {format(range.from, 'LLL dd, y')} -{' '}
                    {format(range.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(range.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="animate-menu-up z-30 mt-2 mr-6 rounded-lg border border-neutral-900 bg-neutral-1000 shadow-2xl sm:w-full">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={range?.from}
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};
