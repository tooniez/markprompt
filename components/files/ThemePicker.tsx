import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import * as Select from '@radix-ui/react-select';
import { FC } from 'react';

import { useConfigContext } from '@/lib/context/config';
import { getTheme, themes } from '@/lib/themes';

import { SelectItem } from '../ui/Select';

type ThemePickerProps = {
  className?: string;
};

export const ThemePicker: FC<ThemePickerProps> = () => {
  const { theme, setTheme } = useConfigContext();

  return (
    <Select.Root
      value={theme.name}
      onValueChange={(value) => {
        const selectedTheme = getTheme(value);
        if (selectedTheme) {
          setTheme(selectedTheme);
        }
      }}
    >
      <Select.Trigger
        className="flex h-10 w-full flex-row items-center gap-2 rounded-md border border-neutral-900 py-1.5 px-3 text-sm outline-none"
        aria-label="Theme"
      >
        <div className="flex-grow text-left">
          <Select.Value placeholder="Pick a theme…" />
        </div>
        <Select.Icon className="flex-none text-neutral-500">
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="overflow-hidden rounded-md border border-neutral-800 bg-neutral-900">
          <Select.ScrollUpButton className="flex h-10 items-center justify-center">
            <ChevronUpIcon />
          </Select.ScrollUpButton>
          <Select.Viewport>
            <Select.Group>
              {themes?.map((theme) => {
                return (
                  <SelectItem key={`theme-${theme.name}`} value={theme.name}>
                    {theme.name}
                  </SelectItem>
                );
              })}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className="flex items-center justify-center p-10">
            <ChevronDownIcon />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>{' '}
    </Select.Root>
  );
};
