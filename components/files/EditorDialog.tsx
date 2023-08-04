import * as Dialog from '@radix-ui/react-dialog';
import { FC } from 'react';

import { DbFile } from '@/types/types';

import { Editor } from './Editor';

type EditorDialogProps = {
  fileId?: DbFile['id'];
  open: boolean;
  setOpen: (open: boolean) => void;
};

const EditorDialog: FC<EditorDialogProps> = ({ fileId, open, setOpen }) => {
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
        <Dialog.Content className="animate-dialog-slide-in dialog-content flex h-[90%] max-h-[800px] w-[90%] max-w-[700px] flex-col outline-none">
          <Editor fileId={fileId} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default EditorDialog;
