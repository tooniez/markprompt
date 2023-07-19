import * as Dialog from '@radix-ui/react-dialog';
import { ReactNode, useState } from 'react';
import { toast } from 'react-hot-toast';

import { DocsLimit } from '@/components/files/DocsLimit';
import { FileDnd } from '@/components/files/FileDnd';
import useUsage from '@/lib/hooks/use-usage';

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
