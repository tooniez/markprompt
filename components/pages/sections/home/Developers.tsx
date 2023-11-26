import cn from 'classnames';
import { Check, PenLine, RotateCw, Sticker } from 'lucide-react';
import { ReactNode } from 'react';
import Balancer from 'react-wrap-balancer';

import { ColoredBlurs } from '@/components/ui/Blurs';
import { formatShortDateTimeInTimeZone } from '@/lib/date';

import { Button } from './shared';
import { FeatureCard } from '../../components/FeatureCard';

const Label = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => {
  return (
    <span
      className={cn(className, 'text-bold mt-0.5 text-[9px] font-semibold')}
    >
      {children}
    </span>
  );
};

const Input = ({
  className,
  checked,
  multiline,
  children,
}: {
  className?: string;
  checked?: boolean;
  multiline?: boolean;
  children?: ReactNode;
}) => {
  return (
    <div
      className={cn(
        className,
        'flex flex-row gap-2 rounded border border-neutral-100 px-1.5 text-[9px] text-neutral-900',
        {
          'items-start py-1.5': multiline,
          'items-center py-1': !multiline,
        },
      )}
    >
      <div className="flex-grow">{children}</div>
      {checked && (
        <div
          className={cn('flex-none rounded-full bg-lime-500 p-[1px]', {
            'mt-0.5': multiline,
          })}
        >
          <Check className="h-1.5 w-1.5 text-white" strokeWidth={4} />
        </div>
      )}
    </div>
  );
};

export const Column = ({
  offset,
  children,
}: {
  offset?: boolean;
  children: ReactNode;
}) => {
  return (
    <div className={cn({ 'mt-32': offset }, 'flex flex-col gap-8')}>
      {children}
    </div>
  );
};

export const Agents = () => {
  return (
    <div className="relative bg-neutral-1100 py-20">
      <div className="relative z-10 mx-auto grid max-w-screen-xl grid-cols-1 px-8 md:grid-cols-2">
        <h1 className="pb-8 text-left text-4xl font-semibold text-neutral-100 sm:text-4xl md:-mr-8">
          <Balancer>
            A suite of tools to scale your mighty customer support team
          </Balancer>
        </h1>
        <p className="col-start-1 text-lg text-neutral-500">
          Handle more support volume by giving your team AI superpowers instead
          of increasing headcount. Markprompt fits in at all touch points in the
          agent and customer journey.
        </p>
      </div>
      <div className="mx-auto grid max-w-screen-xl grid-cols-1 gap-x-8 px-8 sm:grid-cols-2">
        {/* ▲ curl -F 'file=@./file.pdf' ai-api⁠.com/index
# uploads, embeds & indexes

▲ curl -d '{ "url": "my-⁠docs⁠.com" }' ai-api⁠.com/index
# crawls & indexes

▲ curl -G ai-api⁠.com/search -d 'q=what+is+next.js'
# answers with citations */}
      </div>
    </div>
  );
};
