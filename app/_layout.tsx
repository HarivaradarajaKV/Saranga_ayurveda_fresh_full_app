import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import CartProvider from './CartContext';
import WishlistProvider from './WishlistContext';
import { CategoryProvider } from './CategoryContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import AddressProvider from './AddressContext';
import { OrderProvider } from './OrderContext';
import { customScreenAnimation } from './navigation/CustomScreenAnimation';
import { TransitionPresets } from '@react-navigation/stack';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CategoryProvider>
        <CartProvider>
          <WishlistProvider>
            <AddressProvider>
              <OrderProvider>
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
                <StatusBar style="auto" />
              </OrderProvider>
            </AddressProvider>
          </WishlistProvider>
        </CartProvider>
      </CategoryProvider>
    </ThemeProvider>
  );
}
