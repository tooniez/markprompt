import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import * as Switch from '@radix-ui/react-switch';
import * as ReactTooltip from '@radix-ui/react-tooltip';
import {
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { track } from '@vercel/analytics';
import cn from 'classnames';
import { formatISO, parseISO } from 'date-fns';
import dayjs from 'dayjs';
// Cf. https://github.com/iamkun/dayjs/issues/297#issuecomment-1202327426
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  MoreHorizontal,
  Globe,
  Upload,
  SettingsIcon,
  AlertCircle,
  Check,
  RefreshCw,
  XOctagon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { FC, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { isPresent } from 'ts-is-present';

import StatusMessage from '@/components/files/StatusMessage';
import { UpgradeNote } from '@/components/files/UpgradeNote';
import * as GitHub from '@/components/icons/GitHub';
import { MotifIcon } from '@/components/icons/Motif';
import { NotionIcon } from '@/components/icons/Notion';
import { SalesforceIcon } from '@/components/icons/Salesforce';
import { ProjectSettingsLayout } from '@/components/layouts/ProjectSettingsLayout';
import Onboarding from '@/components/onboarding/Onboarding';
import Button from '@/components/ui/Button';
import { IndeterminateCheckbox } from '@/components/ui/Checkbox';
import { SkeletonTable } from '@/components/ui/Skeletons';
import { Tag } from '@/components/ui/Tag';
import { Tooltip } from '@/components/ui/Tooltip';
import { deleteFiles } from '@/lib/api';
import { useTrainingContext } from '@/lib/context/training';
import { formatShortDateTimeInTimeZone } from '@/lib/date';
import emitter, { EVENT_OPEN_PLAN_PICKER_DIALOG } from '@/lib/events';
import useFiles from '@/lib/hooks/use-files';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import useTeam from '@/lib/hooks/use-team';
import useUsage from '@/lib/hooks/use-usage';
import useUser from '@/lib/hooks/use-user';
import {
  getConnectionId,
  getIntegrationId,
  getSyncId,
} from '@/lib/integrations/nango';
import { triggerSync } from '@/lib/integrations/nango.client';
import {
  INFINITE_TOKEN_ALLOWANCE,
  getTier,
  isEnterpriseOrCustomTier,
} from '@/lib/stripe/tiers';
import {
  canDeleteSource,
  getAccessoryLabelForSource,
  getIconForSource,
  getLabelForSource,
  getUrlPath,
  isUrl,
  pluralize,
} from '@/lib/utils';
import { getNameForPath } from '@/lib/utils.nodeps';
import { getFileTitle } from '@/lib/utils.non-edge';
import {
  DbFile,
  DbSource,
  DbSyncQueueOverview,
  NangoSourceDataType,
  Project,
} from '@/types/types';

dayjs.extend(relativeTime);

const Loading = <p className="p-4 text-sm text-neutral-500">Loading...</p>;

const GitHubAddSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/GitHub'),
  { loading: () => Loading },
);

const SalesforceKnowledgeAddSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/SalesforceKnowledge'),
  { loading: () => Loading },
);

const SalesforceCaseAddSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/SalesforceCase'),
  { loading: () => Loading },
);

const NotionPagesAddSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/NotionPages'),
  { loading: () => Loading },
);

const MotifAddSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/Motif'),
  { loading: () => Loading },
);

const WebsiteAddSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/Website'),
  { loading: () => Loading },
);

const FilesAddSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/Files'),
  { loading: () => Loading },
);

const EditorDialog = dynamic(() => import('@/components/files/EditorDialog'), {
  loading: () => Loading,
});

const ConfirmDialog = dynamic(() => import('@/components/dialogs/Confirm'), {
  loading: () => Loading,
});

const RemoveSourceDialog = dynamic(
  () => import('@/components/dialogs/sources/RemoveSource'),
  {
    loading: () => Loading,
  },
);

const FileDnd = dynamic(() => import('@/components/files/FileDnd'), {
  loading: () => Loading,
});

const getBasePath = (pathWithFile: string) => {
  if (isUrl(pathWithFile)) {
    return getUrlPath(pathWithFile);
  }

  if (!pathWithFile.includes('/')) {
    return '/';
  }

  const parts = pathWithFile.split('/');
  if (parts.length <= 2 && pathWithFile.startsWith('/')) {
    return '/';
  } else {
    return parts.slice(0, -1).join('/').replace(/^\//, '');
  }
};

type SyncStatusIndicatorProps = {
  syncQueue: DbSyncQueueOverview;
};

const SyncStatusIndicator: FC<SyncStatusIndicatorProps> = ({ syncQueue }) => {
  switch (syncQueue.status) {
    case 'running':
      return (
        <Tooltip
          message={`Sync started at ${formatShortDateTimeInTimeZone(
            parseISO(syncQueue.created_at),
          )}`}
        >
          <RefreshCw className="h-4 w-4 animate-spin text-neutral-600" />
        </Tooltip>
      );
    case 'canceled':
      return <XOctagon className="h-4 w-4 text-neutral-600" />;
    case 'errored':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'complete': {
      let message = '';
      if (syncQueue.ended_at) {
        message = `Sync completed at ${formatShortDateTimeInTimeZone(
          parseISO(syncQueue.ended_at),
        )}`;
      } else {
        message = 'Sync completed';
      }
      return (
        <Tooltip message={message}>
          <Check className="h-4 w-4 text-green-600" />
        </Tooltip>
      );
    }
  }
};

type SourcesProps = {
  projectId: Project['id'] | undefined;
  onRemoveSelected: (source: DbSource) => void;
};

const Sources: FC<SourcesProps> = ({ projectId, onRemoveSelected }) => {
  const { sources, syncQueues, mutateSyncQueues } = useSources();
  return (
    <>
      {sources.map((source) => {
        const syncQueue = syncQueues?.find((q) => q.source_id === source.id);
        return (
          <SourceItem
            key={source.id}
            source={source}
            syncQueue={syncQueue}
            onSyncSelected={async () => {
              if (!projectId) {
                return;
              }

              const integrationId = getIntegrationId(source);
              if (!integrationId) {
                return;
              }

              const otherSyncQueues = (syncQueues || []).filter(
                (q) => q.source_id !== source.id,
              );
              const currentSyncQueue: DbSyncQueueOverview = syncQueue
                ? {
                    ...syncQueue,
                    status: 'running',
                  }
                : {
                    source_id: source.id,
                    created_at: formatISO(new Date()),
                    ended_at: null,
                    status: 'running',
                  };
              mutateSyncQueues([...otherSyncQueues, currentSyncQueue]);

              const connectionId = getConnectionId(source.id);

              await triggerSync(projectId, integrationId, connectionId, [
                getSyncId(integrationId),
              ]);
            }}
            onConfigureSelected={() => {
              // onConfigureSelected(source);
            }}
            onRemoveSelected={() => {
              onRemoveSelected(source);
            }}
          />
        );
      })}
    </>
  );
};

type SourceItemProps = {
  source: DbSource;
  syncQueue: DbSyncQueueOverview | undefined;
  onSyncSelected: () => void;
  onConfigureSelected: () => void;
  onRemoveSelected: () => void;
};

const SourceItem: FC<SourceItemProps> = ({
  source,
  syncQueue,
  onSyncSelected,
  onConfigureSelected,
  onRemoveSelected,
}) => {
  const Icon = getIconForSource(source);
  const accessory = getAccessoryLabelForSource(source);
  let AccessoryTag = <></>;
  if (accessory) {
    const { label, Icon } = accessory;
    if (Icon) {
      AccessoryTag = (
        <Tag color="neutral" className="flex flex-row gap-1">
          <Icon className="h-3 w-3" />
          {label}
        </Tag>
      );
    } else {
      AccessoryTag = <Tag color="neutral">{label}</Tag>;
    }
  }

  return (
    <div className="flex w-full cursor-default flex-row items-center gap-2 text-sm">
      <Icon className="h-4 w-4 flex-none text-neutral-500" />
      <p className="flex-grow overflow-hidden truncate text-neutral-300">
        {getLabelForSource(source, false)}
      </p>
      {syncQueue && <SyncStatusIndicator syncQueue={syncQueue} />}
      {AccessoryTag}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="flex-none select-none p-1 text-neutral-500 opacity-50 outline-none transition hover:opacity-100"
            aria-label="Source options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="animate-menu-up dropdown-menu-content mr-2 min-w-[160px]"
            sideOffset={5}
          >
            <DropdownMenu.Item asChild onSelect={() => onSyncSelected()}>
              <span className="dropdown-menu-item dropdown-menu-item-noindent block">
                Sync now
              </span>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild onSelect={() => onConfigureSelected()}>
              <span className="dropdown-menu-item dropdown-menu-item-noindent block">
                Configure
              </span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="dropdown-menu-separator" />
            <DropdownMenu.Item asChild onSelect={() => onRemoveSelected()}>
              <span className="dropdown-menu-item dropdown-menu-item-noindent block">
                Remove
              </span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};

const hasNonFileSources = (sources: DbSource[]) => {
  return sources.some(
    (s) => s.type !== 'api-upload' && s.type !== 'file-upload',
  );
};

const Data = () => {
  const { user, loading: loadingUser } = useUser();
  const { team } = useTeam();
  const { project } = useProject();
  const {
    paginatedFiles,
    numFiles,
    mutate: mutateFiles,
    loading: loadingFiles,
    page,
    setPage,
    hasMorePages,
    mutateCount,
  } = useFiles();
  const { sources } = useSources();
  const {
    stopGeneratingEmbeddings,
    state: trainingState,
    trainAllSources,
  } = useTrainingContext();
  const {
    numTokensPerTeamAllowance,
    mutate: mutateFileStats,
    canAddMoreContent,
  } = useUsage();
  const [rowSelection, setRowSelection] = useState({});
  const [forceRetrain, setForceRetrain] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sourceToRemove, setSourceToRemove] = useState<DbSource | undefined>(
    undefined,
  );
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'path', desc: false },
  ]);
  const [openFilePath, setOpenFilePath] = useState<string | undefined>(
    undefined,
  );
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [sourceDialogOpen, setSourceDialogOpen] = useState<
    | {
        // Add other IDs manually here until they are moved to Nango
        dialogId:
          | NangoSourceDataType['integrationId']
          | 'motif'
          | 'github'
          | 'website'
          | 'api-uploads';
        sourceId?: DbSource['id'];
      }
    | undefined
  >(undefined);

  const tier = team && getTier(team);
  const isEnterpriseTier = !tier || isEnterpriseOrCustomTier(tier);

  const columnHelper = createColumnHelper<{
    id: DbFile['id'];
    path: string;
    source_id: string;
    updated_at: string;
    meta: any;
    token_count: number | undefined;
  }>();

  const pageHasSelectableItems = useMemo(() => {
    return (paginatedFiles || []).some((f) => {
      const source = sources.find((s) => s.id === f.source_id);
      return source && canDeleteSource(source.type);
    });
  }, [paginatedFiles, sources]);

  const columns: any = useMemo(
    () => [
      columnHelper.accessor((row) => row.source_id, {
        id: 'select',
        enableSorting: false,
        header: ({ table }) => {
          if (!pageHasSelectableItems) {
            return <></>;
          }
          return (
            <IndeterminateCheckbox
              checked={table.getIsAllRowsSelected()}
              indeterminate={table.getIsSomeRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          );
        },
        cell: (info) => {
          if (!info.row.getCanSelect()) {
            return <></>;
          }
          return (
            <IndeterminateCheckbox
              checked={info.row.getIsSelected()}
              indeterminate={info.row.getIsSomeSelected()}
              onChange={info.row.getToggleSelectedHandler()}
            />
          );
        },
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row, {
        id: 'name',
        header: () => <span>Title</span>,
        cell: (info) => {
          const value = info.getValue();
          // Ensure compat with previously trained data, where we don't
          // extract the title in the meta. Note that the title might be
          // a non-string value as well, e.g. in the case of an html
          // component.
          const title = getFileTitle(value, sources);
          return (
            <button
              className="w-full overflow-hidden truncate text-left outline-none"
              onClick={() => {
                setOpenFilePath(value.path);
                setEditorOpen(true);
              }}
            >
              {title}
            </button>
          );
        },
        footer: (info) => info.column.id,
        sortingFn: (rowA, rowB, columnId) => {
          const valueA: { sourceId: DbSource['id']; path: string } =
            rowA.getValue(columnId);
          const valueB: { sourceId: DbSource['id']; path: string } =
            rowB.getValue(columnId);
          const nameA = getNameForPath(sources, valueA.sourceId, valueA.path);
          const nameB = getNameForPath(sources, valueB.sourceId, valueB.path);
          return nameA.localeCompare(nameB);
        },
      }),
      columnHelper.accessor((row) => row.path, {
        id: 'path',
        header: () => <span>Path</span>,
        cell: (info) => {
          return (
            <ReactTooltip.Provider>
              <ReactTooltip.Root>
                <ReactTooltip.Trigger asChild>
                  <div className="cursor-default truncate">
                    {info.getValue()}
                  </div>
                </ReactTooltip.Trigger>
                <ReactTooltip.Portal>
                  <ReactTooltip.Content className="tooltip-content">
                    {info.getValue()}
                  </ReactTooltip.Content>
                </ReactTooltip.Portal>
              </ReactTooltip.Root>
            </ReactTooltip.Provider>
          );
        },
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.source_id, {
        id: 'source',
        header: () => <span>Source</span>,
        cell: (info) => {
          const value = info.getValue();
          const source = sources.find((s) => s.id === value);
          if (source) {
            return getLabelForSource(source, false);
          } else {
            return '';
          }
        },
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.updated_at, {
        id: 'updated',
        header: () => <span>Updated</span>,
        cell: (info) => {
          return dayjs(info.getValue()).fromNow();
        },
        footer: (info) => info.column.id,
      }),
    ],
    [columnHelper, pageHasSelectableItems, sources],
  );

  const table = useReactTable({
    data: paginatedFiles || [],
    columns,
    state: { rowSelection, sorting },
    enableRowSelection: (row) => {
      const value = row.getValue('source');
      const source = sources.find((s) => s.id === value);
      if (source && !canDeleteSource(source.type)) {
        return false;
      }
      return true;
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const numSelected = Object.values(rowSelection).filter(Boolean).length;
  const hasFiles = paginatedFiles && paginatedFiles.length > 0;
  const canTrain = hasFiles || hasNonFileSources(sources);

  if (!loadingUser && !user?.has_completed_onboarding) {
    return <Onboarding />;
  }

  return (
    <ProjectSettingsLayout
      title="Data"
      width="2xl"
      RightHeading={
        <div className="flex w-full items-center gap-4">
          <div className="flex-grow" />
          <StatusMessage
            trainingState={trainingState}
            isDeleting={isDeleting}
            numFiles={numFiles || 0}
            numSelected={numSelected}
            playgroundPath={`/${team?.slug}/${project?.slug}/playground`}
          />
          {trainingState.state !== 'idle' && (
            <p
              className={cn('whitespace-nowrap text-xs text-neutral-500', {
                'subtle-underline cursor-pointer':
                  trainingState.state !== 'cancel_requested',
              })}
              onClick={stopGeneratingEmbeddings}
            >
              {trainingState.state === 'cancel_requested'
                ? 'Cancelling...'
                : 'Stop training'}
            </p>
          )}
          {numSelected > 0 && (
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Button loading={isDeleting} variant="danger" buttonSize="sm">
                  Delete
                </Button>
              </Dialog.Trigger>
              <ConfirmDialog
                title={`Delete ${pluralize(numSelected, 'file', 'files')}?`}
                description="Deleting a file will remove it from all future answers."
                cta="Delete"
                variant="danger"
                loading={isDeleting}
                onCTAClick={async () => {
                  if (!project?.id) {
                    return;
                  }
                  const selectedRowIndices = Object.keys(rowSelection);
                  const rowModel = table.getSelectedRowModel().rowsById;
                  const fileIds = selectedRowIndices
                    .map((i) => rowModel[i]?.original?.id)
                    .filter(isPresent);
                  if (fileIds.length === 0) {
                    return;
                  }
                  setIsDeleting(true);
                  await deleteFiles(project.id, fileIds);
                  await mutateFiles(
                    paginatedFiles?.filter((f) => !fileIds.includes(f.id)),
                  );
                  await mutateFileStats();
                  await mutateCount();
                  setRowSelection([]);
                  setIsDeleting(false);
                  toast.success(
                    `${pluralize(fileIds.length, 'file', 'files')} deleted.`,
                  );
                }}
              />
            </Dialog.Root>
          )}
          {numSelected === 0 && canTrain && (
            <div className="flex flex-row items-center gap-2">
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    className="rounded-md p-2 text-neutral-500 outline-none transition duration-300 hover:bg-neutral-900 hover:text-neutral-400"
                    role="button"
                    aria-label="Configure training"
                  >
                    <SettingsIcon className="h-4 w-4 transform duration-300" />
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    sideOffset={0}
                    alignOffset={-10}
                    align="end"
                    className="animate-menu-up z-30 mt-2 -mr-8 ml-8 w-[320px] rounded-lg border border-neutral-900 bg-neutral-1000 p-4 shadow-2xl"
                  >
                    <div className="flex flex-none flex-row items-center gap-2">
                      <label
                        className="flex-grow truncate text-sm font-normal text-neutral-300"
                        htmlFor="product-updates"
                      >
                        Force retrain
                      </label>
                      <Switch.Root
                        className="switch-root"
                        checked={forceRetrain}
                        onCheckedChange={setForceRetrain}
                      >
                        <Switch.Thumb className="switch-thumb" />
                      </Switch.Root>
                    </div>
                    <p className="mt-2 text-xs text-neutral-400">
                      If on, previously indexed content will be retrained, even
                      if it hasn&apos;t changed.
                    </p>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
              <Button
                loading={
                  trainingState.state === 'loading' ||
                  trainingState.state === 'fetching_data'
                }
                variant="cta"
                buttonSize="sm"
                onClick={async () => {
                  let i = 0;
                  track('start training');
                  await trainAllSources(
                    forceRetrain,
                    () => {
                      if (i++ % 10 === 0) {
                        // Only mutate every 10 files
                        mutateFiles();
                      }
                    },
                    (message: string) => {
                      toast.error(message);
                    },
                  );
                  await mutateFiles();
                  await mutateCount();
                  toast.success('Processing complete.', {
                    id: 'processing-complete',
                  });
                }}
              >
                Sync
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-4">
        <div className="flex w-full flex-col gap-2">
          {!loadingFiles && !canAddMoreContent && (
            <UpgradeNote className="mb-4" showDialog>
              You have reached your quota of indexed content (
              {numTokensPerTeamAllowance} tokens) on this plan. Please upgrade
              your plan to index more documents.
            </UpgradeNote>
          )}
          {sources.length > 0 && (
            <>
              <p className="text-xs font-medium text-neutral-500">Sources</p>
              <div className="mb-2 flex flex-col gap-2 pt-1 pb-4">
                <Sources
                  projectId={project?.id}
                  onRemoveSelected={setSourceToRemove}
                />
              </div>
            </>
          )}
          <div
            className={cn(
              'flex flex-col gap-2 rounded-md border border-dashed border-neutral-800 p-4',
              {
                'cursor-not-allowed': !canAddMoreContent,
              },
            )}
          >
            <button
              className={cn(
                'flex flex-row items-center gap-2 py-1 text-left text-sm text-neutral-300 outline-none transition hover:text-neutral-400',
                {
                  'pointer-events-none opacity-50': !canAddMoreContent,
                },
              )}
              onClick={() => {
                setSourceDialogOpen({ dialogId: 'website' });
              }}
            >
              <Globe className="h-4 w-4 flex-none text-neutral-500" />
              <span className="truncate">Connect website</span>
            </button>
            <button
              className={cn(
                'flex flex-row items-center gap-2 py-1 text-left text-sm text-neutral-300 outline-none transition hover:text-neutral-400',
                {
                  'pointer-events-none opacity-50': !canAddMoreContent,
                },
              )}
              onClick={() => {
                setSourceDialogOpen({ dialogId: 'github' });
              }}
            >
              <GitHub.GitHubIcon className="h-4 w-4 flex-none text-neutral-500" />
              <span className="truncate">Connect GitHub repo</span>
            </button>
            <button
              className={cn(
                'flex flex-row items-center gap-2 py-1 text-left text-sm text-neutral-300 outline-none transition hover:text-neutral-400',
                {
                  'pointer-events-none opacity-50': !canAddMoreContent,
                },
              )}
              onClick={() => {
                setSourceDialogOpen({ dialogId: 'notion-pages' });
              }}
            >
              <NotionIcon className="h-4 w-4 flex-none text-neutral-500" />
              <span className="flex-grow truncate">Connect Notion</span>
            </button>
            <button
              className={cn(
                'flex flex-row items-center gap-2 py-1 text-left text-sm text-neutral-300 outline-none transition hover:text-neutral-400',
                {
                  'pointer-events-none opacity-50': !canAddMoreContent,
                },
              )}
              onClick={(e) => {
                if (!isEnterpriseTier) {
                  e.preventDefault();
                  emitter.emit(EVENT_OPEN_PLAN_PICKER_DIALOG);
                }
                setSourceDialogOpen({ dialogId: 'salesforce-knowledge' });
              }}
            >
              <SalesforceIcon className="h-4 w-4 flex-none text-neutral-500" />
              <span className="flex-grow truncate">
                Connect Salesforce Knowledge
              </span>

              {!isEnterpriseTier && (
                <div className="flex-nonw">
                  <Tag>Enterprise</Tag>
                </div>
              )}
            </button>
            <button
              className={cn(
                'flex flex-row items-center gap-2 py-1 text-left text-sm text-neutral-300 outline-none transition hover:text-neutral-400',
                {
                  'pointer-events-none opacity-50': !canAddMoreContent,
                },
              )}
              onClick={(e) => {
                if (!isEnterpriseTier) {
                  e.preventDefault();
                  emitter.emit(EVENT_OPEN_PLAN_PICKER_DIALOG);
                }
                setSourceDialogOpen({ dialogId: 'salesforce-case' });
              }}
            >
              <SalesforceIcon className="h-4 w-4 flex-none text-neutral-500" />
              <span className="flex-grow truncate">
                Connect Salesforce Case
              </span>
              {!isEnterpriseTier && (
                <div className="flex-nonw">
                  <Tag>Enterprise</Tag>
                </div>
              )}
            </button>
            {/* <button
              className={cn(
                'flex flex-row items-center gap-2 py-1 text-left text-sm text-neutral-300 outline-none transition hover:text-neutral-400',
                {
                  'pointer-events-none opacity-50': !canAddMoreContent,
                },
              )}
              onClick={() => {
                setSourceDialogOpen({ dialogId: 'motif' });
              }}
            >
              <MotifIcon className="h-4 w-4 flex-none text-neutral-500" />
              <span className="truncate">Connect Motif project</span>
            </button> */}
            <button
              className={cn(
                'flex flex-row items-center gap-2 py-1 text-left text-sm text-neutral-300 outline-none transition hover:text-neutral-400',
                {
                  'pointer-events-none opacity-50': !canAddMoreContent,
                },
              )}
              onClick={() => {
                setSourceDialogOpen({ dialogId: 'api-uploads' });
              }}
            >
              <Upload className="h-4 w-4 flex-none text-neutral-500" />
              <span className="truncate">Upload files</span>
            </button>
          </div>
        </div>
        <div className="sm:col-span-3">
          {loadingFiles && (
            <div className="relative min-h-[200px]">
              <SkeletonTable onDark loading />
            </div>
          )}

          {!loadingFiles && !hasFiles && (
            <div className="h-[400px] rounded-lg border border-dashed border-neutral-800 bg-neutral-1100">
              <FileDnd
                isOnEmptyStateDataPanel
                forceRetrain={forceRetrain}
                onTrainingComplete={() => {
                  toast.success('Processing complete.', {
                    id: 'processing-complete',
                  });
                }}
              />
            </div>
          )}

          {!loadingFiles && hasFiles && (
            <table className="w-full max-w-full table-fixed border-collapse">
              <colgroup>
                <col className={pageHasSelectableItems ? 'w-[32px]' : 'w-0'} />
                <col className="w-[calc(50%-172px)]" />
                <col className="w-[30%]" />
                <col className="w-[20%]" />
                <col className="w-[140px]" />
              </colgroup>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-neutral-800"
                  >
                    {headerGroup.headers.map((header) => {
                      return (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          className="cursor-pointer py-2 px-2 text-left text-sm font-bold text-neutral-300"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {header.isPlaceholder ? null : (
                            <div className="flex flex-row items-center gap-2">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {header.id !== 'select' && (
                                <>
                                  <span className="text-sm font-normal text-neutral-600">
                                    {{
                                      asc: '↓',
                                      desc: '↑',
                                    }[header.column.getIsSorted() as string] ??
                                      null}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-neutral-900 hover:bg-neutral-1000',
                        {
                          'bg-neutral-1000': row.getIsSelected(),
                        },
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        return (
                          <td
                            key={cell.id}
                            style={{
                              width: 100,
                            }}
                            className={cn(
                              'overflow-hidden truncate text-ellipsis whitespace-nowrap py-2 px-2 text-sm',
                              {
                                'font-medium text-neutral-300':
                                  cell.column.id === 'name',
                                'text-neutral-500':
                                  cell.column.id === 'path' ||
                                  cell.column.id === 'source' ||
                                  cell.column.id === 'updated',
                              },
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="flex flex-row gap-2 py-4">
            <Button
              variant="plain"
              buttonSize="xs"
              onClick={() => setPage(page - 1)}
              disabled={page === 0 || loadingFiles}
            >
              Previous
            </Button>
            <Button
              variant="plain"
              buttonSize="xs"
              onClick={() => setPage(page + 1)}
              disabled={!hasMorePages || loadingFiles}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
      <Dialog.Root
        open={!!sourceToRemove}
        onOpenChange={() => setSourceToRemove(undefined)}
      >
        {sourceToRemove && project && (
          <RemoveSourceDialog
            projectId={project.id}
            source={sourceToRemove}
            onComplete={() => setSourceToRemove(undefined)}
          />
        )}
      </Dialog.Root>
      <EditorDialog
        filePath={openFilePath}
        open={editorOpen}
        setOpen={(open) => {
          if (!open) {
            setEditorOpen(false);
          }
        }}
      />
      <NotionPagesAddSourceDialog
        open={sourceDialogOpen?.dialogId === 'notion-pages'}
        onOpenChange={(open) => {
          if (!open) {
            setSourceDialogOpen(undefined);
          }
        }}
      />
      <GitHubAddSourceDialog
        open={sourceDialogOpen?.dialogId === 'github'}
        onOpenChange={(open) => {
          if (!open) {
            setSourceDialogOpen(undefined);
          }
        }}
      />
      <SalesforceKnowledgeAddSourceDialog
        open={sourceDialogOpen?.dialogId === 'salesforce-knowledge'}
        onOpenChange={(open) => {
          if (!open) {
            setSourceDialogOpen(undefined);
          }
        }}
      />
      <SalesforceCaseAddSourceDialog
        open={sourceDialogOpen?.dialogId === 'salesforce-case'}
        onOpenChange={(open) => {
          if (!open) {
            setSourceDialogOpen(undefined);
          }
        }}
      />
      <WebsiteAddSourceDialog
        open={sourceDialogOpen?.dialogId === 'website'}
        onOpenChange={(open) => {
          if (!open) {
            setSourceDialogOpen(undefined);
          }
        }}
      />
      <MotifAddSourceDialog
        open={sourceDialogOpen?.dialogId === 'motif'}
        onOpenChange={(open) => {
          if (!open) {
            setSourceDialogOpen(undefined);
          }
        }}
      />
      <FilesAddSourceDialog
        open={sourceDialogOpen?.dialogId === 'api-uploads'}
        onOpenChange={(open) => {
          if (!open) {
            setSourceDialogOpen(undefined);
          }
        }}
      />
    </ProjectSettingsLayout>
  );
};

export default Data;
