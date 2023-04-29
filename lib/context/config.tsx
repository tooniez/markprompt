import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useState,
} from 'react';

import { useLocalStorage } from '../hooks/utils/use-localstorage';
import { defaultTheme, Theme } from '../themes';

export type State = {
  theme: Theme;
  isDark: boolean;
  setTheme: Dispatch<SetStateAction<Theme>>;
  setDark: (dark: boolean) => void;
};

const initialState: State = {
  theme: defaultTheme,
  isDark: false,
  setTheme: () => {
    // Do nothing
  },
  setDark: () => {
    // Do nothing
  },
};

const ConfigContextProvider = (props: PropsWithChildren) => {
  const [theme, setTheme] = useState(defaultTheme);
  const [isDark, setDark] = useLocalStorage<boolean>(
    'playground-model-dark',
    false,
  );

  return (
    <ConfigContext.Provider
      value={{
        theme,
        isDark,
        setTheme,
        setDark,
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
