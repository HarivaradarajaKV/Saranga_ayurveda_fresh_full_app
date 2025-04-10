import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { UserDetailsModal } from './components/UserDetailsModal';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
    total_orders: number;
    total_spent: number;
    created_at: string;
    last_login: string;
    status: 'active' | 'inactive' | 'blocked';
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        pincode?: string;
    };
    preferences?: {
        notifications?: boolean;
        newsletter?: boolean;
    };
}

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchUsers = async () => {
        try {
            const response = await apiService.get(apiService.ENDPOINTS.ADMIN_USERS);
            if (response.data) {
                setUsers(response.data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchUsers();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdateUserStatus = async (userId: number, newStatus: User['status']) => {
        try {
            await apiService.put(`${apiService.ENDPOINTS.ADMIN_USERS}/${userId}/status`, {
                status: newStatus
            });
            await fetchUsers();
        } catch (error) {
            console.error('Error updating user status:', error);
            Alert.alert('Error', 'Failed to update user status');
        }
    };

    const handleUpdateUserRole = async (userId: number, newRole: User['role']) => {
        Alert.alert(
            'Update User Role',
            `Are you sure you want to make this user an ${newRole}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Update',
                    onPress: async () => {
                        try {
                            await apiService.put(`${apiService.ENDPOINTS.ADMIN_USERS}/${userId}/role`, {
                                role: newRole
                            });
                            await fetchUsers();
                        } catch (error) {
                            console.error('Error updating user role:', error);
                            Alert.alert('Error', 'Failed to update user role');
                        }
                    },
                },
            ]
        );
    };

    const getStatusColor = (status: User['status']) => {
        switch (status) {
            case 'active':
                return '#4CAF50';
            case 'inactive':
                return '#FFA500';
            case 'blocked':
                return '#DC143C';
            default:
                return '#666';
        }
    };

    const handleUserPress = (user: User) => {
        setSelectedUser(user);
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedUser(null);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF69B4" />
            </View>
        );
    }

    return (
        <>
            <Stack.Screen 
                options={{
                    title: 'Users',
                    headerRight: () => (
                        <TouchableOpacity style={styles.headerButton}>
                            <Ionicons name="filter" size={24} color="#000" />
                        </TouchableOpacity>
                    ),
                }}
            />
            <ScrollView 
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {users.map((user) => (
                    <TouchableOpacity 
                        key={user.id} 
                        style={styles.userCard}
                        onPress={() => handleUserPress(user)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.userHeader}>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{user.name}</Text>
                                <Text style={styles.userEmail}>{user.email}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.status) }]}>
                                <Text style={styles.statusText}>{user.status}</Text>
                            </View>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Role</Text>
                                <Text style={styles.statValue}>{user.role}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Orders</Text>
                                <Text style={styles.statValue}>{user.total_orders}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Total Spent</Text>
                                <Text style={styles.statValue}>₹{user.total_spent}</Text>
                            </View>
                        </View>

                        <View style={styles.dateInfo}>
                            <Text style={styles.dateText}>
                                Joined: {new Date(user.created_at).toLocaleDateString()}
                            </Text>
                            <Text style={styles.dateText}>
                                Last Login: {new Date(user.last_login).toLocaleDateString()}
                            </Text>
                        </View>

                        <View style={styles.actionButtons}>
                            {user.role !== 'admin' && (
                                <TouchableOpacity 
                                    style={[styles.actionButton, { backgroundColor: '#4169E1' }]}
                                    onPress={() => handleUpdateUserRole(user.id, 'admin')}
                                >
                                    <Text style={styles.actionButtonText}>Make Admin</Text>
                                </TouchableOpacity>
                            )}
                            {user.status === 'active' && (
                                <TouchableOpacity 
                                    style={[styles.actionButton, { backgroundColor: '#FFA500' }]}
                                    onPress={() => handleUpdateUserStatus(user.id, 'inactive')}
                                >
                                    <Text style={styles.actionButtonText}>Deactivate</Text>
                                </TouchableOpacity>
                            )}
                            {user.status === 'inactive' && (
                                <TouchableOpacity 
                                    style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                                    onPress={() => handleUpdateUserStatus(user.id, 'active')}
                                >
                                    <Text style={styles.actionButtonText}>Activate</Text>
                                </TouchableOpacity>
                            )}
                            {user.status !== 'blocked' && (
                                <TouchableOpacity 
                                    style={[styles.actionButton, { backgroundColor: '#DC143C' }]}
                                    onPress={() => handleUpdateUserStatus(user.id, 'blocked')}
                                >
                                    <Text style={styles.actionButtonText}>Block</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <UserDetailsModal
                user={selectedUser}
                visible={modalVisible}
                onClose={handleCloseModal}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerButton: {
        marginRight: 15,
    },
    userCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        margin: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    userHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    dateInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dateText: {
        fontSize: 12,
        color: '#666',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
}); 