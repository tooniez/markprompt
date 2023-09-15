import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, PlusCircle, XCircle } from 'lucide-react';
import { FC, forwardRef, useState } from 'react';

import Button from './Button';
import { Checkbox } from './Checkbox';

type FilterPillProps = {
  label: string;
  value?: string;
};

export const FilterPill = forwardRef<HTMLButtonElement, FilterPillProps>(
  ({ label, value, ...props }, ref) => {
    // export const FilterPill: FC<FilterPillProps> = ({ label, value }) => {
    return (
      <Button
        ref={ref}
        {...props}
        variant={value ? 'bordered' : 'bordered-dashed'}
        shape="rounded"
        buttonSize="xs"
      >
        <div className="flex flex-row items-center whitespace-nowrap ">
          {value ? (
            <button>
              <XCircle className="h-3 w-3 text-neutral-600" />
            </button>
          ) : (
            <PlusCircle className="h-3 w-3 text-neutral-600" />
          )}
          <span className="font-medium' pl-2">{label}</span>
          {value && (
            <>
              <div className="ml-2 h-4 w-px bg-neutral-800" />
              <span className="ml-2 mr-1 font-medium text-sky-500">
                {value}
              </span>
              <ChevronDown className="h-3 w-3 text-neutral-600" />
            </>
          )}
        </div>
      </Button>
    );
  },
);

FilterPill.displayName = 'FilterPill';

type MutliSelectFilterPillProps = {
  label: string;
  title: string;
  values: string[];
};

export const MutliSelectFilterPill: FC<MutliSelectFilterPillProps> = ({
  label,
  title,
  values,
}) => {
  const [isOpen, setOpen] = useState(false);
  return (
    <Popover.Root open={isOpen} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <FilterPill label={label} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="animate-menu-up dropdown-menu-content z-50 flex w-[200px] flex-col gap-1 p-3">
          <h2 className="mb-2 text-sm font-bold text-neutral-300">{title}</h2>
          {values.map((value) => {
            const id = `filter-pill-${value}`;
            return (
              <div key={id} className="flex flex-row items-center gap-2">
                <Checkbox
                  className="flex-none"
                  id={id}
                  // checked={table.getIsAllRowsSelected()}
                  // indeterminate={table.getIsSomeRowsSelected()}
                  // onChange={table.getToggleAllRowsSelectedHandler()}
                />
                <label htmlFor={id}>
                  <span className="text-sm text-neutral-300">{value}</span>
                </label>
              </div>
            );
          })}

          <Button className="mt-2" variant="cta" buttonSize="xs">
            Apply
          </Button>
          {/* <Popover.CheckboxItem
            // key={`date-range-picker-${rangeKey}`}
            className="dropdown-menu-item dropdown-menu-item-indent"
            // checked={checked}
            // onClick={() => {
            //   setRange?.(fixedRangeToDateRangeZonedTime(range));
            // }}
          >
            asd
          </Popover.CheckboxItem> */}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
