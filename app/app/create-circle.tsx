import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { Text } from '../src/components/common/Text';
import { Button } from '../src/components/common/Button';
import { Input } from '../src/components/common/Input';
import { BottomSheet } from '../src/components/common/BottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { api, getToken } from '../src/services/api';

export default function CreateCircleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [createdCircle, setCreatedCircle] = useState<{ id: string; name: string; invite_code: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'Weekly',
    slots: '',
    payoutOrder: 'Auto',
    startCondition: 'Auto'
  });

  const handleShareCode = async () => {
    if (!createdCircle) return;
    try {
      await Share.share({
        message: `Join my savings group "${createdCircle.name}" on Qova! Enter this invite code: ${createdCircle.invite_code}`,
      });
    } catch (e: any) {
      console.warn('Share failed:', e.message);
    }
  };

  // Validate auth session on mount (catches hot-reloads where storage falls back to memory)
  useEffect(() => {
    async function checkAuth() {
      const token = await getToken();
      if (!token) {
        Alert.alert('Session Expired', 'Please verify your phone number to continue.');
        router.replace('/onboarding/phone');
      }
    }
    checkAuth();
  }, []);

  const showConfirm = () => {
    // Validate inputs
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter a group name.');
      return;
    }
    const cleanAmount = formData.amount.replace(/,/g, '');
    const amountVal = parseFloat(cleanAmount);
    if (!cleanAmount || isNaN(amountVal) || amountVal <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid payment amount.');
      return;
    }
    const slotsVal = parseInt(formData.slots);
    if (!formData.slots || isNaN(slotsVal) || slotsVal <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid number of members.');
      return;
    }

    setShowConfirmSheet(true);
  };

  const handleCreateCircle = async () => {
    setShowConfirmSheet(false);
    const cleanAmount = formData.amount.replace(/,/g, '');
    const amountVal = parseFloat(cleanAmount);
    const slotsVal = parseInt(formData.slots);
    const koboAmount = Math.round(amountVal * 100);

    let apiFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' = 'WEEKLY';
    if (formData.frequency === 'Bi-weekly') {
      apiFrequency = 'BIWEEKLY';
    } else if (formData.frequency === 'Monthly') {
      apiFrequency = 'MONTHLY';
    }

    const payoutOrderType = formData.payoutOrder.toUpperCase() as 'AUTO' | 'MANUAL';
    const startCondition = formData.startCondition.toUpperCase() as 'AUTO' | 'MANUAL';

    setLoading(true);
    try {
      const result = await api.createCircle({
        name: formData.name,
        contribution_amount: koboAmount,
        frequency: apiFrequency,
        total_slots: slotsVal,
        payout_order_type: payoutOrderType,
        start_condition: startCondition,
      });

      setLoading(false);
      setCreatedCircle(result); // Set the circle details state to trigger the Success Screen view
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Creation Failed', error.message || 'Something went wrong. Please check your inputs.');
    }
  };

  const frequencies = ['Weekly', 'Bi-weekly', 'Monthly'];
  const payoutOptions = ['Auto', 'Manual'];
  const startOptions = ['Auto', 'Manual'];

  const formatCurrency = (val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    if (!cleanVal) return '';
    return cleanVal.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleAmountChange = (val: string) => {
    const formatted = formatCurrency(val);
    setFormData({ ...formData, amount: formatted });
  };

  const calculateTotalPayout = () => {
    const amount = parseInt(formData.amount.replace(/,/g, '')) || 0;
    const slots = parseInt(formData.slots) || 0;
    return (amount * slots).toLocaleString();
  };

  if (createdCircle) {
    const amountVal = parseFloat(formData.amount.replace(/,/g, '')) || 0;
    const slotsVal = parseInt(formData.slots) || 0;
    const totalPayoutVal = (amountVal * slotsVal).toLocaleString();

    return (
      <SafeAreaView style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="checkmark-circle" size={80} color={theme.colors.primary} />
          </View>
          
          <Text variant="h1" weight="bold" color={theme.colors.secondary} align="center" style={styles.successTitle}>
            Circle Created!
          </Text>
          <Text variant="body" color={theme.colors.text.secondary} align="center" style={styles.successSubtitle}>
            Your group has been successfully registered. Share the code below with your members to start saving.
          </Text>

          <View style={styles.successCard}>
            <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.cardSectionTitle}>
              INVITE CODE
            </Text>
            <View style={styles.codeShareBox}>
              <Text variant="h2" weight="bold" color={theme.colors.primary} style={styles.inviteCodeText}>
                {createdCircle.invite_code}
              </Text>
            </View>

            <View style={styles.successDivider} />

            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Group Name</Text>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>{createdCircle.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Contribution</Text>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>₦{formData.amount} / person</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Frequency</Text>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>{formData.frequency.toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Slots (Members)</Text>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>{formData.slots} People</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Total Loop Pot</Text>
              <Text variant="body" weight="bold" color={theme.colors.primary}>₦{totalPayoutVal}</Text>
            </View>
          </View>

          <Button
            title="Share Invite Code"
            onPress={handleShareCode}
            leftComponent={<Ionicons name="share-social" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
            style={styles.shareBtn}
          />

          <Button
            title="Go to Dashboard"
            onPress={() => router.replace('/(tabs)/home')}
            variant="outline"
            style={styles.dashboardBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <View style={styles.backIconContainer}>
                <Ionicons name="arrow-back" size={20} color={theme.colors.secondary} />
              </View>
            </TouchableOpacity>
            <Text variant="h1" weight="bold" color={theme.colors.secondary} style={styles.title}>
              Start a Group.
            </Text>
            <Text variant="body" color={theme.colors.text.secondary}>
              Follow these simple steps to set up your new savings circle.
            </Text>
          </View>

          {/* Section 1: About the group */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}><Text variant="tiny" weight="bold" color="#FFFFFF">1</Text></View>
              <Text variant="caption" weight="bold" color={theme.colors.text.secondary}>ABOUT THE GROUP</Text>
            </View>
            
            <Input
              label="What is the group name?"
              placeholder="e.g. Family Savings"
              value={formData.name}
              onChangeText={(val) => setFormData({...formData, name: val})}
            />
            
            <Input
              label="How much will each person pay?"
              placeholder="0.00"
              keyboardType="number-pad"
              value={formData.amount}
              onChangeText={handleAmountChange}
              leftComponent={
                <Text variant="body" weight="bold" color={theme.colors.secondary}>₦</Text>
              }
            />

            <View style={styles.fieldGroup}>
              <Text variant="caption" weight="semiBold" color={theme.colors.text.secondary} style={styles.fieldLabel}>
                How often should they pay?
              </Text>
              <View style={styles.selectorRow}>
                {frequencies.map(f => (
                  <TouchableOpacity 
                    key={f} 
                    style={[styles.selectorItem, formData.frequency === f && styles.selectorActive]}
                    onPress={() => setFormData({...formData, frequency: f})}
                  >
                    <Text variant="caption" weight="bold" color={formData.frequency === f ? '#FFFFFF' : theme.colors.text.secondary}>
                      {f.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input
              label="How many people are in the group?"
              placeholder="e.g. 10"
              keyboardType="number-pad"
              value={formData.slots}
              onChangeText={(val) => setFormData({...formData, slots: val})}
            />
          </View>

          {/* Section 2: Payout Order */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}><Text variant="tiny" weight="bold" color="#FFFFFF">2</Text></View>
              <Text variant="caption" weight="bold" color={theme.colors.text.secondary}>WHO GETS PAID FIRST?</Text>
            </View>
            
            <View style={styles.selectorRow}>
              {payoutOptions.map(o => (
                <TouchableOpacity 
                  key={o} 
                  style={[styles.selectorItem, styles.halfWidth, formData.payoutOrder === o && styles.selectorActive]}
                  onPress={() => setFormData({...formData, payoutOrder: o})}
                >
                  <Text variant="caption" weight="bold" color={formData.payoutOrder === o ? '#FFFFFF' : theme.colors.text.secondary}>
                    {o === 'Auto' ? 'RANDOM DRAW' : 'I WILL CHOOSE'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Section 3: Start Condition */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}><Text variant="tiny" weight="bold" color="#FFFFFF">3</Text></View>
              <Text variant="caption" weight="bold" color={theme.colors.text.secondary}>WHEN DOES THE GROUP START?</Text>
            </View>
            
            <View style={styles.selectorRow}>
              {startOptions.map(o => (
                <TouchableOpacity 
                  key={o} 
                  style={[styles.selectorItem, styles.halfWidth, formData.startCondition === o && styles.selectorActive]}
                  onPress={() => setFormData({...formData, startCondition: o})}
                >
                  <Text variant="caption" weight="bold" color={formData.startCondition === o ? '#FFFFFF' : theme.colors.text.secondary}>
                    {o === 'Auto' ? 'ONCE FULL' : 'I WILL START IT'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.summaryBox}>
            <Text variant="body" weight="bold" color={theme.colors.secondary}>Summary</Text>
            <Text variant="caption" color={theme.colors.text.secondary} style={styles.summaryText}>
              Total payout per cycle: ₦{calculateTotalPayout()}
            </Text>
          </View>

          <Button 
            title="Create Group" 
            onPress={showConfirm} 
            style={styles.createButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmation BottomSheet */}
      <BottomSheet
        isVisible={showConfirmSheet}
        onClose={() => setShowConfirmSheet(false)}
        title="Confirm Group Setup"
      >
        <View style={styles.confirmContent}>
          <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.confirmLabel}>
            GROUP DETAILS
          </Text>

          <View style={styles.confirmDetailsCard}>
            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Name</Text>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>{formData.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Contribution</Text>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>₦{formData.amount}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Frequency</Text>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>{formData.frequency.toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Members</Text>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>{formData.slots} People</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Payout Order</Text>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>
                {formData.payoutOrder === 'Auto' ? 'RANDOM DRAW' : 'MANUAL'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="body" color={theme.colors.text.secondary}>Start Condition</Text>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>
                {formData.startCondition === 'Auto' ? 'ONCE FULL' : 'MANUAL'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text variant="body" weight="bold" color={theme.colors.secondary}>Total Cycle Payout</Text>
              <Text variant="h3" weight="bold" color={theme.colors.primary}>₦{calculateTotalPayout()}</Text>
            </View>
          </View>

          <Text variant="body" color={theme.colors.text.secondary} align="center" style={styles.confirmWarningText}>
            You will automatically join as the first member (slot 1) and be designated as the circle administrator.
          </Text>

          <Button
            title="Yes, Create Group"
            onPress={handleCreateCircle}
            loading={loading}
            style={styles.confirmBtn}
          />

          <TouchableOpacity onPress={() => setShowConfirmSheet(false)} style={styles.cancelBtn}>
            <Text variant="body" weight="semiBold" color={theme.colors.danger}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xl,
  },
  header: {
    marginTop: 20,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    marginBottom: theme.spacing.lg,
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
    borderColor: theme.colors.border,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  fieldGroup: {
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    marginBottom: 8,
    letterSpacing: 1,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  selectorActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  halfWidth: {
    flex: 0.5,
  },
  summaryBox: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  summaryText: {
    marginTop: 4,
  },
  createButton: {
    marginBottom: 40,
  },
  confirmContent: {
    alignItems: 'center',
    width: '100%',
  },
  confirmLabel: {
    letterSpacing: 1.5,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  confirmDetailsCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  confirmWarningText: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    lineHeight: 20,
  },
  confirmBtn: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  cancelBtn: {
    padding: theme.spacing.md,
  },
  successContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  successContent: {
    width: '100%',
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  successIconWrapper: {
    marginBottom: theme.spacing.lg,
  },
  successTitle: {
    marginBottom: theme.spacing.xs,
  },
  successSubtitle: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    lineHeight: 20,
  },
  successCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xxl,
  },
  cardSectionTitle: {
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  codeShareBox: {
    backgroundColor: 'rgba(0,255,102,0.05)',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  inviteCodeText: {
    letterSpacing: 1.5,
  },
  successDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  shareBtn: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  dashboardBtn: {
    width: '100%',
  },
});
