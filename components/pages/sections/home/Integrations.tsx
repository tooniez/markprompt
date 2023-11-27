import cn from 'classnames';
import { Check, PenLine, RotateCw, Sticker } from 'lucide-react';
import { FC, JSXElementConstructor, ReactNode } from 'react';
import Balancer from 'react-wrap-balancer';

type CardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export const Card: FC<CardProps> = ({ title, description, children }) => {
  return (
    <div className="group relative rounded-lg border border-dashed border-neutral-800 bg-neutral-1000 p-2">
      <div className="h-[240px] overflow-hidden rounded bg-neutral-900 shadow-lg sm:h-[200px]">
        {children}
      </div>
      <div className="not-prose relative z-10 flex flex-col gap-4 p-4">
        <h2 className="text-2xl font-semibold text-neutral-100">{title}</h2>
        <p className="text-lg text-neutral-400">{description}</p>
      </div>
    </div>
  );
};

export const Integrations = () => {
  return (
    <div className="relative bg-neutral-1100 py-20">
      <div className="relative z-10 mx-auto grid max-w-screen-xl grid-cols-1 px-8 md:grid-cols-2">
        <h1 className="pb-8 text-left text-4xl font-semibold text-neutral-100 sm:text-4xl md:-mr-8">
          <Balancer>
            1-click integrations, no engineering resources needed
          </Balancer>
        </h1>
        <p className="col-start-1 text-lg text-neutral-500">
          Use integrations to easily integrate Markprompt into your existing
          workflows.
        </p>
      </div>
      <div className="mx-auto grid max-w-screen-xl grid-cols-1 gap-x-8 px-8 sm:grid-cols-4">
        <Card title="No-code chatbot builder" description="">
          <div className="bg-neutral-50"></div>
        </Card>
      </div>
    </div>
  );
};
