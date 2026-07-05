import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Text } from '../../src/components/common/Text';
import { Button } from '../../src/components/common/Button';

export default function SavingsTab() {
  const vaults = [
    { id: '1', name: 'Standard Vault', balance: '120,500', yield: '8.5% p.a', color: theme.colors.primary },
    { id: '2', name: 'Car Fund', balance: '450,000', yield: '12% p.a', color: theme.colors.secondary },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="h1" weight="bold" color={theme.colors.secondary}>Vaults.</Text>
          <Text variant="body" color={theme.colors.text.secondary}>Your personal high-yield savings.</Text>
        </View>

        <View style={styles.totalSection}>
          <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.sectionTitle}>
            TOTAL PERSONAL BALANCE
          </Text>
          <Text variant="h1" weight="bold" color={theme.colors.secondary} style={styles.totalAmount}>
            ₦570,500
          </Text>
        </View>

        <View style={styles.vaultsList}>
          {vaults.map(vault => (
            <View key={vault.id} style={styles.vaultCard}>
              <View style={[styles.vaultAccent, { backgroundColor: vault.color }]} />
              <View style={styles.vaultMain}>
                <View style={styles.vaultHeader}>
                  <Text variant="h3" weight="bold" color={theme.colors.secondary}>{vault.name}</Text>
                  <View style={styles.yieldBadge}>
                    <Text variant="tiny" weight="bold" color={theme.colors.primary}>{vault.yield}</Text>
                  </View>
                </View>
                <Text variant="h2" weight="bold" color={theme.colors.secondary} style={styles.vaultBalance}>
                  ₦{vault.balance}
                </Text>
                <View style={styles.vaultActions}>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="add" size={18} color={theme.colors.primary} />
                    <Text variant="caption" weight="bold" color={theme.colors.primary} style={styles.actionText}>TOP UP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.withdrawBtn]}>
                    <Ionicons name="arrow-up" size={18} color={theme.colors.text.secondary} />
                    <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.actionText}>WITHDRAW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.createNewVault}>
          <View style={styles.createIcon}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </View>
          <Text variant="body" weight="bold" color={theme.colors.primary}>Create a new vault</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={styles.wipOverlay}>
        <Text variant="h1" weight="bold" color="#FFFFFF" style={styles.wipText}>
          WORK IN PROGRESS
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wipOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 28, 21, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  wipText: {
    letterSpacing: 4,
    color: '#FFFFFF',
    textAlign: 'center',
  },
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
  totalSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.12)',
    marginBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    letterSpacing: 2,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 36,
  },
  vaultsList: {
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  vaultCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  vaultAccent: {
    width: 6,
    height: '100%',
  },
  vaultMain: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  vaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  yieldBadge: {
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vaultBalance: {
    marginBottom: theme.spacing.lg,
  },
  vaultActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.15)',
  },
  withdrawBtn: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  actionText: {
    marginLeft: 4,
  },
  createNewVault: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.25)',
    borderStyle: 'dashed',
    marginBottom: 40,
  },
  createIcon: {
    marginRight: 8,
  },
});
