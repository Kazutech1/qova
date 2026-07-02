import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
} from 'react-native-reanimated';
import { theme } from '../src/theme';
import { Text } from '../src/components/common/Text';
import { api } from '../src/services/api';

const { width, height } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.45;

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

export default function HomeScreen() {
  const router = useRouter();
  const [reliabilityScore, setReliabilityScore] = useState<number | null>(null);
  const [reliabilityLabel, setReliabilityLabel] = useState<string | null>(null);

  const b1Y = useSharedValue(0);
  const b1Scale = useSharedValue(1);
  const b2Y = useSharedValue(0);
  const b2Scale = useSharedValue(1);

  useEffect(() => {
    b1Y.value = withRepeat(withSequence(withTiming(-12, { duration: 3000 }), withTiming(12, { duration: 3000 })), -1, true);
    b1Scale.value = withRepeat(withTiming(1.04, { duration: 2500 }), -1, true);
    
    b2Y.value = withRepeat(withSequence(withTiming(10, { duration: 3500 }), withTiming(-10, { duration: 3500 })), -1, true);
    b2Scale.value = withRepeat(withTiming(1.06, { duration: 2800 }), -1, true);
  }, []);

  useEffect(() => {
    async function fetchScore() {
      try {
        const data = await api.getReliabilityScore();
        setReliabilityScore(data.score);
        setReliabilityLabel(data.label);
      } catch (error) {
        console.warn('Failed to fetch reliability score:', error);
      }
    }
    fetchScore();
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: b1Y.value }, { scale: b1Scale.value }],
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: b2Y.value }, { scale: b2Scale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundPattern />
      
      <View style={styles.header}>
        <Text variant="h2" weight="bold" color={theme.colors.secondary} style={styles.title}>
          Choose your path.
        </Text>
        <Text variant="body" color={theme.colors.text.secondary} style={styles.subtitle}>
          Select a mode to continue.
        </Text>
      </View>

      <View style={styles.circleContainer}>
        {/* Create Circle (No Icons) */}
        <Animated.View style={[styles.circle, styles.createCircle, animatedStyle1]}>
          <TouchableOpacity 
            style={styles.touchArea} 
            onPress={() => router.push('/create-circle')}
            activeOpacity={0.8}
          >
            <Text variant="h2" weight="bold" color="#FFFFFF">Create</Text>
            <View style={styles.tapIndicator}>
              <Text variant="tiny" weight="bold" color="#FFFFFF">TAP TO START</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Join Circle (No Icons) */}
        <Animated.View style={[styles.circle, styles.joinCircle, animatedStyle2]}>
          <TouchableOpacity 
            style={styles.touchArea} 
            onPress={() => router.push('/join-circle')}
            activeOpacity={0.8}
          >
            <Text variant="h2" weight="bold" color="#FFFFFF">Join</Text>
            <View style={styles.tapIndicator}>
              <Text variant="tiny" weight="bold" color="#FFFFFF">TAP TO ENTER</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.infoRow}>
          <Text variant="caption" weight="bold" color={theme.colors.secondary}>RELIABILITY SCORE</Text>
          <Text variant="caption" color={theme.colors.text.secondary}>
            {reliabilityScore !== null ? `${reliabilityScore}% (${reliabilityLabel})` : 'UNRATED'}
          </Text>
        </View>
        <Text variant="tiny" color={theme.colors.text.secondary} style={styles.disclaimer}>
          Secure protocol powered by Nomba.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 100,
    justifyContent: 'space-around',
    alignItems: 'center',
    opacity: 0.1,
  },
  patternRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#000',
  },
  header: {
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.6,
  },
  circleContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 40,
    zIndex: 10,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createCircle: {
    backgroundColor: theme.colors.primary,
  },
  joinCircle: {
    backgroundColor: theme.colors.secondary,
  },
  touchArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapIndicator: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  footer: {
    padding: theme.spacing.xl,
    paddingBottom: 40,
    alignItems: 'center',
    zIndex: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
  },
  disclaimer: {
    textAlign: 'center',
    opacity: 0.5,
  },
});
