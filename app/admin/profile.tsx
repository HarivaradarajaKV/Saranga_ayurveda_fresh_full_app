import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';

export default function AdminProfile() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        try {
            setLoading(true);
            const response = await apiService.logout();
            if (response.error) {
                throw new Error(response.error);
            }
            router.replace('/auth/login');
        } catch (error) {
            Alert.alert('Error', 'Failed to logout. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Stack.Screen 
                options={{
                    title: 'Admin Profile',
                }}
            />
            <View style={styles.container}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person-circle" size={80} color="#FF69B4" />
                    </View>
                    <Text style={styles.adminTitle}>Administrator</Text>
                    <Text style={styles.adminEmail}>admin@example.com</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>
                    <TouchableOpacity style={styles.menuItem}>
                        <Ionicons name="key-outline" size={24} color="#666" />
                        <Text style={styles.menuText}>Change Password</Text>
                        <Ionicons name="chevron-forward" size={24} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem}>
                        <Ionicons name="notifications-outline" size={24} color="#666" />
                        <Text style={styles.menuText}>Notifications</Text>
                        <Ionicons name="chevron-forward" size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="log-out-outline" size={24} color="#fff" />
                            <Text style={styles.logoutText}>Logout</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    profileHeader: {
        backgroundColor: '#fff',
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff5f7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    adminTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    adminEmail: {
        fontSize: 16,
        color: '#666',
    },
    section: {
        backgroundColor: '#fff',
        marginTop: 20,
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        marginLeft: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#FF69B4',
        marginHorizontal: 16,
        marginTop: 32,
        padding: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
}); 