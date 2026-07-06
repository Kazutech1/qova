import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, Modal, ActivityIndicator, Alert, RefreshControl, Clipboard, Switch, Share, SafeAreaView, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../src/theme';
import { Text } from '../../../src/components/common/Text';
import { Button } from '../../../src/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../../src/services/api';

// react-native-webview has native code — dev builds made before it was added don't
// include it, and with the new architecture a missing native module can throw at
// import time (which makes expo-router drop this route entirely). Load it guarded;
// when unavailable we fall back to the system browser sheet for card checkout.
let NativeWebView: any = null;
try {
  NativeWebView = require('react-native-webview').WebView;
} catch {
  console.log('[Checkout] react-native-webview unavailable — falling back to browser sheet');
}

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
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CARD'>('TRANSFER');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [circle, setCircle] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  const [virtualAccount, setVirtualAccount] = useState<{
    account_number: string;
    bank_name: string;
    account_ref: string;
    amount_kobo: number;
    due_date: string;
  } | null>(null);

  const [mandate, setMandate] = useState<any>(null);
  const [mandateBusy, setMandateBusy] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  // Floating pill randomized bobbing animations
  const animPill1 = useRef(new Animated.Value(0)).current;
  const animPill2 = useRef(new Animated.Value(0)).current;
  const animPill3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBobbing = (val: Animated.Value, duration: number, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 4,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: -4,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createBobbing(animPill1, 2000 + Math.random() * 500, Math.random() * 300);
    const anim2 = createBobbing(animPill2, 2400 + Math.random() * 600, Math.random() * 300);
    const anim3 = createBobbing(animPill3, 1800 + Math.random() * 400, Math.random() * 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  // Pill click handlers for detailed info alerts
  const handleRecipientPillClick = () => {
    const recipientMember = members.find((m: any) => m.turn === currentCycle);
    const reliability = recipientMember?.user?.reliability_score ?? recipientMember?.reliability_score ?? 100;
    const roundPot = ((circle?.total_slots || 0) * (circle?.contribution_amount / 100 || 0)).toLocaleString();

    setCustomAlert({
      visible: true,
      title: "Active Recipient Details",
      message: `Recipient: ${nextRecipientName}\n` +
        `Payout Slot: Round ${currentCycle}\n` +
        `Reliability Trust Score: ${reliability}/100\n\n` +
        `Once this cycle completes, a total pot of ₦${roundPot} will be disbursed directly to this recipient.`,
      icon: "gift",
    });
  };

  const handleDueDatePillClick = () => {
    setCustomAlert({
      visible: true,
      title: "Cycle Deadline Details",
      message: `Contribution Target: ₦${contributionNaira.toLocaleString()}\n` +
        `Next Payout Due Date: ${nextPayoutDateText}\n` +
        `Rotation Frequency: ${circle?.frequency || 'Monthly'}\n\n` +
        `Ensure your payment is made or auto-debit is active before this date to maintain a high Reliability score.`,
      icon: "calendar",
    });
  };

  const handleTurnPillClick = () => {
    const roundPot = ((circle?.total_slots || 0) * (circle?.contribution_amount / 100 || 0)).toLocaleString();
    const userReliability = profile?.reliability_score ?? 100;

    setCustomAlert({
      visible: true,
      title: "Your Payout Slot Details",
      message: `Your Payout Slot: Round ${userPayoutCycle || 'TBD'}\n` +
        `Estimated Date: ${userPayoutDateText}\n` +
        `Expected Disbursal: ₦${roundPot}\n` +
        `Your Reliability Score: ${userReliability}/100\n\n` +
        `When Round ${userPayoutCycle || 'TBD'} is active, the complete circle pot will be payout-disbursed to you!`,
      icon: "ribbon",
    });
  };

  const fetchCircleDetails = async () => {
    if (!id) return;
    try {
      const [circleRes, profileRes, membersRes, mandateRes] = await Promise.all([
        api.getCircle(id),
        api.getProfile().catch(() => null),
        api.getCircleMembers(id).catch(() => ({ members: [] })),
        api.getMandate(id).catch(() => null),
      ]);

      const c = circleRes.circle || circleRes;
      setCircle(c);

      const userProfile = profileRes?.user;
      setProfile(userProfile);

      const fetchedMembers = membersRes.members || [];
      setMembers(fetchedMembers);

      setMandate(mandateRes);

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
    if (!showPaymentScreen || isPaid || !virtualAccount) return;
    let active = true;
    const interval = setInterval(async () => {
      const paid = await checkPaidStatus();
      if (paid && active) {
        setIsPaid(true);
        setIsSuccess(true);
        setShowPaymentScreen(false);
      }
    }, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [showPaymentScreen, isPaid, virtualAccount, profile?.id, id]);

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
        setShowPaymentScreen(false);
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

  // Card: pay this cycle by card and tokenize it so future cycles charge automatically.
  // The Nomba checkout opens in an in-app WebView (card-only page) and auto-closes when
  // it reaches our /payments/callback redirect.
  const [cardBusy, setCardBusy] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const handleCardAutopay = async () => {
    if (!id || cardBusy) return;
    setCardBusy(true);
    try {
      const setup = await api.setupCardAutopay(id);
      if (NativeWebView) {
        setCheckoutUrl(setup.checkout_link); // opens the in-app checkout modal
      } else {
        // Native WebView not in this build — use the system browser sheet instead
        await WebBrowser.openBrowserAsync(setup.checkout_link);
        confirmCardPayment();
      }
    } catch (e: any) {
      Alert.alert('Card AutoPay', e.message || 'Could not start the card payment.');
    } finally {
      setCardBusy(false);
    }
  };

  // After the checkout closes — actively confirm: nudging getCardAutopay makes the
  // backend reconcile the checkout (settles the contribution + captures the token),
  // then we watch the contribution status. Card settlement can take up to ~60s.
  const confirmCardPayment = async () => {
    if (!id) return;
    setCardBusy(true);
    try {
      const deadline = Date.now() + 90_000;
      let paid = false;
      while (Date.now() < deadline) {
        api.getCardAutopay(id).catch(() => null); // reconcile nudge
        paid = await checkPaidStatus();
        if (paid) break;
        await new Promise(r => setTimeout(r, 5_000));
      }

      if (paid) {
        setIsPaid(true);
        setIsSuccess(true);
        setShowPaymentScreen(false);
        await fetchCircleDetails();
      } else {
        Alert.alert(
          'Confirming payment',
          "We haven't seen your card payment yet. If you completed it, this screen will update automatically within a minute.",
        );
      }
    } finally {
      setCardBusy(false);
    }
  };

  // Auto-close the checkout when Nomba redirects to our callback page
  const handleCheckoutNavigation = (navState: { url?: string }) => {
    if (navState.url && navState.url.includes('/payments/callback')) {
      setCheckoutUrl(null);
      confirmCardPayment();
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
      setShowPaymentScreen(false);
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

  // Calculate round gauge rotation based on number of paid contributions in current cycle
  const currentCyclePaidCount = members.filter((m: any) => m.paid).length;
  const targetPotNaira = totalSlots * contributionNaira;
  const currentPotNaira = currentCyclePaidCount * contributionNaira;

  const roundProgressPercent = circle?.status === 'PENDING' ? 0 : (totalSlots > 0 ? (currentCyclePaidCount / totalSlots) : 0);

  // Total saved so far based on backend user_total_contributed, falling back to local math
  const userTotalSentNaira = (circle && typeof circle.user_total_contributed === 'number')
    ? (circle.user_total_contributed / 100)
    : (contributionNaira * (currentCycle - 1 + (isPaid ? 1 : 0)));

  const nextPayoutDateText = circle?.next_payout_date
    ? new Date(circle.next_payout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : circle?.status === 'PENDING' ? 'PENDING' : 'TBD';

  const memberCountText = `${circle?.members_count || 0} ACTIVE`;

  const isAdmin = circle?.admin_id === profile?.id;

  // Next Payout Recipient Calculations
  const nextRecipientId = circle?.payout_order?.[currentCycle - 1];
  const nextRecipientMember = members.find((m: any) => m.user_id === nextRecipientId);
  const nextRecipientName = nextRecipientMember
    ? (nextRecipientMember.user_id === profile?.id ? "You" : (nextRecipientMember.user?.name || nextRecipientMember.name || 'Unknown'))
    : (circle?.status === 'PENDING' ? 'TBD' : 'None');

  // User Specific Next Payout Calculations
  const getCycleExpectedDate = (cycleNumber: number) => {
    const frequencyDays = circle?.frequency === 'WEEKLY' ? 7 : circle?.frequency === 'BIWEEKLY' ? 14 : 30;
    if (circle?.cycle_started_at) {
      const started = new Date(circle.cycle_started_at);
      return new Date(started.getTime() + (cycleNumber - 1) * frequencyDays * 24 * 60 * 60 * 1000);
    }
    const baseDate = circle?.start_date ? new Date(circle.start_date) : new Date();
    return new Date(baseDate.getTime() + (cycleNumber - 1) * frequencyDays * 24 * 60 * 60 * 1000);
  };

  const userPayoutIndex = circle?.payout_order?.indexOf(profile?.id);
  const userPayoutCycle = userPayoutIndex !== -1 && userPayoutIndex !== undefined ? userPayoutIndex + 1 : null;
  const userMember = members.find((m: any) => m.user_id === profile?.id);
  const hasReceivedPayout = userMember?.has_received_payout || false;

  let userPayoutDateText = 'TBD';
  if (circle?.status === 'PENDING') {
    userPayoutDateText = 'PENDING';
  } else if (userPayoutCycle) {
    if (hasReceivedPayout || userPayoutCycle < currentCycle) {
      userPayoutDateText = 'RECEIVED';
    } else {
      const userPayoutDate = getCycleExpectedDate(userPayoutCycle);
      userPayoutDateText = userPayoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  const handleToggleAutoDebit = async (next: boolean) => {
    if (!id || mandateBusy) return;
    setMandateBusy(true);
    try {
      if (next) {
        const res = await api.enableAutoDebit(id);
        setMandate({
          status: 'PENDING_ACTIVATION',
          activation_note: res.activation_note,
        });
        Alert.alert(
          'Auto-Debit Requested',
          res.activation_note ||
          'To authorize auto-debit, perform a one-time ₦50 verification transfer to the validation bank account. Activation can take up to 72 hours.',
        );
      } else {
        await api.disableAutoDebit(id);
        setMandate(null);
        Alert.alert('Auto-Debit Off', 'Your contributions will no longer be collected automatically.');
      }
      await fetchCircleDetails();
    } catch (e: any) {
      Alert.alert('Auto-Debit Error', e.message || 'Could not update auto-debit.');
    } finally {
      setMandateBusy(false);
    }
  };

  const handleShare = async () => {
    if (!circle?.invite_code) return;
    try {
      await Share.share({
        message: `Join my Qova savings circle! Use my invite code: ${circle.invite_code}`,
      });
    } catch (e) {
      console.warn('[Share] Share failed:', e);
    }
  };

  const activeSlotIndex = selectedSlotIndex !== null
    ? selectedSlotIndex
    : (currentCycle > 0 ? (currentCycle - 1) : 0);
  const activeSlotNumber = activeSlotIndex + 1;
  const activeMember = members.find((m: any) => m.turn === activeSlotNumber);

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
        {/* AJO CIRCLE SECTION */}
        <View style={styles.gaugeSection}>
          <View style={styles.ajoCircleContainer}>
            {/* Outer Dashed Track */}
            <View style={styles.ajoCircleTrack} />

            {/* Floating Pills with Bobbing Animation */}
            {circle?.status === 'ACTIVE' && (
              <>
                <Animated.View style={[styles.pillPositionContainer, styles.pillRecipient, { transform: [{ translateY: animPill1 }] }]}>
                  <TouchableOpacity
                    style={styles.floatingPill}
                    activeOpacity={0.85}
                    onPress={handleRecipientPillClick}
                  >
                    <Ionicons name="gift" size={12} color={theme.colors.primary} />
                    <Text variant="tiny" weight="bold" color={theme.colors.secondary} style={styles.pillText}>
                      {nextRecipientName} (Round {currentCycle})
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[styles.pillPositionContainer, styles.pillDueDate, { transform: [{ translateY: animPill2 }] }]}>
                  <TouchableOpacity
                    style={styles.floatingPill}
                    activeOpacity={0.85}
                    onPress={handleDueDatePillClick}
                  >
                    <Ionicons name="calendar" size={12} color={theme.colors.primary} />
                    <Text variant="tiny" weight="bold" color={theme.colors.secondary} style={styles.pillText}>
                      Due: {nextPayoutDateText}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[styles.pillPositionContainer, styles.pillTurn, { transform: [{ translateY: animPill3 }] }]}>
                  <TouchableOpacity
                    style={styles.floatingPill}
                    activeOpacity={0.85}
                    onPress={handleTurnPillClick}
                  >
                    <Ionicons name="ribbon" size={12} color={theme.colors.primary} />
                    <Text variant="tiny" weight="bold" color={theme.colors.secondary} style={styles.pillText}>
                      Your Turn: Round {userPayoutCycle || 'TBD'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}

            {/* Background Watermark Info */}
            <View style={styles.circleBgInfoContainer} pointerEvents="none">
              <Text variant="tiny" weight="bold" color="rgba(27, 67, 50, 0.05)" style={styles.circleBgLabelTop}>
                {(circle?.frequency || 'MONTHLY').toUpperCase()} CYCLE
              </Text>
              <Text variant="tiny" weight="bold" color="rgba(27, 67, 50, 0.05)" style={styles.circleBgLabelBottom}>
                TARGET ₦{((totalSlots || 0) * contributionNaira).toLocaleString()}
              </Text>
            </View>

            {/* Slots */}
            {[...Array(totalSlots || 1)].map((_, i) => {
              const slotNum = i + 1;
              const angle = (i * 2 * Math.PI) / (totalSlots || 1) - Math.PI / 2;
              const radius = 88;
              const centerX = 120;
              const centerY = 120;
              const slotSize = 36;
              const halfSlot = slotSize / 2;
              const x = centerX + radius * Math.cos(angle) - halfSlot;
              const y = centerY + radius * Math.sin(angle) - halfSlot;

              const member = members.find((m: any) => m.turn === slotNum);
              const isSelected = activeSlotIndex === i;
              const isCurrentRecipient = slotNum === currentCycle;
              const isUser = member?.user_id === profile?.id;

              let slotBg = '#FFFFFF';
              let borderColor = theme.colors.border;
              let borderStyle: 'solid' | 'dashed' = 'solid';
              let borderWidth = 1.5;

              if (member) {
                if (member.paid) {
                  borderColor = theme.colors.success;
                  slotBg = 'rgba(45, 106, 79, 0.06)';
                } else {
                  borderColor = isCurrentRecipient ? theme.colors.warning : theme.colors.danger;
                  slotBg = isCurrentRecipient ? 'rgba(212, 163, 115, 0.05)' : 'rgba(188, 71, 73, 0.04)';
                }

                if (isCurrentRecipient) {
                  borderWidth = 2.5;
                  if (!member.paid) {
                    borderColor = theme.colors.warning;
                  }
                }

                if (isSelected) {
                  borderColor = theme.colors.primary;
                  borderWidth = 2.5;
                }
              } else {
                borderStyle = 'dashed';
                borderColor = 'rgba(0,0,0,0.2)';
                slotBg = 'transparent';
              }

              return (
                <TouchableOpacity
                  key={`slot-${i}`}
                  style={[
                    styles.slotNode,
                    {
                      left: x,
                      top: y,
                      width: slotSize,
                      height: slotSize,
                      borderRadius: halfSlot,
                      backgroundColor: slotBg,
                      borderColor: borderColor,
                      borderStyle: borderStyle,
                      borderWidth: borderWidth,
                    }
                  ]}
                  onPress={() => setSelectedSlotIndex(i)}
                  activeOpacity={0.8}
                >
                  {member ? (
                    <Text variant="tiny" weight="bold" color={isUser ? theme.colors.primary : theme.colors.text.primary} style={{ fontSize: 10 }}>
                      {(member.user?.name || member.name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </Text>
                  ) : (
                    <Ionicons name="add" size={14} color="rgba(0,0,0,0.3)" />
                  )}

                  {/* Recipient Badge */}
                  {isCurrentRecipient && (
                    <View style={styles.recipientCrown}>
                      <Ionicons name="gift" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Center content */}
            <View style={styles.ajoCircleCenter}>
              <Text variant="tiny" weight="bold" color={theme.colors.text.secondary} style={styles.liquidityLabel}>
                ROUND POT
              </Text>
              <Text variant="h2" weight="bold" color={theme.colors.secondary} numberOfLines={1} adjustsFontSizeToFit style={styles.potAmountCenter}>
                ₦{currentPotNaira.toLocaleString()}
              </Text>
              <View style={styles.cycleBadge}>
                <Text variant="tiny" weight="bold" color={theme.colors.primary}>
                  {circle?.status === 'PENDING' ? 'PENDING' : `ROUND ${currentCycle}/${totalSlots}`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SELECTED SLOT CARD */}
        <View style={styles.selectedSlotCard}>
          {activeMember ? (
            <View style={styles.slotCardContent}>
              <View style={styles.slotCardHeader}>
                <View style={styles.slotAvatar}>
                  <Text variant="body" weight="bold" color={theme.colors.primary}>
                    {activeSlotNumber}
                  </Text>
                </View>
                <View style={styles.slotDetails}>
                  <View style={styles.slotNameRow}>
                    <Text variant="body" weight="bold" color={theme.colors.secondary} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {activeMember.user?.name || activeMember.name}
                    </Text>
                    {activeMember.user_id === circle?.admin_id && (
                      <View style={styles.adminTag}>
                        <Text variant="tiny" weight="bold" color="#FFFFFF">ADMIN</Text>
                      </View>
                    )}
                  </View>
                  <Text variant="tiny" color={theme.colors.text.secondary}>
                    Slot {activeSlotNumber} • Payout Turn {activeSlotNumber}
                  </Text>
                </View>
                <View style={styles.slotStatusBadge}>
                  {activeMember.paid ? (
                    <View style={styles.smallPaidBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={theme.colors.primary} />
                      <Text variant="tiny" weight="bold" color={theme.colors.primary} style={{ marginLeft: 2 }}>PAID</Text>
                    </View>
                  ) : (
                    <View style={styles.smallPendingBadge}>
                      <Text variant="tiny" weight="bold" color={theme.colors.text.secondary}>PENDING</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.slotCardSeparator} />

              <View style={styles.slotCardFooter}>
                <View style={styles.scoreMetric}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.primary} />
                  <Text variant="tiny" color={theme.colors.text.secondary} style={{ marginLeft: 6 }}>
                    Trust Score:{' '}
                    <Text variant="tiny" weight="bold" color={theme.colors.primary}>
                      {activeMember.user?.reliability_score ?? 100}/100
                    </Text>
                  </Text>
                </View>

                {activeSlotNumber === currentCycle && circle?.status === 'ACTIVE' && (
                  <View style={styles.recipientIndicator}>
                    <Ionicons name="gift-outline" size={14} color={theme.colors.warning} />
                    <Text variant="tiny" weight="bold" color={theme.colors.warning} style={{ marginLeft: 4 }}>
                      ACTIVE RECIPIENT
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.emptySlotContent}>
              <Ionicons name="people-outline" size={28} color="rgba(0,0,0,0.2)" />
              <View style={styles.emptySlotText}>
                <Text variant="body" weight="bold" color={theme.colors.secondary}>Slot {activeSlotNumber} is Available</Text>
                <Text variant="tiny" color={theme.colors.text.secondary}>
                  Share the invite code to invite a friend to this slot.
                </Text>
              </View>
              <TouchableOpacity style={styles.shareSlotBtn} onPress={handleShare} activeOpacity={0.8}>
                <Text variant="tiny" weight="bold" color="#FFFFFF">SHARE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AUTO-DEBIT CARD */}
        {circle?.status === 'ACTIVE' && (
          <View style={styles.mandateCard}>
            <View style={styles.mandateHeader}>
              <View style={styles.mandateTitleRow}>
                <Ionicons name="shield-checkmark" size={22} color={theme.colors.primary} />
                <View style={{ marginLeft: 10 }}>
                  <Text variant="body" weight="bold" color={theme.colors.secondary}>
                    Automated Contributions
                  </Text>
                  <Text variant="tiny" color={theme.colors.text.secondary}>
                    Direct bank auto-debit collection
                  </Text>
                </View>
              </View>
              {mandateBusy ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleToggleAutoDebit(!mandate || !['ACTIVE', 'PENDING_ACTIVATION'].includes(mandate.status))}
                  style={[
                    styles.customToggleContainer,
                    (!!mandate && ['ACTIVE', 'PENDING_ACTIVATION'].includes(mandate.status)) ? styles.customToggleOn : styles.customToggleOff
                  ]}
                >
                  <View style={[
                    styles.customToggleCircle,
                    (!!mandate && ['ACTIVE', 'PENDING_ACTIVATION'].includes(mandate.status)) ? styles.customToggleCircleOn : styles.customToggleCircleOff
                  ]} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.mandateCardSeparator} />

            {!mandate ? (
              <View style={styles.mandateInfo}>
                <Text variant="tiny" color={theme.colors.text.secondary} style={{ lineHeight: 16 }}>
                  Skip manual bank transfers! Enable Auto-Debit to automatically pay your ₦{contributionNaira.toLocaleString()} contribution each cycle.
                </Text>
              </View>
            ) : mandate.status === 'PENDING_ACTIVATION' ? (
              <View style={styles.mandatePendingInfo}>
                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={14} color={theme.colors.warning} />
                  <Text variant="tiny" weight="bold" color={theme.colors.warning} style={{ marginLeft: 6 }}>
                    VERIFICATION PENDING
                  </Text>
                </View>
                <Text variant="tiny" color={theme.colors.text.secondary} style={{ marginTop: 8, lineHeight: 16 }}>
                  Authorize your mandate by making a one-time ₦50 verification transfer to the validation account below:
                </Text>

                <View style={styles.mandateBankDetails}>
                  <Text variant="body" weight="bold" color={theme.colors.secondary} style={{ textAlign: 'center', lineHeight: 22 }}>
                    {mandate.activation_note || 'Send ₦50 to validation account.'}
                  </Text>
                </View>

                <View style={styles.mandateActionRow}>
                  <TouchableOpacity
                    style={styles.mandateCopyBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      const match = mandate.activation_note?.match(/\b\d{10}\b/);
                      const acct = match ? match[0] : '';
                      if (acct) {
                        Clipboard.setString(acct);
                        Alert.alert('Copied', 'Validation account number copied!');
                      } else {
                        Clipboard.setString(mandate.activation_note || '');
                        Alert.alert('Copied', 'Verification info copied!');
                      }
                    }}
                  >
                    <Ionicons name="copy-outline" size={14} color={theme.colors.primary} />
                    <Text variant="tiny" weight="bold" color={theme.colors.primary} style={{ marginLeft: 6 }}>
                      Copy Number
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mandateRefreshBtn}
                    activeOpacity={0.8}
                    onPress={async () => {
                      setMandateBusy(true);
                      await fetchCircleDetails();
                      setMandateBusy(false);
                    }}
                  >
                    <Ionicons name="sync-outline" size={14} color={theme.colors.primary} />
                    <Text variant="tiny" weight="bold" color={theme.colors.primary} style={{ marginLeft: 6 }}>
                      Verify Transfer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : mandate.status === 'ACTIVE' ? (
              <View style={styles.mandateActiveInfo}>
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.success} />
                  <Text variant="tiny" weight="bold" color={theme.colors.success} style={{ marginLeft: 6 }}>
                    AUTO-DEBIT SECURED
                  </Text>
                </View>
                <Text variant="tiny" color={theme.colors.text.secondary} style={{ marginTop: 8, lineHeight: 16 }}>
                  Contributions will be collected automatically. Next collection is scheduled for{' '}
                  <Text variant="tiny" weight="bold" color={theme.colors.secondary}>
                    {nextPayoutDateText}
                  </Text>.
                </Text>
              </View>
            ) : (
              <View style={styles.mandateInfo}>
                <Text variant="tiny" color={theme.colors.text.secondary}>
                  Auto-debit status: {mandate.status}. Enable to reactivate collections.
                </Text>
              </View>
            )}
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
            <TouchableOpacity style={styles.stickyPayButton} activeOpacity={0.9} onPress={() => setShowPaymentScreen(true)}>
              <Text variant="caption" weight="bold" color="#FFFFFF">CONTRIBUTE</Text>
              <View style={styles.payArrow}>
                <Ionicons name="arrow-up" size={16} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* CUSTOM ALERT MODAL */}
      <Modal
        visible={customAlert.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomAlert(prev => ({ ...prev, visible: false }))}
      >
        <TouchableOpacity
          style={styles.alertOverlay}
          activeOpacity={1}
          onPress={() => setCustomAlert(prev => ({ ...prev, visible: false }))}
        >
          <TouchableOpacity
            style={styles.alertBox}
            activeOpacity={1}
          >
            {customAlert.icon && (
              <View style={styles.alertIconWrapper}>
                <Ionicons name={customAlert.icon as any} size={28} color={theme.colors.primary} />
              </View>
            )}
            <Text variant="h3" weight="bold" color={theme.colors.secondary} style={styles.alertTitle}>
              {customAlert.title}
            </Text>
            <Text variant="body" color={theme.colors.text.secondary} style={styles.alertMessage}>
              {customAlert.message}
            </Text>
            <Button
              title="Got it"
              onPress={() => setCustomAlert(prev => ({ ...prev, visible: false }))}
              variant="primary"
              style={styles.alertCloseBtn}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* FULL SCREEN PAYMENT MODAL */}
      <Modal
        visible={showPaymentScreen}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowPaymentScreen(false)}
      >
        <SafeAreaView style={styles.paymentContainer}>
          {/* Header */}
          <View style={styles.paymentHeader}>
            <TouchableOpacity
              style={styles.paymentBackBtn}
              onPress={() => setShowPaymentScreen(false)}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.secondary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text variant="h3" weight="bold" color={theme.colors.secondary}>Payment Option</Text>
              <Text variant="tiny" color={theme.colors.text.secondary}>Select your contribution payment method</Text>
            </View>
          </View>

          {/* Amount Area */}
          <View style={styles.paymentAmountCard}>
            <Text variant="tiny" weight="bold" color={theme.colors.text.secondary} style={{ letterSpacing: 1.5 }}>
              TOTAL AMOUNT DUE
            </Text>
            <Text variant="h1" weight="bold" color={theme.colors.primary} style={styles.paymentAmountVal}>
              ₦{contributionNaira.toLocaleString()}.00
            </Text>
            <Text variant="tiny" color={theme.colors.text.secondary}>
              Circle: {circle?.name} • Round {currentCycle}
            </Text>
          </View>

          {/* Segmented Tab Selector */}
          <View style={styles.paymentTabContainer}>
            <TouchableOpacity
              style={[
                styles.paymentTab,
                paymentMethod === 'TRANSFER' && styles.paymentTabActive
              ]}
              onPress={() => setPaymentMethod('TRANSFER')}
            >
              <Ionicons
                name="business-outline"
                size={18}
                color={paymentMethod === 'TRANSFER' ? '#FFFFFF' : theme.colors.text.secondary}
              />
              <Text
                variant="body"
                weight="bold"
                color={paymentMethod === 'TRANSFER' ? '#FFFFFF' : theme.colors.text.secondary}
                style={{ marginLeft: 8 }}
              >
                Bank Transfer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentTab,
                paymentMethod === 'CARD' && styles.paymentTabActive
              ]}
              onPress={() => setPaymentMethod('CARD')}
            >
              <Ionicons
                name="card-outline"
                size={18}
                color={paymentMethod === 'CARD' ? '#FFFFFF' : theme.colors.text.secondary}
              />
              <Text
                variant="body"
                weight="bold"
                color={paymentMethod === 'CARD' ? '#FFFFFF' : theme.colors.text.secondary}
                style={{ marginLeft: 8 }}
              >
                Debit Card
              </Text>
            </TouchableOpacity>
          </View>

          {/* Payment Method Content */}
          <ScrollView
            contentContainerStyle={styles.paymentMethodScroll}
            showsVerticalScrollIndicator={false}
          >
            {paymentMethod === 'TRANSFER' ? (
              <View style={styles.transferTabContent}>
                <Text variant="body" color={theme.colors.text.secondary} style={styles.methodDesc}>
                  Make a transfer of the exact amount from your bank app. The funds will settle immediately.
                </Text>

                <View style={styles.paymentAccountCard}>
                  <View style={styles.paymentAccountRow}>
                    <View>
                      <Text variant="tiny" color="rgba(255,255,255,0.7)">BANK NAME</Text>
                      <Text variant="body" weight="bold" color="#FFFFFF">
                        {virtualAccount?.bank_name || 'Generating...'}
                      </Text>
                    </View>
                    <Ionicons name="business" size={24} color="rgba(255,255,255,0.5)" />
                  </View>

                  <View style={styles.paymentAccountRow}>
                    <View>
                      <Text variant="tiny" color="rgba(255,255,255,0.7)">ACCOUNT NUMBER</Text>
                      <Text variant="h2" weight="bold" color="#FFFFFF">
                        {virtualAccount?.account_number || 'Generating...'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.paymentCopyBtn} onPress={handleCopy}>
                      <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.paymentAccountRow}>
                    <View>
                      <Text variant="tiny" color="rgba(255,255,255,0.7)">ACCOUNT NAME</Text>
                      <Text variant="body" weight="bold" color="#FFFFFF">
                        QOVA: {(circle?.name || '').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <Button
                  title={confirming ? "CONFIRMING..." : "I HAVE SENT THE MONEY"}
                  onPress={handleConfirmReal}
                  variant="primary"
                  disabled={confirming || !virtualAccount}
                  style={styles.paymentConfirmBtn}
                />

                <TouchableOpacity
                  style={styles.paymentSimulateBtn}
                  onPress={handleSimulate}
                  disabled={submittingPayment || confirming}
                >
                  <Text variant="caption" weight="bold" color={theme.colors.text.secondary}>
                    {submittingPayment ? 'SIMULATING...' : 'Simulate Bank Transfer (dev)'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardTabContent}>
                <Text variant="body" color={theme.colors.text.secondary} style={styles.methodDesc}>
                  Make your contribution securely using your debit card. We support Visa, Mastercard, and Verve card payments.
                </Text>

                <View style={styles.cardInfoBox}>
                  <View style={styles.cardLogoRow}>
                    <Ionicons name="card" size={24} color={theme.colors.primary} />
                    <Text variant="tiny" weight="bold" color={theme.colors.text.secondary} style={{ marginLeft: 'auto' }}>
                      SECURED BY NOMBA
                    </Text>
                  </View>
                  <Text variant="body" weight="bold" color={theme.colors.secondary} style={{ marginTop: 15 }}>
                    Secured Payment Gateway
                  </Text>
                  <Text variant="tiny" color={theme.colors.text.secondary} style={{ marginTop: 4, lineHeight: 15 }}>
                    Transactions are processed securely by Nomba. Your card details are never stored on our servers.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.paymentConfirmBtn, styles.cardSubmitBtn]}
                  activeOpacity={0.85}
                  onPress={handleCardAutopay}
                  disabled={cardBusy || confirming}
                >
                  {cardBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="card" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text variant="body" weight="bold" color="#FFFFFF">
                        PAY BY CARD ₦{contributionNaira.toLocaleString()}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* IN-APP CARD CHECKOUT (Nomba hosted, card-only) */}
      <Modal
        visible={!!checkoutUrl}
        animationType="slide"
        onRequestClose={() => { setCheckoutUrl(null); confirmCardPayment(); }}
      >
        <View style={styles.checkoutContainer}>
          <View style={styles.checkoutHeader}>
            <View>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>Secure Card Payment</Text>
              <Text variant="tiny" color={theme.colors.text.secondary}>Processed by Nomba — card details never touch Qova</Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutCloseBtn}
              onPress={() => { setCheckoutUrl(null); confirmCardPayment(); }}
            >
              <Ionicons name="close" size={22} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>
          {checkoutUrl && NativeWebView && (
            <NativeWebView
              source={{ uri: checkoutUrl }}
              onNavigationStateChange={handleCheckoutNavigation}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.checkoutLoading}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text variant="tiny" color={theme.colors.text.secondary} style={{ marginTop: 12 }}>
                    Opening secure checkout…
                  </Text>
                </View>
              )}
              style={{ flex: 1 }}
            />
          )}
        </View>
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
  ajoCircleContainer: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  ajoCircleTrack: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.03)',
    borderStyle: 'dashed',
  },
  slotNode: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  recipientCrown: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.warning,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  ajoCircleCenter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  potAmountCenter: {
    fontSize: 20,
    lineHeight: 24,
    marginVertical: 4,
  },
  liquidityLabel: {
    letterSpacing: 2,
    marginBottom: 2,
  },
  selectedSlotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  slotCardContent: {
    width: '100%',
  },
  slotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotDetails: {
    flex: 1,
    marginLeft: 12,
  },
  slotNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminTag: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotStatusBadge: {
    alignItems: 'flex-end',
  },
  smallPaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 106, 79, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  smallPendingBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slotCardSeparator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 12,
  },
  slotCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 163, 115, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptySlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    width: '100%',
  },
  emptySlotText: {
    flex: 1,
    marginLeft: 12,
  },
  shareSlotBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  mandateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  mandateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mandateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mandateInfo: {
    marginTop: 4,
  },
  mandatePendingInfo: {
    marginTop: 6,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 163, 115, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mandateBankDetails: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  refreshMandateBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  mandateActiveInfo: {
    marginTop: 6,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 106, 79, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
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
  statsCard: {
    backgroundColor: theme.colors.surface,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsCol: {
    flex: 1,
  },
  dividerLine: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  earningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  earningTitle: {
    marginLeft: 6,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    width: (width - 52) / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 125,
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
  gaugeSubtitle: {
    marginTop: 15,
    fontFamily: theme.typography.fonts.body,
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
  paymentContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  paymentBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  paymentAmountCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  paymentAmountVal: {
    fontSize: 36,
    lineHeight: 44,
    marginVertical: 8,
  },
  paymentTabContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  paymentTab: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  paymentTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  paymentMethodScroll: {
    padding: 20,
  },
  methodDesc: {
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  paymentAccountCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    padding: 20,
    gap: 20,
    marginBottom: 24,
  },
  paymentAccountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentCopyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentConfirmBtn: {
    height: 56,
    borderRadius: 20,
  },
  paymentSimulateBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  transferTabContent: {
    width: '100%',
  },
  cardTabContent: {
    width: '100%',
  },
  cardInfoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 24,
  },
  cardLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSubmitBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  pillPositionContainer: {
    position: 'absolute',
    zIndex: 100,
  },
  floatingPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  pillRecipient: {
    top: -10,
    left: -20,
  },
  pillDueDate: {
    top: 50,
    right: -45,
  },
  pillTurn: {
    bottom: -5,
    left: -30,
  },
  pillText: {
    fontSize: 9,
  },
  circleBgInfoContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.03)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  circleBgLabelTop: {
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(27, 67, 50, 0.08)',
  },
  circleBgLabelBottom: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(27, 67, 50, 0.08)',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  alertIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    marginBottom: 10,
    textAlign: 'center',
  },
  alertMessage: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  alertCloseBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
  },
  customToggleContainer: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  customToggleOn: {
    backgroundColor: theme.colors.primary,
  },
  customToggleOff: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  customToggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  customToggleCircleOn: {
    alignSelf: 'flex-end',
  },
  customToggleCircleOff: {
    alignSelf: 'flex-start',
  },
  mandateCardSeparator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 16,
  },
  mandateActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  mandateCopyBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mandateRefreshBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(27, 67, 50, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  checkoutCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
