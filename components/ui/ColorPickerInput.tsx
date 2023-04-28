import cn from 'classnames';
import { ChangeEvent, FC, ReactNode, useMemo, useState } from 'react';
import Input from './Input';
import * as Popover from '@radix-ui/react-popover';
import { HexColorPicker } from 'react-colorful';

type ColorPickerInputProps = {} & any;

const ColorDialog = ({
  color,
  setColor,
}: {
  color: string;
  setColor: (color: string) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <div className="flex items-center justify-center px-2">
          <button
            className="h-5 w-5 rounded border border-neutral-800"
            style={{ backgroundColor: `#${color}` }}
          />
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="animate-menu-up z-30 mt-2 mr-6 rounded-lg border border-neutral-900 bg-neutral-1000 shadow-2xl sm:w-full">
          <HexColorPicker
            color={color}
            onChange={(color) => setColor(color.slice(1))}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const ColorPickerInput: FC<ColorPickerInputProps> = ({ ...props }) => {
  const [color, setColor] = useState('440044');

  return (
    <Input
      {...props}
      value={color}
      onChange={(e: ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
      inputSize="sm"
      rightAccessory={<ColorDialog color={color} setColor={setColor} />}
    />
  );
};

export default ColorPickerInput;
