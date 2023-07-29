import cn from 'classnames';
import { FileTextIcon, HashIcon, SearchIcon, SparklesIcon } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';

type SearchResult = {
  highlighted?: boolean;
  type: 'page' | 'section';
  title: ReactNode;
  heading?: string;
};

const sampleSearchResults: SearchResult[] = [
  {
    highlighted: true,
    type: 'page',
    title: (
      <>
        Introducing the <span>Docusaurus</span> plugin
      </>
    ),
  },
  {
    type: 'section',
    heading: 'Markprompt docs',
    title: (
      <>
        <span>Docusaurus</span>
      </>
    ),
  },
  {
    type: 'page',
    heading: 'Introducing the Docusaurus plugin',
    title: (
      <>
        make it easy for users to ask questions to docs. <span>Docusaurus</span>{' '}
        is a popular way to build documentation sites, as it abstracts away
        technicalities,
      </>
    ),
  },
  {
    type: 'section',
    heading: 'Usage with another search plugin',
    title: (
      <>
        another search plugin If your <span>Docusaurus</span> project already
        has a search plugin, such as theme-search-algolia, you need to
      </>
    ),
  },
  {
    type: 'section',
    heading: 'What is Markprompt?',
    title: (
      <>
        components (currently React, Web Component and <span>Docusaurus</span>{' '}
        plugin) that make it easy to integrate a prompt on your existing site.
        Markprompt
      </>
    ),
  },
];

const SearchResultView = ({ result }: { result: SearchResult }) => {
  return (
    <div className="flex flex-row items-center gap-4 px-2">
      <div
        className={cn(
          'flex w-full flex-row items-center gap-4 rounded-md  px-4 py-3',
          {
            'bg-neutral-800': result.highlighted,
            'bg-neutral-900/50': !result.highlighted,
          },
        )}
      >
        <div
          className={cn('flex-none rounded-md p-1.5', {
            'bg-neutral-700 text-neutral-300': result.highlighted,
            'bg-neutral-800 text-neutral-500': !result.highlighted,
          })}
        >
          {result.type === 'page' ? (
            <FileTextIcon className="h-4 w-4" />
          ) : (
            <HashIcon className="h-4 w-4" />
          )}
        </div>
        <div className="flex flex-grow flex-col gap-2 overflow-hidden">
          {result.heading && (
            <span className="w-min whitespace-nowrap rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
              {result.heading}
            </span>
          )}
          <p className="overflow-hidden truncate text-sm font-medium text-neutral-300 [&>span]:border-b-2 [&>span]:border-sky-500 [&>span]:text-sky-500">
            {result.title}
          </p>
        </div>
      </div>
    </div>
  );
};

export const SearchExample = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Prevent SSR/hydration errors.
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <></>;
  }

  return (
    <div className="mt-20 flex w-full max-w-screen-md flex-col overflow-hidden rounded-lg border border-neutral-900 bg-neutral-1000">
      <div className="relative flex flex-row items-center justify-center gap-4 border-b border-neutral-900 px-4 text-sm">
        <div className="border-b-2 border-sky-500 px-2 py-2 font-medium text-neutral-100">
          Search
        </div>
        <div className="flex flex-row items-center gap-2 border-b-2 border-transparent px-4 py-1 font-medium text-neutral-500">
          <SparklesIcon className="h-4 w-4 text-fuchsia-500" />
          Ask AI
        </div>
        <div className="absolute right-2 top-0 bottom-0 flex items-center ">
          <span className="rounded border border-neutral-900 bg-neutral-1100 px-2 py-1 text-xs font-medium text-neutral-500">
            Esc
          </span>
        </div>
      </div>
      <div className="flex flex-row items-center gap-2 border-b border-neutral-900 px-4 py-3 text-sm">
        <SearchIcon className="h-4 w-4 text-neutral-500" />
        <p className="text-sm text-neutral-300">Docusaurus</p>
      </div>
      <div className="flex flex-col gap-2 py-2">
        {sampleSearchResults.map((r, i) => (
          <SearchResultView key={`sample-search-result-${i}`} result={r} />
        ))}
      </div>
    </div>
  );
};
