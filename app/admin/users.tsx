import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    SafeAreaView,
    Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
    const [visibleCount, setVisibleCount] = useState<number>(24);
    const isMountedRef = React.useRef(true);
    const visibleUsers = React.useMemo(() => users.slice(0, visibleCount), [users, visibleCount]);
    const loadMore = React.useCallback(() => setVisibleCount((prev) => prev + 18), []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Ensure modal is closed on unmount
            try {
                setModalVisible(false);
            } catch {}
        };
    }, []);

    // Also close modal quickly on blur to prevent stacking UI/memory
    useFocusEffect(
        React.useCallback(() => {
            return () => {
                try { setModalVisible(false); } catch {}
                try { setSelectedUser(null); } catch {}
            };
        }, [])
    );

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
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF69B4" />
                </View>
            </SafeAreaView>
        );
    }

    

    return (
        <SafeAreaView style={styles.safeArea}>
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
            <FlatList
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                data={visibleUsers}
                keyExtractor={(u) => String(u.id)}
                renderItem={({ item: user }) => (
                    <TouchableOpacity 
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
                )}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={true}
                removeClippedSubviews
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                windowSize={7}
                updateCellsBatchingPeriod={50}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 24 }}>No users found</Text>}
            />

            <UserDetailsModal
                user={selectedUser}
                visible={modalVisible}
                onClose={handleCloseModal}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        paddingBottom: Platform.OS === 'ios' ? 100 : 120, // Extra padding to ensure content is accessible above navigation buttons
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    headerButton: {
        marginRight: Platform.OS === 'ios' ? 15 : 12,
        padding: 4,
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
        flexWrap: 'wrap',
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 8,
        marginTop: 4,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
}); 