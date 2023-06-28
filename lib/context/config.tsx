/* eslint-disable @typescript-eslint/no-empty-function */
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
} from 'react';

import { ModelConfig } from '@/types/types';

import useProject from '../hooks/use-project';
import { useLocalStorage } from '../hooks/utils/use-localstorage';
import { DEFAULT_PROMPT_TEMPLATE } from '../prompt';
import {
  defaultTheme,
  findMatchingTheme,
  Theme,
  ThemeColorKeys,
  ThemeColors,
} from '../themes';
import { objectEquals } from '../utils';

export type State = {
  theme: Theme;
  colors: ThemeColors;
  isDark: boolean;
  placeholder: string;
  iDontKnowMessage: string;
  referencesHeading: string;
  loadingHeading: string;
  askAILabel: string;
  includeBranding: boolean;
  isInstantSearchEnabled: boolean;
  modelConfig: ModelConfig;
  setColor: (colorKey: ThemeColorKeys, value: string) => void;
  setTheme: (theme: Theme) => void;
  setDark: (dark: boolean) => void;
  setSize: (size: Theme['size']) => void;
  setPlaceholder: (placeholder: string) => void;
  setIDontKnowMessage: (iDontKnowMessage: string) => void;
  setAskAILabel: (askAILabel: string) => void;
  setReferencesHeading: (referencesHeading: string) => void;
  setLoadingHeading: (loadingHeading: string) => void;
  setIncludeBranding: (includeBranding: boolean) => void;
  setInstantSearchEnabled: (isInstantSearchEnabled: boolean) => void;
  setModelConfig: (modelConfig: ModelConfig) => void;
  resetModelConfigDefaults: () => void;
};

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: 'gpt-4',
  temperature: 0.1,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  maxTokens: 500,
  promptTemplate: DEFAULT_PROMPT_TEMPLATE.template,
  sectionsMatchCount: 10,
  sectionsMatchThreshold: 0.5,
};

const initialState: State = {
  theme: defaultTheme,
  colors: defaultTheme.colors.light,
  isDark: false,
  placeholder: '',
  iDontKnowMessage: '',
  referencesHeading: '',
  loadingHeading: '',
  askAILabel: '',
  includeBranding: true,
  isInstantSearchEnabled: false,
  modelConfig: DEFAULT_MODEL_CONFIG,
  setColor: () => {},
  setTheme: () => {},
  setDark: () => {},
  setSize: () => {},
  setPlaceholder: () => {},
  setIDontKnowMessage: () => {},
  setReferencesHeading: () => {},
  setLoadingHeading: () => {},
  setAskAILabel: () => {},
  setIncludeBranding: () => {},
  setInstantSearchEnabled: () => {},
  setModelConfig: () => {},
  resetModelConfigDefaults: () => {},
};

export const isDefaultCustomConfig = (config: ModelConfig) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { model: configModel, ...rest } = config;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { model: defaultModel, ...defaultRest } = initialState.modelConfig || {
    model: undefined,
  };
  return objectEquals(rest, defaultRest);
};

export const CONFIG_DEFAULT_VALUES = {
  placeholder: 'Ask me anything…',
  iDontKnowMessage: 'Sorry, I am not sure how to answer that.',
  referencesHeading: 'Answer generated from the following pages:',
  loadingHeading: 'Fetching relevant pages…',
  askAILabel: 'Ask AI…',
  includeBranding: true,
  isInstantSearchEnabled: false,
  isDark: false,
};

const ConfigContextProvider = (props: PropsWithChildren) => {
  const { project } = useProject();

  const [theme, setTheme] = useLocalStorage<Theme>(
    !project?.id ? null : `${project?.id}:config:theme`,
    defaultTheme,
  );

  const [isDark, setDark] = useLocalStorage<boolean>(
    !project?.id ? null : `${project?.id}:config:model-dark`,
    CONFIG_DEFAULT_VALUES.isDark,
  );

  const [placeholder, setPlaceholder] = useLocalStorage<string>(
    !project?.id ? null : `${project?.id}:config:placeholder`,
    CONFIG_DEFAULT_VALUES.placeholder,
  );

  const [iDontKnowMessage, setIDontKnowMessage] = useLocalStorage<string>(
    !project?.id ? null : `${project?.id}:config:i-dont-know-message`,
    CONFIG_DEFAULT_VALUES.iDontKnowMessage,
  );

  const [referencesHeading, setReferencesHeading] = useLocalStorage<string>(
    !project?.id ? null : `${project?.id}:config:references-heading`,
    CONFIG_DEFAULT_VALUES.referencesHeading,
  );

  const [loadingHeading, setLoadingHeading] = useLocalStorage<string>(
    !project?.id ? null : `${project?.id}:config:loading-heading`,
    CONFIG_DEFAULT_VALUES.loadingHeading,
  );

  const [askAILabel, setAskAILabel] = useLocalStorage<string>(
    !project?.id ? null : `${project?.id}:config:ask-ai-label`,
    CONFIG_DEFAULT_VALUES.askAILabel,
  );

  const [includeBranding, setIncludeBranding] = useLocalStorage<boolean>(
    !project?.id ? null : `${project?.id}:config:include-branding`,
    CONFIG_DEFAULT_VALUES.includeBranding,
  );

  const [isInstantSearchEnabled, setInstantSearchEnabled] =
    useLocalStorage<boolean>(
      !project?.id ? null : `${project?.id}:config:instant-search-enabled`,
      CONFIG_DEFAULT_VALUES.isInstantSearchEnabled,
    );

  const [modelConfig, setModelConfig] = useLocalStorage<
    ModelConfig | undefined
  >(
    !project?.id ? null : `${project?.id}:config:model-config`,
    initialState.modelConfig,
  );

  const updateOrCreateCustomTheme = useCallback(
    (newTheme: Theme) => {
      const found = findMatchingTheme(newTheme);
      if (found) {
        setTheme(found);
      } else {
        setTheme({
          isCustom: true,
          ...newTheme,
        });
      }
    },
    [setTheme],
  );

  const setColor = useCallback(
    (colorKey: ThemeColorKeys, value: string) => {
      if (!theme) {
        return;
      }
      const colors = isDark ? theme.colors.dark : theme.colors.light;
      const updatedTheme = {
        ...theme,
        colors: {
          ...theme.colors,
          [isDark ? 'dark' : 'light']: {
            ...colors,
            [colorKey]: value,
          },
        },
      };
      updateOrCreateCustomTheme(updatedTheme);
    },
    [isDark, theme, updateOrCreateCustomTheme],
  );

  const setSize = useCallback(
    (size: Theme['size']) => {
      if (!theme) {
        return;
      }
      const updatedTheme = { ...theme, size };
      updateOrCreateCustomTheme(updatedTheme);
    },
    [theme, updateOrCreateCustomTheme],
  );

  const resetModelConfigDefaults = useCallback(() => {
    if (!initialState.modelConfig) {
      return;
    }
    setModelConfig(initialState.modelConfig);
  }, [setModelConfig]);

  return (
    <ConfigContext.Provider
      value={{
        theme: theme || defaultTheme,
        isDark: isDark || CONFIG_DEFAULT_VALUES.isDark,
        placeholder: placeholder || CONFIG_DEFAULT_VALUES.placeholder,
        iDontKnowMessage:
          iDontKnowMessage || CONFIG_DEFAULT_VALUES.iDontKnowMessage,
        referencesHeading:
          referencesHeading || CONFIG_DEFAULT_VALUES.referencesHeading,
        loadingHeading: loadingHeading || CONFIG_DEFAULT_VALUES.loadingHeading,
        askAILabel: askAILabel || CONFIG_DEFAULT_VALUES.askAILabel,
        includeBranding: !!includeBranding,
        isInstantSearchEnabled: !!isInstantSearchEnabled,
        modelConfig: modelConfig || initialState.modelConfig,
        colors: isDark
          ? (theme || defaultTheme).colors.dark
          : (theme || defaultTheme).colors.light,
        setTheme: updateOrCreateCustomTheme,
        setColor,
        setDark,
        setSize,
        setPlaceholder,
        setIDontKnowMessage,
        setReferencesHeading,
        setLoadingHeading,
        setAskAILabel,
        setIncludeBranding,
        setInstantSearchEnabled,
        setModelConfig,
        resetModelConfigDefaults,
      }}
      {...props}
    />
  );
};

export const useConfigContext = (): State => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error(
      `useConfigContext must be used within a ConfigContextProvider`,
    );
  }
  return context;
};

export const ConfigContext = createContext<State>(initialState);

ConfigContext.displayName = 'ConfigContext';

export const ManagedConfigContext: FC<PropsWithChildren> = ({ children }) => (
  <ConfigContextProvider>{children}</ConfigContextProvider>
);
