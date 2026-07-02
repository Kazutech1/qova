import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { Text } from '../../src/components/common/Text';
import { api, clearToken } from '../../src/services/api';

export default function ProfileTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [profile, setProfile] = useState<{
    id: string;
    phone: string;
    name: string;
    bank_account_number?: string;
    bank_name?: string;
    reliability_score: number;
  } | null>(null);

  const [reliability, setReliability] = useState<{
    score: number;
    label: string;
    breakdown: {
      contributions_paid: number;
      late_or_missed: number;
      pots_completed: number;
    };
  } | null>(null);

  const [pastCircles, setPastCircles] = useState<any[]>([]);

  const fetchProfileDetails = async () => {
    try {
      const [profileData, scoreData, circlesData] = await Promise.all([
        api.getProfile(),
        api.getReliabilityScore().catch(() => null),
        api.getMyCircles().catch(() => ({ past: [] })),
      ]);
      
      setProfile(profileData.user || profileData);
      if (scoreData) {
        setReliability(scoreData);
      }
      if (circlesData) {
        setPastCircles(circlesData.past || []);
      }
    } catch (e: any) {
      console.warn('[ProfileTab] Failed to load profile details:', e.message);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchProfileDetails();
      setLoading(false);
    }
    init();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfileDetails();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await clearToken();
    router.replace('/onboarding/phone');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  // Get initials for profile avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const scoreVal = reliability?.score || profile?.reliability_score || 0;
  const scorePercent = Math.min(Math.round(scoreVal / 10), 100);
  const initials = getInitials(profile?.name);

  // Settings layout grouping
  const settingsGroups = [
    {
      title: 'ACCOUNT & SECURITY',
      items: [
        { id: '1', title: 'Personal Details', icon: 'person-outline' },
        { 
          id: '2', 
          title: 'Linked Bank Account', 
          icon: 'business-outline', 
          value: profile?.bank_name 
            ? `${profile.bank_name} • ${profile.bank_account_number?.slice(-4)}` 
            : 'Not linked' 
        },
        { id: '3', title: 'Security & App PIN', icon: 'lock-closed-outline' },
      ]
    },
    {
      title: 'PREFERENCES',
      items: [
        { id: '4', title: 'Notification Settings', icon: 'notifications-outline' },
        { id: '5', title: 'System Themes', icon: 'color-palette-outline', value: 'Default' },
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.rotatedStripe} pointerEvents="none" />
      
      {/* Static Top Header Section (Non-scrollable) */}
      <View style={styles.staticTopHeader}>
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text variant="h2" weight="bold" color={theme.colors.primary}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text variant="h1" weight="bold" color="#FFFFFF" style={styles.profileName}>
              {profile?.name || 'Qova User'}
            </Text>
            <Text variant="body" color="rgba(255, 255, 255, 0.75)">
              {profile?.phone || 'No phone registered'}
            </Text>
          </View>
        </View>

        {/* RELIABILITY CARD CONTAINER */}
        <View style={styles.reliabilityCard}>
          <View style={styles.reliabilityTitleRow}>
            <Text variant="tiny" weight="bold" color={theme.colors.text.secondary} style={styles.metaLabel}>
              RELIABILITY METRIC
            </Text>
            <Text variant="tiny" weight="bold" color={theme.colors.primary}>
              {reliability?.label?.toUpperCase() || 'ACTIVE'}
            </Text>
          </View>
          
          <View style={styles.scoreDisplayRow}>
            <Text variant="h1" weight="bold" color={theme.colors.secondary} style={styles.scoreText}>
              {scoreVal}
            </Text>
            <Text variant="caption" color={theme.colors.text.secondary} style={styles.scoreTotal}>
              / 1000 pts ({scorePercent}%)
            </Text>
          </View>

          <View style={styles.progressLineTrack}>
            <View style={[styles.progressLineFill, { width: `${scorePercent}%` }]} />
          </View>

          {/* Clean minimal breakdown */}
          <View style={styles.breakdownList}>
            <View style={styles.breakdownItem}>
              <Text variant="tiny" color={theme.colors.text.secondary}>Paid Slots</Text>
              <Text variant="caption" weight="bold" color={theme.colors.secondary}>
                {reliability?.breakdown?.contributions_paid ?? 0}
              </Text>
            </View>
            <View style={styles.breakdownSeparator} />
            <View style={styles.breakdownItem}>
              <Text variant="tiny" color={theme.colors.text.secondary}>Late/Missed</Text>
              <Text variant="caption" weight="bold" color={theme.colors.danger}>
                {reliability?.breakdown?.late_or_missed ?? 0}
              </Text>
            </View>
            <View style={styles.breakdownSeparator} />
            <View style={styles.breakdownItem}>
              <Text variant="tiny" color={theme.colors.text.secondary}>Closed Vaults</Text>
              <Text variant="caption" weight="bold" color={theme.colors.secondary}>
                {reliability?.breakdown?.pots_completed ?? 0}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* SECTION: Recent Activity */}
        <View style={styles.section}>
          <Text variant="tiny" weight="bold" color={theme.colors.text.secondary} style={styles.sectionHeaderLabel}>
            RECENT TRANSACTION FEED
          </Text>
          <View style={styles.listContainer}>
            {pastCircles.length === 0 ? (
              <View style={styles.emptyFeed}>
                <Text variant="tiny" color={theme.colors.text.secondary}>No completed savings history.</Text>
              </View>
            ) : (
              pastCircles.slice(0, 3).map(circle => {
                const totalPayout = ((circle.contribution_amount / 100) * circle.total_slots).toLocaleString();
                const closedDate = new Date(circle.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <View key={circle.id} style={styles.activityRow}>
                    <View style={styles.iconRing}>
                      <Ionicons name="checkmark" size={14} color={theme.colors.primary} />
                    </View>
                    <View style={styles.rowMain}>
                      <Text variant="body" weight="bold" color={theme.colors.secondary}>{circle.name}</Text>
                      <Text variant="tiny" color={theme.colors.text.secondary}>Payout Received • {closedDate}</Text>
                    </View>
                    <Text variant="body" weight="bold" color={theme.colors.primary}>
                      +₦{totalPayout}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* SETTINGS GROUPS */}
        {settingsGroups.map((group, groupIdx) => (
          <View key={`group-${groupIdx}`} style={styles.section}>
            <Text variant="tiny" weight="bold" color={theme.colors.text.secondary} style={styles.sectionHeaderLabel}>
              {group.title}
            </Text>
            <View style={styles.listContainer}>
              {group.items.map(item => (
                <TouchableOpacity key={item.id} style={styles.settingsItem} activeOpacity={0.7}>
                  <View style={styles.itemLeft}>
                    <Ionicons name={item.icon as any} size={18} color={theme.colors.primary} style={styles.itemIcon} />
                    <Text variant="body" weight="semiBold" color={theme.colors.secondary}>
                      {item.title}
                    </Text>
                  </View>
                  <View style={styles.itemRight}>
                    {item.value && (
                      <Text variant="tiny" color={theme.colors.text.secondary} style={styles.valueText}>
                        {item.value}
                      </Text>
                    )}
                    <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Premium Log Out Action */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text variant="body" weight="bold" color={theme.colors.danger}>LOG OUT ACCOUNT</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Beige/cream canvas background
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 140,
  },
  staticTopHeader: {
    paddingHorizontal: 24,
    paddingTop: 45,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  fullDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
    marginVertical: 24,
  },
  reliabilitySection: {
    width: '100%',
  },
  reliabilityTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaLabel: {
    letterSpacing: 1.5,
  },
  scoreDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 36,
    lineHeight: 40,
  },
  scoreTotal: {
    marginLeft: 6,
    fontSize: 14,
  },
  reliabilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  progressLineTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressLineFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  breakdownList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  breakdownSeparator: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderLabel: {
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 2,
  },
  listContainer: {
    width: '100%',
  },
  emptyFeed: {
    paddingVertical: 12,
    paddingLeft: 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  iconRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    marginRight: 8,
  },
  logoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  bottomSpacer: {
    height: 60,
  },
  rotatedStripe: {
    position: 'absolute',
    top: -380,
    right: -100,
    width: 800,
    height: 580,
    backgroundColor: theme.colors.primary,
    transform: [{ rotate: '35deg' }],
    opacity: 1.0,
    borderRadius: 100,
  },
});
