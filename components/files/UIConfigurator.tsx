import { FC, ReactNode } from 'react';

import { useConfigContext } from '@/lib/context/config';
import ColorPickerInput from '../ui/ColorPickerInput';
import Input from '../ui/Input';

type UIConfiguratorProps = {
  className?: string;
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => {
  return (
    <div className="grid grid-cols-2 items-center">
      <span className="text-sm text-neutral-300">{label}</span>
      {children}
    </div>
  );
};

export const UIConfigurator: FC<UIConfiguratorProps> = () => {
  const { uiConfig, setUIConfig } = useConfigContext();
  return (
    <div className="flex flex-col gap-2">
      {/* Default colors of content */}
      <Row label="Background">
        <ColorPickerInput />
      </Row>
      <Row label="Foreground">
        <ColorPickerInput />
      </Row>
      {/* Muted colors of content */}
      <Row label="Muted">
        <ColorPickerInput />
      </Row>
      <Row label="Muted foreground">
        <ColorPickerInput />
      </Row>
      <Row label="Border">
        <ColorPickerInput />
      </Row>
      <Row label="Input">
        <ColorPickerInput />
      </Row>
      {/* Primary colors for buttons */}
      <Row label="Primary">
        <ColorPickerInput />
      </Row>
      <Row label="Primary foreground">
        <ColorPickerInput />
      </Row>
      {/* Secondary colors for buttons */}
      <Row label="Secondary">
        <ColorPickerInput />
      </Row>
      <Row label="Secondary foreground">
        <ColorPickerInput />
      </Row>
      {/* Border radius for card, input and buttons */}
      <Row label="Ring">
        <ColorPickerInput />
      </Row>
      {/* Border radius for card, input and buttons */}
      <Row label="Radius">
        <Input inputSize="sm" rightAccessory="px" />
      </Row>
    </div>
  );
};
