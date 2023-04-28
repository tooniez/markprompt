import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from 'react';

export type State = {
  uiConfig: any;
  setUIConfig: Dispatch<SetStateAction<any>>;
};

const initialState: State = {
  uiConfig: {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setUIConfig: () => {},
};

const ConfigContextProvider = (props: PropsWithChildren) => {
  const [uiConfig, setUIConfig] = useState({});

  return (
    <ConfigContext.Provider
      value={{
        uiConfig,
        setUIConfig,
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
