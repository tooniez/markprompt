import { Markprompt } from '@markprompt/react';
import * as Dialog from '@radix-ui/react-dialog';
import { FC, ReactNode, useEffect, useState } from 'react';
import colors from 'tailwindcss/colors';

import { getApiUrl } from '@/lib/utils.edge';

import tailwindConfig from '../../tailwind.config';

import '@markprompt/css';

type DocsPromptProps = {
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
};

export const DocsPrompt: FC<DocsPromptProps> = ({ children, onOpenChange }) => {
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(promptOpen);
  }, [promptOpen, onOpenChange]);

  return (
    <Dialog.Root open={promptOpen} onOpenChange={setPromptOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
        <Dialog.Content
          className="animate-dialog-slide-in dialog-content flex max-h-[90%] w-[90%] max-w-[720px] flex-col overflow-hidden"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
        >
          <style jsx global>
            {`
              :root {
                --markprompt-background: ${(
                  tailwindConfig.theme?.extend?.colors as any
                )?.['neutral']?.['1000']};
                --markprompt-foreground: ${colors.neutral['300']};
                --markprompt-muted: ${(
                  tailwindConfig.theme?.extend?.colors as any
                )?.['neutral']?.['1100']};
                --markprompt-mutedForeground: ${colors.neutral['500']};
                --markprompt-border: ${colors.neutral['900']};
                --markprompt-input: ${colors.white};
                --markprompt-primary: ${colors.sky['500']};
                --markprompt-primaryForeground: ${colors.white};
                --markprompt-primaryMuted: ${colors.sky['400']};
                --markprompt-secondary: ${(
                  tailwindConfig.theme?.extend?.colors as any
                )?.['neutral']?.['1000']};
                --markprompt-secondaryForeground: ${colors.white};
                --markprompt-primaryHighlight: ${colors.pink['500']};
                --markprompt-secondaryHighlight: ${colors.purple['500']};
                --markprompt-overlay: #00000040;
                --markprompt-ring: ${colors.white};
                --markprompt-radius: 5px;
              }

              input {
                background-color: transparent;
              }

              .MarkpromptPrompt {
                background-color: transparent;
              }

              .MarkpromptClose {
                padding: 0.25rem;
                text-transform: uppercase;
              }

              kbd {
                font-weight: 600;
                font-size: 0.5rem;
                font-family: Inter, sans-serif;
                color: ${colors.neutral['500']};
              }
            `}
          </style>
          <div className="flex h-[calc(100vh-240px)] max-h-[560px] w-full flex-grow overflow-hidden">
            <Markprompt
              display="plain"
              showBranding={false}
              projectKey={
                (process.env.NODE_ENV === 'production'
                  ? process.env.NEXT_PUBLIC_MARKPROMPT_WEBSITE_DOCS_PROJECT_KEY
                  : process.env
                      .NEXT_PUBLIC_MARKPROMPT_WEBSITE_DOCS_PROJECT_KEY_TEST) ||
                ''
              }
              prompt={{
                apiUrl: getApiUrl('completions', false),
                model: 'gpt-4',
                placeholder: 'Ask AI…',
              }}
              references={{
                getLabel: (reference) => {
                  return (
                    reference.meta?.leadHeading?.value ||
                    reference.file?.title ||
                    'Untitled'
                  );
                },
                getHref: (reference) => {
                  return reference.file.path
                    .replace('/pages', '')
                    .replace(/.mdoc$/gi, '')
                    .replace(/.mdx$/gi, '')
                    .replace(/\/index$/gi, '');
                },
              }}
              search={{
                enabled: true,
                apiUrl: getApiUrl('search', false),
                placeholder: 'Search docs…',
                // getHref: (path, sectionHeading, source) => {
                //   console.log('path', path, sectionHeading, source);
                //   return '';
                // },
              }}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
  // return (
  //   <Dialog.Root
  //     open={promptOpen}
  //     onOpenChange={(open) => {
  //       setPromptOpen(open);
  //       onOpenChange?.(open);
  //     }}
  //   >
  //     <Dialog.Trigger asChild>{children}</Dialog.Trigger>
  //     <Dialog.Portal>
  //       <Dialog.Content className="animate-chat-window z-30 mr-4 mb-4 w-[calc(100vw-32px)] sm:w-full">
  //         <div className="relative mt-4 h-[calc(100vh-240px)] max-h-[560px] w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-1000 text-sm shadow-2xl sm:w-[400px]">
  //           <style jsx global>
  //             {`
  //               :root {
  //                 --markprompt-background: #050505;
  //                 --markprompt-foreground: #d4d4d4;
  //                 --markprompt-muted: #171717;
  //                 --markprompt-mutedForeground: #737373;
  //                 --markprompt-border: #262626;
  //                 --markprompt-input: #fff;
  //                 --markprompt-primary: #0ea5e9;
  //                 --markprompt-primaryForeground: #fff;
  //                 --markprompt-primaryMuted: #38bdf8;
  //                 --markprompt-secondary: #0e0e0e;
  //                 --markprompt-secondaryForeground: #fff;
  //                 --markprompt-primaryHighlight: #ec4899;
  //                 --markprompt-secondaryHighlight: #a855f7;
  //                 --markprompt-overlay: #00000040;
  //                 --markprompt-ring: #fff;
  //                 --markprompt-radius: 5px;
  //               }

  //               input {
  //                 background-color: transparent;
  //               }

  //               .MarkpromptPrompt {
  //                 background-color: transparent;
  //               }
  //             `}
  //           </style>
  //           <Markprompt
  //             display="plain"
  //             showBranding={false}
  //             close={{
  //               visible: false,
  //             }}
  //             projectKey={
  //               (process.env.NODE_ENV === 'production'
  //                 ? process.env.NEXT_PUBLIC_MARKPROMPT_WEBSITE_DOCS_PROJECT_KEY
  //                 : process.env
  //                     .NEXT_PUBLIC_MARKPROMPT_WEBSITE_DOCS_PROJECT_KEY_TEST) ||
  //               ''
  //             }
  //             prompt={{
  //               apiUrl: getApiUrl('completions', false),
  //               model: 'gpt-4',
  //               placeholder: 'Ask Docs AI',
  //             }}
  //             search={{
  //               enabled: true,
  //               apiUrl: getApiUrl('search', false),
  //               // getHref: (path, sectionHeading, source) => {
  //               //   console.log('path', path, sectionHeading, source);
  //               //   return '';
  //               // },
  //             }}
  //           />
  //         </div>
  //       </Dialog.Content>
  //     </Dialog.Portal>
  //   </Dialog.Root>
  // );
};
