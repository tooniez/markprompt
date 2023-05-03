import cn from 'classnames';
import {
  Upload,
  Globe,
  X,
  ArrowDown,
  Code,
  Moon,
  Share,
  Sun,
  MessageCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import {
  JSXElementConstructor,
  ReactNode,
  forwardRef,
  useCallback,
} from 'react';
import { toast } from 'react-hot-toast';

import { NavLayout } from '@/components/layouts/NavLayout';
import { addSource, deleteSource } from '@/lib/api';
import { SAMPLE_REPO_URL } from '@/lib/constants';
import { ManagedConfigContext, useConfigContext } from '@/lib/context/config';
import { useTrainingContext } from '@/lib/context/training';
import emitter, { EVENT_OPEN_CHAT } from '@/lib/events';
import useFiles from '@/lib/hooks/use-files';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import {
  getIconForSource,
  getLabelForSource,
  getNameFromPath,
  removeFileExtension,
  showConfetti,
} from '@/lib/utils';
import { SourceType } from '@/types/types';

import GetCode from '../dialogs/code/GetCode';
import FilesAddSourceDialog from '../dialogs/sources/Files';
import MotifAddSourceDialog from '../dialogs/sources/Motif';
import WebsiteAddSourceDialog from '../dialogs/sources/Website';
import { ModelConfigurator } from '../files/ModelConfigurator';
import { Playground } from '../files/Playground';
import { UIConfigurator } from '../files/UIConfigurator';
import { GitHubIcon } from '../icons/GitHub';
import { MotifIcon } from '../icons/Motif';
import { SpinnerIcon } from '../icons/Spinner';
import Button from '../ui/Button';
import { PulseDot } from '../ui/PulseDot';

const GitHubAddSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/GitHub'),
  {
    loading: () => <p className="p-4 text-sm text-neutral-500">Loading...</p>,
  },
);

export const Row = ({
  label,
  className,
  children,
}: {
  label: string | ReactNode;
  className?: string;
  children?: ReactNode;
}) => {
  return (
    <div className={cn(className, 'grid grid-cols-2 items-center gap-4')}>
      <div className="truncate py-1 text-sm text-neutral-300">{label}</div>
      {children && <div className="flex w-full justify-end">{children}</div>}
    </div>
  );
};

type ConnectButtonProps = {
  label: string;
  Icon: JSXElementConstructor<any>;
  sample?: boolean;
  onClick?: () => void;
};

const ConnectButton = forwardRef<HTMLButtonElement, ConnectButtonProps>(
  ({ label, Icon, onClick, ...props }, ref) => {
    return (
      <button
        {...props}
        onClick={onClick}
        ref={ref}
        className="button-ring relative w-full rounded-lg border border-neutral-900 transition hover:bg-neutral-1000"
      >
        <div className="flex flex-row items-center gap-4 p-4 sm:p-3">
          <Icon className="h-4 w-4 flex-none text-neutral-300" />
          <span className="flex-grow truncate text-left text-sm font-medium leading-tight text-neutral-300">
            {label}
          </span>
        </div>
      </button>
    );
  },
);

ConnectButton.displayName = 'ConnectButton';

const Onboarding = () => {
  const { project } = useProject();
  const { files, mutate: mutateFiles, loading: loadingFiles } = useFiles();
  const {
    sources,
    mutate: mutateSources,
    loading: loadingSources,
  } = useSources();
  const { state: trainingState, trainAllSources } = useTrainingContext();
  const {
    theme,
    colors,
    isDark,
    includeBranding,
    modelConfig,
    setDark,
    placeholder,
    iDontKnowMessage,
    referencesHeading,
    loadingHeading,
  } = useConfigContext();

  const startTraining = useCallback(async () => {
    await trainAllSources(
      () => {
        // Do nothing
      },
      (errorMessage: string) => {
        toast.error(errorMessage);
      },
    );
    mutateFiles();
    showConfetti();
    toast.success(
      'Done training sources. You can now ask questions to your content!',
    );
  }, [trainAllSources, mutateFiles]);

  const _addSource = useCallback(
    async (sourceType: SourceType, data: any) => {
      if (!project?.id) {
        return;
      }

      try {
        const newSource = await addSource(project.id, sourceType, data);
        await mutateSources([...sources, newSource]);
        // setTimeout(async () => {
        //   await startTraining();
        // }, 1000);
      } catch (e) {
        console.error(e);
        toast.error(`${e}`);
      }
    },
    [project?.id, mutateSources, sources],
  );

  const hasConnectedSources = sources && sources.length > 0;
  const isTrained = files && files.length > 0;
  const isLoading = loadingSources || loadingFiles;
  const isShowingOverlay = !isLoading && (!hasConnectedSources || !isTrained);

  return (
    <>
      <Head>
        <title>Get started | Markprompt</title>
      </Head>
      <NavLayout animated={false}>
        <div className="fixed top-[var(--app-navbar-height)] bottom-0 left-0 right-0 grid grid-cols-1 sm:grid-cols-4">
          <div className="relative h-full">
            <div className="absolute inset-x-0 top-0 bottom-[var(--onboarding-footer-height)] overflow-y-auto p-6">
              <h1 className="text-xl font-bold text-neutral-300">
                Connect source{' '}
                {!isLoading && (!sources || sources.length === 0) && (
                  <PulseDot className="translate-x-[-4px] translate-y-[-8px] transform" />
                )}
              </h1>
              <p className="mt-2 text-sm font-normal text-neutral-500">
                Missing a source?{' '}
                <span
                  className="subtle-underline cursor-pointer"
                  onClick={() => {
                    emitter.emit(EVENT_OPEN_CHAT);
                  }}
                >
                  Let us know
                </span>
                .
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-1 sm:gap-2">
                <GitHubAddSourceDialog onDidAddSource={startTraining}>
                  <ConnectButton label="GitHub repo" Icon={GitHubIcon} />
                </GitHubAddSourceDialog>
                <WebsiteAddSourceDialog
                  onDidAddSource={startTraining}
                  openPricingAsDialog
                >
                  <ConnectButton label="Website" Icon={Globe} />
                </WebsiteAddSourceDialog>
                <MotifAddSourceDialog onDidAddSource={startTraining}>
                  <ConnectButton label="Motif project" Icon={MotifIcon} />
                </MotifAddSourceDialog>
                <FilesAddSourceDialog onDidAddSource={startTraining}>
                  <ConnectButton label="Upload files" Icon={Upload} />
                </FilesAddSourceDialog>
              </div>
              <p className="mt-6 text-sm text-neutral-500">
                Or select a sample data source:
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-1">
                <ConnectButton
                  label="Markprompt docs"
                  Icon={GitHubIcon}
                  onClick={async () => {
                    await _addSource('github', { url: SAMPLE_REPO_URL });
                  }}
                />
              </div>
              {sources?.length > 0 && (
                <>
                  <h2 className="mt-8 text-sm font-semibold text-neutral-300">
                    Connected sources
                  </h2>
                  <div className="mt-4 flex flex-col gap-2">
                    {sources.map((source, i) => {
                      const Icon = getIconForSource(source.type);
                      return (
                        <div
                          key={`source-icon-${i}`}
                          className="flex flex-row items-center gap-2 rounded-md bg-sky-900/20 py-2 pl-3 pr-2 outline-none"
                        >
                          <Icon className="h-4 w-4 flex-none text-sky-400" />
                          <p className="flex-grow overflow-hidden truncate text-xs text-sky-400">
                            {getLabelForSource(source)}
                          </p>
                          <button
                            className="button-ring rounded-md p-1 outline-none"
                            onClick={async () => {
                              if (!project?.id) {
                                return;
                              }
                              await deleteSource(project.id, source.id);
                              await mutateSources();
                              toast.success('The source has been removed');
                            }}
                          >
                            <X className="h-3 w-3 text-sky-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 z-20 flex h-[var(--onboarding-footer-height)] transform justify-center border-t border-neutral-900 bg-neutral-1100 px-6 py-3 transition duration-300',
                {
                  'translate-y-0 opacity-100': sources.length > 0,
                  'translate-y-[20px] opacity-0': sources.length === 0,
                },
              )}
            >
              <Button
                className="w-full"
                variant={isTrained ? 'plain' : 'fuchsia'}
                loading={trainingState.state !== 'idle'}
                onClick={startTraining}
              >
                Process sources
              </Button>
            </div>
          </div>
          <div className="relative col-span-2">
            <div
              className={cn(
                'absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-8 shadow-xl transition duration-300',
                {
                  'opacity-100': isShowingOverlay,
                  'pointer-events-none opacity-0': !isShowingOverlay,
                },
              )}
            >
              <div className="flex w-min flex-row items-center gap-2 whitespace-nowrap rounded-full bg-black/50 py-3 pl-3 pr-5 text-sm text-white backdrop-blur">
                {trainingState.state !== 'idle' ? (
                  <SpinnerIcon className="ml-1 h-4 w-4 animate-spin" />
                ) : (
                  <div className="rotate-90 transform">
                    <ArrowDown className="h-4 w-4 animate-bounce" />
                  </div>
                )}
                {!hasConnectedSources ? (
                  <>Start by connecting one or more sources</>
                ) : trainingState.state !== 'idle' ? (
                  <>Processing your content</>
                ) : (
                  <>Great! Now hit &apos;Process sources&apos;</>
                )}
              </div>
            </div>
            <div
              className={cn('h-full w-full overflow-hidden', {
                'pointer-events-none': !hasConnectedSources || !isTrained,
              })}
            >
              {project && (
                <div
                  className={cn(
                    'grid-background h-full border-l border-r border-neutral-900',
                    {
                      'grid-background-dark bg-neutral-900': isDark,
                      'grid-background-light bg-neutral-100': !isDark,
                    },
                  )}
                >
                  <div className="relative flex h-full flex-col gap-4">
                    <div
                      className={cn(
                        'flex h-[var(--onboarding-footer-height)] flex-none flex-row items-center gap-2 px-6 shadow-lg',
                        {
                          'border-b border-neutral-900 bg-neutral-1100': isDark,
                          'border-neutral-200 bg-white': !isDark,
                        },
                      )}
                    >
                      <div className="flex-grow">
                        <button
                          className={cn('button-ring rounded p-2 transition', {
                            'text-neutral-300 hover:bg-white/10': isDark,
                            'button-ring-light text-neutral-700 hover:bg-black/10 focus:ring-black/20':
                              !isDark,
                          })}
                          onClick={() => setDark(!isDark)}
                        >
                          {isDark ? (
                            <Sun className="h-5 w-5" />
                          ) : (
                            <Moon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <Button
                        disabled={!isTrained}
                        buttonSize="sm"
                        variant={isDark ? 'plain' : 'borderedWhite'}
                        Icon={Share}
                      >
                        Share
                      </Button>
                      <GetCode>
                        <Button
                          disabled={!isTrained}
                          buttonSize="sm"
                          variant={isDark ? 'plain' : 'borderedWhite'}
                          Icon={Code}
                        >
                          Get code
                        </Button>
                      </GetCode>
                    </div>
                    <div className="absolute inset-x-0 top-[var(--onboarding-footer-height)] bottom-0 flex flex-col gap-4 px-16 py-8">
                      <Playground
                        projectKey={project.private_dev_api_key}
                        // didCompleteFirstQuery={didCompleteFirstQuery}
                        // autoScrollDisabled={!isReady}
                        iDontKnowMessage={iDontKnowMessage}
                        theme={theme}
                        placeholder={placeholder}
                        isDark={isDark}
                        modelConfig={modelConfig}
                        referencesHeading={referencesHeading}
                        loadingHeading={loadingHeading}
                        includeBranding={includeBranding}
                        getReferenceInfo={(path: string) => {
                          const file = files?.find((f) => f.path === path);
                          if (file) {
                            let name = path;
                            const metaTitle = (file.meta as any).title;
                            if (metaTitle) {
                              name = metaTitle;
                            } else {
                              name = removeFileExtension(getNameFromPath(path));
                            }

                            return {
                              name,
                              href: path,
                            };
                          }
                        }}
                      />
                      <div className="flex flex-none flex-row justify-end">
                        <div
                          className="rounded-full border p-3"
                          style={{
                            backgroundColor: colors.primary,
                            borderColor: colors.border,
                          }}
                        >
                          <MessageCircle
                            className="h-5 w-5"
                            style={{
                              color: colors.primaryForeground,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div
            className={cn('relative h-full transition', {
              'pointer-events-none opacity-30':
                !sources || sources.length === 0,
            })}
          >
            <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col overflow-y-auto p-6">
              <h2 className="mb-4 text-lg font-bold">Design</h2>
              <UIConfigurator />
              <h2 className="mb-4 mt-12 text-lg font-bold">
                Model configurator
              </h2>
              <ModelConfigurator />
            </div>
          </div>
        </div>
      </NavLayout>
    </>
  );
};

const OnboardingWithContext = () => {
  return (
    <ManagedConfigContext>
      <Onboarding />
    </ManagedConfigContext>
  );
};

export default OnboardingWithContext;
