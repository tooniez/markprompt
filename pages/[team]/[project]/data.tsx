import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  DotsHorizontalIcon,
  DoubleArrowUpIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import {
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import cn from 'classnames';
import dayjs from 'dayjs';
// Cf. https://github.com/iamkun/dayjs/issues/297#issuecomment-1202327426
import relativeTime from 'dayjs/plugin/relativeTime';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FC, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { isPresent } from 'ts-is-present';

import ConfirmDialog from '@/components/dialogs/Confirm';
import { FileDnd } from '@/components/files/FileDnd';
import { GitHubIcon } from '@/components/icons/GitHub';
import { MotifIcon } from '@/components/icons/Motif';
import { ProjectSettingsLayout } from '@/components/layouts/ProjectSettingsLayout';
import Button from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { deleteFiles, deleteSource } from '@/lib/api';
import {
  TrainingState,
  getTrainingStateMessage,
  useTrainingContext,
} from '@/lib/context/training';
import { getOwnerRepoString } from '@/lib/github';
import useFiles from '@/lib/hooks/use-files';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import useTeam from '@/lib/hooks/use-team';
import { pluralize, truncate } from '@/lib/utils';
import {
  GitHubSourceDataType,
  MotifSourceDataType,
  Project,
  Source,
  SourceType,
} from '@/types/types';

dayjs.extend(relativeTime);

const GitHub = dynamic(() => import('@/components/dialogs/sources/GitHub'), {
  loading: () => <p className="p-4 text-sm text-neutral-500">Loading...</p>,
});

const getBasePath = (pathWithFile: string) => {
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

const getStatusMessage = (
  trainingState: TrainingState,
  isDeleting: boolean,
  numSelected: number,
  numFiles: number,
) => {
  if (trainingState.state === 'idle' && !isDeleting) {
    if (numSelected > 0) {
      return `${pluralize(numSelected, 'file', 'files')} selected`;
    } else {
      return `${pluralize(numFiles, 'file', 'files')} trained`;
    }
  }

  if (trainingState.state === 'loading') {
    return getTrainingStateMessage(trainingState, numFiles);
  } else if (isDeleting) {
    return `Deleting ${pluralize(numSelected, 'file', 'files')}`;
  }
};

type StatusMessageProps = {
  trainingState: TrainingState;
  isDeleting: boolean;
  numFiles: number;
  numSelected: number;
  playgroundPath: string;
};

const StatusMessage: FC<StatusMessageProps> = ({
  trainingState,
  isDeleting,
  numFiles,
  numSelected,
  playgroundPath,
}) => {
  return (
    <div
      className={cn('flex flex-row items-center whitespace-nowrap text-xs', {
        'text-neutral-500': trainingState.state !== 'loading',
        'text-fuchsia-600': trainingState.state === 'loading',
      })}
    >
      <p className={cn({ 'animate-pulse': trainingState.state === 'loading' })}>
        {truncate(
          getStatusMessage(trainingState, isDeleting, numSelected, numFiles) ||
            '',
          80,
        )}
      </p>
      {trainingState.state === 'idle' && numSelected === 0 && numFiles > 0 && (
        <Link href={playgroundPath}>
          <span className="subtle-underline ml-3 whitespace-nowrap transition hover:text-neutral-300">
            Query in playground
          </span>
        </Link>
      )}
    </div>
  );
};

export const getIconForSource = (sourceType: SourceType) => {
  switch (sourceType) {
    case 'motif':
      return MotifIcon;
    case 'file-upload':
      return UploadIcon;
    case 'api-upload':
      return DoubleArrowUpIcon;
    default:
      return GitHubIcon;
  }
};

export const getLabelForSource = (source: Source) => {
  switch (source.type) {
    case 'motif': {
      const data = source.data as MotifSourceDataType;
      return data.name;
    }
    case 'github': {
      const data = source.data as GitHubSourceDataType;
      return getOwnerRepoString(data.url);
    }
    case 'file-upload':
      return 'File uploads';
    case 'api-upload':
      return 'API uploads';
    default:
      return 'Unknown source';
  }
};

type SourceItemProps = {
  source: Source;
  onRemoveSelected: () => void;
};

const SourceItem: FC<SourceItemProps> = ({ source, onRemoveSelected }) => {
  const Icon = getIconForSource(source.type);
  return (
    <div className="flex w-full cursor-default flex-row items-center gap-2 text-sm">
      <Icon className="h-4 w-4 flex-none text-neutral-500" />
      <p className="flex-grow overflow-hidden truncate text-neutral-500">
        {getLabelForSource(source)}
      </p>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="flex-none select-none p-1 text-neutral-500 opacity-50 outline-none transition hover:opacity-100"
            aria-label="Source options"
          >
            <DotsHorizontalIcon />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="animate-menu-up dropdown-menu-content mr-2 min-w-[160px]"
            sideOffset={5}
          >
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

type RemoveSourceDialogProps = {
  projectId: Project['id'];
  source: Source;
  onComplete: () => void;
};

const RemoveSourceDialog: FC<RemoveSourceDialogProps> = ({
  projectId,
  source,
  onComplete,
}) => {
  const { mutate: mutateFiles } = useFiles();
  const { mutate: mutateSources } = useSources();
  const [loading, setLoading] = useState(false);

  return (
    <ConfirmDialog
      title={`Remove ${getLabelForSource(source)}?`}
      description={<>All associated files and training data will be deleted.</>}
      cta="Remove"
      variant="danger"
      loading={loading}
      onCTAClick={async () => {
        setLoading(true);
        try {
          await deleteSource(projectId, source.id);
          await mutateSources();
          await mutateFiles();
          toast.success(
            `The source ${getLabelForSource(
              source,
            )} has been removed from the project.`,
          );
        } catch (e) {
          console.error(e);
          toast.error('Error deleting source.');
        } finally {
          setLoading(false);
          onComplete();
        }
      }}
    />
  );
};

const hasNonFileSources = (sources: Source[]) => {
  return sources.some(
    (s) => s.type !== 'api-upload' && s.type !== 'file-upload',
  );
};

const Data = () => {
  const { team } = useTeam();
  const { project } = useProject();
  const { files, mutate: mutateFiles, loading: loadingFiles } = useFiles();
  const { sources } = useSources();
  const {
    stopGeneratingEmbeddings,
    state: trainingState,
    trainAllSources,
  } = useTrainingContext();
  const [rowSelection, setRowSelection] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [sourceToRemove, setSourceToRemove] = useState<Source | undefined>(
    undefined,
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  const columnHelper = createColumnHelper<{
    path: string;
    updated_at: string;
  }>();

  const columns: any = useMemo(
    () => [
      columnHelper.accessor((row) => row.path, {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => {
          return (
            <Checkbox
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              indeterminate={row.getIsSomeSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          );
        },
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.path, {
        id: 'name',
        header: () => <span>Name</span>,
        cell: (info) => info.getValue().split('/').slice(-1)[0],
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.path, {
        id: 'path',
        header: () => <span>Path</span>,
        cell: (info) => getBasePath(info.getValue()),
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor((row) => row.updated_at, {
        id: 'updated',
        header: () => <span>Updated</span>,
        cell: (info) => dayjs(info.getValue()).fromNow(),
        footer: (info) => info.column.id,
      }),
    ],
    [columnHelper],
  );

  const table = useReactTable({
    data: files || [],
    columns,
    state: { rowSelection, sorting },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const numSelected = Object.values(rowSelection).filter(Boolean).length;
  const hasFiles = files && files.length > 0;
  const canTrain = hasFiles || hasNonFileSources(sources);

  return (
    <ProjectSettingsLayout
      title="Data"
      RightHeading={() => (
        <div className="flex w-full items-center gap-4">
          <div className="flex-grow" />
          <StatusMessage
            trainingState={trainingState}
            isDeleting={isDeleting}
            numFiles={files?.length || 0}
            numSelected={numSelected}
            playgroundPath={`/${team?.slug}/${project?.slug}/playground`}
          />
          {trainingState.state !== 'idle' && (
            <p
              className={cn('text-xs text-neutral-500', {
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
                    .map((i) => rowModel[i].original.id)
                    .filter(isPresent);
                  if (fileIds.length === 0) {
                    return;
                  }
                  setIsDeleting(true);
                  await deleteFiles(project.id, fileIds);
                  await mutateFiles(
                    files?.filter((f) => !fileIds.includes(f.id)),
                  );
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
              <Button
                loading={
                  trainingState.state === 'loading' ||
                  trainingState.state === 'fetching_data'
                }
                variant="cta"
                buttonSize="sm"
                onClick={async () => {
                  await trainAllSources(
                    () => {
                      mutateFiles();
                    },
                    (message: string) => {
                      toast.error(message);
                    },
                  );
                  await mutateFiles();
                  toast.success('Processing complete');
                }}
              >
                Train
              </Button>
            </div>
          )}
        </div>
      )}
    >
      <div className="grid grid-cols-4 gap-8">
        <div className="flex flex-col gap-2">
          {sources.length > 0 && (
            <>
              <p className="text-xs font-medium text-neutral-500">Sources</p>
              <div className="mb-2 flex flex-col gap-2 pt-1 pb-4">
                {sources.map((source) => {
                  return (
                    <SourceItem
                      key={source.id}
                      source={source}
                      onRemoveSelected={() => {
                        setSourceToRemove(source);
                      }}
                    />
                  );
                })}
              </div>
            </>
          )}
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-neutral-800 p-4">
            <Dialog.Root
              open={githubDialogOpen}
              onOpenChange={setGithubDialogOpen}
            >
              <Dialog.Trigger asChild>
                <button className="flex flex-row items-center gap-2 text-left text-sm text-neutral-500 transition hover:text-neutral-400">
                  <GitHubIcon className="h-4 w-4 flex-none" />
                  <span className="truncate">Connect GitHub repo</span>
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
                <Dialog.Content className="animate-dialog-slide-in dialog-content flex h-[90%] max-h-[600px] w-[90%] max-w-[500px] flex-col">
                  <Dialog.Title className="dialog-title flex-none">
                    Connect GitHub repo
                  </Dialog.Title>
                  <Dialog.Description className="dialog-description flex flex-none flex-col gap-2 border-b border-neutral-900 pb-4">
                    <p>
                      Sync files from a GitHub repo. You can specify which files
                      to include and exclude from the repository in the{' '}
                      <Link
                        className="subtle-underline"
                        href={`/${team?.slug}/${project?.slug}/settings`}
                      >
                        project configuration
                      </Link>
                      .
                    </p>
                    <p>
                      <span className="font-semibold">Note</span>: Syncing large
                      repositories (&gt;100 Mb) is not yet supported. In this
                      case, we recommend using file uploads or the{' '}
                      <a
                        className="subtle-underline"
                        href="https://markprompt.com/docs#train-content"
                      >
                        train API
                      </a>
                      .
                    </p>
                  </Dialog.Description>
                  <div className="flex-grow">
                    <GitHub
                      onDidRequestClose={() => {
                        setGithubDialogOpen(false);
                      }}
                    />
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            {/* <button className="flex flex-row items-center gap-2 text-left text-sm text-neutral-500 transition hover:text-neutral-400">
              <MotifIcon className="h-4 w-4 flex-none" />
              <span className="truncate">Connect Motif project</span>
            </button> */}
            <button
              className="flex flex-row items-center gap-2 text-left text-sm text-neutral-500 transition hover:text-neutral-400"
              onClick={() => setFileDialogOpen(true)}
            >
              <UploadIcon className="h-4 w-4 flex-none" />
              <span className="truncate">Upload files</span>
            </button>
          </div>
        </div>
        {!loadingFiles && !hasFiles && (
          <div className="col-span-3 h-[400px] rounded-lg border border-dashed border-neutral-800 bg-neutral-1100">
            <FileDnd
              onTrainingComplete={() => {
                toast.success('Processing complete');
                setTimeout(async () => {
                  setFileDialogOpen(false);
                }, 1000);
              }}
            />
          </div>
        )}
        {hasFiles && (
          <div className="col-span-3">
            <table className="w-full border-collapse">
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
                          className={cn(
                            'cursor-pointer py-2 px-2 text-left text-sm text-neutral-300',
                            {},
                          )}
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
                            className={cn('py-2 px-2 text-sm', {
                              'w-8': cell.column.id === 'select',
                              'truncate font-medium text-neutral-300':
                                cell.column.id === 'name',
                              'max-w-[100px] truncate text-neutral-500':
                                cell.column.id === 'path' ||
                                cell.column.id === 'updated',
                            })}
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
          </div>
        )}
      </div>

      <Dialog.Root open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
          <Dialog.Content className="animate-dialog-slide-in dialog-content h-[90%] max-h-[400px] w-[90%] max-w-[600px]">
            <FileDnd
              onTrainingComplete={() => {
                toast.success('Processing complete');
                setTimeout(async () => {
                  setFileDialogOpen(false);
                }, 1000);
              }}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
    </ProjectSettingsLayout>
  );
};

export default Data;
