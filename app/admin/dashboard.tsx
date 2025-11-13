import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Buffer } from 'buffer';

export default function AdminDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const isMountedRef = React.useRef(true);

  const checkAdminAuth = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const role = await AsyncStorage.getItem('user_role');
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token || role !== 'admin') {
        if (isMountedRef.current) {
          // Use setTimeout to prevent navigation during render
          setTimeout(() => {
            if (isMountedRef.current) {
              Alert.alert('Unauthorized', 'You need to be an admin to access this page');
              try {
                router.replace('/auth/login');
              } catch (navError) {
                console.error('Navigation error:', navError);
              }
            }
          }, 100);
        }
        return;
      }

      // Get user name from token - using safe Base64 decode (no atob in RN)
      if (token && isMountedRef.current) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payloadPart = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const jsonString = Buffer.from(payloadPart, 'base64').toString('utf8');
            const tokenData = JSON.parse(jsonString);
            if (isMountedRef.current) {
              setUserName(tokenData?.name || 'Admin');
            }
          } else if (isMountedRef.current) {
            setUserName('Admin');
          }
        } catch (parseError) {
          console.error('Error parsing token:', parseError);
          if (isMountedRef.current) setUserName('Admin');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      if (isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            try {
              router.replace('/auth/login');
            } catch (navError) {
              console.error('Navigation error in catch:', navError);
            }
          }
        }, 100);
      }
    }
  }, [router]);

  useEffect(() => {
    isMountedRef.current = true;
    // Delay auth check to prevent navigation during initial render
    // Layout already handles auth, so this is just for user name
    const timer = setTimeout(() => {
      checkAdminAuth().catch((error) => {
        console.error('Auth check initialization error:', error);
      });
    }, 300);
    
    return () => {
      clearTimeout(timer);
      isMountedRef.current = false;
    };
  }, [checkAdminAuth]);

  const handleLogout = async () => {
    if (!isMountedRef.current) return;
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_role');
      if (isMountedRef.current) {
        try {
          router.replace('/auth/login');
        } catch (navError) {
          console.error('Navigation error during logout:', navError);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigateTo = (route: '/admin/products' | '/admin/categories' | '/admin/orders' | '/admin/users' | '/admin/coupons' | '/admin/combos' | '/admin/settings' | '/admin/add-product') => {
    if (!isMountedRef.current) return;
    try {
      if (!router || typeof router.push !== 'function') {
        console.error('Router not available');
        return;
      }
      if (route === '/admin/add-product') {
        router.push({ pathname: '/admin/products', params: { showAddForm: 'true' } });
      } else {
        router.push(route);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to navigate. Please try again.');
      }
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Admin Dashboard',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
            <Text style={styles.subtitle}>Admin Dashboard</Text>
          </View>

          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateTo('/admin/products')}
            >
              <Ionicons name="cube-outline" size={32} color="#1a1a1a" />
              <Text style={styles.menuText}>View Products</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.addProductItem]}
              onPress={() => navigateTo('/admin/add-product')}
            >
              <Ionicons name="add-circle-outline" size={32} color="#fff" />
              <Text style={[styles.menuText, styles.addProductText]}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateTo('/admin/categories')}
            >
              <Ionicons name="list-outline" size={32} color="#1a1a1a" />
              <Text style={styles.menuText}>Categories</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateTo('/admin/orders')}
            >
              <Ionicons name="cart-outline" size={32} color="#1a1a1a" />
              <Text style={styles.menuText}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateTo('/admin/users')}
            >
              <Ionicons name="people-outline" size={32} color="#1a1a1a" />
              <Text style={styles.menuText}>Users</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateTo('/admin/coupons')}
            >
              <Ionicons name="ticket-outline" size={32} color="#1a1a1a" />
              <Text style={styles.menuText}>Coupons</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateTo('/admin/combos')}
            >
              <Ionicons name="cube-outline" size={32} color="#1a1a1a" />
              <Text style={styles.menuText}>Combos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                try {
                  if (router && typeof router.push === 'function') {
                    router.push('/admin/reviews');
                  }
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }}
            >
              <Ionicons name="chatbubbles-outline" size={32} color="#1a1a1a" />
              <Text style={styles.menuText}>Reviews</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateTo('/admin/settings')}
            >
              <Ionicons name="settings-outline" size={32} color="#1a1a1a" />
              <Text style={styles.menuText}>Settings</Text>
            </TouchableOpacity> */}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addProductItem: {
    backgroundColor: '#FF69B4',
  },
  menuText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  addProductText: {
    color: '#fff',
  },
  logoutButton: {
    marginRight: 15,
  },
}); 