import cn from 'classnames';
import { FC } from 'react';

type SkeletonProps = {
  loading?: boolean;
};

export const SkeletonTable: FC<SkeletonProps> = ({ loading }) => {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-10 bg-neutral-1100 transition',
        {
          'opacity-0': !loading,
        },
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="loading-skeleton h-7 w-full rounded-md bg-neutral-800" />
        <div className="loading-skeleton h-7 w-full rounded-md bg-neutral-800" />
        <div className="loading-skeleton h-7 w-full rounded-md bg-neutral-800" />
      </div>
    </div>
  );
};

export const SkeletonPanel: FC<SkeletonProps> = ({ loading }) => {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-10 bg-neutral-1100 transition',
        {
          'opacity-0': !loading,
        },
      )}
    >
      <div className="loading-skeleton h-full w-full rounded-md bg-neutral-800" />
    </div>
  );
};
