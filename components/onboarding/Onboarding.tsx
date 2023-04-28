import {
  ChatBubbleIcon,
  CodeIcon,
  Cross2Icon,
  GlobeIcon,
  MixerVerticalIcon,
  Share2Icon,
  UploadIcon,
} from '@radix-ui/react-icons';
import cn from 'classnames';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import {
  JSXElementConstructor,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import { toast } from 'react-hot-toast';

import { NavLayout } from '@/components/layouts/NavLayout';
import { addSource, deleteSource } from '@/lib/api';
import { SAMPLE_REPO_URL } from '@/lib/constants';
import {
  ManagedTrainingContext,
  useTrainingContext,
} from '@/lib/context/training';
import emitter, { EVENT_OPEN_CHAT } from '@/lib/events';
import useFiles from '@/lib/hooks/use-files';
import useOnboarding from '@/lib/hooks/use-onboarding';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import useUser from '@/lib/hooks/use-user';
import { getIconForSource, getLabelForSource } from '@/lib/utils';
import { SourceType } from '@/types/types';

import FilesAddSourceDialog from '../dialogs/sources/Files';
import MotifAddSourceDialog from '../dialogs/sources/Motif';
import WebsiteAddSourceDialog from '../dialogs/sources/Website';
import { Playground } from '../files/Playground';
import { GitHubIcon } from '../icons/GitHub';
import { MarkpromptIcon } from '../icons/Markprompt';
import { MotifIcon } from '../icons/Motif';
import Button from '../ui/Button';
import { SpinnerIcon } from '../icons/Spinner';
import { UIConfigurator } from '../files/UIConfigurator';
import { Tag } from '../ui/Tag';
import { ManagedConfigContext } from '@/lib/context/config';

const GitHubAddSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/GitHub'),
  {
    loading: () => <p className="p-4 text-sm text-neutral-500">Loading...</p>,
  },
);

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
        className="relative w-full rounded-lg border border-neutral-900 transition hover:bg-neutral-1000"
      >
        <div className="flex flex-row items-center gap-4 p-4 sm:p-3">
          <Icon className="h-5 w-5 flex-none text-white" />
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
  const { user, mutate: mutateUser } = useUser();
  const { project } = useProject();
  const { files } = useFiles();
  const { finishOnboarding } = useOnboarding();
  const { sources, mutate: mutateSources } = useSources();
  const {
    state: trainingState,
    stopGeneratingEmbeddings,
    trainAllSources,
  } = useTrainingContext();

  const startTraining = useCallback(async () => {
    await trainAllSources(
      () => {
        // Do nothing
      },
      (errorMessage: string) => {
        toast.error(errorMessage);
      },
    );
    toast.success('Done training sources');
  }, [trainAllSources, sources]);

  const _addSource = useCallback(
    async (sourceType: SourceType, data: any) => {
      if (!project?.id) {
        return;
      }

      const newSource = await addSource(project.id, sourceType, data);
      await mutateSources([...sources, newSource]);
      await startTraining();
    },
    [project?.id, mutateSources, sources, startTraining],
  );

  const isTrained = files && files.length > 0;

  return (
    <>
      <Head>
        <title>Get started | Markprompt</title>
      </Head>
      <NavLayout animated={false}>
        {/* [var(--onboarding-footer-height)] */}
        <div className="fixed top-[var(--app-navbar-height)] bottom-0 left-0 right-0 grid grid-cols-1 sm:grid-cols-4">
          <div className="relative h-full">
            <div className="absolute inset-x-0 top-0 bottom-[var(--onboarding-footer-height)] overflow-y-auto p-6">
              <h1 className="text-xl font-bold text-neutral-300">
                Connect source{' '}
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
                <WebsiteAddSourceDialog onDidAddSource={startTraining}>
                  <ConnectButton label="Website" Icon={GlobeIcon} />
                </WebsiteAddSourceDialog>
                <MotifAddSourceDialog onDidAddSource={startTraining}>
                  <ConnectButton label="Motif project" Icon={MotifIcon} />
                </MotifAddSourceDialog>
                <FilesAddSourceDialog onDidAddSource={startTraining}>
                  <ConnectButton label="Upload files" Icon={UploadIcon} />
                </FilesAddSourceDialog>
              </div>
              <p className="mt-6 text-sm text-neutral-500">
                Or select a sample data source:
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-1">
                <ConnectButton
                  label="Markprompt docs"
                  Icon={MarkpromptIcon}
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
                            className="p-1 outline-none"
                            onClick={async () => {
                              if (!project?.id) {
                                return;
                              }
                              await deleteSource(project.id, source.id);
                              await mutateSources();
                              toast.success('The source has been removed');
                            }}
                          >
                            <Cross2Icon className="h-3 w-3 text-sky-400" />
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
                'absolute inset-x-0 bottom-0 z-20 flex h-[var(--onboarding-footer-height)] transform justify-center border-t border-neutral-900 bg-neutral-1100 px-8 py-3 transition duration-300',
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
          <div className="grid-background col-span-2 bg-neutral-100">
            <div className="flex h-full flex-col gap-4">
              <div className="flex h-[var(--onboarding-footer-height)] flex-none flex-row items-center justify-end gap-2 border-t border-neutral-200 bg-white px-8 shadow-xl">
                <Button
                  disabled={!isTrained}
                  buttonSize="sm"
                  variant="borderedWhite"
                  Icon={Share2Icon}
                >
                  Share
                </Button>
                <Button
                  disabled={!isTrained}
                  buttonSize="sm"
                  variant="borderedWhite"
                  Icon={CodeIcon}
                >
                  Get code
                </Button>
              </div>
              <div className="flex flex-grow flex-col gap-4 px-16 py-8">
                <div className="relative h-full flex-grow overflow-hidden rounded-lg border border-neutral-200 bg-neutral-900 p-4 shadow-2xl">
                  {/* {!isTrained && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-500">
                      <SpinnerIcon className="h-5 w-5 animate-spin" />
                      <p className="text-sm text-neutral-400">
                        Waiting for sources...
                      </p>
                    </div>
                  )} */}
                  {project && (
                    <Playground
                      projectKey={project.private_dev_api_key}
                      // didCompleteFirstQuery={didCompleteFirstQuery}
                      // autoScrollDisabled={!isReady}
                      iDontKnowMessage={
                        'Sorry, I am not sure how to answer that. But we are all set training your files!'
                      }
                    />
                  )}
                </div>
                <div className="flex flex-none flex-row justify-end">
                  <div className="rounded-full bg-black p-3">
                    <ChatBubbleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-full">
            <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col overflow-y-auto">
              <div className="flex-grow overflow-y-auto p-6">
                <h2 className="mb-4 text-sm font-bold">Design</h2>
                <UIConfigurator />
              </div>
              <div className="flex-none border-t border-neutral-900 p-6">
                <h2 className="mb-4 text-sm font-bold">
                  Model configurator <Tag color="fuchsia">Pro</Tag>
                </h2>
              </div>
            </div>
          </div>
        </div>
        {/* <div className="animate-slide-up relative z-0 mx-auto w-full max-w-full border">
          <div
            className={cn('absolute w-full transform transition duration-500', {
              'pointer-events-none -translate-x-24 opacity-0': step !== 0,
            })}
          >
            <AddFiles
              onTrainingComplete={() => {
                toast.success('Processing complete');
                setTimeout(() => {
                  setStep(1);
                }, 1000);
              }}
              onNext={() => {
                setStep(1);
              }}
            />
          </div>
          <div
            className={cn(
              'absolute inset-x-0 transform transition duration-500',
              {
                'pointer-events-none translate-x-24 opacity-0': step !== 1,
              },
            )}
          >
            <Query
              goBack={() => {
                setStep(0);
              }}
              didCompleteFirstQuery={async () => {
                setTimeout(() => {
                  showConfetti();
                }, 1000);
                setTimeout(() => {
                  setCtaVisible(true);
                }, 2000);
              }}
              isReady={step === 1}
            />
            <div
              className={cn(
                'flex w-full flex-col items-center justify-center gap-4',
                {
                  'animate-slide-up': ctaVisible,
                  'opacity-0': !ctaVisible,
                },
              )}
            >
              <Button
                variant="cta"
                onClick={() => {
                  finishOnboarding();
                }}
              >
                Go to dashboard →
              </Button>
              <div
                className={cn(
                  'animate-slide-up mt-2 flex w-full items-center justify-center gap-4',
                  {
                    '-mt-4': !ctaVisible,
                    'mt-4': ctaVisible,
                  },
                )}
              >
                <Checkbox.Root
                  className="flex h-5 w-5 items-center justify-center rounded border border-neutral-700 bg-neutral-1000 transition hover:bg-neutral-900"
                  id="subscribe"
                  onCheckedChange={async (checked: boolean) => {
                    await updateUser({ subscribe_to_product_updates: checked });
                    await mutateUser();
                  }}
                >
                  <Checkbox.Indicator className="text-green-600">
                    <CheckIcon />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label
                  className="cursor-pointer select-none text-sm text-neutral-500"
                  htmlFor="subscribe"
                >
                  Keep me posted about major product updates
                </label>
              </div>
            </div>
          </div>
        </div> */}
        {/* <div className="fixed bottom-0 left-0 right-0 z-20 flex h-[var(--onboarding-footer-height)] flex-row items-center gap-4 border-t border-neutral-900 bg-neutral-1100 px-6 sm:px-8">
          <div className="flex-grow"></div>
          <Button
            className="flex-none"
            variant="ghost"
            buttonSize="sm"
            onClick={() => {
              finishOnboarding();
            }}
          >
            Skip onboarding →
          </Button>
        </div> */}
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
