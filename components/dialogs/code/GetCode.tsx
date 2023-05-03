import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { ReactNode, useState } from 'react';

import { CodePanel } from '@/components/ui/Code';
import { useConfigContext } from '@/lib/context/config';
import useProject from '@/lib/hooks/use-project';
import { Theme, ThemeColorKeys } from '@/lib/themes';

const vanillaJSCode = (projectKey: string) => {
  return `<script src='https://cdn.markprompt.com/script.js' data-project-key='${projectKey}' defer></script>`.trim();
};

const npmInstallReactCode = 'npm install @markprompt/react';

const reactCode = (projectKey: string, placeholder: string) => {
  return `import React from 'react';
import * as Markprompt from '@markprompt/react';
import './style.css';

function Component() {
  return (
    {/* Use from a whitelisted domain. */}
    <Markprompt.Root projectKey="${projectKey}">
      <Markprompt.Trigger
        aria-label="Open Markprompt"
        className="markprompt-button"
      >
        <MarkpromptIcon className="markprompt-icon" />
      </Markprompt.Trigger>
      <Markprompt.Portal>
        <Markprompt.Overlay className="markprompt-overlay" />
        <Markprompt.Content className="markprompt-content">
          <Markprompt.Close className="markprompt-close">
            <CloseIcon />
          </Markprompt.Close>
          <Markprompt.Form>
            <Markprompt.Prompt
              className="markprompt-prompt"
              placeholder="${placeholder}"
            />
          </Markprompt.Form>
          <Markprompt.Answer />
        </Markprompt.Content>
      </Markprompt.Portal>
    </Markprompt.Root>
  );
}

const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line>
  </svg>

export default Component;
`.trim();
};

const reactStylesheet = (theme: Theme) => {
  const lightKeys = Object.keys(theme.colors.light) as ThemeColorKeys[];
  const darkKeys = Object.keys(theme.colors.dark) as ThemeColorKeys[];

  return `/* style.css */

:root {
${lightKeys
  .map((key) => `  --markprompt-${key}: ${theme.colors.dark[key]};`)
  .join('\n')}
}

.dark {
${darkKeys
  .map((key) => `  --markprompt-${key}: ${theme.colors.dark[key]};`)
  .join('\n')}
}

button {
  all: unset;
}

.markprompt-button {
  display: flex;
  cursor: pointer;
}

.markprompt-button:hover {
  color: white;
}

.markprompt-icon {
  width: 3rem;
  height: auto;
}

.markprompt-overlay {
  position: fixed;
  inset: 0;
  animation: overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1);
  background-color: var(--blackA10);
}

@keyframes overlayShow {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.markprompt-content {
  background-color: var(--gray10);
  border-radius: 6px;
  box-shadow: hsl(206 22% 7% / 35%) 0px 10px 38px -10px,
    hsl(206 22% 7% / 20%) 0px 10px 20px -15px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 450px;
  max-height: 85vh;
  padding: 0.75rem;
  animation: contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1);
  color: var(--gray12);
}

@keyframes contentShow {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.markprompt-close {
  position: absolute;
  top: -2rem;
  right: 0rem;
  background: var(--gray10);
  color: rgba(255 255 255 / 0.7);
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.markprompt-close:hover {
  color: white;
}

.markprompt-title {
  margin-block-start: 0;
}

.markprompt-prompt {
  background-color: var(--blackA8);
  border: none;
  border-radius: 4px;
  width: 100%;
  padding: 1rem 0.75rem;
  font-size: 1rem;
  color: var(--gray6);
}

.markprompt-prompt::placeholder {
  color: var(--gray8);
}

.markprompt-prompt:focus {
  outline: 2px solid var(--blackA9);
}
`.trim();
};

const webComponentInstallCode =
  '<script type="module" src="https://esm.sh/@markprompt/web" />';

const webComponentCode = (projectKey: string) =>
  `<markprompt-content projectKey="${projectKey}" />`;

const webComponentStylesheet = (theme: Theme) => {
  const lightKeys = Object.keys(theme.colors.light) as ThemeColorKeys[];
  const darkKeys = Object.keys(theme.colors.dark) as ThemeColorKeys[];

  return `markprompt-content {
${lightKeys
  .map((key) => `  --markprompt-${key}: ${theme.colors.dark[key]};`)
  .join('\n')}
}

markprompt-content.dark {
${darkKeys
  .map((key) => `  --markprompt-${key}: ${theme.colors.dark[key]};`)
  .join('\n')}
}`.trim();
};

const GetCode = ({ children }: { children: ReactNode }) => {
  const { project } = useProject();
  const { theme, placeholder } = useConfigContext();
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);

  if (!project) {
    return <></>;
  }

  return (
    <Dialog.Root open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
        <Dialog.Content className="animate-dialog-slide-in dialog-content flex h-[90%] max-h-[800px] w-[90%] max-w-[700px] flex-col">
          <Dialog.Title className="dialog-title-xl flex-none">
            Copy code
          </Dialog.Title>
          <Dialog.Description className="dialog-description-xl flex-none border-b border-neutral-900 pb-4">
            Copy the code below and add it to your website or JavaScript
            application.
          </Dialog.Description>
          <div className="flex h-full w-full flex-grow p-6">
            <Tabs.Root className="tabs-root" defaultValue="vanilla">
              <Tabs.List className="tabs-list" aria-label="Get code">
                <Tabs.Trigger className="tabs-trigger" value="vanilla">
                  Script
                </Tabs.Trigger>
                <Tabs.Trigger className="tabs-trigger" value="react">
                  React
                </Tabs.Trigger>
                <Tabs.Trigger className="tabs-trigger" value="webcomponent">
                  Web component
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content
                className="tabs-content relative w-full max-w-full flex-grow overflow-y-auto"
                value="vanilla"
              >
                <div className="prose prose-invert absolute inset-x-0 top-4 bottom-0 h-full w-full max-w-full overflow-y-auto">
                  <h3>Usage</h3>
                  <p>Add the following script tag to your HTML page:</p>
                  <CodePanel
                    className="w-full"
                    language="markup"
                    code={vanillaJSCode(project.public_api_key)}
                  />
                </div>
              </Tabs.Content>
              <Tabs.Content
                className="tabs-content relative w-full max-w-full flex-grow overflow-y-auto"
                value="react"
              >
                <div className="prose prose-invert absolute inset-x-0 top-4 bottom-0 h-full w-full max-w-full overflow-y-auto">
                  <h3>Installation</h3>
                  <CodePanel
                    className="w-full"
                    language="bash"
                    code={npmInstallReactCode}
                  />
                  <h3>Usage</h3>
                  <CodePanel
                    className="w-full"
                    language="jsx"
                    code={reactCode(project.public_api_key, placeholder)}
                    noPreWrap
                  />
                  <h3>Stylesheet</h3>
                  <CodePanel
                    className="w-full"
                    language="css"
                    code={reactStylesheet(theme)}
                    noPreWrap
                  />
                </div>
              </Tabs.Content>
              <Tabs.Content
                className="tabs-content relative w-full max-w-full flex-grow overflow-y-auto"
                value="webcomponent"
              >
                <div className="prose prose-invert absolute inset-x-0 top-4 bottom-0 h-full w-full max-w-full overflow-y-auto">
                  <h3>Usage</h3>
                  <p>Add the following script tag to your HTML page:</p>
                  <CodePanel
                    className="w-full"
                    language="markup"
                    code={webComponentInstallCode}
                  />
                  <p>
                    Then add the markprompt-content component anywhere on your
                    page:
                  </p>
                  <CodePanel
                    className="w-full"
                    language="markup"
                    code={webComponentCode(project.public_api_key)}
                  />
                  <h3>Stylesheet</h3>
                  <CodePanel
                    className="w-full"
                    language="css"
                    code={webComponentStylesheet(theme)}
                    noPreWrap
                  />
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default GetCode;
