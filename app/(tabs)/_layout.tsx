import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from '../WishlistContext';
import { useCart } from '../CartContext';
import { AnimatedTabBar } from '../navigation/AnimatedTabBar';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { wishlist = [] } = useWishlist() || {};
  const { getItemCount = () => 0 } = useCart() || {};

  const renderTabIcon = (iconName: keyof typeof Ionicons.glyphMap, focused: boolean) => (
    <Ionicons
      name={iconName}
      size={24}
      color={focused ? '#007AFF' : '#8E8E93'}
    />
  );

  const renderBadgedIcon = (
    iconName: keyof typeof Ionicons.glyphMap,
    focused: boolean,
    count: number
  ) => (
    <View>
      {renderTabIcon(iconName, focused)}
      {count > 0 && (
        <View style={{
          position: 'absolute',
          top: -5,
          right: -10,
          backgroundColor: '#ff4444',
          borderRadius: 10,
          width: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 12 }}>{count}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
      tabBar={props => <AnimatedTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => renderTabIcon(
            focused ? 'home' : 'home-outline',
            focused
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => renderTabIcon(
            focused ? 'search' : 'search-outline',
            focused
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ focused }) => renderBadgedIcon(
            focused ? 'heart' : 'heart-outline',
            focused,
            wishlist?.length || 0
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ focused }) => renderBadgedIcon(
            focused ? 'cart' : 'cart-outline',
            focused,
            getItemCount()
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => renderTabIcon(
            focused ? 'person' : 'person-outline',
            focused
          ),
        }}
      />
    </Tabs>
  );
}
