import React, { useState, useRef } from 'react';
import { View, StyleSheet, Image, Dimensions, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { Text } from '../../src/components/common/Text';
import { Button } from '../../src/components/common/Button';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Savings groups, without the organizer.',
    description: 'Qova digitizes Ajo, Esusu, and Susu — replacing the trust-based collector with a secure digital protocol.',
  },
  {
    id: '2',
    title: 'Your turn next.',
    description: 'Track your rotation cycle in real-time. Automated payouts ensure everyone receives their pot on time, every time.',
  },
  {
    id: '3',
    title: 'Build your credit score.',
    description: 'Consistent contributions build your reliability score, unlocking access to larger savings circles and micro-loans.',
  },
];

export default function OnboardingScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setActiveSlide(roundIndex);
  };

  const nextSlide = () => {
    if (activeSlide < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (activeSlide + 1) * width,
        animated: true,
      });
    } else {
      router.push('/onboarding/phone');
    }
  };

  // Simulation of the "Circle Dots" from the UI Kit
  const CircleDecoration = () => (
    <View style={styles.circleContainer}>
      {[...Array(8)].map((_, i) => {
        const angle = (i * 45) * (Math.PI / 180);
        const radius = 60;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        return (
          <View 
            key={i} 
            style={[
              styles.dot, 
              { 
                transform: [{ translateX: x }, { translateY: y }],
                backgroundColor: i < (activeSlide + 3) ? theme.colors.accent : '#D9D9D9'
              }
            ]} 
          />
        );
      })}
      <View style={styles.centerDot} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.decorationArea}>
              <CircleDecoration />
            </View>
            <View style={styles.content}>
              <Text variant="h1" weight="bold" color={theme.colors.secondary} align="center" style={styles.title}>
                {slide.title}
              </Text>
              <Text variant="body" color={theme.colors.text.secondary} align="center" style={styles.description}>
                {slide.description}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={activeSlide === SLIDES.length - 1 ? "Verify number" : "Continue"}
          onPress={nextSlide}
          style={styles.button}
        />
        
        <Text variant="caption" weight="medium" color={theme.colors.text.secondary} style={styles.supportsText}>
          Supports Local Banks • Paystack
        </Text>

        <TouchableOpacity onPress={() => router.push('/onboarding/phone')} style={styles.skip}>
          <Text variant="body" weight="medium" color={theme.colors.text.secondary}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  slide: {
    width,
    alignItems: 'center',
    paddingTop: height * 0.1,
  },
  decorationArea: {
    height: height * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  centerDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    backgroundColor: 'transparent',
  },
  content: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    marginBottom: theme.spacing.lg,
    lineHeight: 48,
  },
  description: {
    lineHeight: 24,
    paddingHorizontal: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  button: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  supportsText: {
    marginBottom: theme.spacing.lg,
  },
  skip: {
    padding: theme.spacing.sm,
  },
});
