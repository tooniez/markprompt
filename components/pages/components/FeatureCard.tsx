import { FC, JSXElementConstructor, ReactNode } from 'react';

type FeatureCardProps = {
  Icon: JSXElementConstructor<any>;
  title: string;
  subtitle?: ReactNode;
  description?: string;
  children?: ReactNode;
};

export const FeatureCard: FC<FeatureCardProps> = ({
  title,
  subtitle,
  description,
  children,
}) => {
  return (
    <div className="group relative rounded-lg border border-dashed border-neutral-800 bg-neutral-1000 p-2">
      <div className="h-[360px] overflow-hidden rounded bg-neutral-900 shadow-lg sm:h-[300px]">
        {children}
      </div>
      <div className="not-prose relative z-10 flex flex-col gap-4 px-4 py-6 sm:py-8 sm:px-6">
        <h2 className="text-2xl font-semibold text-neutral-100">{title}</h2>
        {subtitle && <div className="text-sm text-neutral-300">{subtitle}</div>}
        <p className="text-neutral-400">{description}</p>
      </div>
    </div>
  );
};
