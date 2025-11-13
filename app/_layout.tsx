import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import CartProvider from './CartContext';
import WishlistProvider from './WishlistContext';
import { CategoryProvider } from './CategoryContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import AddressProvider from './AddressContext';
import { OrderProvider } from './OrderContext';
import { customScreenAnimation } from './navigation/CustomScreenAnimation';
import { TransitionPresets } from '@react-navigation/stack';
import { ErrorBoundary } from './ErrorBoundary';
import './globalErrorHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const userRole = await AsyncStorage.getItem('user_role');
        
        if (token && userRole === 'admin') {
          // Check if we're not already in admin section
          const currentRoute = segments[0];
          if (currentRoute !== 'admin' && currentRoute !== 'auth') {
            // Small delay to ensure navigation is ready
            setTimeout(() => {
              try {
                router.replace('/admin/dashboard');
              } catch (error) {
                console.error('Error redirecting to admin:', error);
              }
            }, 200);
          }
        }
        setHasCheckedAuth(true);
      } catch (error) {
        console.error('Error checking auth in root layout:', error);
        setHasCheckedAuth(true);
      }
    };

    // Wait a bit for navigation to be ready, then check auth
    const timer = setTimeout(() => {
      if (!hasCheckedAuth) {
        checkAuthAndRedirect();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [router, segments, hasCheckedAuth]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#fff' },
        animationDuration: 300,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ title: 'Saranga Ayurveda', headerShown: true }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <CategoryProvider>
          <CartProvider>
            <WishlistProvider>
              <AddressProvider>
                <OrderProvider>
                  <RootLayoutNav />
                  <StatusBar style="auto" />
                </OrderProvider>
              </AddressProvider>
            </WishlistProvider>
          </CartProvider>
        </CategoryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
