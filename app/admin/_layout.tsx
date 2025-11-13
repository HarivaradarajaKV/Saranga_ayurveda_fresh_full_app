import { Stack } from 'expo-router';
import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

export default function AdminLayout() {
    // Removed all auth checking from layout - let individual screens handle auth
    // This prevents navigation loops and crashes

    return (
        <ErrorBoundary>
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#1a1a1a',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                detachInactiveScreens: true,
                // Removed unmountOnBlur to prevent crashes when navigating
            }}
        >
            <Stack.Screen 
                name="index" 
                options={{ 
                    title: 'Admin Dashboard',
                }} 
            />
            <Stack.Screen 
                name="categories" 
                options={{ 
                    title: 'Manage Categories',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="products" 
                options={{ 
                    title: 'Manage Products',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="users" 
                options={{ 
                    title: 'Manage Users',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="orders" 
                options={{ 
                    title: 'Manage Orders',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="coupons" 
                options={{ 
                    title: 'Manage Coupons',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="combos" 
                options={{ 
                    title: 'Manage Combo Offers',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="profile" 
                options={{ 
                    title: 'Admin Profile',
                    animation: 'slide_from_right',
                }} 
            />
        </Stack>
        </ErrorBoundary>
    );
} 