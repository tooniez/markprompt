import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, PlusCircle, XCircle } from 'lucide-react';
import { FC, forwardRef, useEffect, useState } from 'react';

import { arrayEquals } from '@/lib/utils.nodeps';

import Button from './Button';
import { Checkbox } from './Checkbox';

type FilterButtonProps = {
  legend: string;
  value?: string;
  onClear?: () => void;
};

export const FilterButton = forwardRef<HTMLButtonElement, FilterButtonProps>(
  ({ legend, value, onClear, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        {...props}
        variant={value ? 'bordered' : 'bordered-dashed'}
        shape="rounded"
        buttonSize="xs"
        noPadding
        className="px-2"
      >
        <div className="flex flex-row items-center whitespace-nowrap">
          {value ? (
            <button
              className="group cursor-pointer rounded-full transition hover:bg-neutral-900"
              onClick={(e) => {
                e.preventDefault();
                onClear?.();
              }}
            >
              <XCircle className="h-3 w-3 text-neutral-300 group-hover:text-rose-500" />
            </button>
          ) : (
            <div>
              <PlusCircle className="h-3 w-3 text-neutral-600" />
            </div>
          )}
          <span className="py-1 pr-1 pl-2 font-medium">{legend}</span>
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
  legend: string;
  title: string;
  activeValue?: string;
  options: string[];
  checked?: string[];
  align?: 'start' | 'center' | 'end';
  onSubmit?: (newValues: string[]) => void;
  onClear?: () => void;
};

export const MultiSelectFilterButton: FC<MultiSelectFilterButtonProps> = ({
  legend,
  title,
  activeValue,
  options,
  checked: initialChecked,
  align,
  onSubmit,
  onClear,
}) => {
  const [isOpen, setOpen] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    setChecked(initialChecked || []);
  }, [initialChecked]);

  return (
    <Popover.Root
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) {
          // Reset to initial values
          setChecked(initialChecked || []);
        }
        setOpen(o);
      }}
    >
      <Popover.Trigger asChild>
        <FilterButton legend={legend} value={activeValue} onClear={onClear} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="animate-menu-up dropdown-menu-content z-50 flex min-w-[240px] flex-col gap-1 p-3"
          align={align}
          sideOffset={5}
        >
          <h2 className="mb-2 text-sm font-bold text-neutral-300">{title}</h2>
          {options.map((option) => {
            return (
              <div
                key={`filter-pill-${option}`}
                className="flex flex-row items-center gap-2"
              >
                <Checkbox
                  label={option}
                  defaultChecked={checked?.includes(option)}
                  onCheckedChange={(c) => {
                    const rest = checked.filter((v) => v !== option);
                    if (c === true) {
                      setChecked([...rest, option]);
                    } else {
                      setChecked(rest);
                    }
                  }}
                />
              </div>
            );
          })}

          <Button
            className="mt-2"
            variant="cta"
            buttonSize="xs"
            disabled={arrayEquals(initialChecked || [], checked)}
            onClick={() => {
              setOpen(false);
              onSubmit?.(checked);
            }}
          >
            Apply
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
