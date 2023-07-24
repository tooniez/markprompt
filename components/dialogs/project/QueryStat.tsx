import { FileSectionReference } from '@markprompt/core';
import * as Dialog from '@radix-ui/react-dialog';
import { parseISO } from 'date-fns';
import { FC } from 'react';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import useSWR from 'swr';

import { SkeletonTable } from '@/components/ui/Skeletons';
import { formatShortDateTimeInTimeZone } from '@/lib/date';
import useProject from '@/lib/hooks/use-project';
import { fetcher } from '@/lib/utils';
import { PromptStatusTag } from '@/pages/[team]/[project]/insights';
import { DbQueryStat, PromptQueryStatFull } from '@/types/types';

type QueryStatDialogProps = {
  queryStatId?: DbQueryStat['id'];
  open: boolean;
  setOpen: (open: boolean) => void;
};

const QueryStatDialog: FC<QueryStatDialogProps> = ({
  queryStatId,
  open,
  setOpen,
}) => {
  const { project } = useProject();
  const { data: queryStat, error } = useSWR(
    queryStatId && project?.id
      ? `/api/project/${project.id}/insights/query-stats/${queryStatId}`
      : null,
    fetcher<PromptQueryStatFull | undefined>,
  );

  const loading = !queryStat && !error;

  const references = (queryStat?.meta as any)
    ?.references as FileSectionReference[];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
        <Dialog.Content className="animate-dialog-slide-in dialog-content flex h-[90%] max-h-[800px] w-[90%] max-w-[700px] flex-col">
          <div className="flex-none border-b border-neutral-900 pb-2">
            <Dialog.Title className="dialog-title-xl">
              {queryStat?.prompt && (
                <p className="text-lg font-semibold text-neutral-300">
                  {queryStat.prompt}
                </p>
              )}
            </Dialog.Title>
          </div>
          {/* <Dialog.Description className="dialog-description-xl mt-2 flex-none border-b border-neutral-900 pb-4">
            Use the code below in your HTML pages or web application.
          </Dialog.Description> */}
          <div className="flex h-full w-full flex-grow flex-col gap-4 overflow-y-auto p-6">
            {loading ? (
              <div className="relative">
                <SkeletonTable loading={true} />
              </div>
            ) : !queryStat ? (
              <p className="text-sm text-neutral-500">
                Could not retrieve prompt details.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 border-b border-neutral-900 pb-4">
                  <div className="text-sm text-neutral-500">Date</div>
                  <div className="text-sm text-neutral-500">Status</div>
                  <div className="text-sm text-neutral-500">Feedback</div>
                  <div className="text-sm text-neutral-300">
                    {formatShortDateTimeInTimeZone(
                      parseISO(queryStat.created_at),
                    )}
                  </div>
                  <div className="text-sm text-neutral-300">
                    <PromptStatusTag noResponse={!!queryStat.no_response} />
                  </div>
                  <div className="text-sm text-neutral-300">N/A</div>
                </div>
                <div className="flex flex-col gap-2 border-b border-neutral-900 pb-4">
                  <p className="text-sm text-neutral-500">Response</p>
                  <div className="prose prose-sm prose-invert max-w-full">
                    <ReactMarkdown>
                      {queryStat.response || 'No response'}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pb-4">
                  <p className="text-sm text-neutral-500">References</p>
                  {!references || references.length === 0 ? (
                    <p className="text-sm text-neutral-300">N/A</p>
                  ) : (
                    <div className="flex flex-row flex-wrap items-center gap-2">
                      {references.map((f, i) => {
                        return (
                          <div
                            className="rounded-md border border-neutral-900 bg-neutral-1100 py-1 px-2 text-sm font-medium text-neutral-300"
                            key={`reference-${f.file.path}-${f.meta?.leadHeading?.slug}-${i}`}
                          >
                            {f.meta?.leadHeading?.value ||
                              f.file?.title ||
                              'Untitled'}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default QueryStatDialog;
