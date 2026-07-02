import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../../theme';
import { Text } from './Text';

const { height } = Dimensions.get('window');

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  title,
  children,
}) => {
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY }] },
            ]}
          >
            <View style={styles.handle} />
            {title && (
              <View style={styles.header}>
                <Text variant="h3" weight="bold" color={theme.colors.secondary}>
                  {title}
                </Text>
              </View>
            )}
            <View style={styles.content}>{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    paddingBottom: 40,
    minHeight: height * 0.3,
    maxHeight: height * 0.92, // Expanded limit to show more items
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  content: {
    padding: theme.spacing.lg,
  },
});
