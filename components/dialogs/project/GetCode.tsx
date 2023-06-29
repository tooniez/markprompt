import { type MarkpromptOptions } from '@markprompt/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as Tabs from '@radix-ui/react-tabs';
import { diff } from 'deep-object-diff';
import indentString from 'indent-string';
import { stringify } from 'json5';
import { Book } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, useState } from 'react';

import Button from '@/components/ui/Button';
import { CodePanel } from '@/components/ui/Code';
import { Note } from '@/components/ui/Note';
import { MARKPROMPT_JS_PACKAGE_VERSIONS } from '@/lib/constants';
import {
  DEFAULT_MARKPROMPT_OPTIONS_GPT4,
  toSerializableMarkpromptOptions,
  useConfigContext,
} from '@/lib/context/config';
import useProject from '@/lib/hooks/use-project';
import useTeam from '@/lib/hooks/use-team';
import {
  defaultTheme,
  Theme,
  ThemeColorKeys,
  ThemeColors,
  ThemeDimensionKeys,
  ThemeDimensions,
} from '@/lib/themes';
import { pruneEmpty } from '@/lib/utils';
import { Project, Team } from '@/types/types';

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

const npmInstallReactCode =
  'npm install @markprompt/react @markprompt/css react';

const reactCode = (
  projectKey: string,
  isTestKey: boolean,
  markpromptOptions: MarkpromptOptions,
) => {
  return '';
  //   return `import '@markprompt/css';
  // import './style.css';

  // import * as Markprompt from '@markprompt/react';
  // import { useCallback, useContext, useMemo, type ComponentPropsWithoutRef } from 'react';

  // function Component() {
  //   ${
  //     isTestKey
  //       ? '// Do not share this key publicly.'
  //       : '// Use from a whitelisted domain.'
  //   }
  //   return (
  //     <Markprompt.Root
  //       projectKey="${projectKey}"
  //       iDontKnowMessage="${iDontKnowMessage}"
  //       model="${model}"
  //       promptTemplate={\`${promptTemplate}\`}
  //       temperature={${temperature}}
  //       topP={${topP}}
  //       frequencyPenalty={${frequencyPenalty}}
  //       presencePenalty={${presencePenalty}}
  //       maxTokens={${maxTokens}}
  //       sectionsMatchCount={${sectionsMatchCount}}
  //       sectionsMatchThreshold={${sectionsMatchThreshold}}
  //     >
  //       <Markprompt.Trigger className="MarkpromptTrigger">
  //         <AccessibleIcon.Root label={trigger?.label ?? 'Open Markprompt'}>
  //           <ChatIcon className="MarkpromptChatIcon" width="24" height="24" />
  //         </AccessibleIcon.Root>
  //       </Markprompt.Trigger>

  //       <Markprompt.Portal>
  //         <Markprompt.Overlay className="MarkpromptOverlay" />
  //         <Markprompt.Content className="MarkpromptContent" ${
  //           !includeBranding ? `\n      showBranding={false}` : ''
  //         }>
  //           <Markprompt.Title hide>
  //             Ask me anything about Markprompt
  //           </Markprompt.Title>

  //           <Markprompt.Description hide>
  //             I can answer your questions about Markprompt's client-side
  //             libraries, onboarding, API's and more.
  //           </Markprompt.Description>

  //           <Markprompt.Form className="MarkpromptForm">
  //             <Markprompt.Prompt
  //               className="MarkpromptPrompt"
  //               placeholder="${placeholder}"
  //               labelClassName="MarkpromptPromptLabel"
  //               label={
  //                 <AccessibleIcon.Root label="Your prompt">
  //                   <SearchIcon className="MarkpromptSearchIcon" />
  //                 </AccessibleIcon.Root>
  //               }
  //             />
  //           </Markprompt.Form>

  //           <Markprompt.AutoScroller className="MarkpromptAutoScroller">
  //             <div
  //               className="MarkpromptAnswer"
  //               aria-describedby="markprompt-progressbar"
  //               aria-busy={state === 'preload' || state === 'streaming-answer'}
  //               aria-live="polite"
  //             >
  //               <Caret />
  //               <Markprompt.Answer />
  //             </div>
  //           </Markprompt.AutoScroller>

  //           <References
  //             loadingText="${loadingHeading}"
  //             referencesText="${referencesHeading}"
  //           />

  //           <Markprompt.Close className="MarkpromptClose">
  //             <AccessibleIcon.Root label="Close Markprompt">
  //               <CloseIcon />
  //             </AccessibleIcon.Root>
  //           </Markprompt.Close>
  //         </Markprompt.Content>
  //       </Markprompt.Portal>
  //     </Markprompt.Root>
  //   );
  // }

  // const Caret = () => {
  //   const { answer } = useContext(Markprompt.Context);

  //   if (answer) {
  //     return null;
  //   }

  //   return <span className="caret" />;
  // };

  // const capitalize = (text: string) => {
  //   return text.charAt(0).toUpperCase() + text.slice(1);
  // };

  // const removeFileExtension = (fileName: string) => {
  //   const lastDotIndex = fileName.lastIndexOf('.');
  //   if (lastDotIndex === -1) {
  //     return fileName;
  //   }
  //   return fileName.substring(0, lastDotIndex);
  // };

  // type ReferenceProps = {
  //   transformReferenceId?: (referenceId: string) => {
  //     href: string;
  //     text: string;
  //   };
  //   referenceId: string;
  //   index: number;
  // };

  // const defaultTransformReferenceId = (referenceId: string) => ({
  //   href: removeFileExtension(referenceId),
  //   text: capitalize(removeFileExtension(referenceId.split('/').slice(-1)[0])),
  // });

  // const Reference = (props: ReferenceProps) => {
  //   const {
  //     transformReferenceId = defaultTransformReferenceId,
  //     index,
  //     referenceId,
  //   } = props;

  //   const reference = useMemo(
  //     () => transformReferenceId(referenceId),
  //     [referenceId, transformReferenceId],
  //   );

  //   return (
  //     <li
  //       key={referenceId}
  //       className="MarkpromptReference"
  //       style={{
  //         animationDelay: \`\${100 * index}ms\`,
  //       }}
  //     >
  //       <a href={reference.href}>{reference.text}</a>
  //     </li>
  //   );
  // };

  // type ReferencesProps = {
  //   loadingText?: string;
  //   referencesText?: string;
  //   transformReferenceId?: (referenceId: string) => {
  //     href: string;
  //     text: string;
  //   };
  // };

  // const References = (props: ReferencesProps) => {
  //   const {
  //     loadingText = 'Fetching relevant pages…',
  //     referencesText = 'Answer generated from the following sources:',
  //     transformReferenceId,
  //   } = props;
  //   const { state, references } = useContext(Markprompt.Context);

  //   const ReferenceComponent = useCallback(
  //     (props: { referenceId: string; index: number }) => (
  //       <Reference transformReferenceId={transformReferenceId} {...props} />
  //     ),
  //     [transformReferenceId],
  //   );

  //   if (state === 'indeterminate') return null;

  //   let adjustedState: string = state;
  //   if (state === 'done' && references.length === 0) {
  //     adjustedState = 'indeterminate';
  //   }

  //   return (
  //     <div
  //       data-loading-state={adjustedState}
  //       className="MarkpromptReferences"
  //       role="status"
  //     >
  //       {state === 'preload' && (
  //         <>
  //           <div
  //             className="MarkpromptProgress"
  //             id="markprompt-progressbar"
  //             role="progressbar"
  //             aria-labelledby="markprompt-loading-text"
  //           />
  //           <p id="markprompt-loading-text">{loadingText}</p>
  //         </>
  //       )}

  //       {state !== 'preload' && <p>{referencesText}</p>}

  //       <Markprompt.References ReferenceComponent={ReferenceComponent} />
  //     </div>
  //   );
  // };

  // const ChatIcon = (props: ComponentPropsWithoutRef<'svg'>) => (
  //   <svg
  //     xmlns="http://www.w3.org/2000/svg"
  //     viewBox="0 0 24 24"
  //     fill="none"
  //     stroke="currentColor"
  //     {...props}
  //   >
  //     <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
  //   </svg>
  // );

  // const CloseIcon = (props: ComponentPropsWithoutRef<'svg'>) => (
  //   <svg
  //     xmlns="http://www.w3.org/2000/svg"
  //     viewBox="0 0 24 24"
  //     fill="none"
  //     stroke="currentColor"
  //     {...props}
  //   >
  //     <path d="M18 6 6 18M6 6l12 12" />
  //   </svg>
  // );

  // const SearchIcon = (props: ComponentPropsWithoutRef<'svg'>) => (
  //   <svg
  //     xmlns="http://www.w3.org/2000/svg"
  //     viewBox="0 0 24 24"
  //     fill="none"
  //     stroke="currentColor"
  //     {...props}
  //   >
  //     <circle cx="11" cy="11" r="8" />
  //     <path d="m21 21-4.35-4.35" />
  //   </svg>
  // );

  // export default Component;
  // `.trim();
};

const reactStylesheet = (theme: Theme) => {
  const lightColorKeys = Object.keys(theme.colors.light) as ThemeColorKeys[];
  const darkColorKeys = Object.keys(theme.colors.dark) as ThemeColorKeys[];
  const dimensionKeys = Object.keys(theme.dimensions) as ThemeDimensionKeys[];
  const proseClasses = getProseClassCSS(theme.size || 'sm');
  const rootTextSize = getRootTextSize(theme.size || 'sm');

  return `/* style.css */

:root {
${lightColorKeys
  .map((key) => `  --markprompt-${key}: ${theme.colors.light[key]};`)
  .join('\n')}
${dimensionKeys
  .map((key) => `  --markprompt-${key}: ${theme.dimensions[key]};`)
  .join('\n')}
  --markprompt-text-size: ${rootTextSize};
  --markprompt-button-icon-size: 1rem;
}

@media (prefers-color-scheme: dark) {
  :root {
  ${darkColorKeys
    .map((key) => `  --markprompt-${key}: ${theme.colors.dark[key]};`)
    .join('\n')}
  }
}

[class^='Markprompt'] {
  box-sizing: border-box;



    [class^='Markprompt'] *,
    [class^='Markprompt'] *:before,
    [class^='Markprompt'] *:after
  ) {
  box-sizing: inherit;
}

.MarkpromptTrigger, .MarkpromptClose {
  all: unset;
}

.MarkpromptTrigger {
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

.MarkpromptTrigger:hover {
  opacity: 0.8;
}

.MarkpromptIcon {
  width: 1.25rem;
  height: 1.25rem;
}

.MarkpromptOverlay {
  position: fixed;
  inset: 0;
  animation: fade-in 150ms cubic-bezier(0.16, 1, 0.3, 1);
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
  animation-name: show-content;
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

.MarkpromptForm {
  display: grid;
  grid-template-columns: 3.5rem 1fr 3.5rem;
  border-bottom: 1px solid var(--markprompt-border);
}

.MarkpromptPromptLabel {
  display: grid;
  place-items: center;
  cursor: pointer;
}

.MarkpromptSearchIcon {
  color: var(--markprompt-foreground);
  width: var(--markprompt-button-icon-size);
  height: var(--markprompt-button-icon-size);
}

.MarkpromptTitle {
  margin-block-start: 0;
}

.MarkpromptPrompt {
  border: none;
  width: 100%;
  padding-top: 1rem;
  padding-bottom: 1rem;
  font-size: var(--markprompt-text-size);
  background-color: var(--markprompt-background);
  color: var(--markprompt-foreground);
  caret-color: var(--markprompt-primary);
}

.MarkpromptPrompt::placeholder {
  color: var(--markprompt-mutedForeground);
}

.MarkpromptPrompt:focus {
  outline: none;
}

.MarkpromptAutoScroller {
  height: 100%;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
  scrollbar-width: none;
  overflow-x: hidden;
  overflow-y: auto;
}

.MarkpromptAutoScroller::-webkit-scrollbar {
  display: none;
}

.MarkpromptAnswer {
  color: var(--markprompt-foreground);
  font-size: 0.875rem;
  font-size: var(--markprompt-text-size);
  line-height: 1.7142857;
  padding: 1rem 2rem;
}

${proseClasses}

.MarkpromptCaret {
  display: none;
  height: 1em;
  width: 0.8ch;
  margin-top: 1.1428571em;
  margin-left: 0.2rem;
  transform: translate(2px, 2px);
  border-radius: 1px;
  background-color: var(--markprompt-primary);
  box-shadow: 0 0 3px 0 var(--markprompt-primary);
  animation-name: fade-out;
  animation-duration: 1000ms;
  animation-fill-mode: both;
  animation-iteration-count: infinite;
  transition-timing-function: cubic-bezier(0.14, 0, 0.16, 1);
}

[data-loading-state='preload'] .MarkpromptCaret {
  display: inline-block;
}

[data-loading-state='preload'] .MarkpromptProgress {
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

[data-loading-state='preload'] .MarkpromptProgress {
  opacity: 1;



    [data-loading-state]:not([data-loading-state='preload']) .MarkpromptProgress
  ) {
  opacity: 0;
}

.MarkpromptReferences {
  padding-block: 1rem;
  padding-inline: 2rem;
  background-color: var(--markprompt-muted);
  border-top: 1px solid var(--markprompt-border);
  font-size: 0.75rem;
  color: var(--markprompt-mutedForeground);
  transition: height 500ms ease;
  transform: translateY(100%);
  opacity: 0;
  animation: popup 200ms ease-out forwards;
  width: 100%;
  box-sizing: border-box;
}

.MarkpromptReferences[data-loading-state='preload'] {
  height: 50px;



    .MarkpromptReferences[data-loading-state='streaming-answer'],
    .MarkpromptReferences[data-loading-state='done']
  ) {
  height: 95px;
}

.MarkpromptReferences[data-loading-state='indeterminate'] {
  display: none;
  height: 0;
}

.MarkpromptReferences p {
  animation: fade-in 500ms ease-out forwards 1;
  font-weight: 600;
  margin: 0;
}

.MarkpromptReferences ul {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.5rem;
  padding-left: 0;
  list-style-type: none;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.MarkpromptReferences ul::-webkit-scrollbar {
  display: none;
}

.MarkpromptReference {
  font-size: 0.875rem;
  line-height: 1.5rem;
  animation-name: slide-up;
  animation-duration: 1s;
  animation-fill-mode: both;
  transition-timing-function: ease-in-out;
}

.MarkpromptReference a {
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

.MarkpromptReference a:hover {
  opacity: 0.8;
}

@keyframes show-content {
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

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
  }
  to {
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

const vanillaInstallCode = 'npm install @markprompt/web @markprompt/css';

const vanillaCode = (
  projectKey: string,
  containerId: string,
  markpromptOptions: MarkpromptOptions,
) => {
  return '';
  //   `import '@markprompt/css';
  // import { markprompt } from '@markprompt/web';

  // markprompt(
  //   ${projectKey},
  //   ${container},
  //   {
  //     iDontKnowMessage: ${options.iDontKnowMessage},
  //     model: ${options.model},
  //     promptTemplate: ${options.promptTemplate},
  //     temperature: ${options.temperature},
  //     topP: ${options.topP},
  //     frequencyPenalty: ${options.frequencyPenalty},
  //     presencePenalty: ${options.presencePenalty},
  //     maxTokens: ${options.maxTokens},
  //     sectionsMatchCount: ${options.sectionsMatchCount},
  //     sectionsMatchThreshold: ${options.sectionsMatchThreshold},
  //     prompt: {
  //       placeholder: ${options.placeholder}
  //     },
  //     references: {
  //       loadingText: ${options.loadingText},
  //       referencesText: ${options.referencesText}
  //     }
  //   }
  // );
  // `;
};

// Builds the shortest version of the options to pass to a
// markprompt-js function/component. It only includes values
// that are different from the default options.
const getDiffOptions = (
  projectKey: string,
  containerId: string,
  markpromptOptions: MarkpromptOptions,
) => {
  const serializableMarkpromptOptions =
    toSerializableMarkpromptOptions(markpromptOptions);

  const diffOptions = diff(
    toSerializableMarkpromptOptions(DEFAULT_MARKPROMPT_OPTIONS_GPT4),
    serializableMarkpromptOptions,
  );
  return pruneEmpty({
    projectKey: projectKey,
    container: `#${containerId}`,
    ...diffOptions,
  });
};

const getDiffTheme = (theme: Theme) => {
  return diff(defaultTheme, theme);
};

const getThemeCSS = (theme: Partial<Theme>) => {
  const lightColors = (theme.colors?.light || {}) as Partial<ThemeColors>;
  const darkColors = (theme.colors?.dark || {}) as Partial<ThemeColors>;
  const dimensions = (theme.dimensions || {}) as Partial<ThemeDimensions>;
  const lightColorKeys = Object.keys(lightColors) as ThemeColorKeys[];
  const darkColorKeys = Object.keys(darkColors) as ThemeColorKeys[];
  const dimensionKeys = Object.keys(dimensions) as ThemeDimensionKeys[];
  const rootTextSize = theme.size ? getRootTextSize(theme.size) : undefined;

  let rootCSS = '';
  const lightColorVars = lightColorKeys.map(
    (key) => `--markprompt-${key}: ${lightColors[key]};`,
  );
  const darkColorVars = darkColorKeys.map(
    (key) => `--markprompt-${key}: ${darkColors[key]};`,
  );
  const dimensionVars = dimensionKeys.map(
    (key) => `--markprompt-${key}: ${dimensions[key]};`,
  );

  if (lightColorVars.length > 0) {
    rootCSS += lightColorVars.join('\n') + '\n';
  }
  if (dimensionVars.length > 0) {
    rootCSS += dimensionVars.join('\n') + '\n';
  }
  if (rootTextSize) {
    rootCSS += `--markprompt-text-size: ${rootTextSize}` + '\n';
  }
  rootCSS = rootCSS.trim();

  let fullCSS = '';
  if (rootCSS.length > 0) {
    fullCSS = `:root {
${indentString(rootCSS, 2)}
}\n\n`;
  }

  if (darkColorVars.length > 0) {
    fullCSS += `@media (prefers-color-scheme: dark) {
  :root {
${indentString(darkColorVars.join('\n'), 4)}
  }
}`;
  }

  return fullCSS.trim();
};

const scriptTagInstallCode = (
  projectKey: string,
  containerId: string,
  markpromptOptions: MarkpromptOptions,
  theme: Theme,
) => {
  const diffOptions = getDiffOptions(
    projectKey,
    containerId,
    markpromptOptions,
  );

  const diffTheme: Partial<Theme> = getDiffTheme(theme);
  const themeCSS = getThemeCSS(diffTheme);
  let styleBlock = '';
  if (themeCSS?.length > 0) {
    styleBlock = `\n<!-- Style overrides -->
<style>
${indentString(themeCSS, 2)}
</style>\n`;
  }

  console.log('diffTheme', JSON.stringify(diffTheme, null, 2));

  return `<link rel="stylesheet" href="https://unpkg.com/@markprompt/css@${
    MARKPROMPT_JS_PACKAGE_VERSIONS.css
  }/markprompt.css" />
<script>
  window.markprompt = ${indentString(stringify(diffOptions, null, 2), 4).trim()}
</script>
<script async src="https://unpkg.com/@markprompt/web@${
    MARKPROMPT_JS_PACKAGE_VERSIONS.web
  }/dist/init.js"></script>

<!-- Container for the Markpromt trigger button -->
<div id="${containerId}" />
${styleBlock}`;
};

const getDescription = (
  teamSlug: string,
  projectSlug: string,
  isTestMode: boolean,
  isOnboarding: boolean,
) => {
  if (isTestMode) {
    return (
      <>
        Showing code with your <strong>test</strong> key, which can be used for
        non-public sites, for instance for developing on localhost. Do not share
        code with a test key publicly. For public sites, use a production key
        from a whitelisted domain.
      </>
    );
  } else {
    return (
      <>
        Showing code with your <strong>production</strong> key. Production keys
        can only be used when called from a whitelisted domain. You can add
        whitelisted domains in the{' '}
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
        . For local development, use a test key (toggle &ldquo;Test mode&rdquo;
        above).
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
  const { markpromptOptions, theme } = useConfigContext();
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
          <Dialog.Title className="dialog-title-xl flex flex-none flex-row items-center gap-4">
            <div className="flex-grow truncate">Copy code</div>
            <Button
              variant="plain"
              buttonSize="sm"
              target="_blank"
              href="/docs"
              Icon={Book}
            >
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
            <Tabs.Root className="tabs-root" defaultValue="react">
              <Tabs.List className="tabs-list" aria-label="Get code">
                {/* <Tabs.Trigger className="tabs-trigger" value="vanilla">
                  Script
                </Tabs.Trigger> */}
                <Tabs.Trigger className="tabs-trigger" value="react">
                  React
                </Tabs.Trigger>
                <Tabs.Trigger className="tabs-trigger" value="vanilla">
                  Vanilla JS
                </Tabs.Trigger>
                <Tabs.Trigger className="tabs-trigger" value="scriptTag">
                  Script tag
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content
                className="tabs-content relative w-full max-w-full flex-grow"
                value="react"
              >
                <div className="prose prose-invert absolute inset-x-0 top-4 bottom-0 w-full max-w-full overflow-y-auto py-4">
                  {/* <Note size="sm" type="info" className="mb-4">
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
                  </Note> */}
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
                    code={reactCode(apiKey, testMode, markpromptOptions)}
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
                value="vanilla"
              >
                <div className="prose prose-invert absolute inset-x-0 top-4 bottom-0 w-full max-w-full overflow-y-auto py-4">
                  <h3>Installation</h3>
                  <CodePanel
                    className="w-full"
                    language="markup"
                    code={vanillaInstallCode}
                  />
                  <h3>Usage</h3>
                  <TestKeyNote
                    className="mb-4"
                    team={team}
                    project={project}
                    testMode={testMode}
                    isOnboarding={isOnboarding}
                  />
                  <h4>HTML</h4>
                  <p className="text-sm text-neutral-300">
                    Place a container with id `#markprompt` in your page.
                  </p>
                  <CodePanel
                    className="w-full"
                    language="javascript"
                    code={`<div id="markprompt" />`}
                  />
                  <h4>JavaScript</h4>
                  <p className="text-sm text-neutral-300">
                    In JavaScript, call the code below, which will attach the
                    interactive prompt to the `#markprompt` container.
                  </p>
                  <CodePanel
                    className="w-full"
                    language="javascript"
                    code={vanillaCode(apiKey, 'markprompt', markpromptOptions)}
                  />
                </div>
              </Tabs.Content>
              <Tabs.Content
                className="tabs-content relative w-full max-w-full flex-grow"
                value="scriptTag"
              >
                <div className="prose prose-invert absolute inset-x-0 top-4 bottom-0 w-full max-w-full overflow-y-auto py-4">
                  <h3>Usage</h3>
                  <p className="text-sm text-neutral-300">
                    Add the following tags to your HTML pages.
                  </p>
                  <TestKeyNote
                    className="mb-4"
                    team={team}
                    project={project}
                    testMode={testMode}
                    isOnboarding={isOnboarding}
                  />
                  <CodePanel
                    className="w-full"
                    language="markup"
                    code={scriptTagInstallCode(
                      apiKey,
                      'markprompt',
                      markpromptOptions,
                      theme,
                    )}
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
