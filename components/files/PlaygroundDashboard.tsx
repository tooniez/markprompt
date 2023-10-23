import * as Tabs from '@radix-ui/react-tabs';
import cn from 'classnames';
import { motion } from 'framer-motion';
import { Code, Stars, Share as ShareIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import colors from 'tailwindcss/colors';

import { useAppContext } from '@/lib/context/app';
import { useConfigContext } from '@/lib/context/config';
import { useTrainingContext } from '@/lib/context/training';
import useFiles from '@/lib/hooks/use-files';
import useOnboarding from '@/lib/hooks/use-onboarding';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import useUsage from '@/lib/hooks/use-usage';
import { INFINITE_TOKEN_ALLOWANCE } from '@/lib/stripe/tiers';
import {
  getAccessoryLabelForSource,
  getIconForSource,
  getLabelForSource,
} from '@/lib/utils';
import { getApiUrl } from '@/lib/utils.nodeps';

import GetCode from '../dialogs/project/GetCode';
import Share from '../dialogs/project/Share';
import { SpinnerIcon } from '../icons/Spinner';
import Button from '../ui/Button';
import { InfoTooltip } from '../ui/Tooltip';

const UIConfigurator = dynamic(() => import('../files/UIConfigurator'));

const ModelConfigurator = dynamic(() => import('../files/ModelConfigurator'));

export const Row = ({
  label,
  tip,
  className,
  indented,
  collapseMargin,
  top,
  fullWidth,
  children,
}: {
  label?: string | ReactNode;
  tip?: string;
  className?: string;
  indented?: boolean;
  collapseMargin?: boolean;
  top?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}) => {
  return (
    <div
      className={cn(
        className,
        {
          'my-1': !collapseMargin,
          'py-1': collapseMargin,
          'border-l border-neutral-800': indented,
          'items-start': top,
          'items-center': !top,
        },
        'grid grid-cols-2 gap-4',
      )}
    >
      {!fullWidth && (
        <div
          className={cn(
            'flex flex-row items-center gap-2 py-1 text-sm text-neutral-300',
            {
              'pl-3': indented,
            },
          )}
        >
          <span className="truncate">{label}</span>
          {tip && (
            <span className="flex-grow">
              <InfoTooltip message={tip} dimmed />
            </span>
          )}
        </div>
      )}
      {children && (
        <div
          className={cn('flex w-full justify-end', {
            'col-span-2': fullWidth,
            'pl-3': indented && fullWidth,
          })}
        >
          {children}
        </div>
      )}
    </div>
  );
};

type LinesPosition = 'top-left' | 'bottom-left' | 'top' | 'right';

export const LinesContainer = ({
  width,
  height,
  top,
  left,
  position,
  isDark,
  onOverlay,
}: {
  width: number;
  height: number;
  top: number;
  left: number;
  position: LinesPosition;
  isDark?: boolean;
  onOverlay?: boolean;
}) => {
  return (
    <div
      className="absolute inset-0 transition duration-500"
      style={{ top, left, width, height }}
    >
      <Lines
        width={width}
        height={height}
        position={position}
        isDark={!!isDark}
        onOverlay={!!onOverlay}
      />
    </div>
  );
};

export const Lines = ({
  width,
  height,
  position,
  isDark,
  onOverlay,
}: {
  width: number;
  height: number;
  position: LinesPosition;
  isDark: boolean;
  onOverlay?: boolean;
}) => {
  let path;
  if (position === 'top-left') {
    path = `M1 1h${Math.round(width * 0.7)}a4 4 0 014 4v${
      height - 7
    }a4 4 0 004 4h${Math.round(width * 0.3)}`;
  } else if (position === 'bottom-left') {
    path = `M1 ${height}h${Math.round(width * 0.7)}a4 4 0 004-4v${
      -height + 10
    }a4 4 0 014-4h${Math.round(width * 0.3)}`;
  } else if (position === 'top') {
    path = `M1 0v${Math.round(height * 0.7 - 8)}a4 4 0 004 4h${
      width - 10
    }a4 4 0 014 4v${Math.round(height * 0.3)}`;
  } else if (position === 'right') {
    path = `M${width} 1H${Math.round(width * 0.3)}a4 4 0 00-4 4v${
      height - 10
    }a4 4 0 01-4 4H0`;
  }

  // const path1 = `M0 0h${width}v${height}H0z`;

  return (
    <svg viewBox={`0 0 ${width} ${4 * height}`} fill="none">
      <path
        d={path}
        stroke={
          onOverlay ? '#00000060' : isDark ? colors.neutral['800'] : '#00000020'
        }
      />
      <path
        d={path}
        stroke="url(#pulse)"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <defs>
        <motion.linearGradient
          animate={
            position === 'top-left'
              ? {
                  x1: [0, -2 * width],
                  y1: [3 * height, -height],
                  x2: [0, -width],
                  y2: [4 * height, -height],
                }
              : position === 'bottom-left'
              ? {
                  x1: [0, -2 * width],
                  y1: [-2 * height, 2 * height],
                  x2: [0, -width],
                  y2: [-3 * height, 2 * height],
                }
              : position === 'top'
              ? {
                  x1: [0, -2 * width],
                  y1: [3 * height, -height],
                  x2: [0, -width],
                  y2: [4 * height, -height],
                }
              : {
                  x1: [0, 2 * width],
                  y1: [3 * height, -height],
                  x2: [0, width],
                  y2: [4 * height, -height],
                }
          }
          transition={{
            duration: 4,
            repeat: Infinity,
          }}
          id="pulse"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={colors.fuchsia['500']} stopOpacity="0" />
          <stop stopColor={colors.fuchsia['500']} />
          <stop offset="1" stopColor={colors.red['500']} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

type PlaygroundDashboardProps = {
  isOnboarding?: boolean;
};

const PlaygroundDashboard: FC<PlaygroundDashboardProps> = ({
  isOnboarding,
}) => {
  const { project } = useProject();
  const {
    paginatedFiles,
    mutate: mutateFiles,
    loading: loadingFiles,
  } = useFiles();
  const { didCompleteFirstQuery, setDidCompleteFirstQuery } = useAppContext();
  const {
    sources,
    mutate: mutateSources,
    loading: loadingSources,
  } = useSources();
  const { state: trainingState, trainAllSources } = useTrainingContext();
  const { markpromptOptions, theme, isDark } = useConfigContext();
  const { canAddMoreContent, numTokensPerTeamAllowance } = useUsage();
  const [overlayDimensions, setOverlayDimensions] = useState({
    previewContainerWidth: 0,
    previewContainerHeight: 0,
    playgroundWidth: 0,
    playgroundHeight: 0,
    playgroundLeft: 0,
    playgroundTop: 0,
    overlayMessageLeft: 0,
    overlayMessageTop: 0,
    overlayMessageWidth: 0,
    overlayMessageHeight: 0,
  });
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isPlaygroundVisible, setPlaygroundVisible] = useState(true);
  const [isPlaygroundLoaded, setPlaygroundLoaded] = useState(false);
  // const playgroundRef = useRef<HTMLDivElement>(null);
  const playgroundRef = useRef<HTMLIFrameElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const overlayMessageRef = useRef<HTMLDivElement>(null);
  const { finishOnboarding } = useOnboarding();

  const hasConnectedSources = sources && sources.length > 0;
  const isTrained = paginatedFiles && paginatedFiles.length > 0;
  const isLoading = loadingSources || loadingFiles;
  const isTraining = trainingState.state !== 'idle';

  const overlayMessage = useMemo(() => {
    if (!project || isLoading || isLoadingResponse) {
      return undefined;
    }
    if (!hasConnectedSources) {
      if (isOnboarding) {
        return 'Start by connecting one or more sources';
      } else {
        return 'Connect one or more sources';
      }
    }
    if (trainingState.state !== 'idle') {
      return 'Processing sources';
    }
    if (!isTrained && hasConnectedSources) {
      return "Great! Now hit 'Process sources'";
    }

    if (isTrained && !didCompleteFirstQuery) {
      return 'Now ask a question';
    }

    if (didCompleteFirstQuery && isOnboarding) {
      return (
        <span>
          <Stars className="mr-1 mt-[-2px] inline-block h-4 w-4 text-amber-400" />
          You are all set! Get the embed code, configure the design and model,
          or{' '}
          <span
            className="border-b border-dotted border-neutral-300 font-medium"
            onClick={() => {
              finishOnboarding();
            }}
          >
            continue to the dashboard
          </span>
        </span>
      );
    }
    return undefined;
  }, [
    hasConnectedSources,
    isOnboarding,
    isTrained,
    project,
    trainingState.state,
    isLoading,
    didCompleteFirstQuery,
    isLoadingResponse,
    finishOnboarding,
  ]);

  const isShowingOnboardingMessages = !!overlayMessage;
  const isShowingLines = isShowingOnboardingMessages && !isTraining;
  const isShowingOverlay =
    project &&
    (isTraining || (!isLoading && (!hasConnectedSources || !isTrained)));

  useEffect(() => {
    if (!isShowingOnboardingMessages) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!previewContainerRef.current) {
        return;
      }

      const previewContainerRect =
        previewContainerRef.current?.getBoundingClientRect();
      const previewContainerWidth = Math.round(
        previewContainerRect?.width || 0,
      );
      const previewContainerHeight = Math.round(
        previewContainerRect?.height || 0,
      );

      const playgroundRect = playgroundRef.current?.getBoundingClientRect();

      const playgroundTop =
        (playgroundRect?.top || 0) - (previewContainerRect?.top || 0);
      const playgroundLeft =
        (playgroundRect?.left || 0) - (previewContainerRect?.left || 0);
      const playgroundWidth = playgroundRect?.width || 0;
      const playgroundHeight = playgroundRect?.height || 0;

      const overlayMessageRect =
        overlayMessageRef.current?.getBoundingClientRect();

      const overlayMessageLeft =
        (overlayMessageRect?.left || 0) - (previewContainerRect?.left || 0);
      const overlayMessageTop =
        (overlayMessageRect?.top || 0) - (previewContainerRect?.top || 0);
      const overlayMessageWidth = overlayMessageRect?.width || 0;
      const overlayMessageHeight = overlayMessageRect?.height || 0;

      setOverlayDimensions({
        previewContainerWidth,
        previewContainerHeight,
        playgroundLeft,
        playgroundTop,
        playgroundWidth,
        playgroundHeight,
        overlayMessageLeft,
        overlayMessageTop,
        overlayMessageWidth,
        overlayMessageHeight,
      });
    });

    playgroundRef.current && observer.observe(playgroundRef.current);
    previewContainerRef.current &&
      observer.observe(previewContainerRef.current);
    overlayMessageRef.current && observer.observe(overlayMessageRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isShowingOnboardingMessages]);

  useEffect(() => {
    if (
      !isPlaygroundLoaded ||
      !playgroundRef.current?.contentWindow ||
      !project
    ) {
      return;
    }

    const serializedProps = {
      ...markpromptOptions,
      projectKey: project.private_dev_api_key,
      showBranding: markpromptOptions.showBranding,
      trigger: { floating: true },
      prompt: {
        ...markpromptOptions.prompt,
        apiUrl: getApiUrl('chat', false),
      },
      chat: {
        ...markpromptOptions.chat,
        apiUrl: getApiUrl('chat', false),
      },
      search: {
        ...markpromptOptions.search,
        apiUrl: getApiUrl('search', false),
        getHref: undefined,
      },
      feedback: {
        ...markpromptOptions.feedback,
        apiUrl: getApiUrl('feedback', false),
      },
      references: {
        ...markpromptOptions.references,
        getHref: undefined,
        getLabel: undefined,
        transformReferenceId: undefined,
      },
    };

    const colors = isDark ? theme.colors.dark : theme.colors.light;

    playgroundRef.current.contentWindow.postMessage(
      {
        serializedProps,
        colors,
        size: theme.size,
        dimensions: theme.dimensions,
        isDark,
      },
      '*',
    );
  }, [
    paginatedFiles,
    isPlaygroundLoaded,
    project,
    theme,
    isDark,
    markpromptOptions,
  ]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex flex-none flex-row items-center justify-end gap-2 border-b border-neutral-900 px-6 py-2">
        <Share>
          <Button buttonSize="sm" variant="plain" Icon={ShareIcon}>
            Share
          </Button>
        </Share>
        <GetCode isOnboarding={!!isOnboarding}>
          <Button buttonSize="sm" variant="plain" Icon={Code}>
            Get code
          </Button>
        </GetCode>
      </div>
      <div className="grid flex-grow grid-cols-1 sm:grid-cols-3">
        <div className="relative col-span-1 sm:col-span-2">
          <div
            ref={previewContainerRef}
            className={cn(
              'pointer-events-none absolute inset-0 z-30 flex items-center justify-center transition duration-300',
            )}
          >
            <div
              className={cn('absolute inset-0 z-0 bg-black/80 ', {
                'opacity-100': isShowingOverlay,
                'pointer-events-none opacity-0': !isShowingOverlay,
              })}
            />
            {isShowingLines && (
              <div className="pointer-events-none absolute inset-0 flex-none">
                {!hasConnectedSources && !isTraining && (
                  <LinesContainer
                    position="top-left"
                    isDark={isDark}
                    onOverlay={true}
                    top={40}
                    left={0}
                    width={overlayDimensions.overlayMessageLeft}
                    height={overlayDimensions.previewContainerHeight / 2 - 72}
                  />
                )}
                {hasConnectedSources && !isTrained && (
                  <LinesContainer
                    position="bottom-left"
                    isDark={isDark}
                    onOverlay={true}
                    top={overlayDimensions.previewContainerHeight / 2 + 29}
                    left={0}
                    width={overlayDimensions.overlayMessageLeft}
                    height={overlayDimensions.previewContainerHeight / 2 - 61}
                  />
                )}
                {isTrained &&
                  isOnboarding &&
                  didCompleteFirstQuery &&
                  !isLoadingResponse && (
                    <LinesContainer
                      position="right"
                      isDark={isDark}
                      top={32}
                      left={
                        overlayDimensions.overlayMessageLeft +
                        overlayDimensions.overlayMessageWidth
                      }
                      width={
                        overlayDimensions.previewContainerWidth -
                        overlayDimensions.overlayMessageLeft -
                        overlayDimensions.overlayMessageWidth
                      }
                      height={overlayDimensions.previewContainerHeight / 2 - 32}
                    />
                  )}
              </div>
            )}
            {overlayMessage && (
              <div
                ref={overlayMessageRef}
                className={cn(
                  'transfrom flex max-w-[400px] flex-row flex-wrap items-center gap-2 rounded-full bg-black/80 py-3 px-5 text-center text-sm text-white backdrop-blur transition duration-500',

                  {
                    'translate-y-[-30px]':
                      !hasConnectedSources &&
                      !isTrained &&
                      trainingState.state === 'idle',
                    'translate-y-[30px]':
                      hasConnectedSources &&
                      !isTrained &&
                      trainingState.state === 'idle',
                  },
                )}
              >
                {trainingState.state !== 'idle' && (
                  <SpinnerIcon className="ml-1 h-4 w-4 animate-spin" />
                )}
                <>{overlayMessage}</>
              </div>
            )}
          </div>
          <div className="h-full w-full overflow-hidden">
            <div className={cn('h-full border-l border-r border-neutral-900')}>
              <div className="relative flex h-full flex-col gap-4">
                <div
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{
                    backgroundColor: isDark
                      ? theme.colors.dark.overlay
                      : theme.colors.light.overlay,
                  }}
                />
                <div className="absolute inset-0">
                  <iframe
                    ref={playgroundRef}
                    src="/static/html/chatbot-playground.html"
                    className="absolute inset-0 h-full w-full bg-transparent"
                    onLoad={() => {
                      setTimeout(() => {
                        setPlaygroundLoaded(true);
                      }, 100);
                      setTimeout(() => {
                        setDidCompleteFirstQuery(true);
                      }, 5000);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative h-full transition">
          <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col overflow-y-auto pb-12">
            <Tabs.Root
              className="TabsRoot mt-4 flex-grow px-6"
              defaultValue="model"
            >
              <Tabs.List
                className="TabsListSegmented"
                aria-label="Configure model"
              >
                <Tabs.Trigger className="TabsTrigger" value="model">
                  Model
                </Tabs.Trigger>
                <Tabs.Trigger className="TabsTrigger" value="design">
                  Design
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content
                className="TabsContent flex-grow pt-4"
                value="model"
              >
                <ModelConfigurator />
              </Tabs.Content>
              <Tabs.Content
                className="TabsContent flex-grow pt-4"
                value="design"
              >
                <UIConfigurator />
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundDashboard;
