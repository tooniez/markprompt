import { useSupabaseClient } from '@supabase/auth-helpers-react';
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
  fetchPageContent,
  fetchRobotsTxtInfo,
  fetchSitemapUrls,
} from '../integrations/website';
import {
  createChecksum,
  getGitHubOwnerRepoString,
  getNameFromUrlOrPath,
  pluralize,
  shouldIncludeFileWithPath,
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

  const numWebsitePagesRemainingOnPlan =
    numWebsitePagesPerProjectAllowance - numWebsitePagesInProject;

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

      const { data: checksums } = await supabase
        .from('files')
        .select('path,checksum')
        .eq('source_id', sourceId);

      let numNewlyProcessed = 0;
      for (let i = 0; i < numFiles; i++) {
        if (stopFlag.current) {
          stopFlag.current = false;
          break;
        }

        // Only pick the metadata, not the full file content, since this
        // could be an expensive operation (GitHub) that might not be
        // needed if the checksums match.
        const path = getFilePath(i);

        if (
          !shouldIncludeFileWithPath(
            path,
            config.include || [],
            config.exclude || [],
          )
        ) {
          console.info('Skipping', path);
          continue;
        }

        setState({
          state: 'loading',
          progress: i + 1,
          total: numFiles,
          filename: path.split('/').slice(-1)[0],
        });

        const prevChecksum = checksums?.find((c) => c.path === path)?.checksum;

        const { name, content } = await getFileNameContent(i);
        const currentChecksum = createChecksum(content);

        // Check the checksum (or SHA if GitHub file), and skip if equals.
        if (prevChecksum === currentChecksum) {
          console.info('Skipping', path);
          continue;
        }

        if (
          hasReachedTrainingQuota(
            sourceType,
            numNewlyProcessed,
            numWebsitePagesRemainingOnPlan,
          )
        ) {
          break;
        }

        console.info('Processing', path);

        const file: FileData = { path, name, content };

        try {
          await processFile(sourceId, file);
          onFileProcessed?.();
        } catch (e) {
          console.error('Error', e);
          setErrors((errors) => [
            ...errors,
            `Error processing ${file.name}: ${e}`,
          ]);
        }
        numNewlyProcessed++;
      }

      if (
        hasReachedTrainingQuota(
          sourceType,
          numNewlyProcessed,
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
      config.include,
      config.exclude,
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
          const websiteUrl = data.url;

          try {
            const robotsTxtInfo = await fetchRobotsTxtInfo(websiteUrl);
            const sitemapUrls = await fetchSitemapUrls(
              websiteUrl,
              robotsTxtInfo.sitemap,
            );
            if (sitemapUrls !== undefined) {
              // If there is a sitemap, we honor this.
              await generateEmbeddings(
                source.id,
                'website',
                sitemapUrls.length,
                (i) => sitemapUrls[i],
                async (i) => {
                  const url = sitemapUrls[i];
                  const name = getNameFromUrlOrPath(url);
                  const content = (await fetchPageContent(url)) || '';
                  return { name, content };
                },
                () => {
                  onFileProcessed();
                },
              );
            } else {
              // Otherwise, we discover links starting with the root page
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
