import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Text } from '../../src/components/common/Text';

export default function ActivityTab() {
  const transactions = [
    { id: '1', type: 'circle', title: 'Lekki Tech Savers', subtitle: 'Contribution - Cycle 4/10', amount: '-₦50,000', date: 'Today, 10:45 AM', icon: 'sync' },
    { id: '2', type: 'payout', title: 'Oyingbo Traders', subtitle: 'Payout Received', amount: '+₦200,000', date: 'Yesterday, 2:15 PM', icon: 'star' },
    { id: '3', type: 'savings', title: 'Standard Vault', subtitle: 'Top Up', amount: '-₦10,000', date: 'Oct 24, 2026', icon: 'wallet' },
    { id: '4', type: 'circle', title: 'Family Savings', subtitle: 'Contribution', amount: '-₦25,000', date: 'Oct 22, 2026', icon: 'sync' },
    { id: '5', type: 'savings', title: 'Car Fund', subtitle: 'Yield Earned', amount: '+₦1,240', date: 'Oct 20, 2026', icon: 'trending-up' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="h1" weight="bold" color={theme.colors.secondary}>Activity.</Text>
          <Text variant="body" color={theme.colors.text.secondary}>Your complete transaction history.</Text>
        </View>

        <View style={styles.filterRow}>
          {['All', 'Circles', 'Vaults', 'Payouts'].map((filter, i) => (
            <TouchableOpacity key={filter} style={[styles.filterChip, i === 0 && styles.activeChip]}>
              <Text variant="tiny" weight="bold" color={i === 0 ? '#FFFFFF' : theme.colors.text.secondary}>
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.feed}>
          {transactions.map(tx => (
            <TouchableOpacity key={tx.id} style={styles.txRow}>
              <View style={[styles.iconContainer, 
                tx.type === 'payout' ? styles.payoutIcon : 
                tx.type === 'savings' ? styles.savingsIcon : styles.circleIcon
              ]}>
                <Ionicons 
                  name={tx.icon as any} 
                  size={20} 
                  color={tx.type === 'payout' ? theme.colors.primary : theme.colors.secondary} 
                />
              </View>
              <View style={styles.txMain}>
                <View style={styles.txHeader}>
                  <Text variant="body" weight="bold" color={theme.colors.secondary}>{tx.title}</Text>
                  <Text variant="body" weight="bold" color={tx.amount.startsWith('+') ? theme.colors.primary : theme.colors.secondary}>
                    {tx.amount}
                  </Text>
                </View>
                <View style={styles.txFooter}>
                  <Text variant="tiny" color={theme.colors.text.secondary}>{tx.subtitle}</Text>
                  <Text variant="tiny" color={theme.colors.text.secondary}>{tx.date}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.emptyState}>
          <Text variant="tiny" color={theme.colors.text.secondary} align="center">
            Showing transactions from the last 3 months.
          </Text>
        </View>
      </ScrollView>
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
    paddingBottom: 120,
  },
  header: {
    marginBottom: theme.spacing.xxl,
    marginTop: theme.spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.xxl,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  activeChip: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  feed: {
    marginBottom: theme.spacing.xl,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  circleIcon: {
    // Default
  },
  payoutIcon: {
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    borderColor: 'rgba(27, 67, 50, 0.2)',
  },
  savingsIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  txMain: {
    flex: 1,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    marginTop: theme.spacing.xl,
    paddingBottom: 40,
  },
});
