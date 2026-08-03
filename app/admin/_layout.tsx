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
                // detachInactiveScreens removed (not supported in NativeStack screen options)
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
                name="reviews" 
                options={{ 
                    title: 'Manage Reviews',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="new-arrivals" 
                options={{ 
                    title: 'Manage New Arrivals',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="best-sellers" 
                options={{ 
                    title: 'Manage Best Sellers',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="invoices" 
                options={{ 
                    title: 'Invoice Records',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="invoice-form" 
                options={{ 
                    title: 'Invoice Form',
                    animation: 'slide_from_right',
                }} 
            />
            <Stack.Screen 
                name="invoice-detail" 
                options={{ 
                    title: 'Invoice Detail',
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