import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../theme';
import { Text } from './Text';

interface OTPInputProps {
  code: string;
  setCode: (code: string) => void;
  maximumLength?: number;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  code,
  setCode,
  maximumLength = 6,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const boxArray = new Array(maximumLength).fill(0);

  const handlePress = () => {
    setIsFocused(true);
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const boxDigit = (index: number) => {
    const digit = code[index] || '';

    const isCurrentValue = index === code.length;
    const isLastValue = index === maximumLength - 1;
    const isCodeComplete = code.length === maximumLength;

    const isValueFocused = isCurrentValue || (isLastValue && isCodeComplete);

    return (
      <View
        key={index}
        style={[
          styles.box,
          {
            borderColor: isFocused && isValueFocused ? theme.colors.primary : '#E5DFD3',
            borderWidth: isFocused && isValueFocused ? 2 : 1.5,
            backgroundColor: isFocused && isValueFocused ? '#FFFFFF' : '#FAF8F5',
            borderRadius: theme.borderRadius.md,
          },
        ]}
      >
        {digit ? (
          <Text variant="h2" weight="bold" color={theme.colors.secondary}>
            {digit}
          </Text>
        ) : (
          isFocused && isValueFocused ? (
            <View style={styles.cursor} />
          ) : (
            <View style={styles.placeholderDot} />
          )
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.inputContainer} onPress={handlePress}>
        {boxArray.map((_, index) => boxDigit(index))}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={setCode}
        maxLength={maximumLength}
        keyboardType="number-pad"
        onBlur={handleBlur}
        style={styles.hiddenInput}
        autoFocus
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  box: {
    width: 44,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    // Premium shadow
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cursor: {
    width: 2.5,
    height: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 1,
  },
  placeholderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
