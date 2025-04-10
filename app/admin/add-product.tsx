import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import AdminProducts from './products';

export default function AddProductScreen() {
    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <Stack.Screen 
                options={{
                    title: 'Add New Product',
                    headerShown: true,
                }}
            />
            <View style={styles.formContainer}>
                <AdminProducts initialShowAddForm={true} />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    formContainer: {
        flex: 1,
    },
}); 