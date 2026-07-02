import React, { useState, useEffect } from 'react';
import { Tabs, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, TouchableOpacity, SafeAreaView, StatusBar, Share } from 'react-native';
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
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.secondary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text variant="h3" weight="bold" color={theme.colors.secondary}>{circleName}</Text>
            <Text variant="tiny" color={theme.colors.text.secondary}>INVITE CODE: {inviteCode || '...'}</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={theme.colors.secondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

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
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    zIndex: 10, // Ensure header stays above scroll
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
