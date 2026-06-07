import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../services/authEvents';

/**
 * OAuth Callback Screen
 *
 * This screen is shown when the Google OAuth deep link fires:
 *   myapp://auth/callback?token=<jwt>          (production)
 *   exp://192.x.x.x:8081/--/auth/callback?token=<jwt>  (Expo Go)
 *
 * It replaces the default expo-router 404 "This screen doesn't exist" screen
 * that would otherwise flash for ~1 second before the login screen navigates away.
 */
export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; error?: string }>();

  useEffect(() => {
    const rawToken = params.token;
    const authError = params.error;

    // If there's an error or no token, go back to login
    if (authError || !rawToken) {
      console.error('[AuthCallback] OAuth error or missing token:', authError);
      router.replace('/auth/login');
      return;
    }

    const processToken = async () => {
      try {
        // Decode the URI-encoded JWT sent by the backend
        const token = decodeURIComponent(rawToken);
        const tokenData = JSON.parse(atob(token.split('.')[1]));

        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user_role', tokenData.role || 'user');
        if (tokenData.id) {
          await AsyncStorage.setItem('user_id', String(tokenData.id));
        }
        if (tokenData.name) {
          await AsyncStorage.setItem('name', tokenData.name);
          await AsyncStorage.setItem('user_name', tokenData.name);
        }

        authEvents.notify();

        // Navigate to the correct screen based on role
        if (tokenData.role === 'admin') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/(tabs)');
        }
      } catch (err) {
        console.error('[AuthCallback] Token processing failed:', err);
        router.replace('/(tabs)');
      }
    };

    processToken();
  }, [params.token, params.error]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3d5236" />
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf6f0',
    gap: 16,
  },
  text: {
    fontSize: 15,
    color: '#3d5236',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
