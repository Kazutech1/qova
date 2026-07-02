import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Text } from '../../src/components/common/Text';
import { Button } from '../../src/components/common/Button';

export default function DiscoverTab() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const featuredCircles = [
    { id: '1', name: 'Lagos Tech Professionals', amount: '₦100,000', frequency: 'Monthly', slots: '15/20', trustScore: '98' },
    { id: '2', name: 'Abuja Market Women', amount: '₦10,000', frequency: 'Weekly', slots: '8/12', trustScore: '95' },
    { id: '3', name: 'UniLag Alumni Circle', amount: '₦25,000', frequency: 'Monthly', slots: '2/10', trustScore: '92' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="h1" weight="bold" color={theme.colors.secondary}>Discover.</Text>
          <Text variant="body" color={theme.colors.text.secondary}>Find your next community savings group.</Text>
        </View>

        <TouchableOpacity 
          style={styles.inviteLinkBox}
          onPress={() => router.push('/join-circle')}
        >
          <View style={styles.inviteIcon}>
            <Ionicons name="link-outline" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.inviteText}>
            <Text variant="body" weight="bold" color={theme.colors.secondary}>Have an invite code?</Text>
            <Text variant="tiny" color={theme.colors.text.secondary}>Click here to paste a code and join privately.</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={theme.colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search circles by name or interest..."
            placeholderTextColor={theme.colors.text.secondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.section}>
          <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.sectionTitle}>
            FEATURED CIRCLES
          </Text>
          
          {featuredCircles.map(circle => (
            <View key={circle.id} style={styles.circleRow}>
              <View style={styles.circleInfo}>
                <Text variant="body" weight="bold" color={theme.colors.secondary}>{circle.name}</Text>
                <Text variant="tiny" color={theme.colors.text.secondary}>
                  {circle.amount} • {circle.frequency} • {circle.slots} Filled
                </Text>
              </View>
              <View style={styles.trustBadge}>
                <Text variant="tiny" weight="bold" color={theme.colors.primary}>{circle.trustScore}%</Text>
              </View>
              <TouchableOpacity style={styles.joinButton}>
                <Text variant="caption" weight="bold" color={theme.colors.primary}>JOIN</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.categories}>
          <Text variant="caption" weight="bold" color={theme.colors.text.secondary} style={styles.sectionTitle}>
            CATEGORIES
          </Text>
          <View style={styles.tagCloud}>
            {['Professionals', 'Students', 'Business', 'Family', 'Private', 'Public'].map(tag => (
              <TouchableOpacity key={tag} style={styles.tag}>
                <Text variant="caption" color={theme.colors.secondary}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
  inviteLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.15)',
    marginBottom: theme.spacing.xxl,
  },
  inviteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  inviteText: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    height: 52,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xxl,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fonts.body,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    letterSpacing: 2,
    marginBottom: theme.spacing.lg,
  },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  circleInfo: {
    flex: 1,
  },
  trustBadge: {
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginHorizontal: 12,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(27, 67, 50, 0.04)',
  },
  categories: {
    marginBottom: 40,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.2)',
    backgroundColor: theme.colors.surface,
  },
});
