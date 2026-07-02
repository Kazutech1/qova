import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { theme } from '../../../src/theme';
import { Text } from '../../../src/components/common/Text';
import { Ionicons } from '@expo/vector-icons';

export default function AdminSettings() {
  const [autoDebit, setAutoDebit] = React.useState(false);
  const [reminders, setReminders] = React.useState(true);

  const adminActions = [
    { id: '1', title: 'Edit Turn Order', icon: 'swap-vertical-outline', description: 'Manually adjust payout sequence' },
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
            <Text variant="body" weight="bold" color={theme.colors.secondary}>Auto-Debit Members</Text>
            <Text variant="tiny" color={theme.colors.text.secondary}>Automatically pull funds from linked accounts</Text>
          </View>
          <Switch 
            value={autoDebit} 
            onValueChange={setAutoDebit}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
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
          <TouchableOpacity key={action.id} style={styles.actionItem}>
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
});
