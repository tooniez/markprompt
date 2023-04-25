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

import {
  FileData,
  GitHubSourceDataType,
  MotifSourceDataType,
  Source,
} from '@/types/types';

import { processFile } from '../api';
import useProject from '../hooks/use-project';
import useSources from '../hooks/use-sources';
import { getGitHubFiles } from '../integrations/github.node';
import {
  getMotifFileContent,
  getMotifPublicFileMetadata,
} from '../integrations/motif';
import {
  createChecksum,
  getGitHubOwnerRepoString,
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
    numFiles: number,
    getFileMeta: (index: number) => Pick<FileData, 'name' | 'path'>,
    getFileContent: (index: number) => Promise<string>,
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
      state.filename ? ` (${truncate(state.filename, 20)})` : '.'
    }`;
  } else if (state.state === 'complete') {
    return 'Done processing files.';
  } else if (state.state === 'cancel_requested') {
    return 'Stopping processing...';
  }
  if (typeof numFiles !== 'undefined') {
    return `${pluralize(numFiles, 'file', 'files')} added.`;
  }
  return '';
};

const TrainingContextProvider = (props: PropsWithChildren) => {
  const supabase = useSupabaseClient();
  const { project, config } = useProject();
  const [state, setState] = useState<TrainingState>({ state: 'idle' });
  const [errors, setErrors] = useState<string[]>([]);
  const stopFlag = useRef(false);
  const { sources } = useSources();

  const generateEmbeddings = useCallback(
    async (
      sourceId: Source['id'],
      numFiles: number,
      getFileMeta: (index: number) => Pick<FileData, 'name' | 'path'>,
      getFileContent: (index: number) => Promise<string>,
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

      for (let i = 0; i < numFiles; i++) {
        if (stopFlag.current) {
          stopFlag.current = false;
          break;
        }

        // Only pick the metadata, not the full file content, since this
        // could be an expensive operation (GitHub) that might not be
        // needed if the checksums match.
        const fileMeta = getFileMeta(i);

        if (
          !shouldIncludeFileWithPath(
            fileMeta.path,
            config.include || [],
            config.exclude || [],
          )
        ) {
          console.info('Skipping', fileMeta.path);
          continue;
        }

        setState({
          state: 'loading',
          progress: i + 1,
          total: numFiles,
          filename: fileMeta.name,
        });

        const prevChecksum = checksums?.find(
          (c) => c.path === fileMeta.path,
        )?.checksum;

        const content = await getFileContent(i);
        const currentChecksum = createChecksum(content);

        // Check the checksum (or SHA if GitHub file), and skip if equals.
        if (prevChecksum === currentChecksum) {
          console.info('Skipping', fileMeta.path);
          continue;
        }

        console.info('Processing', fileMeta.path);

        const file = { ...fileMeta, content };

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
      }

      setState({ state: 'idle' });
    },
    [project?.id, supabase, config.include, config.exclude],
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
              fileData.length,
              (i) => {
                const file = fileData[i];
                return {
                  name: file.name,
                  path: file.path,
                };
              },
              async (i) => fileData[i].content,
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
              filesMetadata.length,
              (i) => {
                const metadata = filesMetadata[i];
                return {
                  name: metadata.name,
                  path: metadata.path,
                };
              },
              async (i) => getMotifFileContent(filesMetadata[i].id),
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
