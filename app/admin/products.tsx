import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Alert,
    Image,
    Modal,
    Dimensions,
    Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/api';
import { useCategories } from '../CategoryContext';
import CategorySelector from './components/CategorySelector';
import AddProductForm from './components/AddProductForm';
import ImageViewer from 'react-native-image-zoom-viewer';
import EditProductForm from './components/EditProductForm';

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    category_id: number;
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
}

interface AdminProductsProps {
    initialShowAddForm?: boolean;
}

interface NewProductForm {
    name: string;
    description: string;
    price: number;
    category: string;
    stock_quantity: number;
    usage_instructions: string;
    size: string;
    benefits: string;
    ingredients: string;
    product_details: string;
    offer_percentage: number;
}

export default function AdminProducts({ initialShowAddForm = false }: AdminProductsProps) {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { categories, mainCategories, subCategories, loading: categoriesLoading } = useCategories();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedMainCategory, setSelectedMainCategory] = useState<number | null>(null);
    const [showAddForm, setShowAddForm] = useState(initialShowAddForm || params.showAddForm === 'true');
    const [newProduct, setNewProduct] = useState<NewProductForm>({
        name: '',
        description: '',
        price: 0,
        category: '',
        stock_quantity: 0,
        usage_instructions: '',
        size: '',
        benefits: '',
        ingredients: '',
        product_details: '',
        offer_percentage: 0
    });
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [selectedImageUrls, setSelectedImageUrls] = useState<{ url: string }[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await apiService.get(apiService.ENDPOINTS.ADMIN_PRODUCTS);
            
            if (response.error) {
                throw new Error(response.error);
            }

            // Transform the data to ensure all required fields are present
            const transformedProducts = (response.data?.products || []).map((product: any) => {
                return {
                    ...product,
                    created_at: product.created_at || new Date().toISOString(),
                    offer_percentage: product.offer_percentage || 0
                };
            });

            setProducts(transformedProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleImagePick = async (index: number) => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please allow access to your photo library');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const newImages = [...selectedImages];
                newImages[index] = result.assets[0].uri;
                setSelectedImages(newImages);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleAddProduct = async () => {
        // Validate required fields
        if (!newProduct.name?.trim()) {
            Alert.alert('Error', 'Product name is required');
            return;
        }
        if (!newProduct.price || newProduct.price <= 0) {
            Alert.alert('Error', 'Please enter a valid price in rupees');
            return;
        }
        if (!newProduct.category?.trim()) {
            Alert.alert('Error', 'Please select a category');
            return;
        }
        if (!newProduct.stock_quantity || newProduct.stock_quantity < 0) {
            Alert.alert('Error', 'Please enter a valid stock quantity');
            return;
        }

        try {
            const selectedCategoryObj = [...mainCategories, ...Object.values(subCategories).flat()]
                .find(cat => cat.name === newProduct.category);

            if (!selectedCategoryObj) {
                Alert.alert('Error', 'Invalid category selected');
                return;
            }

            const formData = new FormData();

            // Format and add required fields
            formData.append('name', String(newProduct.name).trim());
            formData.append('description', String(newProduct.description || '').trim());
            formData.append('price', String(Math.abs(Number(newProduct.price)))); // Ensure positive price in rupees
            formData.append('category_id', String(selectedCategoryObj.id));
            formData.append('category', selectedCategoryObj.name);
            formData.append('stock_quantity', String(Math.max(0, Number(newProduct.stock_quantity)))); // Ensure non-negative stock
            
            // Add offer percentage (ensure it's between 0 and 100)
            const offerPercentage = Math.max(0, Math.min(100, Number(newProduct.offer_percentage || 0)));
            formData.append('offer_percentage', String(offerPercentage));
            
            // Format and add optional fields
            if (newProduct.usage_instructions) {
                formData.append('usage_instructions', String(newProduct.usage_instructions).trim());
            }
            if (newProduct.size) {
                formData.append('size', String(newProduct.size).trim().toUpperCase()); // Standardize size format
            }
            if (newProduct.benefits) {
                formData.append('benefits', String(newProduct.benefits).trim());
            }
            if (newProduct.ingredients) {
                formData.append('ingredients', String(newProduct.ingredients).trim());
            }
            if (newProduct.product_details) {
                formData.append('product_details', String(newProduct.product_details).trim());
            }

            // Handle images
            if (selectedImages.length > 0) {
                selectedImages.forEach((uri, index) => {
                    if (uri) {
                        const filename = uri.split('/').pop() || `image${index + 1}.jpg`;
                        const match = /\.(\w+)$/.exec(filename);
                        const type = match ? `image/${match[1]}` : 'image/jpeg';

                        formData.append('images', {
                            uri,
                            type,
                            name: filename
                        } as any);
                    }
                });
            }

            // Log the form data for debugging
            console.log('Adding product with data:', Array.from(formData.entries()));

            const response = await apiService.addProduct(formData);
            
            if (response.error) {
                throw new Error(response.error);
            }

            await fetchProducts();
            setNewProduct({
                name: '',
                description: '',
                price: 0,
                category: '',
                stock_quantity: 0,
                usage_instructions: '',
                size: '',
                benefits: '',
                ingredients: '',
                product_details: '',
                offer_percentage: 0
            });
            setSelectedImages([]);
            setShowAddForm(false);
            
            Alert.alert('Success', 'Product added successfully', [
                {
                    text: 'OK',
                    onPress: () => setShowAddForm(false)
                }
            ]);
        } catch (error: any) {
            console.error('Error adding product:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to add product';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleCategorySelect = (category: { id: number; name: string }) => {
        setNewProduct(prev => ({ ...prev, category: category.name }));
        setShowCategoryModal(false);
    };

    const handleDeleteProduct = async (productId: number) => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const response = await apiService.deleteProduct(productId);
                            
                            if (response.error) {
                                Alert.alert('Error', response.error);
                                return;
                            }
                            
                            // Remove the product from the local state
                            setProducts(prevProducts => 
                                prevProducts.filter(product => product.id !== productId)
                            );
                            
                            Alert.alert('Success', 'Product deleted successfully');
                        } catch (error) {
                            console.error('Error deleting product:', error);
                            Alert.alert(
                                'Error',
                                error instanceof Error ? error.message : 'Failed to delete product'
                            );
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleImagePress = (product: Product, imageIndex: number) => {
        const imageUrls = [
            product.image_url,
            product.image_url2,
            product.image_url3
        ].filter(Boolean).map(url => ({ url: apiService.getFullImageUrl(url) }));
        
        setSelectedImageUrls(imageUrls);
        setCurrentImageIndex(imageIndex);
        setIsImageViewerVisible(true);
    };

    const handleEditProduct = async (updatedProduct: Partial<Product>) => {
        try {
            if (!selectedProduct) return;
            
            setLoading(true);
            const response = await apiService.put(`${apiService.ENDPOINTS.PRODUCTS}/${selectedProduct.id}`, updatedProduct);
            
            if (response.error) {
                // Handle specific error cases
                if (response.error.includes('Unauthorized')) {
                    Alert.alert('Session Expired', 'Please log in again to continue.');
                    return;
                }
                throw new Error(response.error);
            }

            // Update the products list with the edited product
            setProducts(prevProducts => 
                prevProducts.map(p => 
                    p.id === selectedProduct.id ? { ...p, ...response.data } : p
                )
            );

            setShowEditModal(false);
            setSelectedProduct(null);
            Alert.alert('Success', 'Product updated successfully');
        } catch (error: any) {
            console.error('Error updating product:', error);
            Alert.alert(
                'Update Failed',
                error.message || 'Failed to update product. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const renderProductCard = (product: Product, index: number) => {
        const renderImage = (imageUrl: string | undefined, index: number) => {
            if (!imageUrl) return null;
            
            const fullUrl = apiService.getFullImageUrl(imageUrl);
            console.log(`Image ${index} URL:`, fullUrl);
            
            return (
                <TouchableOpacity onPress={() => handleImagePress(product, index)}>
                    <Image
                        source={{ uri: fullUrl }}
                        style={styles.productImage}
                        onError={(error) => {
                            console.error(`Error loading image ${index}:`, error.nativeEvent.error);
                        }}
                        defaultSource={{ uri: 'https://via.placeholder.com/150x200/f8f9fa/666666?text=No+Image' }}
                    />
                </TouchableOpacity>
            );
        };

        return (
            <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                    <Text style={styles.productNumber}>#{index + 1}</Text>
                    <TouchableOpacity 
                        onPress={() => router.push(`/admin/product-details/${product.id}`)}
                        style={styles.productNameButton}
                    >
                        <Text style={styles.productName}>{product.name}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.imageContainer}>
                    {renderImage(product.image_url, 0)}
                    {renderImage(product.image_url2, 1)}
                    {renderImage(product.image_url3, 2)}
                </View>
                <View style={styles.productContent}>
                    <View style={styles.productHeader}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <View style={styles.priceContainer}>
                            {product.offer_percentage > 0 ? (
                                <>
                                    <Text style={styles.originalPrice}>₹{parseFloat(String(product.price)).toFixed(2)}</Text>
                                    <Text style={styles.discountedPrice}>
                                        ₹{(parseFloat(String(product.price)) * (1 - product.offer_percentage / 100)).toFixed(2)}
                                    </Text>
                                    <Text style={styles.offerText}>{product.offer_percentage}% OFF</Text>
                                </>
                            ) : (
                                <Text style={styles.productPrice}>₹{parseFloat(String(product.price)).toFixed(2)}</Text>
                            )}
                        </View>
                    </View>
                    
                    {/* Description */}
                    {product.description && (
                        <View style={styles.detailSection}>
                            <Text style={styles.detailTitle}>Description</Text>
                            <Text style={styles.productDescription}>{product.description}</Text>
                        </View>
                    )}

                    {/* Basic Details */}
                    <View style={styles.productDetails}>
                        {product.size && (
                            <Text style={styles.productInfo}>Size: {product.size}</Text>
                        )}
                        <Text style={styles.productInfo}>Stock: {product.stock_quantity} units</Text>
                        <Text style={styles.productCategory}>Category: {product.category}</Text>
                    </View>

                    {/* Usage Instructions */}
                    {product.usage_instructions && (
                        <View style={styles.detailSection}>
                            <Text style={styles.detailTitle}>Usage Instructions</Text>
                            <Text style={styles.detailText}>{product.usage_instructions}</Text>
                        </View>
                    )}

                    {/* Benefits */}
                    {product.benefits && (
                        <View style={styles.detailSection}>
                            <Text style={styles.detailTitle}>Benefits</Text>
                            <Text style={styles.detailText}>{product.benefits}</Text>
                        </View>
                    )}

                    {/* Ingredients */}
                    {product.ingredients && (
                        <View style={styles.detailSection}>
                            <Text style={styles.detailTitle}>Ingredients</Text>
                            <Text style={styles.detailText}>{product.ingredients}</Text>
                        </View>
                    )}

                    {/* Additional Product Details */}
                    {product.product_details && (
                        <View style={styles.detailSection}>
                            <Text style={styles.detailTitle}>Additional Details</Text>
                            <Text style={styles.detailText}>{product.product_details}</Text>
                        </View>
                    )}

                    <View style={styles.productActions}>
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => {
                                setSelectedProduct(product);
                                setShowEditModal(true);
                            }}
                        >
                            <Ionicons name="pencil" size={20} color="#007AFF" />
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => handleDeleteProduct(product.id)}
                        >
                            <Ionicons name="trash-outline" size={20} color="#dc3545" />
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Products',
                    headerStyle: {
                        backgroundColor: '#1a1a1a',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />

            <View style={styles.container}>
                {showAddForm ? (
                    <AddProductForm
                        onSubmit={handleAddProduct}
                        newProduct={newProduct}
                        setNewProduct={setNewProduct}
                        selectedImages={selectedImages}
                        setSelectedImages={setSelectedImages}
                        handleImagePick={handleImagePick}
                    />
                ) : (
                <ScrollView
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                >
                    {loading ? (
                        <ActivityIndicator style={styles.loader} size="large" color="#FF69B4" />
                    ) : products.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="cube-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyStateText}>No products found</Text>
                                <TouchableOpacity
                                    style={styles.addFirstButton}
                                    onPress={() => setShowAddForm(true)}
                                >
                                    <Text style={styles.addFirstButtonText}>Add First Product</Text>
                                </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.productGrid}>
                            {products.map((product, index) => renderProductCard(product, index))}
                        </View>
                    )}
                </ScrollView>
                )}

                {/* Category Modal */}
                <Modal
                    visible={showCategoryModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowCategoryModal(false)}
                >
                    <CategorySelector
                        visible={showCategoryModal}
                        onClose={() => setShowCategoryModal(false)}
                        onSelect={handleCategorySelect}
                        selectedCategory={newProduct.category}
                    />
                </Modal>

                {/* Image Viewer Modal */}
                <Modal
                    visible={isImageViewerVisible}
                    transparent={true}
                    onRequestClose={() => setIsImageViewerVisible(false)}
                >
                    <ImageViewer
                        imageUrls={selectedImageUrls}
                        index={currentImageIndex}
                        onCancel={() => setIsImageViewerVisible(false)}
                        enableSwipeDown
                        onSwipeDown={() => setIsImageViewerVisible(false)}
                    />
                </Modal>

                {/* Edit Product Modal */}
                <Modal
                    visible={showEditModal}
                    animationType="slide"
                    onRequestClose={() => {
                        setShowEditModal(false);
                        setSelectedProduct(null);
                    }}
                >
                    {selectedProduct && (
                        <EditProductForm
                            product={selectedProduct}
                            onSubmit={handleEditProduct}
                            onCancel={() => {
                                setShowEditModal(false);
                                setSelectedProduct(null);
                            }}
                        />
                    )}
                </Modal>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    productGrid: {
        padding: 12,
    },
    productCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    imageContainer: {
        flexDirection: 'row',
        height: 200,
        backgroundColor: '#f5f5f5',
        gap: 1,
    },
    productImage: {
        width: 150,
        height: 200,
        resizeMode: 'cover',
    },
    productContent: {
        padding: 12,
    },
    productHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingTop: 12,
    },
    productNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginRight: 8,
    },
    productNameButton: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        textDecorationLine: 'underline',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    productPrice: {
        fontSize: 16,
        color: '#FF69B4',
        fontWeight: '600',
    },
    originalPrice: {
        fontSize: 14,
        color: '#999',
        textDecorationLine: 'line-through',
    },
    discountedPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF69B4',
    },
    offerText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '500',
    },
    productDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    productDetails: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    productInfo: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    productCategory: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
    },
    productActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    editButton: {
        backgroundColor: '#E3F2FD',
    },
    editButtonText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#fff5f5',
        borderRadius: 6,
    },
    deleteButtonText: {
        marginLeft: 4,
        fontSize: 14,
        color: '#dc3545',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        marginTop: 12,
        marginBottom: 20,
    },
    addFirstButton: {
        backgroundColor: '#FF69B4',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    addFirstButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loader: {
        marginTop: 20,
    },
    detailSection: {
        marginVertical: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
    },
    detailTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    detailText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
});
