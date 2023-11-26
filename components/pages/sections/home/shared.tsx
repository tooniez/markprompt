import cn from 'classnames';
import { ReactNode } from 'react';

export const Button = ({
  className,
  color,
  size,
  children,
}: {
  className?: string;
  color?: 'violet' | 'sky' | 'black' | 'blackLight' | 'white' | 'whiteBordered';
  size?: 'xs' | 'md';
  children: ReactNode;
}) => {
  return (
    <div
      className={cn(className, 'whitespace-nowrap text-center font-medium', {
        'bg-violet-600 text-white': color === 'violet',
        'bg-sky-600 text-white': color === 'sky',
        'bg-white text-neutral-900': color === 'white',
        'border border-neutral-200 bg-white text-neutral-900':
          color === 'whiteBordered',
        'bg-neutral-1000 text-white': color === 'black',
        'border border-neutral-200 bg-neutral-100 text-neutral-900':
          color === 'blackLight',
        'rounded px-2 py-1 text-[9px]': size !== 'xs' && size !== 'md',
        'rounded px-2 py-1 text-[11px]': size === 'md',
        'rounded-[3px] px-1.5 py-[3px] text-[8px]': size === 'xs',
      })}
    >
      {children}
    </div>
  );
};
