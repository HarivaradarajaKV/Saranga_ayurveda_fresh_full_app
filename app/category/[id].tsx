import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useCategories } from '../CategoryContext';
import ProductCard from '../components/ProductCard';
import ProductSearch from '../components/ProductSearch';
import { apiService } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const insets = useSafeAreaInsets();

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

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen 
                options={{
                    title: name as string,
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: '#fff',
                    },
                    headerShadowVisible: true,
                    headerTitleStyle: {
                        fontSize: 18,
                        fontWeight: '600',
                        color: '#000',
                    },
                    contentStyle: {
                        backgroundColor: '#fff',
                    },
                    statusBarStyle: 'dark',
                }}
            />
            <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 0) }]}>
                {filteredProducts.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.noResultsText}>
                            No products available in this category
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredProducts}
                        renderItem={({ item }) => (
                            <View style={styles.productItem}>
                                <ProductCard product={item} hideActions={true} />
                            </View>
                        )}
                        keyExtractor={item => item.id.toString()}
                        numColumns={2}
                        contentContainerStyle={styles.productGrid}
                        columnWrapperStyle={styles.productRow}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <View style={styles.header}>
                                <Text style={styles.categoryName}>{category?.name}</Text>
                                <Text style={styles.productCount}>
                                    {products.length} Products
                                </Text>
                                {category?.description && (
                                    <Text style={styles.description}>
                                        {category.description}
                                    </Text>
                                )}
                            </View>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    No products found in this category
                                </Text>
                            </View>
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
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
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
    }
}); 