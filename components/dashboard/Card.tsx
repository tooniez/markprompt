import { FC, PropsWithChildren, ReactNode } from 'react';

export const DescriptionLabel: FC<PropsWithChildren> = ({ children }) => {
  return <div className="p-4 text-sm text-neutral-500">{children}</div>;
};

type CardProps = {
  title: string | ReactNode;
  description?: string | ReactNode;
  children?: ReactNode;
};

export const Card: FC<CardProps> = ({ title, description, children }) => {
  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-neutral-100">{title}</h2>
        {description && (
          <h3 className="text-sm text-neutral-500">{description}</h3>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
};
