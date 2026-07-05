import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { theme } from '../../../src/theme';
import { Text } from '../../../src/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/services/api';

export default function AdminSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [autoDebit, setAutoDebit] = useState(false);
  const [autoDebitBusy, setAutoDebitBusy] = useState(false);
  const [reminders, setReminders] = useState(true);

  const [circle, setCircle] = useState<any>(null);
  const [nameById, setNameById] = useState<Record<string, string>>({});

  const [showReorder, setShowReorder] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const mandate = await api.getMandate(id);
        setAutoDebit(!!mandate && ['ACTIVE', 'PENDING_ACTIVATION'].includes(mandate.status));
      } catch (e: any) {
        console.warn('[Admin] mandate status failed:', e.message);
      }
      try {
        const [circleRes, membersRes] = await Promise.all([
          api.getCircle(id),
          api.getCircleMembers(id).catch(() => ({ members: [] })),
        ]);
        const c = circleRes.circle || circleRes;
        setCircle(c);
        const map: Record<string, string> = {};
        (membersRes.members || []).forEach((m: any) => {
          map[m.user_id] = m.user?.name || m.name || 'Member';
        });
        setNameById(map);
      } catch (e: any) {
        console.warn('[Admin] circle load failed:', e.message);
      }
    })();
  }, [id]);

  const handleToggleAutoDebit = async (next: boolean) => {
    if (!id || autoDebitBusy) return;
    setAutoDebitBusy(true);
    setAutoDebit(next); // optimistic
    try {
      if (next) {
        const res = await api.enableAutoDebit(id);
        Alert.alert(
          'Auto-Debit Requested',
          res.activation_note ||
            'To activate, send ₦50 from your bank account to the NIBSS validation account. Activation can take up to 72 hours.',
        );
      } else {
        await api.disableAutoDebit(id);
        Alert.alert('Auto-Debit Off', 'Your contributions will no longer be collected automatically.');
      }
    } catch (e: any) {
      setAutoDebit(!next); // revert on failure
      Alert.alert('Auto-Debit', e.message || 'Could not update auto-debit.');
    } finally {
      setAutoDebitBusy(false);
    }
  };

  const openReorder = () => {
    if (!circle) return;
    if (circle.payout_order_type !== 'MANUAL') {
      Alert.alert('Automatic Order', 'This circle uses an automatic payout order, so the turn order cannot be edited manually.');
      return;
    }
    if (circle.status === 'COMPLETED') {
      Alert.alert('Circle Completed', 'This circle has already finished.');
      return;
    }
    setOrder([...(circle.payout_order || [])]);
    setShowReorder(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    setOrder(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveOrder = async () => {
    if (!id) return;
    setSavingOrder(true);
    try {
      await api.setPayoutOrder(id, order);
      setCircle((c: any) => ({ ...c, payout_order: order }));
      setShowReorder(false);
      Alert.alert('Saved', 'Payout turn order updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save the new order.');
    } finally {
      setSavingOrder(false);
    }
  };

  const adminActions: Array<{ id: string; title: string; icon: string; description: string; danger?: boolean; onPress?: () => void }> = [
    { id: '1', title: 'Edit Turn Order', icon: 'swap-vertical-outline', description: 'Manually adjust payout sequence', onPress: openReorder },
    { id: '2', title: 'Late Payment Penalties', icon: 'alert-circle-outline', description: 'Configure fees for delayed contributions' },
    { id: '3', title: 'Invite New Member', icon: 'person-add-outline', description: 'Send invitation link to potential participants' },
    { id: '4', title: 'Circle Rules', icon: 'document-text-outline', description: 'Modify frequency or contribution amount' },
    { id: '5', title: 'Dissolve Circle', icon: 'trash-outline', description: 'End the circle and distribute remaining funds', danger: true },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.adminBadge}>
          <Ionicons name="shield-half" size={12} color="#FFFFFF" />
          <Text variant="tiny" weight="bold" color="#FFFFFF" style={styles.badgeText}>ADMIN CONSOLE</Text>
        </View>
        <Text variant="h2" weight="bold" color={theme.colors.secondary}>Configurations</Text>
        <Text variant="body" color={theme.colors.text.secondary}>Manage your circle's logic and participants.</Text>
      </View>

      {/* QUICK TOGGLES */}
      <View style={styles.section}>
        <View style={styles.settingItem}>
          <View style={styles.settingText}>
            <Text variant="body" weight="bold" color={theme.colors.secondary}>Auto-Debit (Your Contributions)</Text>
            <Text variant="tiny" color={theme.colors.text.secondary}>Automatically collect your contribution from your bank each cycle</Text>
          </View>
          {autoDebitBusy ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Switch
              value={autoDebit}
              onValueChange={handleToggleAutoDebit}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          )}
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingText}>
            <Text variant="body" weight="bold" color={theme.colors.secondary}>Smart Reminders</Text>
            <Text variant="tiny" color={theme.colors.text.secondary}>Automated pings in the circle chat</Text>
          </View>
          <Switch
            value={reminders}
            onValueChange={setReminders}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </View>

      {/* ADMIN ACTIONS */}
      <View style={styles.actionsList}>
        {adminActions.map(action => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionItem}
            activeOpacity={action.onPress ? 0.7 : 1}
            onPress={action.onPress}
          >
            <View style={[styles.iconBox, action.danger && styles.dangerIcon]}>
              <Ionicons name={action.icon as any} size={20} color={action.danger ? theme.colors.danger : theme.colors.secondary} />
            </View>
            <View style={styles.actionContent}>
              <Text variant="body" weight="bold" color={action.danger ? theme.colors.danger : theme.colors.secondary}>
                {action.title}
              </Text>
              <Text variant="tiny" color={theme.colors.text.secondary}>{action.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.2)" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomSpacer} />

      {/* EDIT TURN ORDER MODAL */}
      <Modal visible={showReorder} transparent animationType="slide" onRequestClose={() => setShowReorder(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.reorderSheet}>
            <View style={styles.reorderHandle} />
            <Text variant="h2" weight="bold" color={theme.colors.secondary}>Edit Turn Order</Text>
            <Text variant="tiny" color={theme.colors.text.secondary} style={{ marginBottom: 16 }}>
              Position 1 receives the pot first.
            </Text>
            {order.map((uid, i) => (
              <View key={uid} style={styles.reorderRow}>
                <View style={styles.reorderPos}>
                  <Text variant="tiny" weight="bold" color="#FFFFFF">{i + 1}</Text>
                </View>
                <Text variant="body" weight="bold" color={theme.colors.secondary} style={{ flex: 1 }}>
                  {nameById[uid] || 'Member'}
                </Text>
                <TouchableOpacity style={styles.reorderBtn} disabled={i === 0} onPress={() => move(i, -1)}>
                  <Ionicons name="chevron-up" size={18} color={i === 0 ? 'rgba(0,0,0,0.2)' : theme.colors.secondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.reorderBtn} disabled={i === order.length - 1} onPress={() => move(i, 1)}>
                  <Ionicons name="chevron-down" size={18} color={i === order.length - 1 ? 'rgba(0,0,0,0.2)' : theme.colors.secondary} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.saveOrderBtn} activeOpacity={0.9} onPress={saveOrder} disabled={savingOrder}>
              <Text variant="caption" weight="bold" color="#FFFFFF">{savingOrder ? 'SAVING...' : 'SAVE ORDER'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reorderCancel} onPress={() => setShowReorder(false)}>
              <Text variant="caption" weight="bold" color={theme.colors.text.secondary}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    marginLeft: 4,
    letterSpacing: 1,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  actionsList: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dangerIcon: {
    backgroundColor: 'rgba(230, 57, 70, 0.05)',
  },
  actionContent: {
    flex: 1,
  },
  bottomSpacer: {
    height: 120,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reorderSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  reorderHandle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  reorderPos: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveOrderBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  reorderCancel: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
});
