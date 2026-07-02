import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Platform, RefreshControl, ActivityIndicator, Alert, PanResponder, Animated } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { theme } from '../../src/theme';
import { Text } from '../../src/components/common/Text';
import { Button } from '../../src/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { api, getToken } from '../../src/services/api';

const ACTIVE_CIRCLE_SIZE = 80;

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

export default function HomeTab() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ name: string } | null>(null);
  const [reliability, setReliability] = useState<{ score: number; label: string; breakdown: { contributions_paid: number; late_or_missed: number; pots_completed: number } } | null>(null);
  const [circles, setCircles] = useState<{ current: any[]; past: any[] }>({ current: [], past: [] });
  const [currentIndex, setCurrentIndex] = useState(0);
  const pans = useRef<Record<string, Animated.ValueXY>>({}).current;
  const defaultPan = useRef(new Animated.ValueXY()).current;

  const colorPalette = [theme.colors.primary, theme.colors.secondary, '#4C3B4D', '#1D2A44', '#B91C1C'];

  // Keep pans map pre-populated for active circles
  useEffect(() => {
    if (circles.current) {
      circles.current.forEach(circle => {
        if (!pans[circle.id]) {
          pans[circle.id] = new Animated.ValueXY();
        }
      });
    }
  }, [circles.current]);

  // Reset index if data changes to avoid bounds error
  useEffect(() => {
    if (circles.current && currentIndex >= circles.current.length) {
      setCurrentIndex(0);
    }
  }, [circles.current]);

  const cycleDeck = (swipedId: string) => {
    if (!circles.current.length) return;
    setCurrentIndex(prev => (prev + 1) % circles.current.length);
    // Delay the pan reset so React commits new zIndex/elevation first.
    // Without this, the swiped card snaps back to center for 1 frame
    // before the new ordering hides it behind the new front card.
    setTimeout(() => {
      if (pans[swipedId]) {
        pans[swipedId].setValue({ x: 0, y: 0 });
      }
    }, 60);
  };

  const activeCircle = circles.current[currentIndex];
  const activePan = activeCircle ? (pans[activeCircle.id] || defaultPan) : defaultPan;

  const rotate = activePan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Intercept touch if user drags horizontally more than 10 pixels.
          return Math.abs(gestureState.dx) > 10;
        },
        onPanResponderMove: (evt, gestureState) => {
          activePan.setValue({ x: gestureState.dx, y: gestureState.dy });
        },
        onPanResponderRelease: (e, gestureState) => {
          const currentCircle = circles.current[currentIndex];
          if (!currentCircle) return;

          // Detect tap gesture to navigate
          if (Math.abs(gestureState.dx) < 8 && Math.abs(gestureState.dy) < 8) {
            router.push(`/(circle)/${currentCircle.id}`);
            return;
          }

          if (gestureState.dx > 120) {
            // Swipe Right
            Animated.timing(activePan, {
              toValue: { x: 450, y: gestureState.dy },
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              cycleDeck(currentCircle.id);
            });
          } else if (gestureState.dx < -120) {
            // Swipe Left
            Animated.timing(activePan, {
              toValue: { x: -450, y: gestureState.dy },
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              cycleDeck(currentCircle.id);
            });
          } else {
            // Spring Back - snapper spring dynamics
            Animated.spring(activePan, {
              toValue: { x: 0, y: 0 },
              tension: 50,
              friction: 6,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [currentIndex, circles, activePan]
  );

  const fetchDashboardData = async () => {
    try {
      const [profData, scoreData, circlesData] = await Promise.all([
        api.getProfile(),
        api.getReliabilityScore(),
        api.getMyCircles(),
      ]);
      setProfile(profData.user || profData);
      setReliability(scoreData);
      setCircles(circlesData);
    } catch (e: any) {
      console.warn('[HomeDashboard] Failed to fetch dashboard data:', e.message);
    }
  };

  useEffect(() => {
    async function init() {
      // Guard session
      const token = await getToken();
      if (!token) {
        router.replace('/onboarding/phone');
        return;
      }

      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    }
    init();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getShortName = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'User';

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundPattern />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.greeting}>
              WELCOME BACK
            </Text>
            <Text variant="h1" weight="bold" color={theme.colors.secondary}>
              {firstName}.
            </Text>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ACTIVE CIRCLES SECTION */}
        <View style={styles.activeSection}>
          <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.sectionTitle}>
            ACTIVE CIRCLES
          </Text>

          {circles.current.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={theme.colors.text.secondary} />
              <Text variant="body" color={theme.colors.text.secondary} style={styles.emptyText}>
                You are not in any active savings circles yet.
              </Text>
              <Button 
                title="Create a Circle" 
                onPress={() => router.push('/create-circle')} 
                style={styles.emptyBtn}
              />
            </View>
          ) : (
            <View style={[styles.deckContainer, { height: 280 + (Math.min(circles.current.length, 3) - 1) * 15 }]}>
              {circles.current.map((circle, index) => {
                const N = circles.current.length;
                const diff = (index - currentIndex + N) % N;
                
                // Only render the top 3 cards in the stack stack
                if (diff >= 3) return null;

                const stackIndex = diff;
                const color = colorPalette[index % colorPalette.length];
                
                // Progress Calculations
                const progress = circle.status === 'PENDING' 
                  ? (circle._count.memberships / circle.total_slots)
                  : (circle.current_cycle / circle.total_slots);
                const progressPercent = Math.round(progress * 100);

                const cycleText = circle.status === 'PENDING'
                  ? `${circle._count.memberships}/${circle.total_slots} Slots`
                  : `Round ${circle.current_cycle}/${circle.total_slots}`;
                const formattedContribution = (circle.contribution_amount / 100).toLocaleString();
                const totalPayoutVal = ((circle.contribution_amount / 100) * circle.total_slots).toLocaleString();

                const desc = circle.status === 'PENDING'
                  ? `Pending group. Currently ${circle._count.memberships} of ${circle.total_slots} members have joined.`
                  : `Active group. You contribute ₦${formattedContribution} as member slot ${circle.slot_number}.`;

                const dashCount = circle.total_slots;
                const completedDashes = circle.status === 'PENDING'
                  ? circle._count.memberships
                  : circle.current_cycle;                let animatedStyle: any = {};
                if (stackIndex === 0) {
                  animatedStyle = {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: [
                      { translateX: activePan.x },
                      { translateY: activePan.y },
                      { rotate: rotate },
                    ],
                    zIndex: 10,
                    elevation: 10,
                    opacity: 1.0,
                  };
                } else if (stackIndex === 1) {
                  const scaleXVal = activePan.x.interpolate({
                    inputRange: [-120, 0, 120],
                    outputRange: [1.0, 0.92, 1.0],
                    extrapolate: 'clamp',
                  });
                  const scaleYVal = activePan.x.interpolate({
                    inputRange: [-120, 0, 120],
                    outputRange: [1.0, 0.96, 1.0],
                    extrapolate: 'clamp',
                  });
                  const translateYVal = activePan.x.interpolate({
                    inputRange: [-120, 0, 120],
                    outputRange: [0, 15, 0],
                    extrapolate: 'clamp',
                  });
                  const opacityVal = activePan.x.interpolate({
                    inputRange: [-120, 0, 120],
                    outputRange: [1.0, 0.85, 1.0],
                    extrapolate: 'clamp',
                  });

                  animatedStyle = {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: [
                      { scaleX: scaleXVal },
                      { scaleY: scaleYVal },
                      { translateY: translateYVal },
                    ],
                    opacity: opacityVal,
                    zIndex: 9,
                    elevation: 9,
                  };
                } else if (stackIndex === 2) {
                  const scaleXVal = activePan.x.interpolate({
                    inputRange: [-120, 0, 120],
                    outputRange: [0.92, 0.84, 0.92],
                    extrapolate: 'clamp',
                  });
                  const scaleYVal = activePan.x.interpolate({
                    inputRange: [-120, 0, 120],
                    outputRange: [0.96, 0.92, 0.96],
                    extrapolate: 'clamp',
                  });
                  const translateYVal = activePan.x.interpolate({
                    inputRange: [-120, 0, 120],
                    outputRange: [15, 30, 15],
                    extrapolate: 'clamp',
                  });
                  const opacityVal = activePan.x.interpolate({
                    inputRange: [-120, 0, 120],
                    outputRange: [0.85, 0.7, 0.85],
                    extrapolate: 'clamp',
                  });

                  animatedStyle = {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: [
                      { scaleX: scaleXVal },
                      { scaleY: scaleYVal },
                      { translateY: translateYVal },
                    ],
                    opacity: opacityVal,
                    zIndex: 8,
                    elevation: 8,
                  };
                }

                return (
                  <Animated.View
                    key={circle.id}
                    style={animatedStyle}
                    {...(stackIndex === 0 ? panResponder.panHandlers : {})}
                  >
                    <View style={styles.walletCard}>
                      {/* Radial glow background color mesh overlay */}
                      <View style={[styles.meshGlow, { backgroundColor: color }]} />

                      {/* Top Row */}
                      <View style={styles.cardTopRow}>
                        <View style={styles.topLeftGroup}>
                          <View style={styles.iconRing}>
                            <Ionicons name="people-outline" size={14} color="#FFFFFF" />
                          </View>
                          <Text variant="body" weight="bold" color="#FFFFFF" numberOfLines={1} style={styles.circleNameText}>
                            {circle.name}
                          </Text>
                        </View>
                        
                        <View style={styles.categoryPill}>
                          <Text variant="tiny" weight="bold" color="rgba(255, 255, 255, 0.8)">
                            {circle.frequency.toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.arrowCircle}>
                          <Ionicons name="arrow-forward-outline" size={14} color="#FFFFFF" style={{ transform: [{ rotate: '-45deg' }] }} />
                        </View>
                      </View>

                      {/* Middle Row */}
                      <View style={styles.middleSection}>
                        <View style={styles.percentRow}>
                          <Text variant="h1" weight="bold" style={styles.percentText}>{progressPercent}</Text>
                          <Text variant="h2" weight="bold" style={styles.percentSymbolText}>%</Text>
                          <Ionicons name="arrow-up-outline" size={20} color="#FFFFFF" style={styles.tinyArrowUp} />
                        </View>

                        <Text variant="body" weight="bold" style={styles.potValueText}>
                          ₦{totalPayoutVal} total pot
                        </Text>
                        <Text variant="caption" style={styles.descText} numberOfLines={2}>
                          {desc}
                        </Text>
                      </View>

                      {/* Bottom Progress Dashes Row */}
                      <View style={styles.dashProgressRow}>
                        {Array.from({ length: dashCount }).map((_, i) => {
                          const isActive = i < completedDashes;
                          return (
                            <View 
                              key={`dash-${i}`} 
                              style={[
                                styles.dashUnit, 
                                { backgroundColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)' }
                              ]} 
                            />
                          );
                        })}
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>

        {/* COMPLETED SECTION */}
        <View style={styles.completedSection}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.sectionTitle}>
              COMPLETED HISTORY
            </Text>
          </View>

          <View style={styles.historyList}>
            {circles.past.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text variant="tiny" color={theme.colors.text.secondary}>No completed savings history.</Text>
              </View>
            ) : (
              circles.past.map(circle => {
                const totalPayout = ((circle.contribution_amount / 100) * circle.total_slots).toLocaleString();
                const closedDate = new Date(circle.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <View key={circle.id} style={styles.historyItem}>
                    <View style={styles.historyIconContainer}>
                      <Ionicons name="shield-checkmark" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text variant="body" weight="bold" color={theme.colors.secondary}>{circle.name}</Text>
                      <Text variant="tiny" color={theme.colors.text.secondary}>Closed {closedDate}</Text>
                    </View>
                    <View style={styles.historyPayout}>
                      <Text variant="caption" weight="bold" color={theme.colors.primary}>+₦{totalPayout}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.footerInfo}>
          <View style={styles.scoreRow}>
            <View>
              <Text variant="caption" weight="bold" color={theme.colors.text.secondary}>RELIABILITY SCORE</Text>
              <Text variant="h2" weight="bold" color={theme.colors.primary}>
                {reliability ? `${reliability.score}%` : '50%'}
              </Text>
            </View>
            <View style={styles.scoreDetails}>
              <Text variant="tiny" color={theme.colors.text.secondary}>RATING STATUS</Text>
              <Text variant="caption" weight="bold" color={theme.colors.secondary}>
                {reliability ? reliability.label.toUpperCase() : 'GOOD'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/create-circle')}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
            <Text variant="caption" weight="bold" color={theme.colors.primary} style={styles.actionLabel}>START NEW</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/join-circle')}>
            <Ionicons name="link-outline" size={24} color={theme.colors.primary} />
            <Text variant="caption" weight="bold" color={theme.colors.primary} style={styles.actionLabel}>JOIN GROUP</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: 120,
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  greeting: {
    letterSpacing: 2,
    marginBottom: 4,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27, 67, 50, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.12)',
  },
  activeSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    letterSpacing: 2,
    marginBottom: theme.spacing.lg,
  },
  deckContainer: {
    width: '100%',
    position: 'relative',
    marginTop: 10,
    marginBottom: 20,
  },
  walletCard: {
    backgroundColor: '#1E1B18', // Rich dark stone base matching image
    borderRadius: 28,
    padding: 24,
    width: '100%',
    height: 280, // Fixed height for stacking alignment
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  meshGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.35,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
  },
  topLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  iconRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleNameText: {
    color: '#FFFFFF',
    flex: 1,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginRight: 8,
  },
  arrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleSection: {
    marginBottom: 30,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  percentText: {
    fontSize: 54,
    color: '#FFFFFF',
    lineHeight: 60,
  },
  percentSymbolText: {
    fontSize: 36,
    color: '#FFFFFF',
  },
  tinyArrowUp: {
    marginLeft: 6,
    transform: [{ rotate: '45deg' }],
  },
  potValueText: {
    color: '#FFFFFF',
    marginBottom: 12,
  },
  descText: {
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
  },
  dashProgressRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginTop: 10,
  },
  dashUnit: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
  },
  footerInfo: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreDetails: {
    alignItems: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  actionCard: {
    flex: 1,
    height: 100,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.15)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    marginTop: 8,
    letterSpacing: 1,
  },
  completedSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(27, 67, 50, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyPayout: {
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    marginVertical: theme.spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    maxWidth: '80%',
  },
  emptyBtn: {
    width: '60%',
  },
  emptyHistory: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
});
