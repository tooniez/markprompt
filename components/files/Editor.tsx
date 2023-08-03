import { FC } from 'react';

import { DbFile } from '@/types/types';

type EditorProps = {
  fileId?: DbFile['id'];
};

export const Editor: FC<EditorProps> = ({ fileId }) => {
  return <div className="flex flex-row items-center gap-2 p-4">{fileId}</div>;
};
