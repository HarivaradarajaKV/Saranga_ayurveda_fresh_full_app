import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import EditProductForm from '../components/EditProductForm';

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
    average_rating?: number;
    review_count?: number;
}

export default function AdminProductDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        fetchProductDetails();
    }, [id]);

    const fetchProductDetails = async () => {
        try {
            setLoading(true);
            const response = await apiService.get(`${apiService.ENDPOINTS.PRODUCTS}/${id}`);
            if (response.data) {
                setProduct(response.data);
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            Alert.alert('Error', 'Failed to load product details');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.delete(`${apiService.ENDPOINTS.PRODUCTS}/${id}`);
                            Alert.alert('Success', 'Product deleted successfully');
                            router.back();
                        } catch (error) {
                            console.error('Error deleting product:', error);
                            Alert.alert('Error', 'Failed to delete product');
                        }
                    },
                },
            ],
        );
    };

    const handleEditSubmit = async (updatedProduct: Partial<Product>) => {
        try {
            await apiService.put(`${apiService.ENDPOINTS.PRODUCTS}/${id}`, updatedProduct);
            setShowEditModal(false);
            fetchProductDetails();
            Alert.alert('Success', 'Product updated successfully');
        } catch (error) {
            console.error('Error updating product:', error);
            Alert.alert('Error', 'Failed to update product');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF69B4" />
            </View>
        );
    }

    if (!product) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Product not found</Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Product Details',
                    headerRight: () => (
                        <View style={styles.headerButtons}>
                            <TouchableOpacity
                                onPress={() => setShowEditModal(true)}
                                style={styles.headerButton}
                            >
                                <Ionicons name="create-outline" size={24} color="#FF69B4" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleDelete}
                                style={styles.headerButton}
                            >
                                <Ionicons name="trash-outline" size={24} color="#FF69B4" />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />
            <ScrollView style={styles.container}>
                <View style={styles.imageContainer}>
                    {product.image_url && (
                        <Image
                            source={{ uri: apiService.getFullImageUrl(product.image_url) }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    )}
                </View>

                <View style={styles.detailsContainer}>
                    <Text style={styles.productName}>{product.name}</Text>
                    
                    <View style={styles.priceContainer}>
                        {product.offer_percentage > 0 ? (
                            <>
                                <Text style={styles.price}>
                                    ₹{(product.price * (1 - product.offer_percentage / 100)).toFixed(2)}
                                </Text>
                                <Text style={styles.originalPrice}>
                                    ₹{product.price.toFixed(2)}
                                </Text>
                                <Text style={styles.discount}>{product.offer_percentage}% OFF</Text>
                            </>
                        ) : (
                            <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>
                        )}
                    </View>

                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>Stock Information</Text>
                        <Text style={styles.infoText}>Quantity: {product.stock_quantity}</Text>
                        <Text style={styles.infoText}>Category: {product.category}</Text>
                    </View>

                    {product.description && (
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.description}>{product.description}</Text>
                        </View>
                    )}

                    {product.usage_instructions && (
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Usage Instructions</Text>
                            <Text style={styles.description}>{product.usage_instructions}</Text>
                        </View>
                    )}

                    {product.benefits && (
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Benefits</Text>
                            <Text style={styles.description}>{product.benefits}</Text>
                        </View>
                    )}

                    {product.ingredients && (
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Ingredients</Text>
                            <Text style={styles.description}>{product.ingredients}</Text>
                        </View>
                    )}

                    {product.product_details && (
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Additional Details</Text>
                            <Text style={styles.description}>{product.product_details}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <Modal
                visible={showEditModal}
                animationType="slide"
                onRequestClose={() => setShowEditModal(false)}
            >
                <EditProductForm
                    product={product}
                    onSubmit={handleEditSubmit}
                    onCancel={() => setShowEditModal(false)}
                />
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
    },
    headerButtons: {
        flexDirection: 'row',
    },
    headerButton: {
        marginLeft: 15,
    },
    imageContainer: {
        width: '100%',
        height: 350,
        backgroundColor: '#f5f5f5',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    detailsContainer: {
        padding: 16,
    },
    productName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    price: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF69B4',
    },
    originalPrice: {
        fontSize: 16,
        color: '#666',
        textDecorationLine: 'line-through',
        marginLeft: 8,
    },
    discount: {
        fontSize: 14,
        color: '#4CAF50',
        marginLeft: 8,
    },
    infoSection: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 4,
    },
    description: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },
}); 