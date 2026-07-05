import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../../theme';
import { Text } from './Text';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftComponent?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftComponent,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return theme.colors.outline;
    switch (variant) {
      case 'primary': return theme.colors.primary; // Forest Green
      case 'secondary': return theme.colors.secondary; // Black
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
      default: return theme.colors.secondary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.text.secondary;
    switch (variant) {
      case 'primary': return theme.colors.text.inverse;
      case 'secondary': return theme.colors.text.inverse;
      case 'outline': return theme.colors.primary;
      case 'ghost': return theme.colors.primary;
      default: return theme.colors.text.inverse;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { vertical: 10, horizontal: 16 };
      case 'md': return { vertical: 16, horizontal: 24 };
      case 'lg': return { vertical: 20, horizontal: 32 };
      default: return { vertical: 16, horizontal: 24 };
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          paddingVertical: getPadding().vertical,
          paddingHorizontal: getPadding().horizontal,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: variant === 'outline' ? theme.colors.primary : 'transparent',
          borderRadius: theme.borderRadius.md, // Minimal radius as per UI Kit
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {leftComponent}
          <Text
            variant="body"
            weight="semiBold"
            color={getTextColor()}
            style={textStyle}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
