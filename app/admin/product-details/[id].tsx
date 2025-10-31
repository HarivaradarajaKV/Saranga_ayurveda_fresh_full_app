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
import { ProductReview } from '../../types/reviews';
import { ExpandableDescription } from '../../components/ExpandableDescription';

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
    const [reviews, setReviews] = useState<ProductReview[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    useEffect(() => {
        fetchProductDetails();
        fetchProductReviews();
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

    const fetchProductReviews = async () => {
        try {
            if (!id) return;
            setReviewsLoading(true);
            const numericId = Number(id);
            const response = await apiService.getProductReviews(numericId);
            if (response.data) {
                setReviews(response.data as ProductReview[]);
            } else {
                setReviews([]);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            setReviews([]);
        } finally {
            setReviewsLoading(false);
        }
    };

    const handleDeleteReview = (reviewId: number) => {
        Alert.alert(
            'Delete Review',
            'Are you sure you want to delete this review?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await apiService.deleteReview(reviewId);
                            if (!res.error) {
                                Alert.alert('Success', 'Review deleted successfully');
                                fetchProductReviews();
                            } else {
                                Alert.alert('Error', res.error || 'Failed to delete review');
                            }
                        } catch (e) {
                            console.error('Error deleting review:', e);
                            Alert.alert('Error', 'Failed to delete review');
                        }
                    }
                }
            ]
        );
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
                            <ExpandableDescription
                              description={product.description}
                              maxLines={4}
                              textStyle={styles.description}
                            />
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

                {/* --- REVIEWS SECTION START --- */}
                <View style={{ height: 1, backgroundColor: '#e8d3b9', marginTop: 32, marginBottom: 16, width: '100%' }} />
                <View style={[styles.reviewsSection, { marginTop: 0, elevation: 1, borderRadius: 10, borderWidth: 1, borderColor: '#efd8bb', paddingTop: 16, backgroundColor: '#fffbe9' }]}> 
                    <View style={styles.reviewsHeader}>
                        <Text style={[styles.reviewsTitle, { color: '#b0761b', fontWeight: 'bold', letterSpacing: 0.2 }]}>User Reviews</Text>
                        <View style={styles.reviewsMeta}>
                            <Ionicons name="chatbubbles-outline" size={18} color="#694d21" />
                            <Text style={styles.reviewsCount}>{reviews?.length || 0}</Text>
                        </View>
                    </View>

                    {reviewsLoading ? (
                        <View style={styles.reviewsLoadingContainer}>
                            <ActivityIndicator size="small" color="#694d21" />
                        </View>
                    ) : reviews && reviews.length > 0 ? (
                        <View style={styles.reviewsList}>
                            {reviews.map((rev) => (
                                <View key={rev.id} style={styles.reviewRow}>
                                    <View style={styles.reviewInfo}>
                                        <Text style={styles.reviewUser}>{rev.user_name}</Text>
                                        <Text style={styles.reviewDate}>{new Date(rev.created_at).toLocaleDateString()}</Text>
                                        <Text style={styles.reviewComment}>{rev.comment}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteReview(rev.id)} style={styles.deleteReviewButton}>
                                        <Ionicons name="trash-outline" size={20} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.noReviewsText}>No reviews yet for this product.</Text>
                    )}
                </View>
                {/* --- REVIEWS SECTION END --- */}
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
  reviewsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewsCount: {
    fontSize: 14,
    color: '#694d21',
    marginLeft: 6,
  },
  reviewsLoadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewsList: {
    gap: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#faf7f2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0e6da',
  },
  reviewInfo: {
    flex: 1,
    paddingRight: 12,
  },
  reviewUser: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    lineHeight: 20,
  },
  deleteReviewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noReviewsText: {
    color: '#666',
    fontSize: 14,
    paddingVertical: 8,
  },
}); 