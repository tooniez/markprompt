import { AngelListIcon } from '@/components/icons/AngelList';
import { CalIcon } from '@/components/icons/Cal';
import { MindbodyIcon } from '@/components/icons/Mindbody';
import { PlotlyIcon } from '@/components/icons/Plotly';
import { SemgrepIcon } from '@/components/icons/Semgrep';
import { SkeduloIcon } from '@/components/icons/Skedulo';
import { SourcegraphIcon } from '@/components/icons/Sourcegraph';

export const Companies = () => {
  return (
    <div>
      <p className="mb-4 px-8 text-center text-sm text-neutral-500">
        Live with
      </p>
      <div
        className="mx-auto flex w-full max-w-full flex-row flex-wrap items-center justify-center gap-x-16 gap-y-2 px-8 text-neutral-400"
        style={{
          animationDelay: '200ms',
        }}
      >
        <MindbodyIcon className="w-[130px]" />
        <AngelListIcon className="w-[100px]" />
        <SourcegraphIcon className="-mt-1 w-[160px]" />
        <PlotlyIcon className="w-[120px]" />
        <SemgrepIcon className="w-[130px]" />
        <SkeduloIcon className="-mt-1 w-[120px]" />
        <CalIcon className="w-[100px]" />
      </div>
    </div>
  );
};
