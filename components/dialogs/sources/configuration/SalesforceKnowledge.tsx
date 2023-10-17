import { FC, useMemo } from 'react';

import { SalesforceIcon } from '@/components/icons/Salesforce';
import useSources from '@/lib/hooks/use-sources';
import { DbSource, Project, SourceConfigurationView } from '@/types/types';

import { BaseConfigurationDialog } from './BaseConfiguration';
import { SalesforceKnowledgeSettings } from '../settings/SalesforceKnowledge';

type SalesforceKnowledgeConfigurationDialogProps = {
  projectId: Project['id'];
  sourceId?: DbSource['id'];
  defaultView?: SourceConfigurationView;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const SalesforceKnowledgeConfigurationDialog: FC<
  SalesforceKnowledgeConfigurationDialogProps
> = ({ projectId, sourceId, defaultView, open, onOpenChange }) => {
  const { sources } = useSources();

  const source = useMemo(() => {
    return sources?.find((s) => s.id === sourceId);
  }, [sources, sourceId]);

  return (
    <BaseConfigurationDialog
      source={source}
      defaultView={defaultView}
      open={open}
      onOpenChange={onOpenChange}
      Icon={SalesforceIcon}
    >
      <SalesforceKnowledgeSettings
        projectId={projectId}
        source={source}
        forceDisabled={false}
      />
    </BaseConfigurationDialog>
  );
};

export default SalesforceKnowledgeConfigurationDialog;
