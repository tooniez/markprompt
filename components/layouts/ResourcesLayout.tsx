import Markdoc, { RenderableTreeNode } from '@markdoc/markdoc';
import {
  Combine,
  MessagesSquare,
  FileBarChart,
  Sliders,
  Unplug,
  Code2,
  Key,
  ShieldCheck,
} from 'lucide-react';
import React, { FC } from 'react';

import { MarkdocContext } from './DocsLayout';
import LandingNavbar from './LandingNavbar';
import {
  DocsPlayground,
  Fence,
  ProseContainer,
  TOC,
  useTableOfContents,
} from './MarkdocLayout';
import { Collapse, CollapseGroup } from '../ui/Collapse';
import { Heading } from '../ui/Heading';
import { Note } from '../ui/Note';
import { Pattern } from '../ui/Pattern';
import { Video } from '../ui/Video';

type ResourcesLayoutProps = {
  content: RenderableTreeNode;
  toc: TOC;
  frontmatter: any;
};

export const ResourcesLayout: FC<ResourcesLayoutProps> = ({
  content,
  toc,
  frontmatter,
}: any) => {
  const { registerHeading, unregisterHeading } = useTableOfContents(toc);

  return (
    <>
      <div className="relative mx-auto min-h-screen w-full">
        <Pattern />
        <MarkdocContext.Provider value={{ registerHeading, unregisterHeading }}>
          <div className="fixed top-0 left-0 right-0 z-30 h-24 bg-black/30 backdrop-blur">
            <div className="mx-auto max-w-screen-xl px-6 sm:px-8">
              <LandingNavbar noAnimation />
            </div>
          </div>
          <div className="prose prose-invert relative mx-auto min-h-screen w-full max-w-screen-2xl px-6 pt-40 pb-24 sm:px-8">
            <div className="relative mx-auto w-full max-w-screen-md overflow-hidden">
              <ProseContainer width="md">
                {frontmatter?.title && (
                  <h1 className="mb-12 text-left text-3xl md:text-4xl">
                    {frontmatter.title}
                  </h1>
                )}
                {Markdoc.renderers.react(content, React, {
                  components: {
                    Collapse,
                    CollapseGroup,
                    Fence,
                    Heading,
                    Note,
                    Playground: DocsPlayground,
                    Video,
                    IconCombine: () => (
                      <Combine className="mt-8 block h-5 w-5 text-fuchsia-500" />
                    ),
                    IconMessagesSquare: () => (
                      <MessagesSquare className="mt-8 block h-5 w-5 text-fuchsia-500" />
                    ),
                    IconFileBarChart: () => (
                      <FileBarChart className="mt-8 block h-5 w-5 text-fuchsia-500" />
                    ),
                    IconSliders: () => (
                      <Sliders className="mt-8 block h-5 w-5 text-fuchsia-500" />
                    ),
                    IconUnplug: () => (
                      <Unplug className="mt-8 block h-5 w-5 text-fuchsia-500" />
                    ),
                    IconCode2: () => (
                      <Code2 className="mt-8 block h-5 w-5 text-fuchsia-500" />
                    ),
                    IconKey: () => (
                      <Key className="mt-8 block h-5 w-5 text-fuchsia-500" />
                    ),
                    IconShieldCheck: () => (
                      <ShieldCheck className="mt-8 block h-5 w-5 text-fuchsia-500" />
                    ),
                  },
                })}
              </ProseContainer>
            </div>
          </div>
        </MarkdocContext.Provider>
      </div>
    </>
  );
};
