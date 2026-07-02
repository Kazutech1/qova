import { Platform } from 'react-native';

export const typography = {
  fonts: {
    // Heading: Serif
    primary: Platform.select({ ios: 'Playfair Display', android: 'PlayfairDisplay-Bold', default: 'serif' }),
    // Body: Sans-serif
    body: Platform.select({ ios: 'Inter', android: 'Inter-Regular', default: 'sans-serif' }),
  },
  sizes: {
    h1: 40,
    h2: 28,
    h3: 18,
    body: 16,
    caption: 13,
    tiny: 11,
  },
  weights: {
    bold: '700' as const,
    semiBold: '600' as const,
    medium: '500' as const,
    regular: '400' as const,
    light: '300' as const,
  },
};
