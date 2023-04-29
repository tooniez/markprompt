import * as Accordion from '@radix-ui/react-accordion';
import * as Switch from '@radix-ui/react-switch';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { FC, useMemo } from 'react';

import { useConfigContext } from '@/lib/context/config';

import { ThemePicker } from './ThemePicker';
import { Row } from '../onboarding/Onboarding';
import { AccordionContent, AccordionTrigger } from '../ui/Accordion';
import ColorPickerInput from '../ui/ColorPickerInput';
import Input from '../ui/Input';
import { Tag } from '../ui/Tag';

type UIConfiguratorProps = {
  className?: string;
};

export const UIConfigurator: FC<UIConfiguratorProps> = () => {
  const { theme, isDark, setDark } = useConfigContext();

  const colors = useMemo(() => {
    return isDark ? theme.colors.dark : theme.colors.light;
  }, [theme, isDark]);

  return (
    <div className="flex flex-col gap-2">
      <Row label="Theme">
        <ThemePicker />
      </Row>
      <Row
        label={
          <>
            Include branding <Tag color="fuchsia">Pro</Tag>
          </>
        }
      >
        <Switch.Root
          className="relative h-5 w-8 flex-none rounded-full border border-neutral-700 bg-neutral-800 data-[state='checked']:border-green-600 data-[state='checked']:bg-green-600"
          checked={isDark}
          onCheckedChange={(d: boolean) => setDark(d)}
        >
          <Switch.Thumb className="block h-4 w-4 translate-x-[1px] transform rounded-full bg-white transition data-[state='checked']:translate-x-[13px]" />
        </Switch.Root>
      </Row>
      <Accordion.Root className="mt-4 w-full" type="single" collapsible>
        <Accordion.Item value="options">
          <AccordionTrigger>Options</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2">
              {/* Default colors of content */}
              <Row className="mb-4" label="Show colors for">
                <ToggleGroup.Root
                  className="grid w-full grid-cols-2 overflow-hidden rounded border border-neutral-800 bg-neutral-1000 text-xs font-medium text-neutral-300"
                  type="single"
                  value={isDark ? 'dark' : 'light'}
                  onValueChange={(value) => {
                    setDark(value === 'dark');
                  }}
                  aria-label="Mode"
                >
                  <ToggleGroup.Item
                    className="px-2 py-1.5 text-center transition data-[state='on']:bg-neutral-900 data-[state='on']:text-neutral-300 data-[state='off']:text-neutral-500"
                    value="light"
                    aria-label="Light mode"
                  >
                    Light
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    className="px-2 py-1.5 text-center transition data-[state='on']:bg-neutral-900 data-[state='on']:text-neutral-300 data-[state='off']:text-neutral-500"
                    value="dark"
                    aria-label="Dark mode"
                  >
                    Dark
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              </Row>
              <Row label="Background">
                <ColorPickerInput color={colors.background} />
              </Row>
              <Row label="Foreground">
                <ColorPickerInput color={colors.foreground} />
              </Row>
              {/* Muted colors of content */}
              <Row label="Muted">
                <ColorPickerInput color={colors.muted} />
              </Row>
              <Row label="Muted foreground">
                <ColorPickerInput color={colors.mutedForeground} />
              </Row>
              <Row label="Border">
                <ColorPickerInput color={colors.border} />
              </Row>
              <Row label="Input">
                <ColorPickerInput color={colors.input} />
              </Row>
              {/* Primary colors for buttons */}
              <Row label="Primary">
                <ColorPickerInput color={colors.primary} />
              </Row>
              <Row label="Primary foreground">
                <ColorPickerInput color={colors.primaryForeground} />
              </Row>
              {/* Secondary colors for buttons */}
              <Row label="Secondary">
                <ColorPickerInput color={colors.secondary} />
              </Row>
              <Row label="Secondary foreground">
                <ColorPickerInput color={colors.secondaryForeground} />
              </Row>
              {/* Border radius for card, input and buttons */}
              <Row label="Ring">
                <ColorPickerInput color={colors.ring} />
              </Row>
              {/* Border radius for card, input and buttons */}
              <Row label="Radius">
                <Input inputSize="sm" rightAccessory="px" />
              </Row>
            </div>
          </AccordionContent>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
};
