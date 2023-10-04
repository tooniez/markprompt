import * as Tooltip from '@radix-ui/react-tooltip';
import cn from 'classnames';
import { Info } from 'lucide-react';
import { JSXElementConstructor, useState } from 'react';

export const InfoTooltip = ({
  message,
  dimmed,
  as,
}: {
  message: string;
  dimmed?: boolean;
  as?: JSXElementConstructor<any> | string;
}) => {
  const [open, setOpen] = useState(false);
  const Comp = as || 'button';
  return (
    <Tooltip.Provider>
      <Tooltip.Root open={open} onOpenChange={(open) => setOpen(open)}>
        <Tooltip.Trigger asChild>
          <Comp
            className="button-ring flex w-min cursor-pointer flex-row items-center gap-2 truncate whitespace-nowrap rounded-md text-xs text-neutral-300"
            onClick={() => {
              setOpen(!open);
            }}
          >
            <Info
              className={cn('h-3 w-3', {
                'text-neutral-300': !dimmed,
                'text-neutral-500': dimmed,
              })}
            />
          </Comp>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="tooltip-content z-50 max-w-[300px]"
            sideOffset={5}
          >
            {message}
            <Tooltip.Arrow className="tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
