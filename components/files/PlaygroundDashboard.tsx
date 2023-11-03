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

const PlaygroundDashboard = () => {
  const { project } = useProject();
  const {
    paginatedFiles,
    mutate: mutateFiles,
    loading: loadingFiles,
  } = useFiles();
  const { didCompleteFirstQuery, setDidCompleteFirstQuery } = useAppContext();
  const { markpromptOptions, theme, isDark } = useConfigContext();
  const [isPlaygroundLoaded, setPlaygroundLoaded] = useState(false);
  const playgroundRef = useRef<HTMLIFrameElement>(null);

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
    <div className="absolute inset-0 grid flex-grow grid-cols-1 sm:grid-cols-3">
      <div className="relative col-span-1 h-full sm:col-span-2">
        <div className="h-full w-full overflow-hidden">
          <div className={cn('h-full border-r border-neutral-900')}>
            <div className="relative flex h-full flex-col gap-4">
              {/* <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                  backgroundColor: isDark
                    ? theme.colors.dark.overlay
                    : theme.colors.light.overlay,
                }}
              /> */}
              <div className="absolute inset-0">
                <iframe
                  tabIndex={-1}
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
      <div className="relative h-full flex-col items-stretch overflow-hidden transition">
        <div className="grid flex-none grid-cols-1 flex-row items-center justify-end gap-2 border-b border-neutral-900 px-6 py-2 sm:grid-cols-2">
          <Share>
            <Button buttonSize="sm" variant="plain" Icon={ShareIcon}>
              Share
            </Button>
          </Share>
          <GetCode>
            <Button buttonSize="sm" variant="plain" Icon={Code}>
              Get code
            </Button>
          </GetCode>
        </div>
        <div className="flex h-full flex-grow flex-col overflow-y-auto pb-12">
          <Tabs.Root
            className="TabsRoot mt-4 flex-grow px-6 pb-12"
            defaultValue="model"
          >
            <Tabs.List
              className="TabsListSegmented"
              aria-label="Configure model"
            >
              <Tabs.Trigger className="TabsTrigger" value="model">
                Model
              </Tabs.Trigger>
              <Tabs.Trigger className="TabsTrigger" value="ui">
                UI
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content className="TabsContent flex-grow pt-4" value="model">
              <ModelConfigurator />
            </Tabs.Content>
            <Tabs.Content className="TabsContent flex-grow pt-4" value="ui">
              <UIConfigurator />
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundDashboard;
