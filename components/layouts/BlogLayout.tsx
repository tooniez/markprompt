import Markdoc, { RenderableTreeNode } from '@markdoc/markdoc';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import Image from 'next/image';
import React, { FC, useMemo } from 'react';
import Balancer from 'react-wrap-balancer';

import { getMotifImageDimensionsFromUrl } from '@/lib/utils';

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

dayjs.extend(localizedFormat);

type BlogLayoutProps = {
  content: RenderableTreeNode;
  toc: TOC;
  frontmatter: any;
};

type CloudinaryImageProps = {
  src: string;
  alt: string;
  className?: string;
};

const CloudinaryImage: FC<CloudinaryImageProps> = ({ src, alt, className }) => {
  const dimens = useMemo(() => {
    if (!src) {
      return undefined;
    }
    return getMotifImageDimensionsFromUrl(src);
  }, [src]);

  if (!dimens) {
    return <></>;
  }

  return (
    <Image
      className={className}
      src={src}
      alt={alt}
      width={dimens.width}
      height={dimens.height}
    />
  );
};

export const BlogLayout: FC<BlogLayoutProps> = ({
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
          <div className="prose prose-invert relative mx-auto min-h-screen w-full max-w-screen-xl px-6 pt-48 pb-24 sm:px-8">
            {frontmatter?.title && (
              <div className="flex justify-center">
                <Balancer>
                  <h1 className="mb-4 text-center text-4xl md:text-5xl">
                    {frontmatter.title}
                  </h1>
                </Balancer>
              </div>
            )}
            <div className="flex flex-row items-center justify-center gap-4">
              {frontmatter?.authors?.map(
                (author: { name: string; avatar: string }) => {
                  return (
                    <div
                      className="flex flex-row items-center justify-center gap-2"
                      key={author.name}
                    >
                      <CloudinaryImage
                        src={author.avatar}
                        alt={author.name || 'Avatar'}
                        className="h-6 w-6 rounded-full"
                      />
                      <p className="flex justify-center text-neutral-500">
                        {author?.name}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
            <p className="mt-0 text-center text-neutral-500">
              {dayjs(frontmatter.date).format('LL')}
            </p>
            {frontmatter?.cover && (
              <CloudinaryImage
                src={frontmatter.cover}
                alt={frontmatter.title || 'Cover image'}
                className="rounded-lg border border-neutral-900"
              />
            )}
            <div className="relative mx-auto w-full max-w-screen-md overflow-hidden">
              <ProseContainer>
                {Markdoc.renderers.react(content, React, {
                  components: {
                    Collapse,
                    CollapseGroup,
                    Fence,
                    Heading,
                    Note,
                    Playground: DocsPlayground,
                  },
                })}
              </ProseContainer>
            </div>
          </div>
        </MarkdocContext.Provider>
        <p className="pb-16 pt-16 text-center text-sm text-neutral-700 backdrop-blur transition hover:text-neutral-300">
          Powered by{' '}
          <a
            href="https://motif.land"
            className="subtle-underline"
            target="_blank"
            rel="noreferrer"
          >
            Motif
          </a>
        </p>
      </div>
    </>
  );
};
