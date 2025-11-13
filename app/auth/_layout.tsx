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
            const userRole = await AsyncStorage.getItem('user_role');
            
            if (token) {
                // Use stored role if available, otherwise decode from token
                let role = userRole;
                if (!role) {
                    try {
                        const decodedToken = JSON.parse(atob(token.split('.')[1]));
                        role = decodedToken.role;
                        // Store role for future use
                        if (role) {
                            await AsyncStorage.setItem('user_role', role);
                        }
                    } catch (decodeError) {
                        console.error('Error decoding token:', decodeError);
                    }
                }
                
                if (role === 'admin') {
                    router.replace('/admin/dashboard');
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