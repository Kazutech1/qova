import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { Text } from '../../src/components/common/Text';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePhoneChange = (val: string) => {
    let cleaned = val;
    if (cleaned.startsWith('0')) {
      cleaned = '+234' + cleaned.substring(1);
    }
    setPhone(cleaned);
  };

  const handleContinue = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    try {
      let formattedPhone = phone.trim().replace(/\s+/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+234' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      await api.sendOtp(formattedPhone);
      setLoading(false);
      router.push({
        pathname: '/onboarding/otp',
        params: { phone: formattedPhone }
      });
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Authentication Error', error.message || 'Failed to send OTP. Please try again.');
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
          <View style={styles.header}>
            <Text variant="h2" weight="bold" color={theme.colors.secondary} style={styles.title}>
              Connect your number.
            </Text>
            <Text variant="body" color={theme.colors.text.secondary} style={styles.subtitle}>
              Secure your account and join your first savings circle.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Phone number"
              placeholder="0801 234 5678"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              autoFocus
            />
            
            <View style={styles.infoBox}>
              <Text variant="caption" color={theme.colors.text.secondary} style={styles.infoText}>
                By connecting, you agree to Qova's terms and privacy policy. We use Termii for secure OTP delivery.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Confirm number"
              onPress={handleContinue}
              loading={loading}
              disabled={phone.length < 10}
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
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  infoBox: {
    marginTop: theme.spacing.sm,
  },
  infoText: {
    lineHeight: 18,
  },
  footer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
});
