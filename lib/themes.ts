export type ThemeColors = {
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
  primaryHighlight: string;
  secondaryHighlight: string;
  ring: string;
};

type ThemeDimensions = {
  radius: number;
};

export type ThemeColorKeys = keyof ThemeColors;
export type ThemeDimensionKeys = keyof ThemeDimensions;

export type Theme = {
  name: string;
  isCustom?: boolean;
  size?: 'sm' | 'base';
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  dimensions: ThemeDimensions;
};

export const defaultTheme: Theme = {
  name: 'Default',
  size: 'sm',
  colors: {
    light: {
      background: '#FFFFFF',
      foreground: '#171717',
      muted: '#FAFAFA',
      mutedForeground: '#737373',
      border: '#E5E5E5',
      input: '#FFFFFF',
      primary: '#6366f1',
      primaryForeground: '#FFFFFF',
      secondary: '#FAFAFA',
      secondaryForeground: '#171717',
      primaryHighlight: '#EC4899',
      secondaryHighlight: '#A855F7',
      ring: '#0EA5E9',
    },
    dark: {
      background: '#050505',
      foreground: '#D4D4D4',
      muted: '#171717',
      mutedForeground: '#737373',
      border: '#262626',
      input: '#FFFFFF',
      primary: '#6366f1',
      primaryForeground: '#FFFFFF',
      secondary: '#0E0E0E',
      secondaryForeground: '#FFFFFF',
      primaryHighlight: '#EC4899',
      secondaryHighlight: '#A855F7',
      ring: '#FFFFFF',
    },
  },
  dimensions: {
    radius: 8,
  },
};

const tealTheme: Theme = {
  name: 'Teal',
  size: 'sm',
  colors: {
    light: {
      background: '#FFFFFF',
      foreground: '#FFFFFF',
      muted: '#FFFFFF',
      mutedForeground: '#FFFFFF',
      border: '#FFFFFF',
      input: '#FFFFFF',
      primary: '#FFFFFF',
      primaryForeground: '#FFFFFF',
      secondary: '#FFFFFF',
      secondaryForeground: '#FFFFFF',
      primaryHighlight: '#EC4899',
      secondaryHighlight: '#A855F7',
      ring: '#FFFFFF',
    },
    dark: {
      background: '#FFFFFF',
      foreground: '#FFFFFF',
      muted: '#FFFFFF',
      mutedForeground: '#FFFFFF',
      border: '#FFFFFF',
      input: '#FFFFFF',
      primary: '#FFFFFF',
      primaryForeground: '#FFFFFF',
      secondary: '#FFFFFF',
      secondaryForeground: '#FFFFFF',
      primaryHighlight: '#EC4899',
      secondaryHighlight: '#A855F7',
      ring: '#FFFFFF',
    },
  },
  dimensions: {
    radius: 8,
  },
};

export const getTheme = (name: string): Theme | undefined => {
  return defaultThemes.find((theme) => theme.name === name);
};

const colorsEqual = (colors: ThemeColors, otherColors: ThemeColors) => {
  const keys = Object.keys(colors) as ThemeColorKeys[];
  if (keys.length !== Object.keys(otherColors).length) {
    return false;
  }

  for (const key of keys) {
    if (colors[key].toLowerCase() !== otherColors[key].toLowerCase()) {
      return false;
    }
  }

  return true;
};

const dimensionsEqual = (
  dimensions: ThemeDimensions,
  otherDimensions: ThemeDimensions,
) => {
  const keys = Object.keys(dimensions) as ThemeDimensionKeys[];
  if (keys.length !== Object.keys(otherDimensions).length) {
    return false;
  }

  for (const key of keys) {
    if (dimensions[key] !== otherDimensions[key]) {
      return false;
    }
  }

  return true;
};

export const findMatchingTheme = (themeValues: Omit<Theme, 'name'>) => {
  return defaultThemes.find((t) => {
    return (
      t.size === themeValues.size &&
      colorsEqual(t.colors.light, themeValues.colors.light) &&
      colorsEqual(t.colors.dark, themeValues.colors.dark) &&
      dimensionsEqual(t.dimensions, themeValues.dimensions)
    );
  });
};

export const defaultThemes = [defaultTheme, tealTheme];
