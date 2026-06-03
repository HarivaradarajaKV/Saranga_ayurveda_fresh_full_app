import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    TextInput,
    Alert,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';

interface Product {
    id: number;
    name: string;
    price: number;
    image_url: string;
    is_in_category?: boolean;
}

interface CategoryProductManagerProps {
    visible: boolean;
    onClose: () => void;
    categoryId: number;
    categoryName: string;
}

export default function CategoryProductManager({
    visible,
    onClose,
    categoryId,
    categoryName
}: CategoryProductManagerProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (visible) {
            fetchCategoryProducts();
        }
    }, [visible, categoryId]);

    const fetchCategoryProducts = async () => {
        try {
            setLoading(true);
            // First fetch generic products list to have "all products"
            const allProductsResponse = await apiService.getAdminProducts();

            // Then fetch products strictly in this category (with is_in_category flag)
            // Actually, my new endpoint returns is_in_category for linked products.
            // But we want a list of ALL products, with checks for those in the category.
            // So we need to:
            // 1. Get ALL products.
            // 2. Get Category Products (IDs).
            // 3. Merge.

            // Optimized approach: Get All Products, and Get Category Product IDs.
            const [allRes, catRes] = await Promise.all([
                apiService.getAdminProducts(),
                apiService.getCategoryProducts(categoryId)
            ]);

            if (allRes.data && catRes.data) {
                // CatRes returns products IN the category.
                const categoryProductIds = new Set(catRes.data.map((p: any) => Number(p.id)));

                setSelectedProductIds(categoryProductIds);
                setProducts(allRes.data as unknown as Product[]);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            Alert.alert('Error', 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const toggleProduct = (productId: number) => {
        const newSelected = new Set(selectedProductIds);
        if (newSelected.has(productId)) {
            newSelected.delete(productId);
        } else {
            newSelected.add(productId);
        }
        setSelectedProductIds(newSelected);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const idsList = Array.from(selectedProductIds);
            const response = await apiService.updateCategoryProducts(categoryId, idsList);

            if (response.error) {
                throw new Error(response.error);
            }

            Alert.alert('Success', 'Category products updated successfully');
            onClose();
        } catch (error) {
            console.error('Error updating category products:', error);
            Alert.alert('Error', 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Manage {categoryName}</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={styles.saveButton}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search products..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>
                        {selectedProductIds.size} products selected
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FF69B4" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredProducts}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item }) => {
                            const isSelected = selectedProductIds.has(item.id);
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.productItem,
                                        isSelected && styles.selectedItem
                                    ]}
                                    onPress={() => toggleProduct(item.id)}
                                >
                                    <View style={styles.productInfo}>
                                        <Text style={styles.productName}>{item.name}</Text>
                                        <Text style={styles.productPrice}>₹{item.price}</Text>
                                    </View>
                                    <Ionicons
                                        name={isSelected ? "checkbox" : "square-outline"}
                                        size={24}
                                        color={isSelected ? "#FF69B4" : "#ccc"}
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    closeButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    saveButton: {
        backgroundColor: '#FF69B4',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8f9fa',
        margin: 16,
        borderRadius: 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    statsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    statsText: {
        color: '#666',
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedItem: {
        backgroundColor: '#fff0f5',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        color: '#333',
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 14,
        color: '#666',
    },
});
