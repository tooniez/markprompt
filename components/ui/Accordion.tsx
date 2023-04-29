import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import cn from 'classnames';
import { ReactNode, forwardRef } from 'react';

export const AccordionTrigger = forwardRef(
  (
    {
      children,
      className,
      ...props
    }: { children: ReactNode; className: string } & any,
    forwardedRef,
  ) => (
    <Accordion.Header className="w-full transition hover:opacity-70">
      <Accordion.Trigger
        className={cn(
          'accordion-trigger flex w-full flex-row items-center justify-between gap-2 text-sm font-medium text-neutral-500',
          className,
        )}
        {...props}
        ref={forwardedRef}
      >
        {children}
        <ChevronDownIcon
          className="accordion-chevron h-4 w-4 -rotate-90 transform text-neutral-500 transition"
          aria-hidden
        />
      </Accordion.Trigger>
    </Accordion.Header>
  ),
);

AccordionTrigger.displayName = 'AccordionTrigger';

export const AccordionContent = forwardRef(
  (
    {
      children,
      className,
      ...props
    }: { children: ReactNode; className: string } & any,
    forwardedRef,
  ) => (
    <Accordion.Content
      className={cn('pt-4', className)}
      {...props}
      ref={forwardedRef}
    >
      {children}
    </Accordion.Content>
  ),
);

AccordionContent.displayName = 'AccordionContent';
