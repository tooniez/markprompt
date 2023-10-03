import { FileSectionReference } from '@markprompt/core';
import * as Accordion from '@radix-ui/react-accordion';
import * as Dialog from '@radix-ui/react-dialog';
import cn from 'classnames';
import { parseISO } from 'date-fns';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { FC, useMemo, useState } from 'react';
import useSWR from 'swr';

import { MarkdownContainer } from '@/components/emails/templates/MarkdownContainer';
import { JSONViewer } from '@/components/ui/JSONViewer';
import { SkeletonTable } from '@/components/ui/Skeletons';
import { Tag } from '@/components/ui/Tag';
import { formatShortDateTimeInTimeZone } from '@/lib/date';
import useProject from '@/lib/hooks/use-project';
import { fetcher } from '@/lib/utils';
import { PromptStatusTag } from '@/pages/[team]/[project]/insights';
import { DbConversation, PromptQueryStatFull } from '@/types/types';

const Loading = <p className="p-4 text-sm text-neutral-500">Loading...</p>;

const EditorDialog = dynamic(() => import('@/components/files/EditorDialog'), {
  loading: () => Loading,
});

type MessageResponseCardProps = {
  queryStat: PromptQueryStatFull;
  showFeedback: boolean;
  setEditorOpen: (open: boolean) => void;
  setOpenFileData: ({
    path,
    sectionSlug,
  }: {
    path: string;
    sectionSlug?: string | undefined;
  }) => void;
};

const MessageResponseCard: FC<MessageResponseCardProps> = ({
  queryStat,
  showFeedback,
  setEditorOpen,
  setOpenFileData,
}) => {
  const [showReferences, setShowReferences] = useState(false);
  const vote = (queryStat.feedback as any)?.vote;
  const references = (queryStat?.meta as any)
    ?.references as FileSectionReference[];
  return (
    <div className="flex flex-col gap-2 pb-8">
      <div className="sticky top-0 z-10 flex flex-row items-center gap-4 border-t border-b border-neutral-800 bg-neutral-900 px-6 py-6">
        <p className="flex-grow text-sm font-medium text-neutral-100">
          {queryStat?.prompt || ''}
        </p>
        {showFeedback && (
          <>
            {queryStat.no_response && <Tag color="orange">Unanswered</Tag>}
            {vote === '1' && (
              <ThumbsUpIcon className="h-4 w-4 text-green-600" />
            )}
            {vote === '-1' && (
              <ThumbsDownIcon className="h-4 w-4 text-orange-600" />
            )}
          </>
        )}
      </div>
      <div className="px-6">
        <MarkdownContainer markdown={queryStat.response || 'No response'} />
      </div>
      <div className="flex flex-col items-start gap-2 px-6 pb-4">
        <Accordion.Root type="single" collapsible>
          <Accordion.Item className="overflow-hidden" value="references">
            <Accordion.Header>
              <Accordion.Trigger>
                <button
                  className="flex flex-row items-center gap-2 rounded-full border border-neutral-900 bg-neutral-1100 py-1 pl-3 pr-2 text-sm font-medium text-neutral-300 outline-none"
                  onClick={() => {
                    setShowReferences((s) => !s);
                  }}
                >
                  References
                  <ChevronRightIcon
                    className={cn('h-3.5 w-3.5 transform transition', {
                      'rotate-90': showReferences,
                    })}
                  />
                </button>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="py-4">
              <>
                {!references || references.length === 0 ? (
                  <p className="text-sm text-neutral-300">N/A</p>
                ) : (
                  <div className="flex flex-row flex-wrap items-center gap-2">
                    {references.map((f, i) => {
                      return (
                        <button
                          className="rounded-md border border-neutral-900 bg-neutral-1100 py-1 px-2 text-sm font-medium text-neutral-300"
                          key={`reference-${f.file?.path}-${f.meta?.leadHeading?.slug}-${i}`}
                          onClick={() => {
                            setOpenFileData({
                              path: f.file.path,
                              sectionSlug: f.meta?.leadHeading?.slug,
                            });
                            setEditorOpen(true);
                          }}
                        >
                          {f.meta?.leadHeading?.value ||
                            f.file?.title ||
                            'Untitled'}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </div>
    </div>
  );
};

type ConversationDialogProps = {
  conversationId?: DbConversation['id'];
  displayQueryStatId?: DbConversation['id'];
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ConversationDialog: FC<ConversationDialogProps> = ({
  conversationId,
  open,
  setOpen,
}) => {
  const { project } = useProject();
  const { data: conversation, error } = useSWR(
    conversationId && project?.id
      ? `/api/project/${project.id}/insights/conversation/${conversationId}`
      : null,
    fetcher<PromptQueryStatFull[] | undefined>,
  );
  const [openFileData, setOpenFileData] = useState<
    { path: string; sectionSlug?: string | undefined } | undefined
  >(undefined);
  const [editorOpen, setEditorOpen] = useState<boolean>(false);

  const loading = !conversation && !error;

  const sortedConversations = useMemo(() => {
    return (conversation || []).sort((c1, c2) => {
      return c1.created_at > c2.created_at ? 1 : -1;
    });
  }, [conversation]);

  const firstQueryStat = sortedConversations[0];
  const numUpvotes = sortedConversations.filter(
    (q) => (q.feedback as any)?.vote === '1',
  ).length;
  const numDownvotes = sortedConversations.filter(
    (q) => (q.feedback as any)?.vote === '1',
  ).length;
  const numUnanswered = sortedConversations.filter(
    (q) => !!q.no_response,
  ).length;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
        <Dialog.Content className="animate-dialog-slide-in dialog-content relative flex h-[90%] max-h-[800px] w-[90%] max-w-[700px] flex-col outline-none">
          <button
            className="absolute top-4 right-4 rounded-md p-1 outline-none transition hover:bg-neutral-900"
            onClick={() => {
              setOpen(false);
            }}
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
          <div className="flex-none border-b border-neutral-900">
            <Dialog.Title className="px-6 py-4 text-xl font-bold text-neutral-100">
              Conversation details
            </Dialog.Title>
          </div>
          <div className="flex h-full w-full flex-grow flex-col gap-4 overflow-y-auto">
            {loading ? (
              <div className="p-6">
                <div className="relative">
                  <SkeletonTable onDark loading={true} />
                </div>
              </div>
            ) : !conversation ? (
              <p className="p-6 text-sm text-neutral-500">
                Could not retrieve conversation details.
              </p>
            ) : (
              <>
                <div
                  className={cn(
                    'grid gap-2 border-b border-neutral-900 p-6 pb-4',
                    {
                      'grid-cols-3': conversation.length < 2,
                      'grid-cols-4': conversation.length >= 2,
                    },
                  )}
                >
                  <div className="text-sm text-neutral-500">
                    {conversation.length > 1 ? 'Started' : 'Date'}
                  </div>
                  {conversation.length > 1 && (
                    <div className="text-sm text-neutral-500">Questions</div>
                  )}
                  <div className="text-sm text-neutral-500">Status</div>
                  <div className="text-sm text-neutral-500">Feedback</div>
                  <div className="text-sm text-neutral-300">
                    {formatShortDateTimeInTimeZone(
                      parseISO(firstQueryStat.created_at),
                    )}
                  </div>
                  {conversation.length > 1 && (
                    <div className="text-sm text-neutral-300">
                      {conversation.length}
                    </div>
                  )}
                  <div className="text-sm text-neutral-300">
                    {numUnanswered === 0 && conversation.length > 1 && (
                      <Tag color="green">All answered</Tag>
                    )}
                    {numUnanswered === 0 && conversation.length === 1 && (
                      <Tag color="green">Answered</Tag>
                    )}
                    {numUnanswered > 0 && conversation.length > 1 && (
                      <Tag color="orange">{`${numUnanswered} unanswered`}</Tag>
                    )}
                    {numUnanswered > 0 && conversation.length === 1 && (
                      <Tag color="orange">Unanswered</Tag>
                    )}
                  </div>
                  <div className="flex flex-row items-center gap-4 text-sm text-neutral-300">
                    {numUpvotes > 0 && (
                      <div className="flex flex-row items-center gap-2">
                        <ThumbsUpIcon className="h-4 w-4 text-green-600" />
                        {conversation.length > 1 && (
                          <span className="text-sm">{numUpvotes}</span>
                        )}
                      </div>
                    )}
                    {numDownvotes > 0 && (
                      <div className="flex flex-row items-center gap-2">
                        <ThumbsDownIcon className="h-4 w-4 text-orange-600" />
                        {conversation.length > 1 && (
                          <span className="text-xs">{numDownvotes}</span>
                        )}
                      </div>
                    )}
                    {numUpvotes === 0 && numDownvotes === 0 && <>N/A</>}
                  </div>
                </div>
                {Object.keys(firstQueryStat?.conversationMetadata || {})
                  ?.length > 0 && (
                  <div className="flex flex-col gap-2 px-6 pb-4">
                    <p className="text-sm text-neutral-500">Metadata</p>
                    <div className="w-full">
                      <JSONViewer
                        className="w-full"
                        json={firstQueryStat.conversationMetadata}
                      />
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2 border-b border-neutral-900 pb-4">
                  {sortedConversations.map((queryStat, i) => {
                    return (
                      <MessageResponseCard
                        key={`${conversationId}-${i}`}
                        queryStat={queryStat}
                        showFeedback={sortedConversations.length > 0}
                        setEditorOpen={setEditorOpen}
                        setOpenFileData={setOpenFileData}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      <EditorDialog
        filePath={openFileData?.path}
        highlightSectionSlug={openFileData?.sectionSlug}
        open={editorOpen}
        setOpen={(open) => {
          if (!open) {
            setEditorOpen(false);
          }
        }}
      />
    </Dialog.Root>
  );
};

export default ConversationDialog;
