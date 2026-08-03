import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, StatusBar, useWindowDimensions, RefreshControl, ScrollView, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useCategories } from '../CategoryContext';
import ProductCard from '../components/ProductCard';
import ProductSearch from '../components/ProductSearch';
import { apiService } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const HEADER_LOGO = require('../assets/images/logo.png');

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string;
    image_url2?: string;
    image_url3?: string;
    usage_instructions?: string;
    size?: string;
    benefits?: string;
    ingredients?: string;
    product_details?: string;
    stock_quantity: number;
    created_at: string;
    offer_percentage: number;
    reviewCount?: number;
    image?: string;
}

interface CategoryDetailsResponse {
    id: number;
    name: string;
    description: string;
    image_url: string;
    parent_id: number | null;
    parent_name: string;
    product_count: number;
    products: Product[];
}

export default function CategoryPage() {
    const { id, name } = useLocalSearchParams();
    const { getCategoryById } = useCategories();
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifyEmail, setNotifyEmail] = useState('');
    const [notified, setNotified] = useState(false);
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const numColumns = windowWidth >= 768 ? 4 : windowWidth >= 480 ? 3 : 2;

    const category = getCategoryById(Number(id));

    useEffect(() => {
        fetchProducts();
    }, [id]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.getCategoryDetails<CategoryDetailsResponse>(Number(id));
            if (response.error) {
                throw new Error(response.error);
            }
            const productsData = response.data?.products || [];
            setProducts(productsData);
            setFilteredProducts(productsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setProducts([]);
            setFilteredProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm) ||
                (product.ingredients && product.ingredients.toLowerCase().includes(searchTerm)) ||
                (product.benefits && product.benefits.toLowerCase().includes(searchTerm)) ||
                (product.product_details && product.product_details.toLowerCase().includes(searchTerm))
            );
            setFilteredProducts(filtered);
        }
    };

    const handleNotifySubmit = async () => {
        if (!notifyEmail.trim()) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        try {
            await apiService.post('/submissions/coming-soon-notify', {
                email: notifyEmail.trim(),
                categoryName: name || 'category'
            });
            setNotified(true);
            setNotifyEmail('');
        } catch {
            setNotified(true);
            setNotifyEmail('');
        }
    };

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchProducts();
        } catch (e) {
            console.error('Error refreshing category products:', e);
        } finally {
            setRefreshing(false);
        }
    }, [id]);

    return (
        <>
            <Stack.Screen 
                options={{
                    title: name as string,
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: '#fbf7f4',
                    },
                    headerTintColor: '#2b3a1a',
                    headerTitleAlign: 'center',
                    headerTitleStyle: {
                        fontFamily: 'CormorantGaramond-Bold',
                        fontSize: 22,
                        color: '#2b3a1a',
                    },
                    headerShadowVisible: false,
                    contentStyle: {
                        backgroundColor: '#fbf7f4',
                    },
                    statusBarStyle: 'dark',
                }}
            />
            <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 0) }]}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#694d21" />
                    </View>
                ) : error ? (
                    <ScrollView
                        contentContainerStyle={styles.centerContainer}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#694d21" colors={['#694d21']} />
                        }
                    >
                        <Text style={styles.errorText}>{error}</Text>
                    </ScrollView>
                ) : filteredProducts.length === 0 ? (
                    <ScrollView
                        contentContainerStyle={styles.comingSoonScrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2b3a1a" colors={['#2b3a1a']} />
                        }
                    >
                        <View style={styles.comingSoonCard}>
                            <Image source={HEADER_LOGO} style={styles.brandLogo} resizeMode="contain" />

                            <Text style={styles.comingSoonTitle}>Coming Soon</Text>

                            <View style={styles.dividerRow}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.leafIconText}>🌿</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <Text style={styles.comingSoonDesc}>
                                We are crafting something special for you.{'\n'}
                                Our {name || 'products'} are on their way to bring freshness, balance, and natural elegance.
                            </Text>

                            <Text style={styles.stayTunedTitle}>Stay tuned!</Text>
                            <Text style={styles.stayTunedSub}>Good things take time.</Text>

                            <View style={styles.notifyBox}>
                                <View style={styles.notifyHeader}>
                                    <Ionicons name="mail-outline" size={18} color="#2b3a1a" />
                                    <Text style={styles.notifyTitle}>Get notified when we launch</Text>
                                </View>

                                {notified ? (
                                    <Text style={styles.notifiedText}>✓ Thank you! We will notify you.</Text>
                                ) : (
                                    <View style={styles.notifyInputRow}>
                                        <TextInput
                                            style={styles.notifyInput}
                                            placeholder="Enter your email"
                                            placeholderTextColor="#999"
                                            value={notifyEmail}
                                            onChangeText={setNotifyEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                        <TouchableOpacity style={styles.notifyButton} onPress={handleNotifySubmit}>
                                            <Text style={styles.notifyButtonText}>Notify Me</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                ) : (
                    <FlatList
                        key={numColumns}
                        data={filteredProducts}
                        renderItem={({ item }) => (
                            <View style={[styles.productItem, { maxWidth: `${100 / numColumns}%` }]}>
                                <ProductCard product={item} />
                            </View>
                        )}
                        keyExtractor={item => item.id.toString()}
                        numColumns={numColumns}
                        contentContainerStyle={styles.productGrid}
                        columnWrapperStyle={styles.productRow}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#694d21"
                                colors={['#694d21']}
                            />
                        }
                    />
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fbf7f4',
    },
    header: {
        padding: 16,
        backgroundColor: '#fbf7f4',
    },
    categoryName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    productCount: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
    },
    productGrid: {
        padding: 8,
        paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    },
    productItem: {
        flex: 1,
        margin: 4,
        maxWidth: '50%',
    },
    productRow: {
        justifyContent: 'space-between',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
        padding: 16,
    },
    noResultsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        padding: 16,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    comingSoonScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 16,
    },
    comingSoonCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e8e4df',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    brandLogo: {
        width: 60,
        height: 60,
        marginBottom: 10,
    },
    leafCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#eaf1e8',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    comingSoonTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#2b3a1a',
        fontFamily: Platform.OS === 'ios' ? 'Cormorant Garamond' : 'serif',
        marginBottom: 4,
        textAlign: 'center',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 140,
        marginVertical: 8,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#8da684',
    },
    leafIconText: {
        marginHorizontal: 8,
        fontSize: 12,
    },
    comingSoonDesc: {
        fontSize: 14,
        color: '#555555',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 14,
        paddingHorizontal: 8,
    },
    stayTunedTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2b3a1a',
        marginBottom: 2,
    },
    stayTunedSub: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#777777',
        marginBottom: 16,
    },
    notifyBox: {
        width: '100%',
        backgroundColor: '#faf8f5',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2ded8',
        padding: 14,
    },
    notifyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    notifyTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2b3a1a',
    },
    notifiedText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2b3a1a',
        textAlign: 'center',
        paddingVertical: 4,
    },
    notifyInputRow: {
        flexDirection: 'row',
        gap: 8,
    },
    notifyInput: {
        flex: 1,
        height: 40,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cccccc',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 13,
        color: '#222222',
    },
    notifyButton: {
        backgroundColor: '#2b3a1a',
        borderRadius: 8,
        paddingHorizontal: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifyButtonText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 'bold',
    },
}); 