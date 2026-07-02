import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { theme } from '../../src/theme';

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} translucent={false} />
      
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: 'rgba(27, 67, 50, 0.3)',
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
          name="home"
          options={{
            title: 'HOME',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'EXPLORE',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "compass" : "compass-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="savings"
          options={{
            title: 'VAULTS',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'YOU',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            ),
          }}
        />
        {/* Activity Tab removed as requested */}
        <Tabs.Screen
          name="activity"
          options={{
            href: null, // Hides the tab
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
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
