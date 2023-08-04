import * as Dialog from '@radix-ui/react-dialog';
import dynamic from 'next/dynamic';
import { ReactNode, useState } from 'react';
import { toast } from 'react-hot-toast';

import useUsage from '@/lib/hooks/use-usage';

const Loading = <p className="p-4 text-sm text-neutral-500">Loading...</p>;

const FileDnd = dynamic(() => import('@/components/files/FileDnd'), {
  loading: () => Loading,
});

const DocsLimit = dynamic(() => import('@/components/files/DocsLimit'), {
  loading: () => Loading,
});

const FilesAddSourceDialog = ({
  onDidAddSource,
  forceRetrain,
  children,
}: {
  openPricingAsDialog?: boolean;
  forceRetrain?: boolean;
  onDidAddSource?: () => void;
  children: ReactNode;
}) => {
  const { isInfiniteEmbeddingsTokensAllowance } = useUsage();
  const [fileDialogOpen, setFileDialogOpen] = useState(false);

  return (
    <Dialog.Root open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
        <Dialog.Content className="animate-dialog-slide-in dialog-content flex h-[90%] max-h-[400px] w-[90%] max-w-[600px] flex-col">
          <div className="flex-grow p-4">
            <FileDnd
              onTrainingComplete={() => {
                toast.success('Processing complete.', {
                  id: 'processing-complete',
                });
                setTimeout(async () => {
                  setFileDialogOpen(false);
                  onDidAddSource?.();
                }, 1000);
              }}
              forceRetrain={forceRetrain}
            />
          </div>
          {!isInfiniteEmbeddingsTokensAllowance && (
            <div className="border-t border-neutral-900">
              <DocsLimit />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default FilesAddSourceDialog;
