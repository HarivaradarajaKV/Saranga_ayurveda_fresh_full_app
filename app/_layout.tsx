import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import * as RN from 'react-native';
import 'react-native-reanimated';

const DEFAULT_FONT = 'CormorantGaramond-Medium';

const OriginalText = RN.Text;
const OriginalTextInput = RN.TextInput;

const mergeDefaultFont = (originalStyle: any) => {
  const DEFAULT_FONT = 'CormorantGaramond-Medium';
  const BOLD_FONT = 'CormorantGaramond-Bold';

  try {
    const flatStyle = RN.StyleSheet.flatten(originalStyle) || {};
    if (flatStyle.fontFamily) {
      return originalStyle;
    }

    const weight = flatStyle.fontWeight;
    const isBold = weight === 'bold' || weight === '700' || weight === '800' || weight === '900' || weight === '600';
    
    return [
      originalStyle,
      {
        fontFamily: isBold ? BOLD_FONT : DEFAULT_FONT,
        fontWeight: undefined,
      }
    ];
  } catch (e) {
    return [{ fontFamily: DEFAULT_FONT }, originalStyle];
  }
};

const CustomText = React.forwardRef((props: any, ref: any) => {
  const { style, children, ...rest } = props;
  return (
    <OriginalText {...rest} ref={ref} style={mergeDefaultFont(style)}>
      {children}
    </OriginalText>
  );
});

Object.keys(OriginalText).forEach((key) => {
  try {
    (CustomText as any)[key] = (OriginalText as any)[key];
  } catch (e) {}
});
CustomText.displayName = 'Text';

const CustomTextInput = React.forwardRef((props: any, ref: any) => {
  const { style, ...rest } = props;
  return (
    <OriginalTextInput {...rest} ref={ref} style={mergeDefaultFont(style)} />
  );
});

Object.keys(OriginalTextInput).forEach((key) => {
  try {
    (CustomTextInput as any)[key] = (OriginalTextInput as any)[key];
  } catch (e) {}
});
CustomTextInput.displayName = 'TextInput';

try {
  (RN as any).Text = CustomText;
  (RN as any).TextInput = CustomTextInput;
} catch (e) {
  try {
    Object.defineProperty(RN, 'Text', {
      value: CustomText,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(RN, 'TextInput', {
      value: CustomTextInput,
      writable: true,
      configurable: true,
    });
  } catch (err) {
    console.error('Failed to patch react-native exports:', err);
  }
}
import CartProvider from './CartContext';
import WishlistProvider from './WishlistContext';
import { CategoryProvider } from './CategoryContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import AddressProvider from './AddressContext';
import { OrderProvider } from './OrderContext';
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
    'CormorantGaramond-Regular': require('../assets/fonts/CormorantGaramond-Regular.ttf'),
    'CormorantGaramond-Medium': require('../assets/fonts/CormorantGaramond-Medium.ttf'),
    'CormorantGaramond-Bold': require('../assets/fonts/CormorantGaramond-Bold.ttf'),
  });

  useEffect(() => {
    if (error) {
      console.error('Font loading error:', error);
      // Don't throw error, just log it and continue without the font
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) {
      // Hide splash screen even if font loading failed
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Show loading state only if fonts are still loading and no error
  if (!loaded && !error) {
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
