import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import ImageViewer from 'react-native-image-zoom-viewer';
import { useWishlist } from '../WishlistContext';
import { useCart } from '../CartContext';
import { apiService } from '../services/api';
import ProductReviews from '../components/ProductReviews';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpandableDescription } from '../components/ExpandableDescription';
import {
  ProductSize,
  Benefits,
  Ingredients,
  HowToUse,
  FrequentlyAskedQuestions,
  CustomerReviews,
  FrequentlyBoughtTogether,
  ProductDescription
} from '../../components/product';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  image_url2?: string;
  image_url3?: string;
  usage_instructions?: string | string[];
  size?: string;
  benefits?: string | string[];
  ingredients?: string | string[];
  product_details?: string;
  stock_quantity: number;
  created_at: string;
  offer_percentage: number;
  original_price?: number;
  discount_percentage?: number;
  rating?: number;
  review_count?: number;
  shades?: string[];
  sizes?: string[];
  frequently_bought_together?: RelatedProduct[];
  faqs?: FAQ[];
}

interface RelatedProduct extends Product {}

interface FAQ {
  question: string;
  answer: string;
}

interface CartItem extends Product {
  quantity: number;
  variant?: string;
  cartId?: number;
  selected_shade?: string;
  selected_size?: string;
}

interface ProductReviewsProps {
  productId: number;
  reviews: any[];
  averageRating: number;
  reviewCount: number;
  onReviewAdded: () => void;
  isAuthenticated: boolean;
  currentUserId?: number;
}

export default function ProductPage() {
  const router = useRouter();
  const { id, productData: productDataString } = useLocalSearchParams();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addItem, getCartItems } = useCart();
  const [isLoading, setIsLoading] = useState(true);
  const [productData, setProductData] = useState<Product | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();
  const [selectedShade, setSelectedShade] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<{[key: number]: boolean}>({});
  const scrollViewRef = useRef(null);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const selectedIndex = Math.floor(contentOffset.x / viewSize.width);
    setCurrentImageIndex(selectedIndex);
  };

  useEffect(() => {
    checkAuth();
    loadProductData();
    fetchReviews();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userIdStr = await AsyncStorage.getItem('user_id');
      console.log('Auth check:', {
        token: !!token,
        userIdStr,
        parsedUserId: userIdStr ? parseInt(userIdStr, 10) : undefined
      });
      setIsAuthenticated(!!token);
      setCurrentUserId(userIdStr ? parseInt(userIdStr, 10) : undefined);
    } catch (err) {
      console.error('Error checking auth status:', err);
      setIsAuthenticated(false);
      setCurrentUserId(undefined);
    }
  };

  const loadProductData = async () => {
    try {
      setIsLoading(true);
      if (productDataString) {
        const parsed = JSON.parse(productDataString as string);
        if (parsed && typeof parsed === 'object') {
          console.log('Product data loaded from params:', {
            id: parsed.id,
            name: parsed.name,
            price: parsed.price,
            offer_percentage: parsed.offer_percentage,
            image_url: parsed.image_url,
            processed_image_url: apiService.getFullImageUrl(parsed.image_url)
          });
          // Fetch fresh data from backend to ensure latest prices
          const response = await apiService.get(`/products/${parsed.id}`);
          if (response.data) {
            setProductData(response.data);
          } else {
            setProductData(parsed);
          }
        } else {
          throw new Error('Invalid product data format');
        }
      } else if (id) {
        // Fetch product data if not provided in params
        const response = await apiService.get(`/products/${id}`);
        if (response.data) {
          console.log('Product data loaded from API:', {
            id: response.data.id,
            name: response.data.name,
            price: response.data.price,
            offer_percentage: response.data.offer_percentage,
            image_url: response.data.image_url,
            processed_image_url: apiService.getFullImageUrl(response.data.image_url)
          });
          setProductData(response.data);
        } else {
          throw new Error('Product not found');
        }
      } else {
        throw new Error('No product data or ID provided');
      }
    } catch (error) {
      console.error('Error loading product data:', error);
      Alert.alert('Error', 'Failed to load product details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!id) return;
    try {
      const response = await apiService.get(`/products/${id}/reviews`);
      console.log('Raw reviews response:', response.data);
      
      if (response.data) {
        let reviewsData = [];
        // Handle both array and object response formats
        if (Array.isArray(response.data)) {
          reviewsData = response.data;
        } else if (response.data.reviews) {
          reviewsData = response.data.reviews;
        }

        console.log('Processed reviews data:', reviewsData);
        
        const avgRating = reviewsData.length > 0 
          ? reviewsData.reduce((acc: number, review: any) => acc + review.rating, 0) / reviewsData.length 
          : 0;
        
        setReviews(reviewsData);
        setAverageRating(avgRating);
        setReviewCount(reviewsData.length);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleAuthRequired = () => {
    Alert.alert(
      'Login Required',
      'Please log in to perform this action.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Login', 
          onPress: () => router.push('/auth/login')
        }
      ]
    );
  };

  const checkDelivery = async () => {
    if (!pincode || pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    setIsCheckingDelivery(true);
    try {
      const isBangaloreArea = parseInt(pincode) >= 560001 && parseInt(pincode) <= 560100;
      
      if (isBangaloreArea) {
        Alert.alert(
          'Delivery Status',
          `Delivery available to ${pincode}. Estimated delivery in 2-3 business days.`
        );
      } else {
        Alert.alert(
          'Delivery Status',
          `Delivery to ${pincode} will take 5-7 business days.`
        );
      }
    } catch (error) {
      console.error('Error checking delivery:', error);
      Alert.alert('Error', 'Failed to check delivery availability. Please try again.');
    } finally {
      setIsCheckingDelivery(false);
    }
  };

  const handleAddToCart = async (item?: Product) => {
    if (!isAuthenticated) {
      handleAuthRequired();
      return;
    }

    const productToAdd = item || productData;
    if (!productToAdd || !productToAdd.stock_quantity) {
      Alert.alert('Error', 'Product is out of stock');
      return;
    }

    // Check if product has sizes and if size is selected
    if (productToAdd.sizes && productToAdd.sizes.length > 0 && !selectedSize) {
      Alert.alert('Error', 'Please select a size before adding to cart');
      return;
    }

    setIsAddingToCart(true);
    try {
      // Add the selected size to the product when adding to cart
      const productWithSize = {
        ...productToAdd,
        selected_size: selectedSize
      };
      await addItem(productWithSize);
      Alert.alert(
        'Success',
        'Item added to cart successfully',
        [
          { text: 'Continue Shopping', style: 'cancel' },
          { text: 'View Cart', onPress: () => router.push('/cart') }
        ]
      );
    } catch (error) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlistPress = async () => {
    if (!isAuthenticated) {
      handleAuthRequired();
      return;
    }

    if (!productData) {
      Alert.alert('Error', 'Product data not available');
      return;
    }

    try {
      if (isInWishlist(productData.id)) {
        await removeFromWishlist(productData.id);
      } else {
        const wishlistProduct = {
          ...productData,
          usage_instructions: Array.isArray(productData.usage_instructions) 
            ? productData.usage_instructions.join('\n') 
            : productData.usage_instructions,
          benefits: Array.isArray(productData.benefits)
            ? productData.benefits.join('\n')
            : productData.benefits,
          ingredients: Array.isArray(productData.ingredients)
            ? productData.ingredients.join('\n')
            : productData.ingredients,
        };
        await addToWishlist(wishlistProduct);
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

  const handleAddReview = async (review: { rating: number; comment: string }) => {
    if (!isAuthenticated) {
      handleAuthRequired();
      return;
    }

    try {
      const userName = await AsyncStorage.getItem('user_name') || 'Anonymous';
      console.log('Current user data:', {
        currentUserId,
        userName,
        isAuthenticated
      });

      const reviewData = {
        ...review,
        product_id: Number(id),
        user_id: currentUserId,
        user_name: userName,
        created_at: new Date().toISOString()
      };

      console.log('Sending review data:', reviewData);
      
      const response = await apiService.post(`/products/${id}/reviews`, reviewData);
      console.log('Review submission response:', response.data);
      
      if (response.data) {
        // Add the new review to the existing reviews
        const newReview = response.data.review || response.data;
        setReviews(prevReviews => [...prevReviews, newReview]);
        
        // Recalculate average rating
        const newAvgRating = (averageRating * reviewCount + review.rating) / (reviewCount + 1);
        setAverageRating(newAvgRating);
        setReviewCount(prev => prev + 1);
        
        Alert.alert('Success', 'Review added successfully');
      }
    } catch (error) {
      console.error('Add review error:', error);
      Alert.alert('Error', 'Failed to add review');
    }
  };

  const handleEditReview = async (reviewId: number, review: { rating: number; comment: string }) => {
    try {
      const response = await apiService.put(`/products/${id}/reviews/${reviewId}`, review);
      if (response.data) {
        await fetchReviews();
        Alert.alert('Success', 'Review updated successfully');
      }
    } catch (error) {
      console.error('Edit review error:', error);
      Alert.alert('Error', 'Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      const response = await apiService.delete(`/products/${id}/reviews/${reviewId}`);
      if (response.data) {
        await fetchReviews();
        Alert.alert('Success', 'Review deleted successfully');
      }
    } catch (error) {
      console.error('Delete review error:', error);
      Alert.alert('Error', 'Failed to delete review');
    }
  };

  const handleNotifyMe = async () => {
    // Implementation of handleNotifyMe function
  };

  // Function to handle image press
  const handleImagePress = (index: number) => {
    setCurrentImageIndex(index);
    setIsImageViewerVisible(true);
  };

  // Function to handle image errors
  const handleImageError = (imageIndex: number) => {
    console.log(`Image ${imageIndex} failed to load`);
    setImageErrors(prev => ({ ...prev, [imageIndex]: true }));
  };

  // Function to get image URLs for the viewer
  const getImageUrls = () => {
    if (!productData) return [];
    
    const urls = [
      { url: imageErrors[0] ? 'https://via.placeholder.com/400x400/f8f9fa/666666?text=No+Image' : apiService.getFullImageUrl(productData.image_url) }
    ];
    
    if (productData.image_url2) {
      urls.push({ url: imageErrors[1] ? 'https://via.placeholder.com/400x400/f8f9fa/666666?text=No+Image' : apiService.getFullImageUrl(productData.image_url2) });
    }
    
    if (productData.image_url3) {
      urls.push({ url: imageErrors[2] ? 'https://via.placeholder.com/400x400/f8f9fa/666666?text=No+Image' : apiService.getFullImageUrl(productData.image_url3) });
    }
    
    return urls;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!productData) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{productData.name}</Text>
          <TouchableOpacity onPress={handleWishlistPress} style={styles.headerButton}>
            <Ionicons 
              name={isInWishlist(productData.id) ? "heart" : "heart-outline"} 
              size={24} 
              color={isInWishlist(productData.id) ? "#FF6B6B" : "#666"} 
            />
          </TouchableOpacity>
        </View>

        {/* Product Images */}
        <View style={styles.imageSection}>
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.imageContainer}
            onScroll={(event) => {
              const contentOffset = event.nativeEvent.contentOffset;
              const viewSize = event.nativeEvent.layoutMeasurement;
              const selectedIndex = Math.floor(contentOffset.x / viewSize.width);
              setCurrentImageIndex(selectedIndex);
            }}
            scrollEventThrottle={16}
          >
            <TouchableOpacity 
              onPress={() => handleImagePress(0)}
              style={styles.imageWrapper}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: imageErrors[0] ? 'https://via.placeholder.com/400x400/f8f9fa/666666?text=No+Image' : apiService.getFullImageUrl(productData.image_url) }} 
                style={styles.productImage}
                resizeMode="contain"
                onError={() => handleImageError(0)}
              />
              <View style={styles.imageOverlay}>
                <Ionicons name="expand" size={24} color="rgba(255,255,255,0.8)" />
              </View>
            </TouchableOpacity>
            {productData.image_url2 && (
              <TouchableOpacity 
                onPress={() => handleImagePress(1)}
                style={styles.imageWrapper}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ uri: imageErrors[1] ? 'https://via.placeholder.com/400x400/f8f9fa/666666?text=No+Image' : apiService.getFullImageUrl(productData.image_url2) }} 
                  style={styles.productImage}
                  resizeMode="contain"
                  onError={() => handleImageError(1)}
                />
                <View style={styles.imageOverlay}>
                  <Ionicons name="expand" size={24} color="rgba(255,255,255,0.8)" />
                </View>
              </TouchableOpacity>
            )}
            {productData.image_url3 && (
              <TouchableOpacity 
                onPress={() => handleImagePress(2)}
                style={styles.imageWrapper}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ uri: imageErrors[2] ? 'https://via.placeholder.com/400x400/f8f9fa/666666?text=No+Image' : apiService.getFullImageUrl(productData.image_url3) }} 
                  style={styles.productImage}
                  resizeMode="contain"
                  onError={() => handleImageError(2)}
                />
                <View style={styles.imageOverlay}>
                  <Ionicons name="expand" size={24} color="rgba(255,255,255,0.8)" />
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
          
          {/* Image Counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1} / {getImageUrls().length}
            </Text>
          </View>
        </View>

        {/* Image Pagination Dots */}
        <View style={styles.paginationDots}>
          <View style={[styles.dot, currentImageIndex === 0 && styles.activeDot]} />
          {productData.image_url2 && (
            <View style={[styles.dot, currentImageIndex === 1 && styles.activeDot]} />
          )}
          {productData.image_url3 && (
            <View style={[styles.dot, currentImageIndex === 2 && styles.activeDot]} />
          )}
        </View>

        {/* Image Viewer Modal */}
        <Modal
          visible={isImageViewerVisible}
          transparent={true}
          onRequestClose={() => setIsImageViewerVisible(false)}
          animationType="fade"
        >
          <View style={styles.imageViewerContainer}>
            <ImageViewer
              imageUrls={getImageUrls()}
              index={currentImageIndex}
              enableSwipeDown={true}
              onSwipeDown={() => setIsImageViewerVisible(false)}
              renderHeader={() => (
                <View style={styles.imageViewerHeader}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsImageViewerVisible(false)}
                  >
                    <Ionicons name="close" size={28} color="white" />
                  </TouchableOpacity>
                  <View style={styles.imageViewerCounter}>
                    <Text style={styles.imageViewerCounterText}>
                      {currentImageIndex + 1} / {getImageUrls().length}
                    </Text>
                  </View>
                </View>
              )}
              renderIndicator={() => null}
            />
          </View>
        </Modal>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{productData.name}</Text>
          <View style={styles.priceContainer}>
            {productData.offer_percentage > 0 ? (
              <>
                <Text style={styles.price}>
                  ₹{(productData.price * (1 - productData.offer_percentage / 100)).toFixed(2)}
                </Text>
                <Text style={styles.originalPrice}>
                  ₹{parseFloat(String(productData.price)).toFixed(2)}
                </Text>
                <Text style={styles.discount}>{productData.offer_percentage}% OFF</Text>
              </>
            ) : (
              <Text style={styles.price}>₹{parseFloat(String(productData.price)).toFixed(2)}</Text>
            )}
          </View>

          {/* Stock Indicator */}
          <View style={styles.stockContainer}>
            {productData.stock_quantity === 0 ? (
              <Text style={[styles.stockText, styles.outOfStock]}>Out of Stock</Text>
            ) : productData.stock_quantity <= 3 ? (
              <Text style={[styles.stockText, styles.lowStock]}>Only {productData.stock_quantity} left in stock</Text>
            ) : (
              <Text style={[styles.stockText, styles.inStock]}>In Stock</Text>
            )}
          </View>

          {/* Rating Section */}
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>
              {averageRating > 0 ? averageRating.toFixed(1) : 'No ratings'}
            </Text>
            {averageRating > 0 && (
              <>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.reviews}>({reviewCount} reviews)</Text>
              </>
            )}
          </View>

          {/* Product Description */}
          {productData.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <ExpandableDescription 
                description={productData.description}
                maxLines={4}
                textStyle={styles.descriptionText}
                expandLabel="See more"
                collapseLabel="See less"
              />
            </View>
          )}

          {/* Size Selection */}
          {(() => {
            const availableSizes: string[] = [];
            if (productData.sizes && Array.isArray(productData.sizes)) {
              availableSizes.push(...productData.sizes);
            }
            if (productData.size && typeof productData.size === 'string') {
              availableSizes.push(productData.size);
            }
            return availableSizes.length > 0 ? (
              <ProductSize
                sizes={availableSizes}
                selectedSize={selectedSize}
                onSelectSize={setSelectedSize}
              />
            ) : null;
          })()}

          {/* Check Delivery */}
          <View style={styles.deliveryCheck}>
            <Text style={styles.sectionTitle}>Check Delivery</Text>
            <View style={styles.pincodeContainer}>
              <TextInput
                style={styles.pincodeInput}
                placeholder="Enter Pincode"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity 
                style={styles.checkButton} 
                onPress={checkDelivery}
                disabled={isCheckingDelivery}
              >
                <Text style={styles.checkButtonText}>
                  {isCheckingDelivery ? 'Checking...' : 'Check'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {productData.stock_quantity > 0 ? (
              <> 
                <TouchableOpacity 
                  style={[styles.button, styles.addToCartButton]} 
                  onPress={() => handleAddToCart()}
                  disabled={isAddingToCart}
                >
                  <Ionicons name="cart-outline" size={20} color="#007AFF" />
                  <Text style={styles.addToCartText}>
                    {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.button, styles.buyNowButton]} 
                  onPress={async () => {
                    if (!isAuthenticated) {
                      handleAuthRequired();
                      return;
                    }

                    // Check if product has sizes and if size is selected
                    if (productData.sizes && productData.sizes.length > 0 && !selectedSize) {
                      Alert.alert('Error', 'Please select a size before proceeding');
                      return;
                    }

                    const existingItem = await getCartItems().find(cartItem => cartItem.id === productData.id);
                    if (existingItem) {
                      Alert.alert('Item already in cart', 'You can view it in your cart.');
                      router.push('/cart');
                    } else {
                      // Add the selected size to the product when adding to cart
                      const productWithSize = {
                        ...productData,
                        selected_size: selectedSize
                      };
                      await addItem(productWithSize);
                      Alert.alert(
                        'Added to Cart',
                        'Item added to cart successfully',
                        [{ text: 'View Cart', onPress: () => router.push('/cart') }]
                      );
                    }
                  }}
                >
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={styles.buyNowText}>Buy Now</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.outOfStockContainer}>
                <Text style={styles.outOfStockMessage}>Stay tuned for this item to be back in stock.</Text>
                <TouchableOpacity 
                  style={styles.notifyButton}
                  onPress={handleNotifyMe}
                >
                  <Text style={styles.notifyButtonText}>Notify Me When Available</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Frequently Bought Together */}
          {productData && (
            <FrequentlyBoughtTogether 
              currentProductId={productData.id}
              category={productData.category}
            />
          )}

          {/* Benefits */}
          {productData.benefits && (
            <Benefits 
              benefits={
                Array.isArray(productData.benefits) 
                  ? productData.benefits 
                  : productData.benefits.split('\n').filter(benefit => benefit.trim())
              } 
            />
          )}

          {/* Ingredients */}
          {productData.ingredients && (
            <Ingredients 
              ingredients={
                Array.isArray(productData.ingredients) 
                  ? productData.ingredients 
                  : productData.ingredients.split('\n').filter(ingredient => ingredient.trim())
              } 
            />
          )}

          {/* How to Use */}
          {productData.usage_instructions && (
            <HowToUse 
              steps={
                Array.isArray(productData.usage_instructions) 
                  ? productData.usage_instructions.map((instruction, index) => ({
                      step: index + 1,
                      instruction: instruction.trim()
                    }))
                  : productData.usage_instructions.split('\n')
                      .filter(instruction => instruction.trim())
                      .map((instruction, index) => ({
                        step: index + 1,
                        instruction: instruction.trim()
                      }))
              } 
            />
          )}

          {/* FAQ */}
          {productData.faqs && productData.faqs.length > 0 && (
            <FrequentlyAskedQuestions />
          )}

          {/* Customer Reviews */}
          <CustomerReviews 
            rating={averageRating}
            reviews={reviews}
            productId={Number(id)}
            isAuthenticated={isAuthenticated}
            currentUserId={currentUserId}
            onAddReview={handleAddReview}
            onEditReview={handleEditReview}
            onDeleteReview={handleDeleteReview}
            onLogin={handleAuthRequired}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  imageSection: {
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    width: Dimensions.get('window').width,
    height: 400,
  },
  imageWrapper: {
    width: Dimensions.get('window').width,
    height: 400,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  productImage: {
    width: Dimensions.get('window').width - 40,
    height: 400,
    resizeMode: 'contain',
  },
  imageOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    opacity: 0.8,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginHorizontal: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  activeDot: {
    backgroundColor: '#007AFF',
    width: 12,
    height: 12,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  productInfo: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productName: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
    lineHeight: 32,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 12,
    color: '#2c3e50',
  },
  originalPrice: {
    fontSize: 20,
    textDecorationLine: 'line-through',
    color: '#95a5a6',
    marginRight: 12,
  },
  discount: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: '700',
    backgroundColor: '#d5f4e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  rating: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
    color: '#f39c12',
  },
  reviews: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  descriptionSection: {
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'left',
  },
  deliveryCheck: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pincodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pincodeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  checkButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  checkButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addToCartButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  addToCartText: {
    color: '#007AFF',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 16,
  },
  buyNowButton: {
    backgroundColor: '#007AFF',
  },
  buyNowText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 16,
  },
  stockContainer: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inStock: {
    color: '#27ae60',
  },
  lowStock: {
    color: '#e74c3c',
  },
  outOfStock: {
    color: '#e74c3c',
    fontWeight: '700',
  },
  outOfStockContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  outOfStockMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  notifyButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  notifyButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000,
    padding: 10,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  imageViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  imageViewerCounter: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  imageViewerCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
