import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useGlobalSearchParams } from 'expo-router';
import { theme } from '../../../src/theme';
import { Text } from '../../../src/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/services/api';

export default function CircleMembers() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [circle, setCircle] = useState<any>(null);

  const fetchMembersData = async () => {
    if (!id) {
      console.warn('[CircleMembers] No ID found in route params');
      return;
    }
    console.log('[CircleMembers] Fetching members data for circle ID:', id);
    try {
      const [circleRes, membersRes] = await Promise.all([
        api.getCircle(id),
        api.getCircleMembers(id),
      ]);

      console.log('[CircleMembers] Circle response:', JSON.stringify(circleRes));
      console.log('[CircleMembers] Members response:', JSON.stringify(membersRes));

      const c = circleRes.circle || circleRes;
      setCircle(c);

      const fetchedMembers = membersRes.members || [];
      console.log('[CircleMembers] Fetched members list count:', fetchedMembers.length);

      // Map backend enriched members to local UI model
      const mappedMembers = fetchedMembers.map((m: any) => {
        let payoutStatus = m.status; // 'completed', 'active', 'upcoming'
        if (c.status === 'PENDING') {
          payoutStatus = 'pending start';
        } else if (m.status === 'active') {
          payoutStatus = 'active payout';
        }

        return {
          id: m.id,
          name: m.user?.name || 'Unknown',
          turn: m.turn || m.slot_number,
          status: payoutStatus,
          paid: m.paid,
        };
      });

      console.log('[CircleMembers] Mapped members list:', JSON.stringify(mappedMembers));

      // Sort by slot/turn number
      mappedMembers.sort((a: any, b: any) => a.turn - b.turn);
      setMembers(mappedMembers);
    } catch (e: any) {
      console.error('[CircleMembers] Error loading members details:', e);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchMembersData();
      setLoading(false);
    }
    init();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMembersData();
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
        <Text variant="h2" weight="bold" color={theme.colors.secondary}>Participants</Text>
        <Text variant="body" color={theme.colors.text.secondary}>Turn order and payment status for this cycle.</Text>
      </View>

      <View style={styles.listContainer}>
        {members.length === 0 ? (
          <View style={styles.emptyList}>
            <Text variant="tiny" color={theme.colors.text.secondary}>No members found.</Text>
          </View>
        ) : (
          members.map((member, index) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.turnBadge}>
                <Text variant="body" weight="bold" color={theme.colors.secondary}>{member.turn}</Text>
              </View>
              
              <View style={styles.avatarContainer}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: `hsla(${index * 60}, 70%, 40%, 0.1)` }]}>
                  <Text variant="body" weight="bold" color={theme.colors.secondary}>
                    {(member.name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.memberInfo}>
                <Text variant="body" weight="bold" color={theme.colors.secondary} numberOfLines={1}>{member.name}</Text>
                <Text variant="tiny" color={theme.colors.text.secondary}>
                  {member.status.toUpperCase()}
                </Text>
              </View>

              <View style={styles.statusIndicator}>
                {member.paid ? (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                    <Text variant="tiny" weight="bold" color={theme.colors.primary} style={styles.badgeText}>PAID</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Text variant="tiny" weight="bold" color={theme.colors.text.secondary}>PENDING</Text>
                  </View>
                )}
              </View>
            </View>
          ))
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
  listContainer: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  turnBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  statusIndicator: {
    alignItems: 'flex-end',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    marginLeft: 4,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  bottomSpacer: {
    height: 120,
  },
});
