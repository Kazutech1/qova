import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, Modal, ActivityIndicator, Alert, RefreshControl, Clipboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../src/theme';
import { Text } from '../../../src/components/common/Text';
import { Button } from '../../../src/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/services/api';

const { width, height } = Dimensions.get('window');
const GAUGE_SIZE = 240;

const BackgroundPattern = () => (
  <View style={styles.patternContainer} pointerEvents="none">
    {[...Array(10)].map((_, i) => (
      <View key={`row-${i}`} style={styles.patternRow}>
        {[...Array(8)].map((_, j) => (
          <View key={`dot-${i}-${j}`} style={styles.dot} />
        ))}
      </View>
    ))}
  </View>
);

export default function CircleOverview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [circle, setCircle] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isPaid, setIsPaid] = useState(false);

  const [virtualAccount, setVirtualAccount] = useState<{
    account_number: string;
    bank_name: string;
    account_ref: string;
    amount_kobo: number;
    due_date: string;
  } | null>(null);

  const fetchCircleDetails = async () => {
    if (!id) return;
    try {
      const [circleRes, profileRes] = await Promise.all([
        api.getCircle(id),
        api.getProfile().catch(() => null),
      ]);

      const c = circleRes.circle || circleRes;
      setCircle(c);

      const userProfile = profileRes?.user;
      setProfile(userProfile);

      if (c.status === 'ACTIVE') {
        const contribRes = await api.getContributions(id).catch(() => ({ contributions: [] }));
        const userContrib = contribRes?.contributions?.find((contrib: any) => contrib.user_id === userProfile?.id);
        const currentlyPaid = userContrib?.status === 'PAID';
        setIsPaid(currentlyPaid);

        // Pre-fetch virtual payment details if unpaid
        if (!currentlyPaid) {
          try {
            const payRes = await api.payContribution(id);
            setVirtualAccount(payRes);
          } catch (e: any) {
            console.log('[payContribution] Failed to fetch/create virtual account:', e.message);
            if (e.message?.includes('You have already paid for this cycle')) {
              setIsPaid(true);
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[CircleOverview] Failed to load circle details:', e.message);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchCircleDetails();
      setLoading(false);
    }
    init();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCircleDetails();
    setRefreshing(false);
  };

  const handleStartCircle = async () => {
    if (!id) return;
    Alert.alert(
      'Start Circle',
      'Are you sure you want to start this savings circle? This will anchor the contribution orders and request payment from all members.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start', 
          onPress: async () => {
            setLoading(true);
            try {
              await api.startCircle(id);
              Alert.alert('Success', 'Savings circle started successfully!');
              await fetchCircleDetails();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to start circle');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Checks the backend for the webhook-driven PAID status of the current user's contribution
  const checkPaidStatus = async (): Promise<boolean> => {
    if (!id || !profile?.id) return false;
    try {
      const contribRes = await api.getContributions(id);
      const userContrib = contribRes?.contributions?.find((c: any) => c.user_id === profile.id);
      return userContrib?.status === 'PAID';
    } catch {
      return false;
    }
  };

  // Background poll while the deposit sheet is open — a real transfer flips this to PAID
  useEffect(() => {
    if (!showModal || isPaid || !virtualAccount) return;
    let active = true;
    const interval = setInterval(async () => {
      const paid = await checkPaidStatus();
      if (paid && active) {
        setIsPaid(true);
        setIsSuccess(true);
        setShowModal(false);
      }
    }, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [showModal, isPaid, virtualAccount, profile?.id, id]);

  // Real transfer: "I have sent the money" verifies by polling the contribution status
  const handleConfirmReal = async () => {
    if (!virtualAccount) {
      Alert.alert('Error', 'No virtual payment account generated.');
      return;
    }
    setConfirming(true);
    try {
      const deadline = Date.now() + 40000; // ~40s of active polling
      let paid = false;
      while (Date.now() < deadline) {
        paid = await checkPaidStatus();
        if (paid) break;
        await new Promise(r => setTimeout(r, 4000));
      }
      if (paid) {
        setIsPaid(true);
        setIsSuccess(true);
        setShowModal(false);
      } else {
        Alert.alert(
          'Still confirming',
          "We haven't seen your transfer yet. Bank transfers can take a minute — this screen will update automatically once it lands.",
        );
      }
    } finally {
      setConfirming(false);
    }
  };

  // Dev-only: force the payment through the simulate endpoint
  const handleSimulate = async () => {
    if (!virtualAccount) {
      Alert.alert('Error', 'No virtual payment account generated.');
      return;
    }
    setSubmittingPayment(true);
    try {
      await api.simulatePayment(virtualAccount.account_ref);
      setIsSuccess(true);
      setShowModal(false);
      await fetchCircleDetails();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Payment simulation failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCopy = () => {
    if (virtualAccount?.account_number) {
      Clipboard.setString(virtualAccount.account_number);
      Alert.alert('Copied', 'Account number copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isSuccess) {
    const contributionVal = circle ? (circle.contribution_amount / 100).toLocaleString() : '50,000';
    return (
      <View style={styles.successContainer}>
        <BackgroundPattern />
        <View style={styles.successContent}>
          <View style={styles.successIconOuter}>
            <View style={styles.successIconInner}>
              <Ionicons name="checkmark" size={48} color="#FFFFFF" />
            </View>
          </View>
          <Text variant="h1" weight="bold" color={theme.colors.secondary} style={styles.successTitle}>
            Payment Received!
          </Text>
          <Text variant="body" color={theme.colors.text.secondary} style={styles.successSub}>
            Your contribution of ₦{contributionVal} has been added to your pot.
          </Text>
          <View style={styles.successBadge}>
            <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
            <Text variant="tiny" weight="bold" color={theme.colors.primary} style={{ marginLeft: 6 }}>
              +5 RELIABILITY POINTS
            </Text>
          </View>
          <Button 
            title="BACK TO DETAILS" 
            onPress={() => setIsSuccess(false)} 
            variant="primary"
            style={styles.doneButton}
          />
        </View>
      </View>
    );
  }

  const contributionNaira = circle ? (circle.contribution_amount / 100) : 0;
  const totalPotNaira = circle ? circle.total_pot / 100 : 0;
  const currentCycle = circle?.current_cycle || 0;
  const totalSlots = circle?.total_slots || 0;
  
  // Calculate round gauge rotation
  const progressPercent = totalSlots > 0 ? (circle?.status === 'PENDING' ? 0 : currentCycle / totalSlots) : 0.4;
  
  // Total saved so far based on cycles completed + active payments
  const totalSavedNaira = circle ? contributionNaira * (currentCycle - 1 + (isPaid ? 1 : 0)) : 0;

  const nextPayoutDateText = circle?.next_payout_date
    ? new Date(circle.next_payout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : circle?.status === 'PENDING' ? 'PENDING' : 'TBD';

  const memberCountText = `${circle?.members_count || 0} ACTIVE`;

  const isAdmin = circle?.admin_id === profile?.id;

  return (
    <View style={styles.container}>
      <BackgroundPattern />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* SEMI-CIRCLE GAUGE SECTION */}
        <View style={styles.gaugeSection}>
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeTrack} />
            <View style={[
              styles.gaugeProgress, 
              { transform: [{ rotate: `${-180 + (progressPercent * 180)}deg` }] }
            ]} />
            
            <View style={styles.liquidityContent}>
              <Text variant="tiny" weight="bold" color={theme.colors.text.secondary} style={styles.liquidityLabel}>
                CURRENT POOL
              </Text>
              <Text variant="h1" weight="bold" color={theme.colors.secondary} style={styles.potAmount}>
                ₦{totalPotNaira.toLocaleString()}
              </Text>
              <View style={styles.cycleBadge}>
                <Text variant="tiny" weight="bold" color={theme.colors.primary}>
                  {circle?.status === 'PENDING' ? 'PENDING START' : `ROUND ${currentCycle}/${totalSlots}`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CONTRIBUTION STATUS & OVERFLOW POT */}
        {circle?.status === 'ACTIVE' && (
          <View style={[styles.potStatusContainer, isPaid && styles.paidStatusContainer]}>
            {isPaid && (
              <View style={styles.paidBadgeFloating}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text variant="tiny" weight="bold" color="#FFFFFF" style={{ marginLeft: 4 }}>ROUND CLEARED</Text>
              </View>
            )}
            
            <View style={styles.statusHeader}>
              <Text variant="caption" weight="bold" color={isPaid ? "#FFFFFF" : theme.colors.text.secondary}>
                YOUR CONTRIBUTION STATUS
              </Text>
              {!isPaid && (
                <View style={styles.unpaidBadge}>
                  <Text variant="tiny" weight="bold" color={theme.colors.danger}>ACTION REQUIRED</Text>
                </View>
              )}
            </View>

            <View style={styles.potDisplayRow}>
              <View style={styles.potBox}>
                <View style={[styles.potVisual, isPaid && styles.paidPotVisual]}>
                  <View style={[styles.potFill, { height: '100%', backgroundColor: isPaid ? theme.colors.primary : theme.colors.secondary }]} />
                  <Ionicons name={isPaid ? "ribbon" : "wallet"} size={24} color="#FFFFFF" />
                </View>
                <Text variant="tiny" weight="bold" color={isPaid ? "#FFFFFF" : theme.colors.secondary}>ROUND {currentCycle}</Text>
                <Text variant="tiny" color={isPaid ? "rgba(255,255,255,0.7)" : theme.colors.text.secondary}>
                  {isPaid ? "FULLY PAID" : "PENDING"}
                </Text>
              </View>

              <View style={styles.potConnector}>
                <Ionicons name="chevron-forward" size={16} color={isPaid ? "rgba(255,255,255,0.3)" : theme.colors.border} />
              </View>

              <View style={styles.potBox}>
                <View style={[styles.potVisual, styles.overflowPot, isPaid && { borderColor: 'rgba(255,255,255,0.2)' }]}>
                  <View style={[styles.potFill, { height: '0%', backgroundColor: isPaid ? '#FFFFFF' : theme.colors.primary, opacity: isPaid ? 0.4 : 0.8 }]} />
                  <Ionicons name="lock-closed-outline" size={18} color={isPaid ? "rgba(255,255,255,0.5)" : theme.colors.border} />
                </View>
                <Text variant="tiny" weight="bold" color={isPaid ? "#FFFFFF" : theme.colors.secondary}>ROUND {Math.min(currentCycle + 1, totalSlots)}</Text>
                <Text variant="tiny" color={isPaid ? "rgba(255,255,255,0.7)" : theme.colors.text.secondary}>LOCKED</Text>
              </View>
            </View>
          </View>
        )}

        {/* PENDING CIRCLE ADMIN CALLOUT */}
        {circle?.status === 'PENDING' && (
          <View style={styles.pendingCallout}>
            <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>Group Setup Pending</Text>
              <Text variant="tiny" color={theme.colors.text.secondary}>
                {isAdmin 
                  ? 'All members join using the invite code. Tap "START SAVINGS CIRCLE" below when ready to activate contributions.'
                  : 'Waiting for the group administrator to anchor slots and launch this savings circle.'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.earningsCard}>
            <View style={styles.earningHeader}>
              <Ionicons name="trending-up" size={16} color={theme.colors.primary} />
              <Text variant="tiny" weight="bold" color={theme.colors.primary} style={styles.earningTitle}>
                YOUR SAVINGS PROGRESS
              </Text>
            </View>
            <Text variant="h2" weight="bold" color={theme.colors.secondary}>
              ₦{totalSavedNaira.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.gridCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.secondary} />
            </View>
            <Text variant="tiny" color={theme.colors.text.secondary}>NEXT PAYOUT</Text>
            <Text variant="body" weight="bold" color={theme.colors.secondary}>
              {nextPayoutDateText.toUpperCase()}
            </Text>
          </View>
          <View style={styles.gridCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="people-outline" size={18} color={theme.colors.secondary} />
            </View>
            <Text variant="tiny" color={theme.colors.text.secondary}>PARTICIPANTS</Text>
            <Text variant="body" weight="bold" color={theme.colors.secondary}>
              {memberCountText}
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* STICKY FLOATING ACTION BAR */}
      <View style={styles.stickyActionContainer}>
        {circle?.status === 'PENDING' ? (
          isAdmin ? (
            <TouchableOpacity 
              style={[styles.fullWidthButton, { backgroundColor: theme.colors.primary }]} 
              activeOpacity={0.9} 
              onPress={handleStartCircle}
            >
              <Text variant="caption" weight="bold" color="#FFFFFF">START SAVINGS CIRCLE</Text>
              <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.fullWidthButton, styles.disabledBtn]}>
              <Text variant="caption" weight="bold" color="rgba(0,0,0,0.3)">WAITING FOR LAUNCH</Text>
              <Ionicons name="time-outline" size={16} color="rgba(0,0,0,0.3)" style={{ marginLeft: 8 }} />
            </View>
          )
        ) : circle?.status === 'ACTIVE' && isPaid ? (
          <View style={[styles.fullWidthButton, styles.disabledBtn]}>
            <Text variant="caption" weight="bold" color="rgba(0,0,0,0.4)">ROUND CLEARED</Text>
            <Ionicons name="checkmark-done-circle" size={18} color="rgba(0,0,0,0.4)" style={{ marginLeft: 8 }} />
          </View>
        ) : circle?.status === 'ACTIVE' && !isPaid ? (
          <View style={styles.actionBlur}>
            <View style={styles.amountInputContainer}>
              <Text variant="tiny" color={theme.colors.text.secondary}>AMOUNT DUE</Text>
              <View style={styles.inputRow}>
                <Text variant="body" weight="bold" color={theme.colors.secondary}>₦</Text>
                <Text variant="h3" weight="bold" color={theme.colors.secondary}>
                  {contributionNaira.toLocaleString()}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.stickyPayButton} activeOpacity={0.9} onPress={() => setShowModal(true)}>
              <Text variant="caption" weight="bold" color="#FFFFFF">CONTRIBUTE</Text>
              <View style={styles.payArrow}>
                <Ionicons name="arrow-up" size={16} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* CONTRIBUTION BOTTOM SHEET (MODAL) */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity 
            style={styles.bottomSheet} 
            activeOpacity={1}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <Text variant="h2" weight="bold" color={theme.colors.secondary}>Deposit Funds</Text>
              <Text variant="body" color={theme.colors.text.secondary}>Transfer the exact amount to the circle bank account below.</Text>
            </View>

            <View style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View>
                  <Text variant="tiny" color="rgba(255,255,255,0.7)">BANK NAME</Text>
                  <Text variant="body" weight="bold" color="#FFFFFF">
                    {virtualAccount?.bank_name || 'Generating...'}
                  </Text>
                </View>
                <Ionicons name="business" size={24} color="rgba(255,255,255,0.5)" />
              </View>
              <View style={styles.accountRow}>
                <View>
                  <Text variant="tiny" color="rgba(255,255,255,0.7)">ACCOUNT NUMBER</Text>
                  <Text variant="h2" weight="bold" color="#FFFFFF">
                    {virtualAccount?.account_number || 'Generating...'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.accountRow}>
                <View>
                  <Text variant="tiny" color="rgba(255,255,255,0.7)">ACCOUNT NAME</Text>
                  <Text variant="body" weight="bold" color="#FFFFFF">
                    QOVA: {(circle?.name || '').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.amountBadge}>
              <Text variant="tiny" color={theme.colors.text.secondary}>AMOUNT TO SEND</Text>
              <Text variant="h3" weight="bold" color={theme.colors.secondary}>
                ₦{contributionNaira.toLocaleString()}.00
              </Text>
            </View>

            <Button
              title={confirming ? "CONFIRMING..." : "I HAVE SENT THE MONEY"}
              onPress={handleConfirmReal}
              variant="primary"
              disabled={confirming || !virtualAccount}
              style={styles.confirmButton}
            />
            <TouchableOpacity style={styles.cancelButton} onPress={handleSimulate} disabled={submittingPayment || confirming}>
              <Text variant="caption" weight="bold" color={theme.colors.text.secondary}>
                {submittingPayment ? 'SIMULATING...' : 'Simulate payment (dev)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
              <Text variant="caption" weight="bold" color={theme.colors.text.secondary}>CANCEL</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 200,
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
  },
  patternRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  dot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#000',
  },
  gaugeSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  gaugeContainer: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  gaugeTrack: {
    position: 'absolute',
    top: 0,
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    borderRadius: GAUGE_SIZE / 2,
    borderWidth: 12,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  gaugeProgress: {
    position: 'absolute',
    top: 0,
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    borderRadius: GAUGE_SIZE / 2,
    borderWidth: 12,
    borderColor: theme.colors.primary,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  liquidityContent: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  liquidityLabel: {
    letterSpacing: 2,
    marginBottom: 2,
  },
  potAmount: {
    fontSize: 32,
    lineHeight: 32,
    marginBottom: 4,
  },
  cycleBadge: {
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  potStatusContainer: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  paidStatusContainer: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  paidBadgeFloating: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  unpaidBadge: {
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  potDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 10,
  },
  potBox: {
    alignItems: 'center',
    gap: 6,
  },
  potVisual: {
    width: 60,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  paidPotVisual: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  overflowPot: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  potFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.secondary,
    opacity: 0.8,
  },
  potConnector: {
    paddingTop: 10,
  },
  statsRow: {
    marginBottom: 20,
  },
  earningsCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningTitle: {
    marginLeft: 6,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  gridCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  stickyActionContainer: {
    position: 'absolute',
    bottom: 105,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  fullWidthButton: {
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  disabledBtn: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionBlur: {
    backgroundColor: '#FFFFFF',
    borderRadius: 35,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  amountInputContainer: {
    flex: 1,
    paddingLeft: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stickyPayButton: {
    backgroundColor: theme.colors.primary,
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: height * 0.6,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    marginBottom: 15,
  },
  accountCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    padding: 20,
    gap: 20,
    marginBottom: 24,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountBadge: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmButton: {
    height: 60,
    borderRadius: 20,
  },
  cancelButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  successContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successContent: {
    alignItems: 'center',
    width: '100%',
  },
  successIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(27, 67, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    marginBottom: 12,
  },
  successSub: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 40,
  },
  doneButton: {
    width: '100%',
    height: 60,
    borderRadius: 20,
  },
  bottomSpacer: {
    height: 120,
  },
  pendingCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 67, 50, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.15)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
});
