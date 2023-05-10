import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as Tabs from '@radix-ui/react-tabs';
import Link from 'next/link';
import { ReactNode, useState } from 'react';

import Button from '@/components/ui/Button';
import { CodePanel } from '@/components/ui/Code';
import { Note } from '@/components/ui/Note';
import { useConfigContext } from '@/lib/context/config';
import useProject from '@/lib/hooks/use-project';
import useTeam from '@/lib/hooks/use-team';
import { Theme, ThemeColorKeys, ThemeDimensionKeys } from '@/lib/themes';
import { OpenAIModelId, Project, Team } from '@/types/types';

import { getProseClassCSS, getRootTextSize } from './prose';

export const KeyNote = ({
  className,
}: {
  className?: string;
  projectKey?: string;
  textKey?: string;
}) => {
  return (
    <Note className={className} size="sm" type="warning">
      The code is diplayed with your project key, and needs to be run from a
      whitelisted domain. If you wish to test your code on a non-whitelisted
      domain, such as localhost, use the test key instead. Do not share the test
      key publicly.
    </Note>
  );
};

const vanillaJSCode = (projectKey: string) => {
  return `<script src='https://cdn.markprompt.com/script.js' data-project-key='${projectKey}' defer></script>`.trim();
};

const npmInstallReactCode =
  'npm install @markprompt/react react @radix-ui/react-visually-hidden';

const reactCode = (
  projectKey: string,
  isTestKey: boolean,
  includeBranding: boolean,
  iDontKnowMessage: string,
  placeholder: string,
  loadingHeading: string,
  referencesHeading: string,
  model: OpenAIModelId,
  promptTemplate: string,
  temperature: number,
  topP: number,
  frequencyPenalty: number,
  presencePenalty: number,
  maxTokens: number,
) => {
  return `import * as Markprompt from '@markprompt/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useContext } from 'react';

import './style.css';

function Component() {
  ${
    isTestKey
      ? '// Do not share this key publicly.'
      : '// Use from a whitelisted domain.'
  }
  return (
    <Markprompt.Root
      projectKey="${projectKey}"${
    !includeBranding ? `\n      includeBranding="false"` : ''
  }
      iDontKnowMessage="${iDontKnowMessage}"
      placeholder="${placeholder}"
      loadingHeading="${loadingHeading}"
      referencesHeading="${referencesHeading}"
      model="${model}"
      promptTemplate={\`${promptTemplate}\`}
      temperature={${temperature}}
      topP={${topP}}
      frequencyPenalty={${frequencyPenalty}}
      presencePenalty={${presencePenalty}}
      maxTokens={${maxTokens}}
    >
      <Markprompt.Trigger
        aria-label="Open Markprompt"
        className="MarkpromptButton"
      >
        <ChatIcon className="MarkpromptIcon" />
      </Markprompt.Trigger>
      <Markprompt.Portal>
        <Markprompt.Overlay className="MarkpromptOverlay" />
        <Markprompt.Content className="MarkpromptContent">
          <Markprompt.Close className="MarkpromptClose">
            <CloseIcon />
          </Markprompt.Close>

          {/* Markprompt.Title is required for accessibility reasons. It can be hidden using an accessible content hiding technique. */}
          <VisuallyHidden asChild>
            <Markprompt.Title>
              Ask me anything about Markprompt
            </Markprompt.Title>
          </VisuallyHidden>

          {/* Markprompt.Description is included for accessibility reasons. It is optional and can be hidden using an accessible content hiding technique. */}
          <VisuallyHidden asChild>
            <Markprompt.Description>
              I can answer your questions about Markprompt's client-side
              libraries, onboarding, API's and more.
            </Markprompt.Description>
          </VisuallyHidden>

          <Markprompt.Form>
            <SearchIcon className="MarkpromptSearchIcon" />
            <Markprompt.Prompt className="MarkpromptPrompt" />
          </Markprompt.Form>

          <Markprompt.AutoScroller className="MarkpromptAnswer">
            <Caret />
            <Markprompt.Answer />
          </Markprompt.AutoScroller>

          <References />
        </Markprompt.Content>
      </Markprompt.Portal>
    </Markprompt.Root>
  );
}

const Caret = () => {
  const { answer } = useContext(Markprompt.Context);

  if (answer) {
    return null;
  }

  return <span className="caret" />;
};

const capitalize = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const removeFileExtension = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName;
  }
  return fileName.substring(0, lastDotIndex);
};

const Reference = ({
  referenceId,
  index,
}: {
  referenceId: string;
  index: number;
}) => {
  return (
    <li
      key={referenceId}
      className="reference"
      style={{
        animationDelay: \`\${100 * index}ms\`,
      }}
    >
      <a href={removeFileExtension(referenceId)}>
        {capitalize(removeFileExtension(referenceId.split('/').slice(-1)[0]))}
      </a>
    </li>
  );
};

const References = () => {
  const { state, references } = useContext(Markprompt.Context);

  if (state === 'indeterminate') return null;

  let adjustedState: string = state;
  if (state === 'done' && references.length === 0) {
    adjustedState = 'indeterminate';
  }

  return (
    <div data-loading-state={adjustedState} className="references">
      <div className="progress" />
      <p>Fetching relevant pages…</p>
      <p>Answer generated from the following sources:</p>
      <Markprompt.References RootElement="ul" ReferenceElement={Reference} />
    </div>
  );
};

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" x2="16.65" y1="21" y2="16.65"></line>
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" x2="6" y1="6" y2="18"></line>
    <line x1="6" x2="18" y1="6" y2="18"></line>
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
  </svg>
);

export default Component;
`.trim();
};

const reactStylesheet = (theme: Theme) => {
  const lightColorKeys = Object.keys(theme.colors.light) as ThemeColorKeys[];
  const darkColorKeys = Object.keys(theme.colors.dark) as ThemeColorKeys[];
  const dimensionKeys = Object.keys(theme.dimensions) as ThemeDimensionKeys[];
  const proseClasses = getProseClassCSS(theme.size || 'sm');
  const rootRextSize = getRootTextSize(theme.size || 'sm');

  return `/* style.css */

:root {
${lightColorKeys
  .map((key) => `  --markprompt-${key}: ${theme.colors.light[key]};`)
  .join('\n')}
${dimensionKeys
  .map((key) => `  --markprompt-${key}: ${theme.dimensions[key]};`)
  .join('\n')}
  --markprompt-text-size: ${rootRextSize};
  --markprompt-button-icon-size: 1rem;
}

.dark {
${darkColorKeys
  .map((key) => `  --markprompt-${key}: ${theme.colors.dark[key]};`)
  .join('\n')}
}

button {
  all: unset;
}

.MarkpromptButton {
  display: flex;
  cursor: pointer;
  border-radius: 99999px;
  color: var(--markprompt-primaryForeground);
  background-color: var(--markprompt-primary);
  padding: 0.75rem;
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  transition-property: opacity;
  transition-duration: 200ms;
}

.MarkpromptButton:hover {
  opacity: 0.8;
}

.MarkpromptIcon {
  width: 1.25rem;
  height: 1.25rem;
}

.MarkpromptOverlay {
  position: fixed;
  inset: 0;
  animation: overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1);
  background-color: var(--markprompt-overlay);
}

.MarkpromptContent {
  background-color: var(--markprompt-background);
  border-radius: var(--markprompt-radius);
  border: 1px solid var(--markprompt-border);
  box-shadow: hsl(206 22% 7% / 35%) 0px 10px 38px -10px,
    hsl(206 22% 7% / 20%) 0px 10px 20px -15px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80vw;
  max-width: 600px;
  height: calc(100vh - 200px);
  max-height: 600px;
  animation-name: contentShow;
  animation-duration: 300ms;
  animation-fill-mode: both;
  transition-timing-function: cubic-bezier(0.25, 0.4, 0.55, 1.4);
  color: var(--markprompt-foreground);
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
}

.MarkpromptClose {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  color: var(--markprompt-foreground);
  width: var(--markprompt-button-icon-size);
  height: var(--markprompt-button-icon-size);
  padding: 0.25rem;
  border-radius: 4px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition-property: box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.MarkpromptClose:hover {
  opacity: 0.8;
}

.MarkpromptClose:focus {
  box-shadow: inset 0 0 0 2px var(--markprompt-primary);
}

.MarkpromptSearchIcon {
  position: absolute;
  top: 1rem;
  left: 1.25rem;
  color: var(--markprompt-foreground);
  width: var(--markprompt-button-icon-size);
  height: var(--markprompt-button-icon-size);
  cursor: pointer;
  display: grid;
  place-items: center;
}

.MarkpromptTitle {
  margin-block-start: 0;
}

.MarkpromptPrompt {
  border-left: none !important;
  border-right: none !important;
  border-top: none !important;
  outline: none !important;
  border-bottom: 1px solid var(--markprompt-border);
  box-shadow: none;
  width: 100%;
  padding-left: 3.5rem;
  padding-right: 3.5rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  font-size: var(--markprompt-text-size);
  background-color: var(--markprompt-background);
  color: var(--markprompt-foreground);
  caret-color: var(--markprompt-primary);
}

.MarkpromptPrompt:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
  box-shadow: none;
}

.MarkpromptPrompt::placeholder {
  color: var(--markprompt-mutedForeground);
}

.MarkpromptPrompt:focus {
  outline: 2px solid var(--markprompt-mutedForeground);
}

.MarkpromptReferences {
  background-color: var(--markprompt-muted);
  color: var(--markprompt-mutedForeground);
  border-top: 1px solid var(--markprompt-border);
}

.MarkpromptAnswer {
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  padding: 1rem 2rem;
  scroll-behavior: smooth;
  -ms-overflow-style: none;
  scrollbar-width: none;
  font-size: var(--markprompt-text-size);
}
.MarkpromptAnswer::-webkit-scrollbar {
  display: none;
}
.MarkpromptAnswer :not(:last-child) .caret {
  display: none;
}
${proseClasses}

.caret {
  display: none;
  height: 1rem;
  width: 0.5rem;
  margin-left: 0.2rem;
  transform: translate(2px, 2px);
  border-radius: 1px;
  background-color: var(--markprompt-primary);
  box-shadow: 0 0 3px 0 var(--markprompt-primary);
  animation-name: blink;
  animation-duration: 1000ms;
  animation-fill-mode: both;
  animation-iteration-count: infinite;
  transition-timing-function: cubic-bezier(0.14, 0, 0.16, 1);
}

[data-loading-state='preload'] .caret {
  display: inline-block;
}

[data-loading-state]:not([data-loading-state='done']) .caret {
  display: none;
}

[data-loading-state='preload'] .progress {
  position: absolute;
  top: -2px;
  left: 0;
  height: 2px;
  background-image: linear-gradient(
    to right,
    var(--markprompt-primaryHighlight),
    var(--markprompt-secondaryHighlight)
  );
  animation-name: progress;
  animation-duration: 2s;
  animation-fill-mode: none;
  animation-iteration-count: infinite;
  transition-timing-function: cubic-bezier(0.14, 0, 0.16, 1);
  transition: opacity 200ms ease;
}
[data-loading-state='preload'] .progress {
  opacity: 1;
}
[data-loading-state]:not([data-loading-state='preload']) .progress {
  opacity: 0;
}

.references {
  position: 'relative';
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  background-color: var(--markprompt-muted);
  border-top: 1px solid var(--markprompt-border);
  font-size: 0.75rem;
  transition: height 500ms ease;
  transform: translateY(100%);
  opacity: 0;
  animation: popup 200ms ease-out forwards;
  width: 100%;
  box-sizing: border-box;
}
.references[data-loading-state='preload'] {
  height: 50px;
}
.references[data-loading-state='streaming-answer'],
.references[data-loading-state='done'] {
  height: 95px;
}
.references[data-loading-state='indeterminate'] {
  display: none;
  height: 0;
}

.references p {
  transition: opacity 500ms ease;
  position: absolute;
  top: 0.25rem;
  left: 2rem;
  right: 2rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.references[data-loading-state='preload'] > p:first-of-type {
  opacity: 1;
}
.references[data-loading-state='preload'] > p:last-of-type {
  opacity: 0;
}
[data-loading-state]:not([data-loading-state='preload']) > p:first-of-type {
  opacity: 0 !important;
}
[data-loading-state]:not([data-loading-state='preload']) > p:last-of-type {
  opacity: 1;
}

.references ul {
  width: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.5rem;
  list-style-type: none;
  margin-top: 2.25rem;
  padding-left: 2rem;
  padding-bottom: 2rem;
  overflow-x: auto;
  min-width: 100%;
  width: 0;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.references ul::-webkit-scrollbar {
  display: none;
}

.reference {
  font-size: 0.875rem;
  line-height: 1.5rem;
  animation-name: slide-up;
  animation-duration: 1s;
  animation-fill-mode: both;
  transition-timing-function: ease-in-out;
}

.reference a {
  display: inline-block;
  text-decoration: none;
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--markprompt-border);
  border-radius: 0.375rem;
  color: var(--markprompt-primary);
  font-weight: 500;
  transition-property: opacity;
  transition-duration: 200ms;
  white-space: nowrap;
}

.reference a:hover {
  opacity: 0.8;
}

@keyframes contentShow {
  from {
    opacity: 0;
    transform: translate(-50%, -46%) scale(0.98);
  }
  50% {
    transform: translate(-50%, -51%) scale(1.02);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes overlayShow {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes blink {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes popup {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes progress {
  0% {
    width: 0;
    transform: translateX(0);
  }
  50% {
    width: 100%;
    transform: translateX(0);
  }
  100% {
    width: 100%;
    transform: translateX(100%);
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

`.trim();
};

const webComponentInstallCode =
  '<script type="module" src="https://esm.sh/@markprompt/web" />';

const webComponentCode = (projectKey: string) =>
  `<markprompt-content projectKey="${projectKey}" />`;

const webComponentStylesheet = (theme: Theme) => {
  const lightColorKeys = Object.keys(theme.colors.light) as ThemeColorKeys[];
  const darkColorKeys = Object.keys(theme.colors.dark) as ThemeColorKeys[];
  const dimensionKeys = Object.keys(theme.dimensions) as ThemeDimensionKeys[];

  return `markprompt-content {
${lightColorKeys
  .map((key) => `  --markprompt-${key}: ${theme.colors.light[key]};`)
  .join('\n')}
${dimensionKeys
  .map((key) => `  --markprompt-${key}: ${theme.dimensions[key]};`)
  .join('\n')}
}

markprompt-content.dark {
${darkColorKeys
  .map((key) => `  --markprompt-${key}: ${theme.colors.dark[key]};`)
  .join('\n')}
}`.trim();
};

const getDescription = (
  teamSlug: string,
  projectSlug: string,
  isTestMode: boolean,
  isOnboarding: boolean,
) => {
  if (isTestMode) {
    return 'Showing code with your test key, which can be used for non-public sites, for instance on localhost. Do not share code with a test key publicly. For public sites, use a production key from a whitelisted domain.';
  } else {
    return (
      <>
        Showing code with your production key. Production keys can only be used
        when called from a whitelisted domain. You can add whitelisted domains
        in the{' '}
        {!isOnboarding ? (
          <Link
            className="subtle-underline"
            href={`/${teamSlug}/${projectSlug}/settings`}
          >
            project settings
          </Link>
        ) : (
          <>project settings</>
        )}
        . For local development, use a test key.
      </>
    );
  }
};

export const TestKeyNote = ({
  team,
  project,
  testMode,
  isOnboarding,
  className,
}: {
  team: Team;
  project: Project;
  testMode: boolean;
  isOnboarding: boolean;
  className: string;
}) => {
  return (
    <Note type="warning" size="sm" className={className}>
      {getDescription(team.slug, project.slug, testMode, isOnboarding)}
    </Note>
  );
};

const GetCode = ({
  isOnboarding,
  children,
}: {
  isOnboarding: boolean;
  children: ReactNode;
}) => {
  const { team } = useTeam();
  const { project } = useProject();
  const {
    theme,
    placeholder,
    modelConfig,
    iDontKnowMessage,
    referencesHeading,
    loadingHeading,
    includeBranding,
  } = useConfigContext();
  const [testMode, setTestMode] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);

  if (!team || !project) {
    return <></>;
  }

  const apiKey = testMode
    ? project.private_dev_api_key
    : project.public_api_key;

  return (
    <Dialog.Root open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-appear dialog-overlay" />
        <Dialog.Content className="animate-dialog-slide-in dialog-content flex h-[90%] max-h-[800px] w-[90%] max-w-[700px] flex-col">
          <Dialog.Title className="dialog-title-xl flex flex-none flex-row items-center gap-2">
            <div className="flex-grow truncate">Copy code</div>
            <Button variant="ghost" buttonSize="sm">
              Docs
            </Button>
            <div className="flex flex-none flex-row items-center gap-2">
              <label
                className="flex-grow truncate text-sm font-normal text-neutral-500"
                htmlFor="product-updates"
              >
                Test mode
              </label>
              <Switch.Root
                className="switch-root"
                id="test-mode"
                checked={testMode}
                onCheckedChange={setTestMode}
              >
                <Switch.Thumb className="switch-thumb" />
              </Switch.Root>
            </div>
          </Dialog.Title>
          <Dialog.Description className="dialog-description-xl mt-2 flex-none border-b border-neutral-900 pb-4">
            Use the code below in your HTML pages or web application.
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
                  Web Component
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content
                className="tabs-content relative w-full max-w-full flex-grow"
                value="vanilla"
              >
                <div className="prose prose-invert absolute inset-x-0 top-4 bottom-0 w-full max-w-full overflow-y-auto py-4">
                  <h3>Usage</h3>
                  <p>Add the following script tag to your HTML page:</p>
                  <CodePanel language="markup" code={vanillaJSCode(apiKey)} />
                  <TestKeyNote
                    className="mt-4"
                    team={team}
                    project={project}
                    testMode={testMode}
                    isOnboarding={isOnboarding}
                  />
                </div>
              </Tabs.Content>
              <Tabs.Content
                className="tabs-content relative w-full max-w-full flex-grow"
                value="react"
              >
                <div className="prose prose-invert absolute inset-x-0 top-4 bottom-0 w-full max-w-full overflow-y-auto py-4">
                  <Note size="sm" type="info" className="mb-4">
                    <p>
                      Check out the starter template for a fully working example
                      in Next.js:
                    </p>
                    <p className="pt-2 pb-1">
                      <a
                        href="https://github.com/motifland/markprompt-starter-template"
                        target="_blank"
                        rel="noreferrer"
                        className="subtle-underline"
                      >
                        Markprompt starter template
                      </a>{' '}
                      →
                    </p>
                  </Note>
                  <h3>Installation</h3>
                  <CodePanel
                    className="w-full"
                    language="bash"
                    code={npmInstallReactCode}
                  />
                  <h3>Usage</h3>
                  <TestKeyNote
                    className="mb-4"
                    team={team}
                    project={project}
                    testMode={testMode}
                    isOnboarding={isOnboarding}
                  />
                  <CodePanel
                    language="jsx"
                    code={reactCode(
                      apiKey,
                      testMode,
                      includeBranding,
                      iDontKnowMessage,
                      placeholder,
                      loadingHeading,
                      referencesHeading,
                      modelConfig.model,
                      modelConfig.promptTemplate,
                      modelConfig.temperature,
                      modelConfig.topP,
                      modelConfig.frequencyPenalty,
                      modelConfig.presencePenalty,
                      modelConfig.maxTokens,
                    )}
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
                className="tabs-content relative w-full max-w-full flex-grow"
                value="webcomponent"
              >
                <div className="prose prose-invert absolute inset-x-0 top-4 bottom-0 w-full max-w-full overflow-y-auto py-4">
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
                    code={webComponentCode(apiKey)}
                  />
                  <TestKeyNote
                    className="mt-4"
                    team={team}
                    project={project}
                    testMode={testMode}
                    isOnboarding={isOnboarding}
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
