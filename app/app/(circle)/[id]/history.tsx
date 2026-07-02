import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useGlobalSearchParams } from 'expo-router';
import { theme } from '../../../src/theme';
import { Text } from '../../../src/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/services/api';

export default function CircleHistory() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistoryDetails = async () => {
    if (!id) return;
    try {
      const res = await api.getCircleHistory(id);
      setHistory(res.history || []);
    } catch (e: any) {
      console.warn('[CircleHistory] Failed to load circle history ledger:', e.message);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchHistoryDetails();
      setLoading(false);
    }
    init();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistoryDetails();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      <View style={styles.header}>
        <Text variant="h2" weight="bold" color={theme.colors.secondary}>Circle Ledger</Text>
        <Text variant="body" color={theme.colors.text.secondary}>Complete audit trail of all movements.</Text>
      </View>

      <View style={styles.logContainer}>
        {history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text variant="tiny" color={theme.colors.text.secondary}>No transactions recorded yet.</Text>
          </View>
        ) : (
          history.map(tx => {
            const formattedAmount = (tx.amount / 100).toLocaleString();
            const txDate = new Date(tx.date || Date.now()).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View key={tx.id} style={styles.logItem}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: tx.type === 'payout' ? 'rgba(27, 67, 50, 0.05)' : 'rgba(0,0,0,0.03)' }
                ]}>
                  <Ionicons 
                    name={tx.type === 'payout' ? "arrow-up-outline" : "arrow-down-outline"} 
                    size={20} 
                    color={tx.type === 'payout' ? theme.colors.primary : theme.colors.text.secondary} 
                  />
                </View>

                <View style={styles.txInfo}>
                  <Text variant="body" weight="bold" color={theme.colors.secondary}>
                    {tx.type === 'payout' ? `Payout: ${tx.user}` : `Contribution: ${tx.user}`}
                  </Text>
                  <Text variant="tiny" color={theme.colors.text.secondary}>Round {tx.cycle_number} • {txDate}</Text>
                </View>

                <View style={styles.txAmount}>
                  <Text variant="body" weight="bold" color={tx.type === 'payout' ? theme.colors.primary : theme.colors.secondary}>
                    {tx.type === 'payout' ? '-' : '+'}₦{formattedAmount}
                  </Text>
                  <View style={styles.successBadge}>
                    <View style={styles.successDot} />
                    <Text variant="tiny" color={theme.colors.primary}>COMPLETED</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
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
  },
  header: {
    marginBottom: 24,
  },
  logContainer: {
    gap: 16,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  txInfo: {
    flex: 1,
  },
  txAmount: {
    alignItems: 'flex-end',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  successDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginRight: 6,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  bottomSpacer: {
    height: 120,
  },
});
