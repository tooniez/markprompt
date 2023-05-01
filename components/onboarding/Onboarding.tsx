import { Cross2Icon, GlobeIcon, UploadIcon } from '@radix-ui/react-icons';
import cn from 'classnames';
import { Code, Moon, Share, Sun, MessageCircle } from 'lucide-react';
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
import { UIConfigurator } from '../files/UIConfigurator';
import { GitHubIcon } from '../icons/GitHub';
import { MarkpromptIcon } from '../icons/Markprompt';
import { MotifIcon } from '../icons/Motif';
import { AccordionContent, AccordionTrigger } from '../ui/Accordion';
import Button from '../ui/Button';
import { Tag } from '../ui/Tag';

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
  children: ReactNode;
}) => {
  return (
    <div className={cn(className, 'grid grid-cols-2 items-center gap-4')}>
      <div className="truncate py-1 text-sm text-neutral-300">{label}</div>
      <div className="flex w-full justify-end">{children}</div>
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
  const {
    theme,
    colors,
    isDark,
    includeBranding,
    setDark,
    placeholder,
    referencesHeading,
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
          <div className="col-span-2 h-full overflow-hidden">
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
                        className={cn('rounded p-2 transition', {
                          'text-neutral-300 hover:bg-white/10': isDark,
                          'text-neutral-700 hover:bg-black/10': !isDark,
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
                    <Button
                      disabled={!isTrained}
                      buttonSize="sm"
                      variant={isDark ? 'plain' : 'borderedWhite'}
                      Icon={Code}
                    >
                      Get code
                    </Button>
                  </div>
                  <div className="absolute inset-x-0 top-[var(--onboarding-footer-height)] bottom-0 flex flex-col gap-4 px-16 py-8">
                    <Playground
                      projectKey={project.private_dev_api_key}
                      // didCompleteFirstQuery={didCompleteFirstQuery}
                      // autoScrollDisabled={!isReady}
                      iDontKnowMessage={
                        'Sorry, I am not sure how to answer that. But we are all set training your files!'
                      }
                      theme={theme}
                      placeholder={placeholder}
                      referencesHeading={referencesHeading}
                      isDark={isDark}
                      includeBranding={includeBranding}
                      // isDemoMode
                      // noAnimation
                      // playing={true}
                      // demoPrompt="How do I publish a component?"
                      // demoResponse={`To publish a component on Acme, follow these steps:

                      // # Sign up

                      // - At the root of your project, open or create a file named \`index.js\`, and add the following lines (you can add as many components as you need):

                      // \`\`\`js
                      // import Component1 from "/path/to/component1
                      // import Component2 from "/path/to/component2

                      // export {
                      //   Component1,
                      //   Component2,
                      //   // ...
                      // }
                      // \`\`\`

                      // - Then, head over to the Component Library, accessible via the sidebar.
                      // - Navigate to the Publish tab, and set a new semantic version. It must be higher than the previous one.
                      // - Hit "Publish".
                      // `}
                      // demoReferences={[
                      //   'Getting Started',
                      //   'Publishing',
                      //   'Components',
                      // ]}
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
          <div className="relative h-full">
            <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col overflow-y-auto p-6">
              <h2 className="mb-4 text-lg font-bold">Design</h2>
              <UIConfigurator />
              <h2 className="mb-4 mt-12 text-lg font-bold">
                Model configurator <Tag color="fuchsia">Pro</Tag>
              </h2>
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
