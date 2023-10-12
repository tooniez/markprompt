import { FC } from 'react';

import { NotionIcon } from '@/components/icons/Notion';
import { DbSource, Project, SourceConfigurationView } from '@/types/types';

import { BaseConfigurationDialog } from './BaseConfiguration';
import { NotionPagesSettings } from '../settings/NotionPages';

type NotionPagesConfigurationDialogProps = {
  projectId: Project['id'];
  source?: DbSource;
  defaultView?: SourceConfigurationView;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const NotionPagesConfigurationDialog: FC<
  NotionPagesConfigurationDialogProps
> = ({ projectId, source, defaultView, open, onOpenChange }) => {
  return (
    <BaseConfigurationDialog
      source={source}
      defaultView={defaultView}
      open={open}
      onOpenChange={onOpenChange}
      Icon={NotionIcon}
    >
      <NotionPagesSettings
        projectId={projectId}
        source={source}
        forceDisabled={false}
        showSkip={false}
      />
    </BaseConfigurationDialog>
  );
};

export default NotionPagesConfigurationDialog;
