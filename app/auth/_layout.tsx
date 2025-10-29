import { Stack } from 'expo-router';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function AuthLayout() {
    const router = useRouter();

    useEffect(() => {
        checkExistingAuth();
    }, []);

    const checkExistingAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (token) {
                // Check if user is admin
                const decodedToken = JSON.parse(atob(token.split('.')[1]));
                if (decodedToken.role === 'admin') {
                    router.replace('/admin');
                } else {
                    router.replace('/(tabs)');
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    };

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                headerStyle: {
                    backgroundColor: '#fff',
                },
                headerTintColor: '#694d21',
                headerShadowVisible: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="login"
                options={{
                    headerShown: true,
                    headerTitle: 'Login',
                    headerBackVisible: true,
                }}
            />
            <Stack.Screen
                name="signup"
                options={{
                    headerShown: true,
                    headerTitle: 'Create Account',
                    headerBackVisible: true,
                }}
            />
            <Stack.Screen
                name="forgot-password"
                options={{
                    headerShown: true,
                    headerTitle: 'Reset Password',
                    headerBackVisible: true,
                }}
            />
        </Stack>
    );
} 