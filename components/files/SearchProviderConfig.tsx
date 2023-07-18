import { AlgoliaProvider } from '@markprompt/core/dist/search';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ChangeEvent, FC } from 'react';

import { useConfigContext } from '@/lib/context/config';

import { Row } from './PlaygroundDashboard';
import Input from '../ui/Input';
import { SelectItem } from '../ui/Select';

type SearchProviderConfigProps = {
  className?: string;
};

export const SearchProviderConfig: FC<SearchProviderConfigProps> = () => {
  const { markpromptOptions, setMarkpromptOptions } = useConfigContext();

  return (
    <>
      <Row label="Provider" indented collapseMargin>
        <Select.Root
          value={
            markpromptOptions.search?.provider?.name === 'algolia'
              ? 'algolia'
              : 'markprompt'
          }
          onValueChange={(value) => {
            if (value === 'algolia') {
              setMarkpromptOptions({
                ...markpromptOptions,
                search: {
                  ...markpromptOptions.search,
                  provider: {
                    name: 'algolia',
                    apiKey: '',
                    appId: '',
                    indexName: '',
                  },
                },
              });
            } else {
              setMarkpromptOptions({
                ...markpromptOptions,
                search: {
                  ...markpromptOptions.search,
                  provider: undefined,
                },
              });
            }
          }}
        >
          <Select.Trigger
            className="button-ring flex w-full flex-row items-center gap-2 rounded-md border border-neutral-900 py-1.5 px-3 text-sm text-neutral-300 outline-none"
            aria-label="Theme"
          >
            <div className="flex-grow truncate whitespace-nowrap text-left">
              <Select.Value placeholder="Pick a theme…" />
            </div>
            <Select.Icon className="flex-none text-neutral-500">
              <ChevronDown className="h-4 w-4" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="z-30 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900">
              <Select.ScrollUpButton className="flex h-10 items-center justify-center">
                <ChevronUp className="h-4 w-4" />
              </Select.ScrollUpButton>
              <Select.Viewport>
                <Select.Group>
                  <SelectItem value="markprompt">Markprompt</SelectItem>
                  <SelectItem value="algolia">Algolia</SelectItem>
                </Select.Group>
              </Select.Viewport>
              <Select.ScrollDownButton className="flex items-center justify-center p-2">
                <ChevronDown className="h-4 w-4" />
              </Select.ScrollDownButton>
            </Select.Content>
          </Select.Portal>{' '}
        </Select.Root>
      </Row>
      {markpromptOptions.search?.provider?.name === 'algolia' && (
        <>
          <Row label="API key" indented collapseMargin>
            <Input
              inputSize="sm"
              value={markpromptOptions.search?.provider?.apiKey || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setMarkpromptOptions({
                  ...markpromptOptions,
                  search: {
                    ...markpromptOptions.search,
                    provider: {
                      ...(markpromptOptions.search
                        ?.provider as AlgoliaProvider),
                      apiKey: event.target.value,
                    },
                  },
                });
              }}
            />
          </Row>
          <Row label="App ID" indented collapseMargin>
            <Input
              inputSize="sm"
              value={markpromptOptions.search?.provider?.appId || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setMarkpromptOptions({
                  ...markpromptOptions,
                  search: {
                    ...markpromptOptions.search,
                    provider: {
                      ...(markpromptOptions.search
                        ?.provider as AlgoliaProvider),
                      appId: event.target.value,
                    },
                  },
                });
              }}
            />
          </Row>
          <Row label="Index name" indented collapseMargin>
            <Input
              inputSize="sm"
              value={markpromptOptions.search?.provider?.indexName || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setMarkpromptOptions({
                  ...markpromptOptions,
                  search: {
                    ...markpromptOptions.search,
                    provider: {
                      ...(markpromptOptions.search
                        ?.provider as AlgoliaProvider),
                      indexName: event.target.value,
                    },
                  },
                });
              }}
            />
          </Row>
        </>
      )}
    </>
  );
};
