import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Animated,
    Dimensions,
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
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
}

interface QuickActionProps {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    color: string;
    description: string;
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

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    
    // Animation values
    const fadeAnim = new Animated.Value(0);
    const slideAnim = new Animated.Value(50);
    const scaleAnim = new Animated.Value(0.95);

    const fetchStats = async () => {
        try {
            const response = await apiService.get(apiService.ENDPOINTS.ADMIN_STATS);
            if (response.data) {
                setStats(response.data);
                setLastUpdated(new Date());
                
                // Trigger animations when data loads
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        tension: 100,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                ]).start();
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

    const AdminCard = ({ title, value, icon, onPress, color = "#FF69B4", trend, trendValue }: AdminCardProps) => {
        const cardScale = new Animated.Value(1);
        
        const handlePressIn = () => {
            Animated.spring(cardScale, {
                toValue: 0.95,
                useNativeDriver: true,
            }).start();
        };
        
        const handlePressOut = () => {
            Animated.spring(cardScale, {
                toValue: 1,
                useNativeDriver: true,
            }).start();
        };

        const getTrendIcon = () => {
            switch (trend) {
                case 'up': return 'trending-up';
                case 'down': return 'trending-down';
                default: return 'remove';
            }
        };

        const getTrendColor = () => {
            switch (trend) {
                case 'up': return '#4CAF50';
                case 'down': return '#F44336';
                default: return '#666';
            }
        };

        return (
            <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                <TouchableOpacity 
                    style={[styles.card, { borderLeftColor: color }]} 
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
                            <Ionicons name={icon} size={24} color={color} />
                        </View>
                        {trend && trendValue && (
                            <View style={styles.trendContainer}>
                                <Ionicons 
                                    name={getTrendIcon()} 
                                    size={16} 
                                    color={getTrendColor()} 
                                />
                                <Text style={[styles.trendText, { color: getTrendColor() }]}>
                                    {trendValue}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={[styles.cardValue, { color: color }]}>{value}</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const handleAddProduct = () => {
        router.push('/admin/add-product');
    };

    const handleManageProducts = () => {
        router.push('/admin/products');
    };

    const handleManageCategories = () => {
        router.push('/admin/categories');
    };

    const QuickAction = ({ title, icon, onPress, color, description }: QuickActionProps) => {
        const actionScale = new Animated.Value(1);
        
        const handlePressIn = () => {
            Animated.spring(actionScale, {
                toValue: 0.95,
                useNativeDriver: true,
            }).start();
        };
        
        const handlePressOut = () => {
            Animated.spring(actionScale, {
                toValue: 1,
                useNativeDriver: true,
            }).start();
        };

        return (
            <Animated.View style={{ transform: [{ scale: actionScale }] }}>
                <TouchableOpacity
                    style={[styles.quickActionCard, { backgroundColor: color }]}
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={0.8}
                >
                    <View style={styles.quickActionIcon}>
                        <Ionicons name={icon} size={28} color="#fff" />
                    </View>
                    <Text style={styles.quickActionTitle}>{title}</Text>
                    <Text style={styles.quickActionDescription}>{description}</Text>
                </TouchableOpacity>
            </Animated.View>
        );
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
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                onPress={onRefresh}
                                style={styles.refreshButton}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="refresh" size={20} color="#FF69B4" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => router.push(ADMIN_ROUTES.PROFILE)}
                                style={styles.profileButton}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="person-circle-outline" size={28} color="#FF69B4" />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />
            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                <Animated.View 
                    style={[
                        styles.header,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Dashboard Overview</Text>
                        <Text style={styles.headerSubtitle}>Welcome to your Saranga Ayurveda admin panel</Text>
                        <Text style={styles.lastUpdated}>
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </Text>
                    </View>
                    <View style={styles.headerStats}>
                        <View style={styles.statBadge}>
                            <Ionicons name="pulse" size={16} color="#4CAF50" />
                            <Text style={styles.statBadgeText}>Live</Text>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View 
                    style={[
                        styles.statsSection,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <Text style={styles.sectionTitle}>Key Metrics</Text>
                    <View style={styles.grid}>
                        <AdminCard
                            title="Total Users"
                            value={stats?.total_users || 0}
                            icon="people"
                            color="#4CAF50"
                            trend="up"
                            trendValue="+12%"
                            onPress={() => router.push(ADMIN_ROUTES.USERS)}
                        />
                        <AdminCard
                            title="Products"
                            value={stats?.total_products || 0}
                            icon="cube"
                            color="#2196F3"
                            trend="up"
                            trendValue="+5%"
                            onPress={() => router.push(ADMIN_ROUTES.PRODUCTS)}
                        />
                        <AdminCard
                            title="Orders"
                            value={stats?.total_orders || 0}
                            icon="receipt"
                            color="#FF9800"
                            trend="up"
                            trendValue="+8%"
                            onPress={() => router.push(ADMIN_ROUTES.ORDERS)}
                        />
                        <AdminCard
                            title="Revenue"
                            value={`₹${stats?.total_revenue || 0}`}
                            icon="cash"
                            color="#9C27B0"
                            trend="up"
                            trendValue="+15%"
                            onPress={() => router.push(ADMIN_ROUTES.ANALYTICS)}
                        />
                    </View>
                </Animated.View>

                <Animated.View 
                    style={[
                        styles.quickActionsSection,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsGrid}>
                        <QuickAction
                            title="Add Product"
                            icon="add-circle"
                            color="#4CAF50"
                            description="Create new product"
                            onPress={handleAddProduct}
                        />
                        <QuickAction
                            title="Manage Categories"
                            icon="list"
                            color="#2196F3"
                            description="Organize products"
                            onPress={handleManageCategories}
                        />
                        <QuickAction
                            title="View Orders"
                            icon="receipt"
                            color="#FF9800"
                            description="Track orders"
                            onPress={() => router.push(ADMIN_ROUTES.ORDERS)}
                        />
                        <QuickAction
                            title="Manage Coupons"
                            icon="pricetag"
                            color="#E91E63"
                            description="Discount codes"
                            onPress={() => router.push(ADMIN_ROUTES.COUPONS)}
                        />
                    </View>
                </Animated.View>

                <Animated.View 
                    style={[
                        styles.recentActivitySection,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <View style={styles.activityCard}>
                        <View style={styles.activityItem}>
                            <View style={styles.activityIcon}>
                                <Ionicons name="add" size={16} color="#4CAF50" />
                            </View>
                            <View style={styles.activityContent}>
                                <Text style={styles.activityTitle}>New product added</Text>
                                <Text style={styles.activityTime}>2 minutes ago</Text>
                            </View>
                        </View>
                        <View style={styles.activityItem}>
                            <View style={styles.activityIcon}>
                                <Ionicons name="person-add" size={16} color="#2196F3" />
                            </View>
                            <View style={styles.activityContent}>
                                <Text style={styles.activityTitle}>New user registered</Text>
                                <Text style={styles.activityTime}>5 minutes ago</Text>
                            </View>
                        </View>
                        <View style={styles.activityItem}>
                            <View style={styles.activityIcon}>
                                <Ionicons name="receipt" size={16} color="#FF9800" />
                            </View>
                            <View style={styles.activityContent}>
                                <Text style={styles.activityTitle}>Order completed</Text>
                                <Text style={styles.activityTime}>10 minutes ago</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginRight: 15,
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    profileButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        marginBottom: 16,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    lastUpdated: {
        fontSize: 12,
        color: '#999',
    },
    headerStats: {
        alignItems: 'flex-end',
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statBadgeText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '500',
    },
    statsSection: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    card: {
        width: (width - 44) / 2,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '500',
    },
    cardTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '500',
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    quickActionsSection: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    quickActionCard: {
        width: (width - 44) / 2,
        backgroundColor: '#4CAF50',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    quickActionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    quickActionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },
    quickActionDescription: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
    },
    recentActivitySection: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    activityCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    activityIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    activityTime: {
        fontSize: 12,
        color: '#666',
    },
}); 