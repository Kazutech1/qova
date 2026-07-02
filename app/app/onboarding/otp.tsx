import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../../src/theme';
import { Text } from '../../src/components/common/Text';
import { Button } from '../../src/components/common/Button';
import { OTPInput } from '../../src/components/common/OTPInput';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

export default function OTPScreen() {
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    try {
      if (!phone) {
        throw new Error('Phone number is missing. Please go back and re-enter.');
      }
      await api.verifyOtp(phone, otp);
      setLoading(false);
      router.push('/onboarding/profile');
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Verification Error', error.message || 'Invalid or expired OTP. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    try {
      await api.sendOtp(phone);
      setTimer(60);
      Alert.alert('OTP Sent', 'A new verification code has been sent.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend code.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.secondary} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarWrapper}>
              <View style={[styles.progressBar, { width: '66%', backgroundColor: theme.colors.primary }]} />
            </View>
            <Text variant="tiny" weight="bold" color={theme.colors.text.secondary} style={styles.progressText}>
              STEP 2 OF 3
            </Text>
          </View>

          {/* Shield Lock Visual Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Ionicons name="shield-checkmark" size={32} color={theme.colors.primary} />
            </View>
          </View>

          <View style={styles.header}>
            <Text variant="h2" weight="bold" color={theme.colors.secondary} style={styles.title}>
              Verify your identity.
            </Text>
            <Text variant="body" color={theme.colors.text.secondary} style={styles.subtitle}>
              We've sent a 6-digit security code to your number.
            </Text>
          </View>

          <View style={styles.form}>
            <OTPInput
              code={otp}
              setCode={setOtp}
              maximumLength={6}
            />
            
            <View style={styles.resendContainer}>
              {timer > 0 ? (
                <Text variant="caption" color={theme.colors.text.secondary}>
                  Resend in <Text variant="caption" weight="bold">{timer}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text variant="caption" weight="bold" color={theme.colors.primary}>
                    Resend code
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Verify & continue"
              onPress={handleVerify}
              loading={loading}
              disabled={otp.length < 6}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    padding: theme.spacing.lg,
    marginTop: Platform.OS === 'ios' ? 0 : 20,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    paddingTop: 0,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  progressBarWrapper: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5DFD3',
    flex: 1,
    marginRight: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    letterSpacing: 1,
  },
  iconContainer: {
    alignItems: 'flex-start',
    marginVertical: theme.spacing.md,
  },
  iconBackground: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5DFD3',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 20,
  },
  resendContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  footer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
});
