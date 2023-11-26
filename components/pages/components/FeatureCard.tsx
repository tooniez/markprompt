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
      <div className="h-[300px] overflow-hidden rounded bg-neutral-900 shadow-lg">
        {children}
      </div>
      <div className="not-prose relative z-10 flex flex-col gap-4 px-6 py-8">
        <h2 className="text-2xl font-semibold text-neutral-100">{title}</h2>
        {subtitle && <div className="text-sm text-neutral-300">{subtitle}</div>}
        <p className="text-neutral-400">{description}</p>
      </div>
    </div>
  );
};
