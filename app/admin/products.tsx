import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Alert,
    Image,
    Modal,
    Dimensions,
    Platform,
    SafeAreaView,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/api';
import { useCategories } from '../CategoryContext';
import CategorySelector from './components/CategorySelector';
import AddProductForm from './components/AddProductForm';
import ImageViewer from 'react-native-image-zoom-viewer';
import EditProductForm from './components/EditProductForm';
import { ExpandableDescription } from '../components/ExpandableDescription';

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

// App theme colors
const themeColors = {
    primary: '#FF69B4',
    primaryDark: '#e55a9e',
    secondary: '#694d21',
    background: '#f8f9fa',
    card: '#fff',
    text: '#1a1a1a',
    textSecondary: '#666',
    textTertiary: '#999',
    border: '#e0e0e0',
    success: '#27ae60',
    error: '#e74c3c',
    shadow: 'rgba(0, 0, 0, 0.1)',
};

// Inner component with all logic
function AdminProductsInner({ initialShowAddForm = false }: AdminProductsProps) {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    // Track if component is mounted to prevent state updates after unmount
    const isMountedRef = React.useRef(true);
    
    // Track all timers for proper cleanup
    const timersRef = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
    const animationFramesRef = React.useRef<Set<number>>(new Set());
    
    const { categories, mainCategories, subCategories, loading: categoriesLoading } = useCategories();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Get window width safely with error handling
    const [windowWidth, setWindowWidth] = useState(() => {
        try {
            return Dimensions.get('window').width;
        } catch (error) {
            console.error('Error getting window width:', error);
            return 375; // Default mobile width
        }
    });
    
    // Safe setTimeout wrapper that tracks timers
    const safeSetTimeout = React.useCallback((callback: () => void, delay: number) => {
        const timerId = setTimeout(() => {
            timersRef.current.delete(timerId);
            if (isMountedRef.current) {
                callback();
            }
        }, delay);
        timersRef.current.add(timerId);
        return timerId;
    }, []);
    
    // Safe requestAnimationFrame wrapper that tracks frames
    const safeRequestAnimationFrame = React.useCallback((callback: () => void) => {
        const frameId = requestAnimationFrame(() => {
            animationFramesRef.current.delete(frameId);
            if (isMountedRef.current) {
                callback();
            }
        });
        animationFramesRef.current.add(frameId);
        return frameId;
    }, []);
    
    // Update window width on dimension change
    useEffect(() => {
        if (!isMountedRef.current) return;
        
        try {
            const subscription = Dimensions.addEventListener('change', ({ window }) => {
                if (isMountedRef.current && window?.width) {
                    setWindowWidth(window.width);
                }
            });
            return () => {
                if (subscription?.remove) {
                    subscription.remove();
                }
            };
        } catch (error) {
            console.error('Error setting up dimensions listener:', error);
        }
    }, []);
    
    const isMobile = windowWidth < 768;
    const fetchAbortControllerRef = React.useRef<AbortController | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Limit initial render to prevent memory crashes (Expo Go limitation)
    const INITIAL_RENDER_LIMIT = 24;
    const [displayLimit, setDisplayLimit] = useState(INITIAL_RENDER_LIMIT);
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
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'price' | 'created_at' | 'stock'>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showSortModal, setShowSortModal] = useState(false);
    const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
    const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
    const [imageRefreshKey, setImageRefreshKey] = useState(0);

    const fetchProducts = React.useCallback(async () => {
        if (!isMountedRef.current) return;
        
        // Cancel any previous fetch
        if (fetchAbortControllerRef.current) {
            fetchAbortControllerRef.current.abort();
        }
        
        // Create new abort controller for this fetch
        fetchAbortControllerRef.current = new AbortController();
        
        try {
            if (isMountedRef.current) {
                // Use safe setTimeout to defer state update to prevent render blocking
                safeSetTimeout(() => {
                    if (isMountedRef.current) {
                        try {
                            setLoading(true);
                        } catch (e) {
                            console.error('Error setting loading state:', e);
                        }
                    }
                }, 0);
            }
            
            const response = await apiService.get(apiService.ENDPOINTS.ADMIN_PRODUCTS);
            
            // Check if component is still mounted and request wasn't aborted
            if (!isMountedRef.current || fetchAbortControllerRef.current?.signal.aborted) {
                return;
            }
            
            if (response.error) {
                throw new Error(response.error);
            }

            // Transform the data to ensure all required fields are present
            // Limit to prevent memory crashes with large datasets
            const allProducts = response.data?.products || [];
            const transformedProducts = allProducts.slice(0, 150).map((product: any) => {
                return {
                    ...product,
                    created_at: product.created_at || new Date().toISOString(),
                    offer_percentage: product.offer_percentage || 0
                };
            });

            // Defer state update to prevent crashes during rapid navigation
            // Use safe requestAnimationFrame for better performance
            if (isMountedRef.current) {
                safeRequestAnimationFrame(() => {
                    if (isMountedRef.current && !fetchAbortControllerRef.current?.signal.aborted) {
                        try {
                            setProducts(transformedProducts);
                            setDisplayLimit(INITIAL_RENDER_LIMIT); // Reset display limit
                            setError(null); // Clear any previous errors
                        } catch (e) {
                            console.error('Error setting products:', e);
                            setError('Failed to load products. Please try again.');
                        }
                    }
                });
            }
        } catch (error: any) {
            // Ignore abort errors
            if (error?.name === 'AbortError' || fetchAbortControllerRef.current?.signal.aborted) {
                return;
            }
            
            console.error('Error fetching products:', error);
            
            if (isMountedRef.current && !fetchAbortControllerRef.current?.signal.aborted) {
                safeSetTimeout(() => {
                    if (isMountedRef.current) {
                        try {
                            setProducts([]);
                        } catch (e) {
                            console.error('Error setting empty products:', e);
                        }
                    }
                }, 0);
            }
        } finally {
            if (isMountedRef.current && !fetchAbortControllerRef.current?.signal.aborted) {
                safeSetTimeout(() => {
                    if (isMountedRef.current) {
                        try {
                            setLoading(false);
                        } catch (e) {
                            console.error('Error setting loading false:', e);
                        }
                    }
                }, 0);
            }
        }
    }, [safeSetTimeout, safeRequestAnimationFrame]);

    const onRefresh = React.useCallback(async () => {
        if (!isMountedRef.current) return;
        
        try {
            safeSetTimeout(() => {
                if (isMountedRef.current) {
                    try {
                        setRefreshing(true);
                    } catch (e) {
                        console.error('Error setting refreshing:', e);
                    }
                }
            }, 0);
            
            await fetchProducts();
        } catch (error) {
            console.error('Error in refresh:', error);
        } finally {
            if (isMountedRef.current) {
                safeSetTimeout(() => {
                    if (isMountedRef.current) {
                        try {
                            setRefreshing(false);
                        } catch (e) {
                            console.error('Error setting refreshing false:', e);
                        }
                    }
                }, 0);
            }
        }
    }, [fetchProducts, safeSetTimeout]);

    useEffect(() => {
        isMountedRef.current = true;
        
        // Add delay to prevent rapid navigation crashes
        const initTimer = safeSetTimeout(() => {
            if (isMountedRef.current) {
                fetchProducts().catch((error) => {
                    console.error('Initial fetch error:', error);
                });
            }
        }, 100);
        
        // Cleanup function
        return () => {
            // Clear all pending timers
            timersRef.current.forEach(timer => clearTimeout(timer));
            timersRef.current.clear();
            
            // Cancel all pending animation frames
            animationFramesRef.current.forEach(frameId => cancelAnimationFrame(frameId));
            animationFramesRef.current.clear();
            
            isMountedRef.current = false;
            
            // Abort any pending fetch
            if (fetchAbortControllerRef.current) {
                fetchAbortControllerRef.current.abort();
                fetchAbortControllerRef.current = null;
            }

            // Ensure heavy modals are closed and image data cleared to prevent leaks
            try {
                setIsImageViewerVisible(false);
                setSelectedImageUrls([]);
                setShowEditModal(false);
                setSelectedProduct(null);
                setShowProductDetailsModal(false);
                setSelectedProductForDetails(null);
            } catch (cleanupError) {
                console.error('Cleanup error on unmount:', cleanupError);
            }
        };
    }, [fetchProducts, safeSetTimeout]);

    // Also clean up aggressively on blur to avoid memory build-up when navigating back and forth
    useFocusEffect(
        React.useCallback(() => {
            // onFocus: no-op
            return () => {
                // onBlur: perform the same cleanup as unmount
                try {
                    timersRef.current.forEach(timer => clearTimeout(timer));
                    timersRef.current.clear();
                } catch {}
                try {
                    animationFramesRef.current.forEach(frameId => cancelAnimationFrame(frameId));
                    animationFramesRef.current.clear();
                } catch {}
                try {
                    if (fetchAbortControllerRef.current) {
                        fetchAbortControllerRef.current.abort();
                        fetchAbortControllerRef.current = null;
                    }
                } catch {}
                try {
                    setIsImageViewerVisible(false);
                    setSelectedImageUrls([]);
                    setShowEditModal(false);
                    setSelectedProduct(null);
                    setShowProductDetailsModal(false);
                    setSelectedProductForDetails(null);
                } catch {}
            };
        }, [])
    );

    // Prevent rapid navigation crashes - add debounce for navigation
    const navigationDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Reset mount state when component re-mounts (navigation back)
    useEffect(() => {
        // Clear any pending debounce
        if (navigationDebounceRef.current) {
            clearTimeout(navigationDebounceRef.current);
        }
        
        // Set mount state
        isMountedRef.current = true;
        
        // Debounce: prevent rapid navigation crashes
        navigationDebounceRef.current = safeSetTimeout(() => {
            if (isMountedRef.current) {
                // Only fetch if products list is empty and not already loading
                if (products.length === 0 && !loading) {
                    fetchProducts().catch((error) => {
                        console.error('Navigation back fetch error:', error);
                    });
                }
            }
        }, 300);
        
        return () => {
            if (navigationDebounceRef.current) {
                clearTimeout(navigationDebounceRef.current);
                navigationDebounceRef.current = null;
            }
        };
    }, [safeSetTimeout]); // Include safeSetTimeout in deps

    // Filter and sort products
    useEffect(() => {
        let filtered = products;

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'price':
                    aValue = parseFloat(String(a.price));
                    bValue = parseFloat(String(b.price));
                    break;
                case 'stock':
                    aValue = a.stock_quantity;
                    bValue = b.stock_quantity;
                    break;
                case 'created_at':
                default:
                    aValue = new Date(a.created_at).getTime();
                    bValue = new Date(b.created_at).getTime();
                    break;
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        // Limit displayed products to prevent memory crashes
        const limitedFiltered = filtered.slice(0, displayLimit);
        
        if (isMountedRef.current) {
            safeRequestAnimationFrame(() => {
                if (isMountedRef.current) {
                    try {
                        setFilteredProducts(limitedFiltered);
                    } catch (e) {
                        console.error('Error setting filtered products:', e);
                    }
                }
            });
        }
    }, [products, searchQuery, sortBy, sortOrder, displayLimit, safeRequestAnimationFrame]);
    
    // Load more products when scrolling
    const loadMoreProducts = React.useCallback(() => {
        if (isMountedRef.current && filteredProducts.length < products.length) {
            setDisplayLimit(prev => Math.min(prev + 20, products.length));
        }
    }, [filteredProducts.length, products.length]);

    const handleImagePick = async (index: number) => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please allow access to your photo library');
                return;
            }

            // Show aspect ratio options for more flexible cropping
            Alert.alert(
                'Select Image Aspect Ratio',
                'Choose the aspect ratio for your image crop:',
                [
                    {
                        text: 'Square (1:1)',
                        onPress: () => pickImageWithAspect(index, [1, 1])
                    },
                    {
                        text: 'Landscape (4:3)',
                        onPress: () => pickImageWithAspect(index, [4, 3])
                    },
                    {
                        text: 'Portrait (3:4)',
                        onPress: () => pickImageWithAspect(index, [3, 4])
                    },
                    {
                        text: 'Wide (16:9)',
                        onPress: () => pickImageWithAspect(index, [16, 9])
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ]
            );
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const pickImageWithAspect = async (index: number, aspect: [number, number]) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: aspect, // Flexible aspect ratio based on user choice
                quality: 0.95, // Higher quality for better images
                allowsMultipleSelection: false,
                exif: false, // Disable EXIF data to reduce file size
                base64: false, // Don't include base64 to reduce memory usage
            });

            if (!result.canceled && result.assets[0]) {
                const newImages = [...selectedImages];
                newImages[index] = result.assets[0].uri;
                setSelectedImages(newImages);
                console.log('Image selected successfully:', result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
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

            if (isMountedRef.current) {
                await fetchProducts();
                if (isMountedRef.current) {
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
                }
            }
            
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

    const handleEditProduct = async (formData: FormData) => {
        try {
            if (!selectedProduct) return;
            
            setLoading(true);
            const response = await apiService.updateProduct(selectedProduct.id, formData);
            
            if (response.error) {
                // Handle specific error cases
                if (response.error.includes('Unauthorized')) {
                    Alert.alert('Session Expired', 'Please log in again to continue.');
                    return;
                }
                throw new Error(response.error);
            }

            // Update the products list with the edited product
            if (!response.data) {
                throw new Error('No data received from server');
            }
            
            const productData = response.data;
            const updatedProduct = { ...selectedProduct, ...productData };
            console.log('Updated product data:', updatedProduct);
            console.log('Response data:', productData);
            console.log('Image URLs in response:', {
                image_url: productData.image_url,
                image_url2: productData.image_url2,
                image_url3: productData.image_url3
            });
            
            // Force update the products list
            if (isMountedRef.current) {
                setProducts(prevProducts => 
                    prevProducts.map(p => 
                        p.id === selectedProduct.id ? {
                            ...p,
                            ...productData,
                            image_url: productData.image_url || p.image_url || '',
                            image_url2: productData.image_url2 || p.image_url2 || '',
                            image_url3: productData.image_url3 || p.image_url3 || ''
                        } as Product : p
                    )
                );
            }

            // Update the selectedProductForDetails if it's the same product
            if (selectedProductForDetails && selectedProductForDetails.id === selectedProduct.id) {
                setSelectedProductForDetails({
                    ...selectedProductForDetails,
                    ...response.data,
                    image_url: response.data.image_url,
                    image_url2: response.data.image_url2,
                    image_url3: response.data.image_url3
                });
            }

            setShowEditModal(false);
            setSelectedProduct(null);
            
            // Force refresh the products list and images
            setImageRefreshKey(prev => prev + 1);
            
            // Force immediate refresh of the products list
            safeSetTimeout(() => {
                if (isMountedRef.current) {
                    fetchProducts().catch((error) => {
                        console.error('Error refetching products:', error);
                    });
                }
            }, 100);
            
            // Additional refresh after a longer delay to ensure images are updated
            safeSetTimeout(() => {
                if (isMountedRef.current) {
                    setImageRefreshKey(prev => prev + 1);
                }
            }, 1000);
            
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

    const handleProductCardPress = (product: Product) => {
        setSelectedProductForDetails(product);
        setShowProductDetailsModal(true);
    };

    const renderProductCard = (product: Product, index: number) => {
    const renderImage = (imageUrl: string | undefined, index: number) => {
        if (!imageUrl) return null;
        
        // Stable cache busting tied to imageRefreshKey only (prevents constant reloads)
        const cacheBuster = `?k=${imageRefreshKey}`;
        const fullUrl = apiService.getFullImageUrl(imageUrl) + cacheBuster;
        
        return (
            <TouchableOpacity onPress={() => handleImagePress(product, index)}>
                <Image
                    key={`${product.id}-${index}-${imageRefreshKey}`}
                    source={{ uri: fullUrl }}
                    style={styles.productImage}
                    onError={() => {
                        console.log('Image load error for:', imageUrl);
                    }}
                    resizeMode="cover"
                    progressiveRenderingEnabled
                />
            </TouchableOpacity>
        );
    };

        const cardWidthStyle = (windowWidth && windowWidth >= 768) ? styles.productCardTablet : null;

        return (
            <TouchableOpacity 
                key={product.id} 
                style={[styles.productCard, cardWidthStyle]}
                onPress={() => handleProductCardPress(product)}
            >
                <View style={styles.productImageContainer}>
                    {renderImage(product.image_url, 0)}
                </View>
                <View style={styles.productCardContent}>
                    <Text style={styles.productCardName} numberOfLines={2}>
                        {product.name}
                    </Text>
                    <View style={styles.productCardPrice}>
                        {product.offer_percentage > 0 ? (
                            <>
                                <Text style={styles.productCardOriginalPrice}>
                                    ₹{parseFloat(String(product.price)).toFixed(0)}
                                </Text>
                                <Text style={styles.productCardDiscountedPrice}>
                                    ₹{(parseFloat(String(product.price)) * (1 - product.offer_percentage / 100)).toFixed(0)}
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.productCardPriceText}>
                                ₹{parseFloat(String(product.price)).toFixed(0)}
                            </Text>
                        )}
                    </View>
                    <Text style={styles.productCardCategory} numberOfLines={1}>
                        {product.category}
                    </Text>
                    <Text style={styles.productCardStock}>
                        Stock: {product.stock_quantity}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Calculate bottom padding for navigation bar - safe approach without useSafeAreaInsets
    // Use Platform check similar to categories screen
    const scrollContentPadding = Platform.OS === 'ios' ? 100 : 120; // Extra padding for navigation

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

            <SafeAreaView style={styles.safeArea}>
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
                <>
                    {/* Search and Filter Bar */}
                    <View style={styles.searchContainer}>
                        <View style={styles.searchInputContainer}>
                            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search products..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#666"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color="#666" />
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        <View style={styles.filterContainer}>
                            <TouchableOpacity 
                                style={styles.filterButton}
                                onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                                <Ionicons 
                                    name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                                    size={16} 
                                    color="#FF69B4" 
                                />
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.sortButton}
                                onPress={() => setShowSortModal(true)}
                            >
                                <Text style={styles.sortButtonText}>
                                    {sortBy === 'name' ? 'Name' : 
                                     sortBy === 'price' ? 'Price' : 
                                     sortBy === 'stock' ? 'Stock' : 'Date'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="#FF69B4" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Products Count and Add Button */}
                    <View style={styles.productsCountContainer}>
                        <View style={styles.productsCountInfo}>
                            <Text style={styles.productsCount}>
                                {filteredProducts.length} of {products.length} products
                            </Text>
                            {filteredProducts.length > 0 && (
                                <Text style={styles.productsCountSubtext}>
                                    Tap a product to view details
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity 
                            style={styles.addProductButton}
                            onPress={() => setShowAddForm(true)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.addProductButtonContent}>
                                <Ionicons name="add-circle" size={22} color="#fff" />
                                <Text style={styles.addProductButtonText}>Add Product</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                {/* Removed outer ScrollView to avoid nesting with FlatList */}
                    {error && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorBannerText}>{error}</Text>
                            <TouchableOpacity onPress={() => {
                                if (isMountedRef.current) {
                                    setError(null);
                                    fetchProducts().catch(e => console.error('Retry error:', e));
                                }
                            }}>
                                <Text style={styles.errorBannerRetry}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {loading ? (
                        <ActivityIndicator style={styles.loader} size="large" color="#FF69B4" />
                    ) : filteredProducts.length === 0 ? (
                        <View style={[styles.emptyState, { paddingBottom: scrollContentPadding }]}>
                            <Ionicons name="cube-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyStateText}>
                                {searchQuery ? 'No products match your search' : 'No products found'}
                            </Text>
                            {searchQuery ? (
                                <TouchableOpacity
                                    style={styles.clearSearchButton}
                                    onPress={() => setSearchQuery('')}
                                >
                                    <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.addFirstButton}
                                    onPress={() => setShowAddForm(true)}
                                >
                                    <Text style={styles.addFirstButtonText}>Add First Product</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <FlatList
                            data={filteredProducts}
                            keyExtractor={(item) => String(item.id)}
                            numColumns={windowWidth >= 768 ? 3 : 2}
                            renderItem={({ item, index }) => renderProductCard(item, index)}
                            contentContainerStyle={[styles.productGrid, { paddingBottom: scrollContentPadding }]}
                            columnWrapperStyle={{ justifyContent: 'space-between' }}
                            removeClippedSubviews
                            initialNumToRender={8}
                            maxToRenderPerBatch={8}
                            windowSize={5}
                            updateCellsBatchingPeriod={80}
                            onEndReached={loadMoreProducts}
                            onEndReachedThreshold={0.5}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            }
                            ListFooterComponent={filteredProducts.length < products.length ? (
                                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color="#FF69B4" />
                                </View>
                            ) : null}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                
                </>
                )}
            </View>
            </SafeAreaView>

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
                        enablePreload={false}
                        saveToLocalByLongPress={false}
                        renderIndicator={(currentIndex?: number, allSize?: number) => (
                            <View />
                        )}
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

                {/* Sort Options Modal */}
                <Modal
                    visible={showSortModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowSortModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.sortModal}>
                            <View style={styles.sortModalHeader}>
                                <Text style={styles.sortModalTitle}>Sort Products</Text>
                                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.sortOptions}>
                                {[
                                    { key: 'created_at', label: 'Date Added' },
                                    { key: 'name', label: 'Product Name' },
                                    { key: 'price', label: 'Price' },
                                    { key: 'stock', label: 'Stock Quantity' }
                                ].map((option) => (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[
                                            styles.sortOption,
                                            sortBy === option.key && styles.sortOptionSelected
                                        ]}
                                        onPress={() => {
                                            setSortBy(option.key as any);
                                            setShowSortModal(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.sortOptionText,
                                            sortBy === option.key && styles.sortOptionTextSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                        {sortBy === option.key && (
                                            <Ionicons name="checkmark" size={20} color="#FF69B4" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Product Details Modal */}
                <Modal
                    visible={showProductDetailsModal}
                    animationType="slide"
                    onRequestClose={() => {
                        setShowProductDetailsModal(false);
                        setSelectedProductForDetails(null);
                    }}
                >
                    {selectedProductForDetails && (
                        <View style={styles.productDetailsContainer}>
                            <View style={styles.productDetailsHeader}>
                                <Text style={styles.productDetailsTitle}>Product Details</Text>
                                <TouchableOpacity 
                                    onPress={() => {
                                        setShowProductDetailsModal(false);
                                        setSelectedProductForDetails(null);
                                    }}
                                >
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={styles.productDetailsContent}>
                                <View style={styles.productDetailsImageContainer}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
                                        {[selectedProductForDetails.image_url, selectedProductForDetails.image_url2, selectedProductForDetails.image_url3]
                                            .filter(Boolean)
                                            .map((imageUrl, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => handleImagePress(selectedProductForDetails, index)}
                                                    style={styles.productDetailsImageWrapper}
                                                >
                                                    <Image
                                                        key={`${selectedProductForDetails.id}-${index}-${imageRefreshKey}`}
                                                        source={{ uri: apiService.getFullImageUrl(imageUrl) + `?k=${imageRefreshKey}` }}
                                                        style={styles.productDetailsImage}
                                                        resizeMode="cover"
                                                        progressiveRenderingEnabled
                                                        onError={() => {
                                                            console.log('Product details image load error for:', imageUrl);
                                                        }}
                                                    />
                                                </TouchableOpacity>
                                            ))}
                                    </ScrollView>
                                    {![selectedProductForDetails.image_url, selectedProductForDetails.image_url2, selectedProductForDetails.image_url3].some(Boolean) && (
                                        <View style={styles.noImagePlaceholder}>
                                            <Ionicons name="image-outline" size={48} color="#ccc" />
                                            <Text style={styles.noImageText}>No images available</Text>
                                        </View>
                                    )}
                                </View>
                                
                                <View style={styles.productDetailsInfo}>
                                    <Text style={styles.productDetailsName}>{selectedProductForDetails.name}</Text>
                                    
                                    <View style={styles.productDetailsPrice}>
                                        {selectedProductForDetails.offer_percentage > 0 ? (
                                            <>
                                                <Text style={styles.productDetailsOriginalPrice}>
                                                    ₹{parseFloat(String(selectedProductForDetails.price)).toFixed(2)}
                                                </Text>
                                                <Text style={styles.productDetailsDiscountedPrice}>
                                                    ₹{(parseFloat(String(selectedProductForDetails.price)) * (1 - selectedProductForDetails.offer_percentage / 100)).toFixed(2)}
                                                </Text>
                                                <Text style={styles.productDetailsOfferText}>
                                                    {selectedProductForDetails.offer_percentage}% OFF
                                                </Text>
                                            </>
                                        ) : (
                                            <Text style={styles.productDetailsPriceText}>
                                                ₹{parseFloat(String(selectedProductForDetails.price)).toFixed(2)}
                                            </Text>
                                        )}
                                    </View>
                                    
                                    <Text style={styles.productDetailsCategory}>
                                        Category: {selectedProductForDetails.category}
                                    </Text>
                                    <Text style={styles.productDetailsStock}>
                                        Stock: {selectedProductForDetails.stock_quantity} units
                                    </Text>
                                    
                                    {selectedProductForDetails.description && (
                                        <View style={styles.productDetailsSection}>
                                            <Text style={styles.productDetailsSectionTitle}>Description</Text>
                                            <ExpandableDescription
                                              description={selectedProductForDetails.description}
                                              maxLines={4}
                                              textStyle={styles.productDetailsSectionText}
                                            />
                                        </View>
                                    )}
                                    
                                    {selectedProductForDetails.size && (
                                        <View style={styles.productDetailsSection}>
                                            <Text style={styles.productDetailsSectionTitle}>Size</Text>
                                            <Text style={styles.productDetailsSectionText}>
                                                {selectedProductForDetails.size}
                                            </Text>
                                        </View>
                                    )}
                                    
                                    {selectedProductForDetails.usage_instructions && (
                                        <View style={styles.productDetailsSection}>
                                            <Text style={styles.productDetailsSectionTitle}>Usage Instructions</Text>
                                            <Text style={styles.productDetailsSectionText}>
                                                {selectedProductForDetails.usage_instructions}
                                            </Text>
                                        </View>
                                    )}
                                    
                                    {selectedProductForDetails.benefits && (
                                        <View style={styles.productDetailsSection}>
                                            <Text style={styles.productDetailsSectionTitle}>Benefits</Text>
                                            <Text style={styles.productDetailsSectionText}>
                                                {selectedProductForDetails.benefits}
                                            </Text>
                                        </View>
                                    )}
                                    
                                    {selectedProductForDetails.ingredients && (
                                        <View style={styles.productDetailsSection}>
                                            <Text style={styles.productDetailsSectionTitle}>Ingredients</Text>
                                            <Text style={styles.productDetailsSectionText}>
                                                {selectedProductForDetails.ingredients}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                            
                            <View style={styles.productDetailsActions}>
                                <TouchableOpacity 
                                    style={styles.productDetailsEditButton}
                                    onPress={() => {
                                        setSelectedProduct(selectedProductForDetails);
                                        setShowEditModal(true);
                                        setShowProductDetailsModal(false);
                                        setSelectedProductForDetails(null);
                                    }}
                                >
                                    <Ionicons name="pencil" size={20} color="#fff" />
                                    <Text style={styles.productDetailsEditButtonText}>Edit Product</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.productDetailsDeleteButton}
                                    onPress={() => {
                                        setShowProductDetailsModal(false);
                                        setSelectedProductForDetails(null);
                                        handleDeleteProduct(selectedProductForDetails.id);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#fff" />
                                    <Text style={styles.productDetailsDeleteButtonText}>Delete Product</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: themeColors.background,
    },
    container: {
        flex: 1,
        backgroundColor: themeColors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: themeColors.background,
        alignItems: 'center',
        gap: 8,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeColors.card,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: themeColors.border,
        shadowColor: themeColors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: themeColors.text,
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterButton: {
        padding: 10,
        backgroundColor: themeColors.card,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: themeColors.border,
        shadowColor: themeColors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: themeColors.card,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: themeColors.border,
        gap: 6,
        shadowColor: themeColors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sortButtonText: {
        fontSize: 14,
        color: themeColors.primary,
        fontWeight: '600',
    },
    productsCountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: themeColors.card,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.border,
        minHeight: 60,
        shadowColor: themeColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    productsCountInfo: {
        flex: 1,
    },
    productsCount: {
        fontSize: 16,
        color: themeColors.text,
        fontWeight: '600',
        marginBottom: 2,
    },
    productsCountSubtext: {
        fontSize: 12,
        color: themeColors.textSecondary,
        fontStyle: 'italic',
    },
    addProductButton: {
        backgroundColor: themeColors.primary,
        borderRadius: 12,
        elevation: 4,
        shadowColor: themeColors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        minWidth: 120,
    },
    addProductButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 6,
    },
    addProductButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    clearSearchButton: {
        backgroundColor: themeColors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 12,
        shadowColor: themeColors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    clearSearchButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sortModal: {
        backgroundColor: themeColors.card,
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 320,
        shadowColor: themeColors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    sortModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sortModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: themeColors.text,
    },
    sortOptions: {
        gap: 10,
    },
    sortOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 12,
        backgroundColor: themeColors.background,
        borderWidth: 1,
        borderColor: themeColors.border,
    },
    sortOptionSelected: {
        backgroundColor: themeColors.primary,
        borderColor: themeColors.primary,
    },
    sortOptionText: {
        fontSize: 16,
        color: themeColors.text,
        fontWeight: '500',
    },
    sortOptionTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    productGrid: {
	        padding: 12,
    },
    productCard: {
        width: '48%', // Mobile default (2 columns)
        backgroundColor: themeColors.card,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: themeColors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: themeColors.border,
    },
    productCardTablet: {
        width: '31%', // Tablet/Desktop (3 columns)
    },
    productImageContainer: {
        height: 160,
        backgroundColor: themeColors.background,
    },
    productImage: {
        width: '100%',
        height: 160,
        resizeMode: 'cover',
    },
    productCardContent: {
        padding: 12,
    },
    productCardName: {
        fontSize: 15,
        fontWeight: '600',
        color: themeColors.text,
        marginBottom: 6,
        lineHeight: 20,
    },
    productCardPrice: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 4,
    },
    productCardOriginalPrice: {
        fontSize: 12,
        color: themeColors.textTertiary,
        textDecorationLine: 'line-through',
    },
    productCardDiscountedPrice: {
        fontSize: 15,
        color: themeColors.primary,
        fontWeight: '700',
    },
    productCardPriceText: {
        fontSize: 15,
        color: themeColors.primary,
        fontWeight: '700',
    },
    productCardCategory: {
        fontSize: 12,
        color: themeColors.textSecondary,
        marginBottom: 4,
        fontWeight: '500',
    },
    productCardStock: {
        fontSize: 11,
        color: themeColors.textTertiary,
        fontWeight: '500',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        minHeight: 300,
    },
    emptyStateText: {
        fontSize: 16,
        color: themeColors.textSecondary,
        marginTop: 16,
        marginBottom: 24,
        textAlign: 'center',
        fontWeight: '500',
    },
    addFirstButton: {
        backgroundColor: themeColors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: themeColors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    addFirstButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
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
    // Product Details Modal Styles
    productDetailsContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    productDetailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#f8f9fa',
    },
    productDetailsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    productDetailsContent: {
        flex: 1,
    },
    productDetailsImageContainer: {
        height: 250,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageScrollView: {
        flex: 1,
    },
    productDetailsImageWrapper: {
        marginRight: 8,
    },
    productDetailsImage: {
        width: 220,
        height: 220,
        resizeMode: 'cover',
        borderRadius: 8,
    },
    noImagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noImageText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    productDetailsInfo: {
        padding: 16,
    },
    productDetailsName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    productDetailsPrice: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    productDetailsOriginalPrice: {
        fontSize: 16,
        color: '#999',
        textDecorationLine: 'line-through',
    },
    productDetailsDiscountedPrice: {
        fontSize: 18,
        color: '#FF69B4',
        fontWeight: '600',
    },
    productDetailsOfferText: {
        fontSize: 12,
        color: '#FF69B4',
        backgroundColor: '#fff5f5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    productDetailsPriceText: {
        fontSize: 18,
        color: '#FF69B4',
        fontWeight: '600',
    },
    productDetailsCategory: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    productDetailsStock: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    productDetailsSection: {
        marginBottom: 16,
    },
    productDetailsSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    productDetailsSectionText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    productDetailsActions: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        backgroundColor: '#f8f9fa',
    },
    productDetailsEditButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    productDetailsEditButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    productDetailsDeleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dc3545',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    productDetailsDeleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    loadMoreButton: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: themeColors.primary,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: themeColors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    loadMoreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    errorBanner: {
        backgroundColor: '#ffebee',
        padding: 14,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    errorBannerText: {
        color: themeColors.error,
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },
    errorBannerRetry: {
        color: themeColors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
});

// Error Boundary Wrapper
export default function AdminProducts({ initialShowAddForm = false }: AdminProductsProps) {
    const [hasError, setHasError] = useState(false);
    const [errorInfo, setErrorInfo] = useState<string | null>(null);

    if (hasError) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ff4444', marginBottom: 10, textAlign: 'center' }}>
                    Products Screen Error
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
                    {errorInfo || 'An unexpected error occurred'}
                </Text>
                <TouchableOpacity
                    style={{ backgroundColor: '#FF69B4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
                    onPress={() => {
                        setHasError(false);
                        setErrorInfo(null);
                    }}
                >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Wrap in try-catch to prevent crashes (do NOT set state during render)
    try {
        return <AdminProductsInner initialShowAddForm={initialShowAddForm} />;
    } catch (error: any) {
        console.error('AdminProducts render error:', error);
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ff4444', marginBottom: 10, textAlign: 'center' }}>
                    Products Screen Error
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
                    {error?.message || 'An unexpected error occurred'}
                </Text>
                <TouchableOpacity
                    style={{ backgroundColor: '#FF69B4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
                    onPress={() => {}}
                >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }
}
