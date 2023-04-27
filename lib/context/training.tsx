import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { uniq } from 'lodash-es';
import pLimit from 'p-limit';
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-hot-toast';
import { isPresent } from 'ts-is-present';

import {
  FileData,
  GitHubSourceDataType,
  MotifSourceDataType,
  Source,
  WebsiteSourceDataType,
} from '@/types/types';

import { processFile } from '../api';
import useProject from '../hooks/use-project';
import useSources from '../hooks/use-sources';
import useUsage from '../hooks/use-usage';
import { getGitHubFiles } from '../integrations/github.node';
import {
  getMotifFileContent,
  getMotifPublicFileMetadata,
} from '../integrations/motif';
import {
  extractLinksFromHtml,
  fetchPageContent,
  fetchRobotsTxtInfo,
  fetchSitemapUrls,
} from '../integrations/website';
import {
  completeHrefWithOrigin,
  createChecksum,
  getGitHubOwnerRepoString,
  getNameFromUrlOrPath,
  getUrlHostname,
  isHrefFromHost,
  pluralize,
  shouldIncludeFileWithPath,
  toNormalizedHostname,
  truncate,
} from '../utils';

type IdleState = { state: 'idle' };
type FetchingDataState = { state: 'fetching_data' };
type LoadingState = {
  state: 'loading';
  progress?: number;
  total?: number;
  filename?: string;
  message?: string;
};
type CancelRequestsState = { state: 'cancel_requested' };
type CompleteState = { state: 'complete'; errors: string[] };

export type TrainingState =
  | IdleState
  | FetchingDataState
  | LoadingState
  | CancelRequestsState
  | CompleteState;

export type State = {
  state: TrainingState;
  errors: string[];
  generateEmbeddings: (
    sourceId: Source['id'],
    sourceType: Source['type'],
    numFiles: number,
    getFilePath: (index: number) => string,
    getFileNameContent: (
      index: number,
    ) => Promise<{ name: string; content: string }>,
    onFileProcessed?: () => void,
    forceRetrain?: boolean,
  ) => Promise<void>;
  stopGeneratingEmbeddings: () => void;
  trainAllSources: (
    onFileProcessed: () => void,
    onError: (message: string) => void,
  ) => void;
  trainSource: (
    source: Source,
    onFileProcessed: () => void,
    onError: (message: string) => void,
  ) => void;
};

const initialState: State = {
  state: { state: 'idle' },
  errors: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  generateEmbeddings: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  stopGeneratingEmbeddings: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  trainAllSources: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  trainSource: () => {},
};

export const getTrainingStateMessage = (
  state: TrainingState,
  numFiles?: number,
) => {
  if (state.state === 'loading') {
    return `Processing file ${state.progress} of ${state.total}${
      state.filename ? ` (${truncate(state.filename, 20)})` : ''
    }`;
  } else if (state.state === 'complete') {
    return 'Done processing files';
  } else if (state.state === 'cancel_requested') {
    return 'Stopping processing...';
  }
  if (typeof numFiles !== 'undefined') {
    return `${pluralize(numFiles, 'file', 'files')} added`;
  }
  return '';
};

const hasReachedTrainingQuota = (
  sourceType: Source['type'],
  numNewlyProcessedFiles: number,
  numWebsitePagesRemainingOnPlan: number,
) => {
  return (
    sourceType === 'website' &&
    numNewlyProcessedFiles >= numWebsitePagesRemainingOnPlan
  );
};

const TrainingContextProvider = (props: PropsWithChildren) => {
  const supabase = useSupabaseClient();
  const { project, config } = useProject();
  const { sources } = useSources();
  const { numWebsitePagesInProject, numWebsitePagesPerProjectAllowance } =
    useUsage();
  const [state, setState] = useState<TrainingState>({ state: 'idle' });
  const [errors, setErrors] = useState<string[]>([]);
  const stopFlag = useRef(false);
  const numProcessedInSession = useRef(0);

  const numWebsitePagesRemainingOnPlan =
    numWebsitePagesPerProjectAllowance - numWebsitePagesInProject;

  const generateEmbeddingForFile = useCallback(
    async (
      index: number,
      checksums: { path: any; checksum: any }[],
      sourceId: Source['id'],
      sourceType: Source['type'],
      numFiles: number,
      getFilePath: (index: number) => string,
      getFileNameContent: (
        index: number,
      ) => Promise<{ name: string; content: string }>,
      onFileProcessed?: () => void,
    ) => {
      if (stopFlag.current) {
        return;
      }

      // Only pick the metadata, not the full file content, since this
      // could be an expensive operation (GitHub) that might not be
      // needed if the checksums match.
      const path = getFilePath(index);

      if (
        !shouldIncludeFileWithPath(
          path,
          config.include || [],
          config.exclude || [],
        )
      ) {
        console.info('Skipping', path);
        return;
      }

      setState({
        state: 'loading',
        progress: index + 1,
        total: numFiles,
        filename: path.split('/').slice(-1)[0],
      });

      const prevChecksum = checksums?.find((c) => c.path === path)?.checksum;

      const { name, content } = await getFileNameContent(index);
      const currentChecksum = createChecksum(content);

      // Check the checksum (or SHA if GitHub file), and skip if equals.
      if (prevChecksum === currentChecksum) {
        console.info('Skipping', path);
        return;
      }

      if (
        hasReachedTrainingQuota(
          sourceType,
          numProcessedInSession.current,
          numWebsitePagesRemainingOnPlan,
        )
      ) {
        return;
      }

      // We update early because processing is run in parallel.
      // If the processing fails, we just decrement the value.
      numProcessedInSession.current++;

      console.info('Processing', path);

      const file: FileData = { path, name, content };

      try {
        await processFile(sourceId, file);
        onFileProcessed?.();
      } catch (e) {
        numProcessedInSession.current--;
        console.error('Error', e);
        setErrors((errors) => [
          ...errors,
          `Error processing ${file.name}: ${e}`,
        ]);
      }
    },
    [config.exclude, config.include, numWebsitePagesRemainingOnPlan],
  );

  const generateEmbeddings = useCallback(
    async (
      sourceId: Source['id'],
      sourceType: Source['type'],
      numFiles: number,
      getFilePath: (index: number) => string,
      getFileNameContent: (
        index: number,
      ) => Promise<{ name: string; content: string }>,
      onFileProcessed?: () => void,
    ) => {
      if (!project?.id) {
        return;
      }

      setErrors([]);
      numProcessedInSession.current = 0;
      stopFlag.current = false;

      const { data: checksums } = await supabase
        .from('files')
        .select('path,checksum')
        .eq('source_id', sourceId);

      // TODO: check how much we can do concurrently without hitting
      // rate limitations.
      const limit = pLimit(10);

      await Promise.all(
        Array.from(Array(numFiles).keys()).map((index) => {
          return limit(() =>
            generateEmbeddingForFile(
              index,
              checksums || [],
              sourceId,
              sourceType,
              numFiles,
              getFilePath,
              getFileNameContent,
              onFileProcessed,
            ),
          );
        }),
      );

      if (
        hasReachedTrainingQuota(
          sourceType,
          numProcessedInSession.current,
          numWebsitePagesRemainingOnPlan,
        )
      ) {
        toast.error(
          'You have reached the quota of website pages per project on this plan.',
        );
      }

      setState({ state: 'idle' });
    },
    [
      project?.id,
      supabase,
      numWebsitePagesRemainingOnPlan,
      generateEmbeddingForFile,
    ],
  );

  const trainSource = useCallback(
    async (
      source: Source,
      onFileProcessed: () => void,
      onError: (message: string) => void,
    ) => {
      switch (source.type) {
        case 'github': {
          const data = source.data as GitHubSourceDataType;
          try {
            const fileData = await getGitHubFiles(
              data.url,
              config.include || [],
              config.exclude || [],
            );

            await generateEmbeddings(
              source.id,
              'github',
              fileData.length,
              (i) => fileData[i].path,
              async (i) => {
                const name = fileData[i].name;
                const content = fileData[i].content;
                return { name, content };
              },
              () => {
                onFileProcessed();
              },
            );
          } catch (e) {
            const repoOwner = getGitHubOwnerRepoString(data.url);
            onError(`Error processing ${repoOwner}: ${e}`);
            break;
          }
          break;
        }
        case 'motif': {
          const data = source.data as MotifSourceDataType;

          try {
            const filesMetadata = await getMotifPublicFileMetadata(
              data.projectDomain,
              config.include || [],
              config.exclude || [],
            );

            await generateEmbeddings(
              source.id,
              'motif',
              filesMetadata.length,
              (i) => filesMetadata[i].path,
              async (i) => {
                const name = filesMetadata[i].name;
                const content = await getMotifFileContent(filesMetadata[i].id);
                return { name, content };
              },
              () => {
                onFileProcessed();
              },
            );
          } catch (e) {
            onError(`Error processing ${data.projectDomain}: ${e}`);
            break;
          }
          break;
        }
        case 'website': {
          const data = source.data as WebsiteSourceDataType;
          const websiteUrl = toNormalizedHostname(data.url);

          try {
            const generateEmbeddingsForUrls = async (urls: string[]) => {
              const processedContent: string[] = [];
              await generateEmbeddings(
                source.id,
                'website',
                urls.length,
                (i) => urls[i],
                async (i) => {
                  const url = urls[i];
                  const name = getNameFromUrlOrPath(url);
                  const content = (await fetchPageContent(url)) || '';
                  processedContent.push(content);
                  return { name, content };
                },
                () => {
                  onFileProcessed();
                },
              );
              return processedContent;
            };

            const robotsTxtInfo = await fetchRobotsTxtInfo(websiteUrl);
            const sitemapUrls = await fetchSitemapUrls(
              websiteUrl,
              robotsTxtInfo.sitemap,
            );
            if (sitemapUrls !== undefined) {
              // If there is a sitemap, we honor this.
              await generateEmbeddingsForUrls(sitemapUrls);
            } else {
              // Otherwise, we discover links starting with the root page
              let processedLinks: string[] = [];
              let linksToProcess = [websiteUrl];
              const hostname = getUrlHostname(websiteUrl);
              while (linksToProcess.length > 0) {
                const processedContent = await generateEmbeddingsForUrls(
                  linksToProcess,
                );
                const discoveredLinks = uniq(
                  processedContent.flatMap((html) =>
                    extractLinksFromHtml(html),
                  ),
                )
                  .filter((href) => isHrefFromHost(hostname, href))
                  .map((href) => {
                    return completeHrefWithOrigin(websiteUrl, href);
                  })
                  .filter(isPresent);
                processedLinks = [...processedLinks, ...linksToProcess];
                linksToProcess = discoveredLinks.filter(
                  (link) => !processedLinks.includes(link),
                );
              }
            }
          } catch (e) {
            onError(`Error processing ${websiteUrl}: ${e}`);
          }

          break;
        }
        default: {
          // Skip. Note that file sources are trained at upload
          // time, and file content is not stored, so there's nothing
          // to train here in this situation.
          break;
        }
      }
    },
    [config.exclude, config.include, generateEmbeddings],
  );

  const trainAllSources = useCallback(
    async (onFileProcessed: () => void, onError: (message: string) => void) => {
      setState({ state: 'fetching_data' });
      for (const source of sources) {
        await trainSource(source, onFileProcessed, onError);
      }
      setState({ state: 'idle' });
    },
    [sources, trainSource],
  );

  const stopGeneratingEmbeddings = useCallback(() => {
    stopFlag.current = true;
    setState({ state: 'cancel_requested' });
  }, []);

  return (
    <TrainingContext.Provider
      value={{
        state,
        errors,
        generateEmbeddings,
        stopGeneratingEmbeddings,
        trainAllSources,
        trainSource,
      }}
      {...props}
    />
  );
};

export const useTrainingContext = (): State => {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error(
      `useTrainingContext must be used within a TrainingContextProvider`,
    );
  }
  return context;
};

export const TrainingContext = createContext<State>(initialState);

TrainingContext.displayName = 'TrainingContext';

export const ManagedTrainingContext: FC<PropsWithChildren> = ({ children }) => (
  <TrainingContextProvider>{children}</TrainingContextProvider>
);
