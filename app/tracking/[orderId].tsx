import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';

interface TrackingUpdate {
    status: string;
    date: string;
    activity: string;
    location: string;
}

export default function TrackingScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [trackingData, setTrackingData] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        loadTrackingData();
    }, []);

    const loadTrackingData = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await apiService.get(`/shiprocket/track/${params.orderId}`);

            if (response.data) {
                setTrackingData(response.data.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load tracking information');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadTrackingData();
    };

    if (loading) {
        return (
            <View style={{ flex: 1 }}>
                <LinearGradient
                    colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
                    style={StyleSheet.absoluteFill}
                />
                <SafeAreaView style={styles.safeArea}>
                    <Stack.Screen
                        options={{
                            title: 'Track Shipment',
                            headerStyle: {
                                backgroundColor: '#f8f6f0',
                            },
                            headerTintColor: '#694d21',
                            headerTitleStyle: {
                                fontWeight: '700',
                            },
                        }}
                    />
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#694d21" />
                        <Text style={styles.loadingText}>Loading tracking info...</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (error) {
        return (
            <View style={{ flex: 1 }}>
                <LinearGradient
                    colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
                    style={StyleSheet.absoluteFill}
                />
                <SafeAreaView style={styles.safeArea}>
                    <Stack.Screen
                        options={{
                            title: 'Track Shipment',
                            headerStyle: {
                                backgroundColor: '#f8f6f0',
                            },
                            headerTintColor: '#694d21',
                        }}
                    />
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={loadTrackingData}>
                            <LinearGradient
                                colors={['#694d21', '#5a3f1a']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.retryButtonGradient}
                            >
                                <Text style={styles.retryText}>Retry</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={styles.safeArea}>
                <StatusBar backgroundColor="#f8f6f0" barStyle="dark-content" />
                <Stack.Screen
                    options={{
                        title: 'Track Shipment',
                        headerStyle: {
                            backgroundColor: '#f8f6f0',
                        },
                        headerTintColor: '#694d21',
                        headerTitleStyle: {
                            fontWeight: '700',
                        },
                    }}
                />
                <ScrollView
                    style={styles.container}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#694d21']} />
                    }
                >
                    {trackingData && (
                        <View style={styles.content}>
                            {/* AWB Number */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="barcode-outline" size={24} color="#694d21" />
                                    <Text style={styles.cardTitle}>Tracking Number</Text>
                                </View>
                                <Text style={styles.awbNumber}>{trackingData.awb_code || 'N/A'}</Text>
                            </View>

                            {/* Current Status */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="cube-outline" size={24} color="#694d21" />
                                    <Text style={styles.cardTitle}>Current Status</Text>
                                </View>
                                <Text style={styles.statusText}>
                                    {trackingData.tracking_data?.shipment_status || 'Processing'}
                                </Text>
                                {trackingData.tracking_data?.edd && (
                                    <View style={styles.eddBadge}>
                                        <Ionicons name="time-outline" size={16} color="#fff" />
                                        <Text style={styles.eddText}>
                                            Expected: {new Date(trackingData.tracking_data.edd).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Tracking Timeline */}
                            {trackingData.tracking_data?.shipment_track && trackingData.tracking_data.shipment_track.length > 0 && (
                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="list-outline" size={24} color="#694d21" />
                                        <Text style={styles.cardTitle}>Tracking History</Text>
                                    </View>
                                    <View style={styles.timeline}>
                                        {trackingData.tracking_data.shipment_track.map((track: any, index: number) => (
                                            <View key={index} style={styles.trackItem}>
                                                <View style={styles.trackDotContainer}>
                                                    <View style={[styles.trackDot, index === 0 && styles.trackDotActive]} />
                                                    {index < trackingData.tracking_data.shipment_track.length - 1 && (
                                                        <View style={styles.trackLine} />
                                                    )}
                                                </View>
                                                <View style={styles.trackContent}>
                                                    <Text style={styles.trackActivity}>{track.activity}</Text>
                                                    {track.location && (
                                                        <View style={styles.trackLocationRow}>
                                                            <Ionicons name="location-outline" size={14} color="#666" />
                                                            <Text style={styles.trackLocation}>{track.location}</Text>
                                                        </View>
                                                    )}
                                                    <Text style={styles.trackDate}>
                                                        {new Date(track.date).toLocaleString('en-IN', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    },
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        marginTop: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    retryButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    retryButtonGradient: {
        paddingHorizontal: 32,
        paddingVertical: 12,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        color: '#666',
        marginLeft: 8,
        fontWeight: '600',
    },
    awbNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#694d21',
        letterSpacing: 1,
    },
    statusText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2c3e50',
        textTransform: 'capitalize',
        marginBottom: 12,
    },
    eddBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#694d21',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    eddText: {
        fontSize: 14,
        color: '#fff',
        marginLeft: 6,
        fontWeight: '600',
    },
    timeline: {
        marginTop: 8,
    },
    trackItem: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    trackDotContainer: {
        alignItems: 'center',
        marginRight: 16,
    },
    trackDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#d0d0d0',
        borderWidth: 3,
        borderColor: '#e8e5e1',
    },
    trackDotActive: {
        backgroundColor: '#694d21',
        borderColor: '#fef3e8',
    },
    trackLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#e0e0e0',
        marginTop: 4,
        minHeight: 40,
    },
    trackContent: {
        flex: 1,
        paddingTop: 0,
    },
    trackActivity: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 6,
        lineHeight: 22,
    },
    trackLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    trackLocation: {
        fontSize: 14,
        color: '#666',
        marginLeft: 4,
    },
    trackDate: {
        fontSize: 13,
        color: '#999',
    },
});
