import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from '../WishlistContext';
import { useCart } from '../CartContext';
import { AnimatedTabBar } from '../navigation/AnimatedTabBar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom hook to get bottom tab height
export const useBottomTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  return 60 + Math.max(insets.bottom, 4); // 60 is the base height of our tab bar
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { wishlist = [] } = useWishlist() || {};
  const { getItemCount = () => 0 } = useCart() || {};

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
        }
      }}
      tabBar={props => <AnimatedTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={'#694d21'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={24}
              color={'#694d21'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ focused }) => (
            <View>
              <Ionicons
                name={focused ? 'heart' : 'heart-outline'}
                size={24}
                color={'#694d21'}
              />
              {wishlist?.length > 0 && (
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
                  <Text style={{ color: '#fff', fontSize: 12 }}>{wishlist.length}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ focused }) => (
            <View>
              <Ionicons
                name={focused ? 'cart' : 'cart-outline'}
                size={24}
                color={'#694d21'}
              />
              {getItemCount() > 0 && (
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
                  <Text style={{ color: '#fff', fontSize: 12 }}>{getItemCount()}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={'#694d21'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
