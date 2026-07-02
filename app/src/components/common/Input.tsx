import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { theme } from '../../theme';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftComponent?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  leftComponent,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="caption" weight="semiBold" color={isFocused ? theme.colors.accent : theme.colors.text.secondary} style={styles.label}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputContainer,
        { borderColor: isFocused ? theme.colors.accent : theme.colors.border },
        error ? styles.inputError : null,
      ]}>
        {leftComponent && (
          <View style={styles.leftComponent}>
            {leftComponent}
          </View>
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.text.secondary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      {error && (
        <Text variant="tiny" color={theme.colors.danger} style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  label: {
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.5,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftComponent: {
    marginRight: 8,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: theme.typography.sizes.body,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fonts.body,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    marginTop: theme.spacing.xs,
  },
});
