import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { Text } from '../src/components/common/Text';
import { Button } from '../src/components/common/Button';
import { Input } from '../src/components/common/Input';
import { BottomSheet } from '../src/components/common/BottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/services/api';

const BackgroundPattern = () => (
  <View style={styles.patternContainer} pointerEvents="none">
    {[...Array(15)].map((_, i) => (
      <View key={`row-${i}`} style={styles.patternRow}>
        {[...Array(10)].map((_, j) => (
          <View key={`dot-${i}-${j}`} style={styles.dot} />
        ))}
      </View>
    ))}
  </View>
);

export default function JoinCircleScreen() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [circleDetails, setCircleDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFind = async () => {
    if (!inviteCode) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCircleByInvite(inviteCode.trim());
      setCircleDetails(response.circle);
      setShowDetails(true);
    } catch (err: any) {
      setError(err.message || 'Failed to find circle. Please verify the invite code.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!inviteCode) return;
    setLoading(true);
    setError(null);
    try {
      await api.joinCircle(inviteCode.trim());
      setShowDetails(false);
      router.push('/(tabs)/home');
    } catch (err: any) {
      setError(err.message || 'Failed to join circle.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundPattern />
      <View style={styles.headerStripe} pointerEvents="none" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <View style={styles.backIconContainer}>
                <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
            
            <Text variant="h1" weight="bold" color={theme.colors.secondary} style={styles.title}>
              Join a Circle.
            </Text>
            <Text variant="body" color={theme.colors.text.secondary}>
              Enter the unique invite code provided by the circle administrator to start savings.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.card}>
              <View style={styles.cardIconRing}>
                <Ionicons name="link" size={22} color={theme.colors.primary} />
              </View>
              
              <Text variant="h2" weight="bold" color={theme.colors.secondary} style={styles.cardTitle}>
                Group Code
              </Text>
              
              <Input
                placeholder="e.g. QX-8829-01"
                value={inviteCode}
                onChangeText={(text) => {
                  setInviteCode(text);
                  if (error) setError(null);
                }}
                autoCapitalize="characters"
                containerStyle={styles.inputContainer}
              />
              
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
                  <Text variant="caption" color={theme.colors.danger} style={styles.errorText}>
                    {error}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
              <Text variant="caption" color={theme.colors.text.secondary} style={styles.infoText}>
                Savings circles require invitations to guarantee members trust score rating and payment compliance.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Button 
              title="Find Circle" 
              onPress={handleFind} 
              loading={loading && !showDetails}
              disabled={!inviteCode || loading}
              variant="primary"
              style={styles.findBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <BottomSheet
        isVisible={showDetails}
        onClose={() => {
          setShowDetails(false);
          setCircleDetails(null);
        }}
        title="Circle Invitation"
      >
        {circleDetails && (
          <View style={styles.sheetContent}>
            <View style={styles.circleHeader}>
              <Text variant="h2" weight="bold" color={theme.colors.secondary}>
                {circleDetails.name}
              </Text>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text variant="tiny" weight="bold" color={theme.colors.primary}>
                  ADMIN: {circleDetails.admin?.name?.toUpperCase() || 'UNKNOWN'}
                </Text>
              </View>
            </View>

            <View style={styles.detailsList}>
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text variant="tiny" weight="bold" color={theme.colors.text.secondary}>CONTRIBUTION</Text>
                  <Text variant="body" weight="bold" color={theme.colors.secondary}>
                    ₦{(circleDetails.contribution_amount / 100).toLocaleString()} / {circleDetails.frequency.charAt(0) + circleDetails.frequency.slice(1).toLowerCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text variant="tiny" weight="bold" color={theme.colors.text.secondary}>SLOTS</Text>
                  <Text variant="body" weight="bold" color={theme.colors.secondary}>
                    {circleDetails.members_count} / {circleDetails.total_slots} Members Joined
                  </Text>
                </View>
              </View>

              <View style={[styles.detailItem, styles.payoutItem]}>
                <View style={[styles.detailIconContainer, styles.payoutIconContainer]}>
                  <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text variant="tiny" weight="bold" color="rgba(255,255,255,0.7)">TOTAL POT PAYOUT</Text>
                  <Text variant="h2" weight="bold" color="#FFFFFF">
                    ₦{((circleDetails.contribution_amount * circleDetails.total_slots) / 100).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <Text variant="caption" color={theme.colors.text.secondary} style={styles.disclaimer}>
              By joining, you agree to make recurring contributions of ₦{(circleDetails.contribution_amount / 100).toLocaleString()} every {circleDetails.frequency.toLowerCase()} until the savings circle cycle completes.
            </Text>

            <Button
              title="Yes, Join Savings Circle"
              onPress={handleConfirmJoin}
              loading={loading}
              style={styles.confirmButton}
            />
            
            <TouchableOpacity 
              onPress={() => {
                setShowDetails(false);
                setCircleDetails(null);
              }} 
              style={styles.cancelButton}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text variant="body" weight="semiBold" color={theme.colors.danger}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
  },
  patternRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginVertical: 15,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
  },
  headerStripe: {
    position: 'absolute',
    top: -220,
    right: -100,
    width: 500,
    height: 380,
    backgroundColor: theme.colors.primary,
    transform: [{ rotate: '25deg' }],
    opacity: 0.08,
    borderRadius: 80,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  header: {
    marginTop: 10,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    marginBottom: theme.spacing.md,
    width: 40,
  },
  backIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.1)',
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  form: {
    flex: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: theme.spacing.xl,
  },
  cardIconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(27, 67, 50, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    marginTop: theme.spacing.md,
    marginBottom: 0,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 67, 50, 0.04)',
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.08)',
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    marginBottom: 20,
  },
  findBtn: {
    height: 56,
    borderRadius: 16,
  },
  sheetContent: {
    paddingVertical: 10,
  },
  circleHeader: {
    marginBottom: theme.spacing.xl,
  },
  adminBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  detailsList: {
    gap: 12,
    marginBottom: theme.spacing.xl,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  payoutItem: {
    backgroundColor: theme.colors.primary,
    borderColor: 'transparent',
  },
  detailIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(27, 67, 50, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  payoutIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  detailTextContainer: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  disclaimer: {
    marginBottom: theme.spacing.xl,
    lineHeight: 18,
    textAlign: 'center',
  },
  confirmButton: {
    height: 56,
    borderRadius: 16,
    marginBottom: theme.spacing.md,
  },
  cancelButton: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: theme.spacing.md,
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    lineHeight: 18,
  },
});
