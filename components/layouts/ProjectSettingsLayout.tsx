import { FC, useMemo } from 'react';

import useProject from '@/lib/hooks/use-project';
import useTeam from '@/lib/hooks/use-team';

import { NavSubtabsLayout, NavSubtabsLayoutProps } from './NavSubtabsLayout';

export const ProjectSettingsLayout: FC<NavSubtabsLayoutProps> = (props) => {
  const { team } = useTeam();
  const { project } = useProject();

  const subTabItems = useMemo(() => {
    if (!team?.slug || !project?.slug) {
      return undefined;
    }
    const basePath = `/${team?.slug}/${project?.slug}`;
    return [
      { label: 'Home', href: basePath },
      { label: 'Data', href: `${basePath}/data` },
      { label: 'Playground', href: `${basePath}/playground` },
      // { label: 'Insights', href: `${basePath}/insights`, tag: 'New' },
      { label: 'Settings', href: `${basePath}/settings` },
    ];
  }, [team?.slug, project?.slug]);

  return <NavSubtabsLayout {...props} subTabItems={subTabItems} />;
};
