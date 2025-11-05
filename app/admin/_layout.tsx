import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminLayout() {
    const router = useRouter();

    useEffect(() => {
        checkAdminAuth();
    }, []);

    const checkAdminAuth = async () => {
        try {
            const role = await AsyncStorage.getItem('user_role');
            const token = await AsyncStorage.getItem('auth_token');
            
            if (!token || role !== 'admin') {
                router.replace('/auth/login');
            }
        } catch (error) {
            console.error('Auth check error:', error);
            router.replace('/auth/login');
        }
    };

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#1a1a1a',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen 
                name="index" 
                options={{ 
                    title: 'Admin Dashboard'
                }} 
            />
            <Stack.Screen 
                name="categories" 
                options={{ 
                    title: 'Manage Categories',
                    animation: 'slide_from_right'
                }} 
            />
            <Stack.Screen 
                name="products" 
                options={{ 
                    title: 'Manage Products',
                    animation: 'slide_from_right'
                }} 
            />
            <Stack.Screen 
                name="users" 
                options={{ 
                    title: 'Manage Users',
                    animation: 'slide_from_right'
                }} 
            />
            <Stack.Screen 
                name="orders" 
                options={{ 
                    title: 'Manage Orders',
                    animation: 'slide_from_right'
                }} 
            />
            <Stack.Screen 
                name="coupons" 
                options={{ 
                    title: 'Manage Coupons',
                    animation: 'slide_from_right'
                }} 
            />
            <Stack.Screen 
                name="combos" 
                options={{ 
                    title: 'Manage Combo Offers',
                    animation: 'slide_from_right'
                }} 
            />
            <Stack.Screen 
                name="profile" 
                options={{ 
                    title: 'Admin Profile',
                    animation: 'slide_from_right'
                }} 
            />
        </Stack>
    );
} 