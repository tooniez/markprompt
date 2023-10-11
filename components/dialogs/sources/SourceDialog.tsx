import * as Dialog from '@radix-ui/react-dialog';
import { ReactNode } from 'react';

const SourceDialog = ({
  title,
  description,
  open,
  onOpenChange,
  trigger,
  children,
}: {
  title: string;
  description: string;
  open?: boolean;
  onOpenChange?(open: boolean): void;
  trigger: ReactNode;
  children: ReactNode;
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
        <Dialog.Content className="animate-dialog-slide-in dialog-content flex h-[90%] max-h-[720px] w-[90%] max-w-[500px] flex-col">
          <div className="flex-none">
            <Dialog.Title className="dialog-title flex-none">
              {title}
            </Dialog.Title>
            <div className="dialog-description flex flex-none flex-col gap-2 border-b border-neutral-900 pb-4">
              <p>{description}</p>
            </div>
          </div>
          <div className="flex-grow overflow-y-hidden">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SourceDialog;
