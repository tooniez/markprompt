import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, PlusCircle, XCircle } from 'lucide-react';
import { FC, forwardRef, useEffect, useState } from 'react';

import Button from './Button';
import { Checkbox } from './Checkbox';

type FilterButtonProps = {
  label: string;
  value?: string;
};

export const FilterButton = forwardRef<HTMLButtonElement, FilterButtonProps>(
  ({ label, value, ...props }, ref) => {
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

FilterButton.displayName = 'FilterButton';

type MultiSelectFilterButtonProps = {
  label: string;
  title: string;
  values: string[];
  checked?: string[];
  align?: 'start' | 'center' | 'end';
};

export const MultiSelectFilterButton: FC<MultiSelectFilterButtonProps> = ({
  label,
  title,
  values,
  checked: initialChecked,
  align,
}) => {
  const [isOpen, setOpen] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    setChecked(initialChecked || []);
  }, [initialChecked]);

  console.log('checked', JSON.stringify(checked, null, 2));

  return (
    <Popover.Root open={isOpen} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <FilterButton label={label} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="animate-menu-up dropdown-menu-content z-50 flex min-w-[240px] flex-col gap-1 p-3"
          align={align}
          sideOffset={5}
        >
          <h2 className="mb-2 text-sm font-bold text-neutral-300">{title}</h2>
          {values.map((value) => {
            return (
              <div
                key={`filter-pill-${value}`}
                className="flex flex-row items-center gap-2"
              >
                <Checkbox
                  label={value}
                  defaultChecked={checked?.includes(value)}
                  onCheckedChange={(c) => {
                    const rest = checked.filter((v) => v !== value);
                    if (c === true) {
                      setChecked([...rest, value]);
                    } else {
                      setChecked(rest);
                    }
                  }}
                />
              </div>
            );
          })}

          <Button className="mt-2" variant="cta" buttonSize="xs">
            Apply
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
