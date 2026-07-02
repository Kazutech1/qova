import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface AppTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'tiny';
  weight?: keyof typeof theme.typography.weights;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const Text: React.FC<AppTextProps> = ({
  variant = 'body',
  weight = 'regular',
  color = theme.colors.text.primary,
  align = 'left',
  style,
  children,
  ...props
}) => {
  const isHeading = variant === 'h1' || variant === 'h2';
  
  return (
    <RNText
      style={[
        {
          fontSize: theme.typography.sizes[variant],
          fontWeight: theme.typography.weights[weight],
          color: color,
          textAlign: align,
          fontFamily: isHeading ? theme.typography.fonts.primary : theme.typography.fonts.body,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
