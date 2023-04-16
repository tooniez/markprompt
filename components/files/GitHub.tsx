import * as Dialog from '@radix-ui/react-dialog';
import cn from 'classnames';
import dynamic from 'next/dynamic';
import { FC, useCallback, useEffect, useState } from 'react';

import {
  getTrainingStateMessage,
  TrainingState,
  useTrainingContext,
} from '@/lib/context/training';
import {
  getGitHubMDFiles,
  getOwnerRepoString,
  getRepositoryMDFilesInfo,
} from '@/lib/github';
import useGitHub from '@/lib/hooks/integrations/use-github';
import useFiles from '@/lib/hooks/use-files';
import useProject from '@/lib/hooks/use-project';
import useProjects from '@/lib/hooks/use-projects';
import useSources from '@/lib/hooks/use-sources';
import { MarkpromptConfigType } from '@/lib/schema';
import { createChecksum, pluralize } from '@/lib/utils';
import { ApiError, Source } from '@/types/types';

import { GitHubIcon } from '../icons/GitHub';
import Button from '../ui/Button';
import { ToggleMessage } from '../ui/ToggleMessage';

const GitHubSource = dynamic(
  () => import('@/components/dialogs/sources/GitHub'),
  {
    loading: () => <p className="p-4 text-sm text-neutral-500">Loading...</p>,
  },
);

type GitHubProps = {
  onTrainingComplete: () => void;
  className?: string;
};

type GitHubStateIdle = { state: 'idle' };
type GitHubStateChecking = { state: 'checking' };
type GitHubStateInaccessible = { state: 'inaccessible' };
type GitHubStateNoFile = { state: 'no_files' };
type GitHubStateReady = { state: 'ready'; numFiles: number };
type GitHubStateFetchingData = { state: 'fetching_gh_data' };
type GitHubStateTrainingComplete = { state: 'training_complete' };

type GitHubState =
  | GitHubStateIdle
  | GitHubStateChecking
  | GitHubStateInaccessible
  | GitHubStateNoFile
  | GitHubStateReady
  | GitHubStateFetchingData
  | GitHubStateTrainingComplete;

const getReadyMessage = (
  isFetchingRepoInfo: boolean,
  trainingState: TrainingState,
  githubSource: Source | undefined,
  numFiles: number,
  onSelectOtherClick: () => void,
) => {
  if (trainingState.state === 'idle') {
    if (githubSource) {
      return (
        <div className="flex flex-col">
          <p>{pluralize(numFiles, 'file', 'files')} found</p>
          <p className="text-xs text-neutral-500">
            Syncing {getOwnerRepoString((githubSource.data as any)['url'])}.{' '}
            <span
              className="subtle-underline cursor-pointer"
              onClick={onSelectOtherClick}
            >
              Select another repo
            </span>
            .
          </p>
        </div>
      );
    } else if (isFetchingRepoInfo) {
      return 'Fetching files...';
    }
  }
  return getTrainingStateMessage(trainingState);
};

export const GitHub: FC<GitHubProps> = ({ onTrainingComplete }) => {
  const { projects, mutate: mutateProjects } = useProjects();
  const { project, config, mutate: mutateProject } = useProject();
  const { mutate: mutateFiles } = useFiles();
  const { sources } = useSources();
  const { token } = useGitHub();
  const {
    generateEmbeddings,
    state: trainingState,
    stopGeneratingEmbeddings,
  } = useTrainingContext();
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [isFetchingRepoInfo, setFetchingRepoInfo] = useState(false);
  const [numFiles, setNumFiles] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isTrainingInitiatedByGitHub, setIsTrainingInitiatedByGitHub] =
    useState(false);

  const checkRepo = useCallback(
    async (url: string, config: MarkpromptConfigType) => {
      if (!url || !project) {
        return;
      }

      setFetchingRepoInfo(true);
      const files = await getRepositoryMDFilesInfo(
        url,
        config.include || [],
        config.exclude || [],
        token?.access_token || undefined,
      );
      setFetchingRepoInfo(false);
      setNumFiles(files ? files.length : 0);
    },
    [project, token?.access_token],
  );

  const githubSource = sources.find((s) => s.source === 'github');

  const isReady = !!githubSource;

  useEffect(() => {
    const data = githubSource?.data as any;
    if (!data?.['url']) {
      return;
    }
    checkRepo(data['url'] as string, config);
  }, [githubSource, config, checkRepo]);

  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center rounded-lg border-2 p-8 text-sm text-neutral-300 transition duration-300',
        {
          'border-transparent': !isReady,
          'border-fuchsia-600 bg-fuchsia-500 bg-opacity-[7%]': isReady,
        },
      )}
    >
      <div className="relative mt-8 flex w-full max-w-md flex-col gap-4">
        <div className="absolute inset-x-0 -top-12 z-50 overflow-visible">
          <ToggleMessage
            showMessage1={!isReady}
            message1="Sync files from  GitHub"
            message2={getReadyMessage(
              isFetchingRepoInfo,
              trainingState,
              githubSource,
              numFiles,
              () => {
                setGithubDialogOpen(true);
              },
            )}
          />
        </div>
        <div className="relative flex flex-row justify-center">
          <Dialog.Root
            open={githubDialogOpen}
            onOpenChange={setGithubDialogOpen}
          >
            {/* Only hide the trigger if the state is ready. The dialog still needs to be accessible. */}
            {!isReady && (
              <Dialog.Trigger asChild>
                <Button className="mt-2" variant="plain" Icon={GitHubIcon}>
                  Select GitHub repository
                </Button>
              </Dialog.Trigger>
            )}
            <Dialog.Portal>
              <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
              <Dialog.Content className="animate-dialog-slide-in dialog-content flex h-[90%] max-h-[600px] w-[90%] max-w-[500px] flex-col">
                <Dialog.Title className="dialog-title flex-none">
                  Select GitHub repository
                </Dialog.Title>
                <Dialog.Description className="dialog-description flex-none border-b border-neutral-900 pb-4">
                  Sync files from a GitHub repository.
                </Dialog.Description>
                <div className="flex-grow">
                  <GitHubSource
                    clearPrevious
                    onDidRequestClose={() => {
                      setGithubDialogOpen(false);
                    }}
                  />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          {isReady && (
            <Button
              variant="glow"
              loading={
                trainingState.state !== 'idle' && isTrainingInitiatedByGitHub
              }
              loadingMessage="Processing..."
              onClick={async () => {
                const githubUrl = (githubSource?.data as any)['url'];
                if (!projects || !project?.id || !githubUrl) {
                  return;
                }
                try {
                  setError(undefined);
                  setIsTrainingInitiatedByGitHub(true);
                  const mdFiles = await getGitHubMDFiles(
                    githubUrl,
                    config.include || [],
                    config.exclude || [],
                  );
                  await generateEmbeddings(
                    mdFiles.length,
                    (i) => {
                      const file = mdFiles[i];
                      const content = file.content;
                      return {
                        name: file.name,
                        path: file.path,
                        checksum: createChecksum(content),
                      };
                    },
                    async (i) => mdFiles[i].content,
                    () => {
                      mutateFiles();
                    },
                  );
                  await mutateFiles();
                  onTrainingComplete();
                } catch (e) {
                  setError(`${(e as ApiError).message}`);
                } finally {
                  setIsTrainingInitiatedByGitHub(false);
                }
              }}
            >
              Start training
            </Button>
          )}
        </div>
        {/* <div className="relative flex flex-row gap-2">
          <Input
            className="w-full"
            value={githubUrl}
            variant={isReady ? 'glow' : 'plain'}
            type="text"
            onChange={(e: any) => {
              setGitHubUrl(e.target.value);
              checkRepo(e.target.value, config);
            }}
            placeholder="Enter URL"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />
          <Button
            disabled={!isReady}
            variant={isReady ? 'glow' : 'plain'}
            loading={
              gitHubState.state === 'checking' ||
              (trainingState.state !== 'idle' && isTrainingInitiatedByGitHub)
            }
            loadingMessage={
              gitHubState.state === 'checking' ? 'Checking...' : 'Processing...'
            }
            onClick={async () => {
              if (!projects || !project?.id || !githubUrl) {
                return;
              }
              setIsTrainingInitiatedByGitHub(true);
              const values = { github_repo: githubUrl };
              const updatedProject = { ...project, ...values };
              setGitHubState({ state: 'fetching_gh_data' });
              await mutateProject(updateProject(project.id, values), {
                optimisticData: updatedProject,
                rollbackOnError: true,
                populateCache: true,
                revalidate: false,
              });
              await mutateProjects([
                ...projects.filter((p) => p.id !== updatedProject.id),
                updatedProject,
              ]);
              const mdFiles = await getGitHubMDFiles(
                githubUrl,
                config.include || [],
                config.exclude || [],
              );
              await generateEmbeddings(
                mdFiles.length,
                (i) => {
                  const file = mdFiles[i];
                  const content = file.content;
                  return {
                    name: file.name,
                    path: file.path,
                    checksum: createChecksum(content),
                  };
                },
                async (i) => mdFiles[i].content,
                () => {
                  mutateFiles();
                },
              );
              await mutateFiles();
              setIsTrainingInitiatedByGitHub(false);
              onTrainingComplete();
              setGitHubState({ state: 'idle' });
            }}
          >
            Start training
          </Button>
        </div> */}
        {trainingState.state !== 'idle' && isTrainingInitiatedByGitHub && (
          <div className="absolute -bottom-7 flex w-full justify-center">
            <p
              className="subtle-underline cursor-pointer text-xs"
              onClick={stopGeneratingEmbeddings}
            >
              {trainingState.state === 'cancel_requested'
                ? 'Cancelling...'
                : 'Stop training'}
            </p>
          </div>
        )}
      </div>
      {error && (
        <div className="absolute left-4 right-4 bottom-3 flex justify-center">
          <p className="text-center text-xs text-fuchsia-500">{error}</p>
        </div>
      )}
    </div>
  );
};
