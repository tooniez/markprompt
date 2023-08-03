import { FC } from 'react';
import useSWR from 'swr';

import useProject from '@/lib/hooks/use-project';
import { fetcher } from '@/lib/utils';
import { DbFile } from '@/types/types';

import { SkeletonTable } from '../ui/Skeletons';

type EditorProps = {
  fileId?: DbFile['id'];
};

export const Editor: FC<EditorProps> = ({ fileId }) => {
  const { project } = useProject();

  const { data: file, error } = useSWR(
    project?.id && fileId ? `/api/project/${project.id}/files/${fileId}` : null,
    fetcher<DbFile[]>,
  );

  const loading = !file && !error;

  if (loading) {
    return (
      <div className="p-4">
        <div className="relative">
          <SkeletonTable loading />;
        </div>
      </div>
    );
  }

  return <div className="flex flex-row items-center gap-2 p-4">{fileId}</div>;
};
