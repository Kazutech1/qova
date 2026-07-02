import { colors, darkColors } from './colors';
import { typography } from './typography';

export const theme = {
  colors,
  typography,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    round: 999,
  },
};

export const darkTheme = {
  ...theme,
  colors: darkColors,
};

export type Theme = typeof theme;
export { colors, darkColors, typography };
