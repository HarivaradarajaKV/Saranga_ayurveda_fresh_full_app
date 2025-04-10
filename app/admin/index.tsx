import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';

interface DashboardStats {
    total_users: number;
    total_products: number;
    total_revenue: number;
    total_orders: number;
}

interface AdminCardProps {
    title: string;
    value: number | string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
}

const ADMIN_ROUTES = {
    PROFILE: '/admin/profile' as const,
    USERS: '/admin/users' as const,
    PRODUCTS: '/admin/products' as const,
    ANALYTICS: '/admin/analytics' as const,
    NEW_PRODUCT: '/admin/products/new' as const,
    CATEGORIES: '/admin/categories' as const,
    COUPONS: '/admin/coupons' as const,
    ORDERS: '/admin/orders' as const,
} as const;

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const response = await apiService.get(apiService.ENDPOINTS.ADMIN_STATS);
            if (response.data) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const AdminCard = ({ title, value, icon, onPress }: AdminCardProps) => (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.cardIcon}>
                <Ionicons name={icon} size={24} color="#FF69B4" />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardValue}>{value}</Text>
        </TouchableOpacity>
    );

    const handleAddProduct = () => {
        router.push('/admin/add-product');
    };

    const handleManageProducts = () => {
        router.push('/admin/products');
    };

    const handleManageCategories = () => {
        router.push('/admin/categories');
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
                    title: 'Admin Dashboard',
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => router.push(ADMIN_ROUTES.PROFILE)}
                            style={[styles.headerButton, {
                                padding: 12,
                                marginRight: 15,
                                borderRadius: 25,
                                backgroundColor: '#f5f5f5',
                            }]}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="person-circle-outline" size={28} color="#FF69B4" />
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
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Dashboard Overview</Text>
                    <Text style={styles.headerSubtitle}>Welcome to your Saranga Ayurveda admin panel</Text>
                </View>

                <View style={styles.grid}>
                    <AdminCard
                        title="Total Users"
                        value={stats?.total_users || 0}
                        icon="people"
                        onPress={() => router.push(ADMIN_ROUTES.USERS)}
                    />
                    <AdminCard
                        title="Products"
                        value={stats?.total_products || 0}
                        icon="cube"
                        onPress={() => router.push(ADMIN_ROUTES.PRODUCTS)}
                    />
                    <AdminCard
                        title="Orders"
                        value={stats?.total_orders || 0}
                        icon="receipt"
                        onPress={() => router.push(ADMIN_ROUTES.ORDERS)}
                    />
                    <AdminCard
                        title="Revenue"
                        value={`₹${stats?.total_revenue || 0}`}
                        icon="cash"
                        onPress={() => router.push(ADMIN_ROUTES.ANALYTICS)}
                    />
                </View>

                <View style={styles.quickActions}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.addProductButton]}
                            onPress={handleAddProduct}
                        >
                            <Ionicons name="add-circle" size={24} color="#fff" />
                            <Text style={styles.actionButtonText}>Add Product</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.manageCategoriesButton]}
                            onPress={handleManageCategories}
                        >
                            <Ionicons name="list" size={24} color="#fff" />
                            <Text style={styles.actionButtonText}>Manage Categories</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.manageOrdersButton]}
                            onPress={() => router.push(ADMIN_ROUTES.ORDERS)}
                        >
                            <Ionicons name="receipt" size={24} color="#fff" />
                            <Text style={styles.actionButtonText}>Manage Orders</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.manageCouponsButton]}
                            onPress={() => router.push(ADMIN_ROUTES.COUPONS)}
                        >
                            <Ionicons name="pricetag" size={24} color="#fff" />
                            <Text style={styles.actionButtonText}>Manage Coupons</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
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
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 10,
        justifyContent: 'space-between',
    },
    card: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff5f7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    cardValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    quickActions: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 15,
    },
    actionButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 10,
        minWidth: '48%',
    },
    addProductButton: {
        backgroundColor: '#28a745',
    },
    manageCategoriesButton: {
        backgroundColor: '#007bff',
    },
    manageOrdersButton: {
        backgroundColor: '#4CAF50',
    },
    manageCouponsButton: {
        backgroundColor: '#FF69B4',
    },
    actionButtonText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    headerButton: {
        padding: 10,
        marginRight: 10,
        borderRadius: 20,
    },
}); 