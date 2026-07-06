import React, { useState, useEffect } from 'react';
import { Tabs, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, TouchableOpacity, SafeAreaView, StatusBar, Share, Alert, Clipboard } from 'react-native';
import { theme } from '../../../src/theme';
import { Text } from '../../../src/components/common/Text';
import { api } from '../../../src/services/api';

export default function CircleLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [circleName, setCircleName] = useState('Circle');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    if (id) {
      api.getCircle(id)
        .then(res => {
          const c = res.circle || res;
          setCircleName(c.name);
          setInviteCode(c.invite_code);
        })
        .catch(err => {
          console.warn('[CircleLayout] Failed to load circle details:', err.message);
        });
    }
  }, [id]);

  const handleShare = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join my Qova savings circle! Use my invite code: ${inviteCode}`,
      });
    } catch (e) {
      console.warn('[Share] Share failed:', e);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.headerContainer}>
        {Array.from({ length: 22 }).map((_, index) => {
          const opacity = Math.max(0, 1 - (index / 22));
          return (
            <View
              key={`gradient-step-${index}`}
              style={{
                position: 'absolute',
                top: index * 7,
                left: 0,
                right: 0,
                height: 8,
                backgroundColor: '#1B4332',
                opacity: opacity * 0.95,
              }}
            />
          );
        })}
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerCenterArea}>
              <Text variant="h2" weight="bold" color={theme.colors.secondary} numberOfLines={2} style={{ textAlign: 'center' }}>
                {circleName}
              </Text>
            </View>

            <TouchableOpacity style={styles.settingsButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerBottomRow}>
            <Text variant="tiny" color={theme.colors.text.secondary} style={{ textAlign: 'center', marginBottom: 8 }}>
              Active Savings Group
            </Text>
            
            <TouchableOpacity
              style={styles.invitePill}
              activeOpacity={0.8}
              onPress={() => {
                if (inviteCode) {
                  Clipboard.setString(inviteCode);
                  Alert.alert('Copied', 'Invite code copied to clipboard!');
                }
              }}
            >
              <Text variant="tiny" weight="bold" color={theme.colors.primary}>CODE: {inviteCode || '...'}</Text>
              <Ionicons name="copy-outline" size={10} color={theme.colors.primary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: 'rgba(0,0,0,0.3)',
          tabBarStyle: styles.floatingTabBar,
          tabBarLabelStyle: {
            fontFamily: theme.typography.fonts.body,
            fontSize: 10,
            fontWeight: '700',
            marginBottom: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'OVERVIEW',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="members"
          options={{
            title: 'MEMBERS',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'CHAT',
            tabBarStyle: { display: 'none' }, // Hide tab bar on chat
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'HISTORY',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "receipt" : "receipt-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: 'ADMIN',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "shield-half" : "shield-outline"} size={22} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  headerSafeArea: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    zIndex: 10,
  },
  headerContainer: {
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenterArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  headerBottomRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  invitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(27, 67, 50, 0.12)',
  },
  floatingTabBar: {
    position: 'absolute',
    bottom: 25,
    marginHorizontal: 20,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: 65,
    paddingBottom: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    paddingHorizontal: 10,
  },
});
