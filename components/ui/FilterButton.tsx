import * as Popover from '@radix-ui/react-popover';
import * as RadioGroup from '@radix-ui/react-radio-group';
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
  activeLabel?: string;
  options: string[];
  checkedIndices?: number[];
  align?: 'start' | 'center' | 'end';
  onSubmit?: (indices: number[]) => void;
  onClear?: () => void;
};

export const MultiSelectFilterButton: FC<MultiSelectFilterButtonProps> = ({
  legend,
  title,
  activeLabel,
  options,
  checkedIndices: initialCheckedIndices,
  align,
  onSubmit,
  onClear,
}) => {
  const [isOpen, setOpen] = useState(false);
  const [checkedIndices, setCheckedIndices] = useState<number[]>([]);

  useEffect(() => {
    setCheckedIndices(initialCheckedIndices || []);
  }, [initialCheckedIndices]);

  return (
    <Popover.Root
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) {
          // Reset to initial values
          setCheckedIndices(initialCheckedIndices || []);
        }
        setOpen(o);
      }}
    >
      <Popover.Trigger asChild>
        <FilterButton legend={legend} value={activeLabel} onClear={onClear} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="animate-menu-up dropdown-menu-content z-50 flex min-w-[240px] flex-col gap-1 p-3"
          align={align}
          sideOffset={5}
        >
          <h2 className="mb-2 text-sm font-bold text-neutral-300">{title}</h2>
          {options.map((option, i) => {
            return (
              <div
                key={`filter-pill-${option}`}
                className="flex flex-row items-center gap-2"
              >
                <Checkbox
                  label={option}
                  defaultChecked={checkedIndices?.includes(i)}
                  onCheckedChange={(c) => {
                    const rest = checkedIndices.filter((v) => v !== i);
                    if (c === true) {
                      setCheckedIndices([...rest, i]);
                    } else {
                      setCheckedIndices(rest);
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
            disabled={arrayEquals(initialCheckedIndices || [], checkedIndices)}
            onClick={() => {
              setOpen(false);
              onSubmit?.(checkedIndices);
            }}
          >
            Apply
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

type SingleSelectFilterButtonProps = {
  legend: string;
  title: string;
  activeLabel?: string;
  options: string[];
  selectedIndex?: number;
  align?: 'start' | 'center' | 'end';
  onSubmit?: (index: number) => void;
  onClear?: () => void;
};

export const SingleSelectFilterButton: FC<SingleSelectFilterButtonProps> = ({
  legend,
  title,
  activeLabel,
  options,
  selectedIndex: initialSelectedIndex,
  align,
  onSubmit,
  onClear,
}) => {
  const [isOpen, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(
    undefined,
  );

  useEffect(() => {
    setSelectedIndex(initialSelectedIndex);
  }, [initialSelectedIndex]);

  return (
    <Popover.Root
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) {
          // Reset to initial values
          setSelectedIndex(initialSelectedIndex);
        }
        setOpen(o);
      }}
    >
      <Popover.Trigger asChild>
        <FilterButton legend={legend} value={activeLabel} onClear={onClear} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="animate-menu-up dropdown-menu-content z-50 flex min-w-[240px] flex-col gap-1 p-3"
          align={align}
          sideOffset={5}
        >
          <h2 className="mb-2 text-sm font-bold text-neutral-300">{title}</h2>
          <RadioGroup.Root
            className="RadioGroupRoot"
            aria-label={title}
            defaultValue={`${initialSelectedIndex || 0}`}
            onValueChange={(value) => {
              setSelectedIndex(parseInt(value));
            }}
          >
            {options.map((option, i) => {
              const id = `filter-pill-${option}`;
              return (
                <div key={id} className="flex flex-row items-center gap-2">
                  <RadioGroup.Item
                    className="RadioGroupItem"
                    value={`${i}`}
                    id={id}
                  >
                    <RadioGroup.Indicator className="RadioGroupIndicator" />
                  </RadioGroup.Item>
                  <label htmlFor={id}>
                    <span className="Label">{option}</span>
                  </label>
                </div>
              );
            })}
          </RadioGroup.Root>
          <Button
            className="mt-2"
            variant="cta"
            buttonSize="xs"
            disabled={initialSelectedIndex === selectedIndex}
            onClick={() => {
              setOpen(false);
              if (typeof selectedIndex !== 'undefined') {
                onSubmit?.(selectedIndex);
              }
            }}
          >
            Apply
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

// type SingleSelectFilterButtonProps = {
//   legend: string;
//   title: string;
//   activeLabel?: string;
//   options: string[];
//   selectedIndex?: number;
//   align?: 'start' | 'center' | 'end';
//   onSubmit?: (index: number) => void;
//   onClear?: () => void;
// };

// export const SingleSelectFilterButton: FC<SingleSelectFilterButtonProps> = ({
//   legend,
//   title,
//   activeLabel,
//   options,
//   selectedIndex: initialSelectedIndex,
//   align,
//   onSubmit,
//   onClear,
// }) => {
//   const [isOpen, setOpen] = useState(false);
//   const [selectedIndex, setSelectedIndex] = useState<number | undefined>(
//     undefined,
//   );

//   useEffect(() => {
//     setSelectedIndex(initialSelectedIndex);
//   }, [initialSelectedIndex]);

//   return (
//     <Popover.Root
//       open={isOpen}
//       onOpenChange={(o) => {
//         if (!o) {
//           // Reset to initial values
//           setSelectedIndex(initialSelectedIndex);
//         }
//         setOpen(o);
//       }}
//     >
//       <Popover.Trigger asChild>
//         <FilterButton legend={legend} value={activeLabel} onClear={onClear} />
//       </Popover.Trigger>
//       <Popover.Portal>
//         <Popover.Content
//           className="animate-menu-up dropdown-menu-content z-50 flex min-w-[240px] flex-col gap-1 p-3"
//           align={align}
//           sideOffset={5}
//         >
//           <h2 className="mb-2 text-sm font-bold text-neutral-300">{title}</h2>
//           <RadioGroup.Root
//             className="RadioGroupRoot"
//             aria-label={title}
//             defaultValue={`${initialSelectedIndex || 0}`}
//             onValueChange={(value) => {
//               setSelectedIndex(parseInt(value));
//             }}
//           >
//             {options.map((option, i) => {
//               const id = `filter-pill-${option}`;
//               return (
//                 <div key={id} className="flex flex-row items-center gap-2">
//                   <RadioGroup.Item
//                     className="RadioGroupItem"
//                     value={`${i}`}
//                     id={id}
//                   >
//                     <RadioGroup.Indicator className="RadioGroupIndicator" />
//                   </RadioGroup.Item>
//                   <label htmlFor={id}>
//                     <span className="Label">{option}</span>
//                   </label>
//                 </div>
//               );
//             })}
//           </RadioGroup.Root>
//           <Button
//             className="mt-2"
//             variant="cta"
//             buttonSize="xs"
//             disabled={initialSelectedIndex === selectedIndex}
//             onClick={() => {
//               setOpen(false);
//               if (typeof selectedIndex !== 'undefined') {
//                 onSubmit?.(selectedIndex);
//               }
//             }}
//           >
//             Apply
//           </Button>
//         </Popover.Content>
//       </Popover.Portal>
//     </Popover.Root>
//   );
// };
