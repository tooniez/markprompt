import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { CheckIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { FC, HTMLProps, useEffect, useMemo, useRef } from 'react';

export const Checkbox: FC<
  RadixCheckbox.CheckboxProps & { label?: string; indeterminate?: boolean }
> = ({ id = undefined, label = '', ...rest }) => {
  const _id = useMemo(() => {
    return id || nanoid();
  }, [id]);

  return (
    <div className="flex flex-row items-center gap-2">
      <RadixCheckbox.Root
        id={_id}
        className="flex h-4 w-4 items-center justify-center rounded border border-neutral-800 bg-neutral-900 transition data-[state='checked']:bg-sky-600 data-[state='indeterminate']:bg-sky-600"
        {...rest}
      >
        <RadixCheckbox.Indicator>
          <CheckIcon className="h-3 w-3 text-white" strokeWidth={4} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label && (
        <label htmlFor={_id}>
          <span className="cursor-pointer select-none text-sm text-neutral-300">
            {label}
          </span>
        </label>
      )}
    </div>
  );
};

type IndeterminateCheckboxProps = {
  indeterminate?: boolean;
  onCheckedChange?: (value: boolean | 'indeterminate') => void;
} & HTMLProps<HTMLInputElement>;

export const IndeterminateCheckbox: FC<IndeterminateCheckboxProps> = ({
  indeterminate,
  onCheckedChange,
  ...rest
}) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current && typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate, rest.checked]);

  return (
    <input
      type="checkbox"
      ref={ref}
      className="h-4 w-4 cursor-pointer rounded border-neutral-800 bg-neutral-900 text-sky-600 ring-offset-sky-700 transition hover:text-sky-700 focus:ring-0 focus:ring-offset-sky-700 disabled:cursor-not-allowed disabled:border-neutral-900 disabled:bg-neutral-1000"
      onChange={(e) => {
        const v = e.target.value;
        onCheckedChange?.(
          v === 'on' ? true : v === 'off' ? false : 'indeterminate',
        );
      }}
      {...rest}
    />
  );
};
