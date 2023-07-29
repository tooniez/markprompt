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
      { label: 'Data', href: `${basePath}` },
      { label: 'Playground', href: `${basePath}/playground` },
      { label: 'Insights', href: `${basePath}/insights`, tag: 'Beta' },
      { label: 'Settings', href: `${basePath}/settings` },
    ];
  }, [team?.slug, project?.slug]);

  return <NavSubtabsLayout {...props} subTabItems={subTabItems} />;
};
