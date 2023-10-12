import * as Tabs from '@radix-ui/react-tabs';
import { FC, JSXElementConstructor, ReactNode, useMemo } from 'react';

import useProject from '@/lib/hooks/use-project';
import { getConnectionId, getIntegrationName } from '@/lib/integrations/nango';
import {
  DbSource,
  NangoSourceDataType,
  SourceConfigurationView,
} from '@/types/types';

import SourceDialog from '../SourceDialog';

type BaseConfigurationDialogProps = {
  source?: DbSource;
  defaultView?: SourceConfigurationView;
  Icon?: JSXElementConstructor<any>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

export const BaseConfigurationDialog: FC<BaseConfigurationDialogProps> = ({
  source,
  defaultView,
  Icon,
  open,
  onOpenChange,
  children,
}) => {
  const { project } = useProject();

  const title = useMemo(() => {
    if (source?.type !== 'nango') {
      return 'Configuration';
    }
    const data = source?.data as NangoSourceDataType;
    return data?.displayName || getIntegrationName(data.integrationId);
  }, [source]);

  if (!project?.id) {
    return <></>;
  }

  return (
    <SourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      Icon={Icon}
    >
      <Tabs.Root
        className="TabsRoot"
        defaultValue={defaultView || 'configuration'}
      >
        <Tabs.List className="TabsList" aria-label="Configure source">
          <Tabs.Trigger className="TabsTrigger" value="configuration">
            Configuration
          </Tabs.Trigger>
          <Tabs.Trigger className="TabsTrigger" value="logs">
            Logs
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content className="TabsContent px-4 py-8" value="configuration">
          {children}
        </Tabs.Content>
        <Tabs.Content className="TabsContent" value="logs">
          <p className="p-4 text-sm text-neutral-500">Coming soon</p>
        </Tabs.Content>
      </Tabs.Root>
    </SourceDialog>
  );
};
