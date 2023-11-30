import { ReactNode } from 'react';

export const LargeSection = ({ children }: { children: ReactNode }) => {
  return (
    <div className="p-6 sm:px-8">
      <div className="mx-auto w-full max-w-screen-lg">{children}</div>
    </div>
  );
};
