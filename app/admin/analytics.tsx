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
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';

interface ProductAnalytics {
    id: number;
    name: string;
    price: number;
    total_orders: number;
    total_units_sold: number;
    total_revenue: number;
    average_rating: number;
    review_count: number;
    wishlist_count: number;
}

export default function AdminAnalytics() {
    const [analytics, setAnalytics] = useState<ProductAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAnalytics = async () => {
        try {
            const response = await apiService.get(apiService.ENDPOINTS.ADMIN_ANALYTICS);
            if (response.data) {
                setAnalytics(response.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAnalytics();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const getTotalRevenue = () => {
        return analytics.reduce((sum, item) => sum + item.total_revenue, 0);
    };

    const getTotalUnitsSold = () => {
        return analytics.reduce((sum, item) => sum + item.total_units_sold, 0);
    };

    const getAverageRating = () => {
        const totalRating = analytics.reduce((sum, item) => sum + (item.average_rating * item.review_count), 0);
        const totalReviews = analytics.reduce((sum, item) => sum + item.review_count, 0);
        return totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : '0.0';
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
                    title: 'Analytics',
                    headerRight: () => (
                        <TouchableOpacity style={styles.headerButton}>
                            <Ionicons name="download" size={24} color="#000" />
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
                <View style={styles.overviewSection}>
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Ionicons name="cash" size={24} color="#FF69B4" />
                            <Text style={styles.statValue}>₹{getTotalRevenue()}</Text>
                            <Text style={styles.statLabel}>Total Revenue</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="cube" size={24} color="#FF69B4" />
                            <Text style={styles.statValue}>{getTotalUnitsSold()}</Text>
                            <Text style={styles.statLabel}>Units Sold</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="star" size={24} color="#FF69B4" />
                            <Text style={styles.statValue}>{getAverageRating()}</Text>
                            <Text style={styles.statLabel}>Avg Rating</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.productsSection}>
                    <Text style={styles.sectionTitle}>Product Performance</Text>
                    {analytics.map((product) => (
                        <View key={product.id} style={styles.productCard}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <View style={styles.productStats}>
                                <View style={styles.statRow}>
                                    <Text style={styles.statTitle}>Revenue</Text>
                                    <Text style={styles.statValue}>₹{product.total_revenue}</Text>
                                </View>
                                <View style={styles.statRow}>
                                    <Text style={styles.statTitle}>Units Sold</Text>
                                    <Text style={styles.statValue}>{product.total_units_sold}</Text>
                                </View>
                                <View style={styles.statRow}>
                                    <Text style={styles.statTitle}>Orders</Text>
                                    <Text style={styles.statValue}>{product.total_orders}</Text>
                                </View>
                                <View style={styles.statRow}>
                                    <Text style={styles.statTitle}>Rating</Text>
                                    <Text style={styles.statValue}>
                                        {product.average_rating.toFixed(1)} ({product.review_count})
                                    </Text>
                                </View>
                                <View style={styles.statRow}>
                                    <Text style={styles.statTitle}>Wishlist</Text>
                                    <Text style={styles.statValue}>{product.wishlist_count}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
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
    headerButton: {
        marginRight: 15,
    },
    overviewSection: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginVertical: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    productsSection: {
        padding: 16,
    },
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 12,
    },
    productStats: {
        gap: 8,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statTitle: {
        fontSize: 14,
        color: '#666',
    },
}); 