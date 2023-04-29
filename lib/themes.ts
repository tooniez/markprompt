type ThemeColors = {
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  ring: string;
};

type ThemeDimensions = {
  radius: number;
};

export type Theme = {
  name: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  dimensions: ThemeDimensions;
};

export const defaultTheme: Theme = {
  name: 'Default',
  colors: {
    light: {
      background: '#ffffff',
      foreground: '#ff00ff',
      muted: '#ffffff',
      mutedForeground: '#f0ff0f',
      border: '#f0de0f',
      input: '#ffffff',
      primary: '#ffffff',
      primaryForeground: '#ffffff',
      secondary: '#ffffff',
      secondaryForeground: '#ffffff',
      ring: '#ffffff',
    },
    dark: {
      background: '#ffffff',
      foreground: '#ffffff',
      muted: '#ffffff',
      mutedForeground: '#ffffff',
      border: '#ffffff',
      input: '#ffffff',
      primary: '#ffffff',
      primaryForeground: '#ffffff',
      secondary: '#ffffff',
      secondaryForeground: '#ffffff',
      ring: '#ffffff',
    },
  },
  dimensions: {
    radius: 5,
  },
};

const tealTheme: Theme = {
  name: 'Teal',
  colors: {
    light: {
      background: '#ffffff',
      foreground: '#ffffff',
      muted: '#ffffff',
      mutedForeground: '#ffffff',
      border: '#ffffff',
      input: '#ffffff',
      primary: '#ffffff',
      primaryForeground: '#ffffff',
      secondary: '#ffffff',
      secondaryForeground: '#ffffff',
      ring: '#ffffff',
    },
    dark: {
      background: '#ffffff',
      foreground: '#ffffff',
      muted: '#ffffff',
      mutedForeground: '#ffffff',
      border: '#ffffff',
      input: '#ffffff',
      primary: '#ffffff',
      primaryForeground: '#ffffff',
      secondary: '#ffffff',
      secondaryForeground: '#ffffff',
      ring: '#ffffff',
    },
  },
  dimensions: {
    radius: 5,
  },
};

export const getTheme = (name: string): Theme | undefined => {
  return themes.find((theme) => theme.name === name);
};

export const themes = [defaultTheme, tealTheme];
