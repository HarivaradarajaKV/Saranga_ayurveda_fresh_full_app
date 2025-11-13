import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from '../ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe import - lazy load only when needed
function getApiService() {
    try {
        const apiModule = require('../services/api');
        return apiModule.apiService || apiModule.default || null;
    } catch (error) {
        console.error('Failed to import apiService:', error);
        return null;
    }
}

interface DashboardStats {
    total_users: number;
    total_products: number;
    total_revenue: number;
    total_orders: number;
}

const ADMIN_ROUTES = {
    PROFILE: '/admin/profile' as const,
    USERS: '/admin/users' as const,
    PRODUCTS: '/admin/products' as const,
    ANALYTICS: '/admin/analytics' as const,
    CATEGORIES: '/admin/categories' as const,
    COUPONS: '/admin/coupons' as const,
    COMBOS: '/admin/combos' as const,
    ORDERS: '/admin/orders' as const,
    REVIEWS: '/admin/reviews' as const,
} as const;

function AdminDashboardInner() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        total_users: 0,
        total_products: 0,
        total_revenue: 0,
        total_orders: 0,
    });
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const mountedRef = useRef(true);
    const fetchInProgressRef = useRef(false);

    const fetchStats = useCallback(async () => {
        // Prevent multiple simultaneous fetches
        if (fetchInProgressRef.current || !mountedRef.current) {
            return;
        }

        fetchInProgressRef.current = true;

        try {
            const service = getApiService();
            
            if (!service || typeof service.get !== 'function') {
                fetchInProgressRef.current = false;
                return;
            }

            const endpoints = service.ENDPOINTS || {};
            const statsEndpoint = endpoints.ADMIN_STATS || '/admin/stats';

            // Make API call with timeout protection and error wrapping
            let response: any = null;
            let timeoutId: ReturnType<typeof setTimeout> | null = null;
            
            try {
                const apiCall = service.get(statsEndpoint);
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new Error('Request timeout'));
                    }, 8000);
                });

                response = await Promise.race([apiCall, timeoutPromise]);
                
                // Clear timeout if request completed
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            } catch (apiError: any) {
                // Clear timeout on error
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                
                // Ignore abort/timeout errors silently
                if (apiError?.message === 'Request timeout' || apiError?.name === 'AbortError') {
                    if (mountedRef.current) {
                        setError('Request timed out. Please try again.');
                    }
                } else {
                    console.error('API call failed:', apiError);
                }
                
                fetchInProgressRef.current = false;
                return;
            }
            
            if (!mountedRef.current) {
                fetchInProgressRef.current = false;
                return;
            }

            // Handle response - API service returns { data: ... } or { error: ... }
            if (response && typeof response === 'object') {
                if (response.error) {
                    if (mountedRef.current) {
                        setError(response.error);
                    }
                } else if (response.data) {
                    const statsData = response.data;
                    if (mountedRef.current && typeof statsData === 'object') {
                        setStats({
                            total_users: Number(statsData.total_users || 0) || 0,
                            total_products: Number(statsData.total_products || 0) || 0,
                            total_revenue: Number(statsData.total_revenue || 0) || 0,
                            total_orders: Number(statsData.total_orders || 0) || 0,
                        });
                        setError(null);
                    }
                }
            }
        } catch (err: any) {
            if (!mountedRef.current) {
                fetchInProgressRef.current = false;
                return;
            }
            
            console.error('Error fetching stats:', err);
            // Don't set error - just silently fail and show zeros
        } finally {
            if (mountedRef.current) {
                fetchInProgressRef.current = false;
            }
        }
    }, []);

    const onRefresh = useCallback(async () => {
        if (fetchInProgressRef.current || !mountedRef.current) {
            if (mountedRef.current) {
                setRefreshing(false);
            }
            return;
        }
        
        if (mountedRef.current) {
            setRefreshing(true);
            setError(null);
        }
        
        try {
            await fetchStats();
        } catch (err) {
            console.error('Refresh error:', err);
        } finally {
            if (mountedRef.current) {
                setRefreshing(false);
            }
        }
    }, [fetchStats]);

    useEffect(() => {
        mountedRef.current = true;
        let authTimer: ReturnType<typeof setTimeout> | null = null;
        let statsTimer: ReturnType<typeof setTimeout> | null = null;
        let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
        
        // Auth check - non-blocking, delayed
        authTimer = setTimeout(async () => {
            if (!mountedRef.current) return;
            try {
                const role = await AsyncStorage.getItem('user_role');
                const token = await AsyncStorage.getItem('auth_token');
                
                if (!token || role !== 'admin') {
                    if (mountedRef.current) {
                        try {
                            router.replace('/auth/login');
                        } catch (e) {
                            console.error('Navigation error:', e);
                        }
                    }
                }
            } catch (err) {
                console.error('Auth check error:', err);
            }
        }, 1500);
        
        // Fetch stats in background - delayed to ensure component is fully mounted
        statsTimer = setTimeout(() => {
            if (mountedRef.current && !fetchInProgressRef.current) {
                fetchStats().catch((err) => {
                    console.error('Fetch stats error in useEffect:', err);
                });
            }
        }, 2000);

        return () => {
            mountedRef.current = false;
            fetchInProgressRef.current = false;
            
            // Clear all timers
            if (authTimer) {
                clearTimeout(authTimer);
                authTimer = null;
            }
            if (statsTimer) {
                clearTimeout(statsTimer);
                statsTimer = null;
            }
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = null;
            }
        };
    }, [fetchStats, router]);

    const safeNavigate = useCallback((route: string) => {
        if (!mountedRef.current) return;
        try {
            router.push(route as any);
        } catch (err) {
            console.error('Navigation error:', err);
        }
    }, [router]);

    const AdminCard = ({ title, value, icon, onPress, color = "#FF69B4" }: {
        title: string;
        value: number | string;
        icon: keyof typeof Ionicons.glyphMap;
        onPress: () => void;
        color?: string;
    }) => {
        return (
            <TouchableOpacity 
                style={[styles.card, { borderLeftColor: color }]} 
                onPress={onPress}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
                        <Ionicons name={icon} size={24} color={color} />
                    </View>
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={[styles.cardValue, { color: color }]}>{value}</Text>
            </TouchableOpacity>
        );
    };

    // Always show UI immediately - never block on API calls
    return (
        <SafeAreaView style={styles.safeArea}>
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
                                onPress={() => safeNavigate(ADMIN_ROUTES.PROFILE)}
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
                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setError(null);
                                fetchStats();
                            }}
                            style={styles.retryButtonSmall}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Dashboard Overview</Text>
                    <Text style={styles.headerSubtitle}>Welcome to your Saranga Ayurveda admin panel</Text>
                </View>

                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Key Metrics</Text>
                    <View style={styles.grid}>
                        <AdminCard
                            title="Total Users"
                            value={stats.total_users}
                            icon="people"
                            color="#4CAF50"
                            onPress={() => safeNavigate(ADMIN_ROUTES.USERS)}
                        />
                        <AdminCard
                            title="Products"
                            value={stats.total_products}
                            icon="cube"
                            color="#2196F3"
                            onPress={() => safeNavigate(ADMIN_ROUTES.PRODUCTS)}
                        />
                        <AdminCard
                            title="Orders"
                            value={stats.total_orders}
                            icon="receipt"
                            color="#FF9800"
                            onPress={() => safeNavigate(ADMIN_ROUTES.ORDERS)}
                        />
                        <AdminCard
                            title="Revenue"
                            value={`₹${stats.total_revenue}`}
                            icon="cash"
                            color="#9C27B0"
                            onPress={() => safeNavigate(ADMIN_ROUTES.ANALYTICS)}
                        />
                    </View>
                </View>

                <View style={styles.quickActionsSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#2196F3' }]}
                            onPress={() => safeNavigate(ADMIN_ROUTES.PRODUCTS)}
                        >
                            <Ionicons name="cube" size={28} color="#fff" />
                            <Text style={styles.quickActionTitle}>Products</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#FF69B4' }]}
                            onPress={() => safeNavigate(ADMIN_ROUTES.CATEGORIES)}
                        >
                            <Ionicons name="list" size={28} color="#fff" />
                            <Text style={styles.quickActionTitle}>Categories</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#FF9800' }]}
                            onPress={() => safeNavigate(ADMIN_ROUTES.ORDERS)}
                        >
                            <Ionicons name="cart" size={28} color="#fff" />
                            <Text style={styles.quickActionTitle}>Orders</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.quickActionCard, { backgroundColor: '#4CAF50' }]}
                            onPress={() => safeNavigate(ADMIN_ROUTES.USERS)}
                        >
                            <Ionicons name="people" size={28} color="#fff" />
                            <Text style={styles.quickActionTitle}>Users</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

export default function AdminDashboard() {
    return (
        <ErrorBoundary>
            <AdminDashboardInner />
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    errorBanner: {
        backgroundColor: '#ffebee',
        padding: 12,
        margin: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    errorText: {
        color: '#c62828',
        fontSize: 14,
        flex: 1,
    },
    retryButtonSmall: {
        backgroundColor: '#FF69B4',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
        marginLeft: 12,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15,
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginLeft: 8,
    },
    profileButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginLeft: 8,
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        marginBottom: 16,
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
    },
    card: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderLeftWidth: 4,
        marginBottom: 12,
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
    },
    quickActionCard: {
        width: '48%',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    quickActionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 12,
        textAlign: 'center',
    },
});
