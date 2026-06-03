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
  Animated,
  Share,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Video, ResizeMode } from 'expo-av';
import { useWishlist } from '../WishlistContext';
import { useCart } from '../CartContext';
import { apiService } from '../services/api';
import ProductReviews from '../components/ProductReviews';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpandableDescription } from '../components/ExpandableDescription';
import { OptimizedImage } from '../components/OptimizedImage';
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
import { imagePreloader } from '../utils/imagePreloader';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  image_url2?: string;
  image_url3?: string;
  media?: Array<{ url: string; type: 'image' | 'gif' | 'video' }>;
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
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isHowToUseExpanded, setIsHowToUseExpanded] = useState(false);
  const [isIngredientsExpanded, setIsIngredientsExpanded] = useState(false);
  const [isBenefitsExpanded, setIsBenefitsExpanded] = useState(false);
  const [isAutoScrollDisabled, setIsAutoScrollDisabled] = useState(false);
  const scrollViewRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

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

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Function to get all media items for the main details carousel
  const getMediaList = () => {
    if (!productData) return [];
    
    if (productData.media && Array.isArray(productData.media) && productData.media.length > 0) {
      return productData.media;
    }
    
    // Fallback to legacy structure
    const legacyList = [
      { url: productData.image_url, type: 'image' }
    ];
    if (productData.image_url2) legacyList.push({ url: productData.image_url2, type: 'image' });
    if (productData.image_url3) legacyList.push({ url: productData.image_url3, type: 'image' });
    
    return legacyList;
  };

  // Preload next images when current image index changes
  useEffect(() => {
    if (productData) {
      const imageUrls = getMediaList()
        .filter(item => item.type !== 'video')
        .map(item => apiService.getFullImageUrl(item.url));
      
      imagePreloader.preloadCarouselImages(imageUrls, currentImageIndex);
    }
  }, [currentImageIndex, productData]);

  // Auto-scroll images every 8 seconds
  useEffect(() => {
    if (!productData || isImageViewerVisible || isAutoScrollDisabled) return;
    
    const mediaList = getMediaList();
    const numItems = mediaList.length;

    if (numItems <= 1) return;

    const intervalId = setInterval(() => {
      // Pause auto-scroll if current item is a video
      const currentItem = mediaList[currentImageIndex];
      if (currentItem && currentItem.type === 'video') {
        return;
      }

      const nextIndex = (currentImageIndex + 1) % numItems;
      if (scrollViewRef.current) {
        // @ts-ignore
        scrollViewRef.current.scrollTo({
          x: nextIndex * Dimensions.get('window').width,
          animated: true,
        });
      }
      setCurrentImageIndex(nextIndex);
    }, 8000);

    return () => clearInterval(intervalId);
  }, [productData, currentImageIndex, isImageViewerVisible, isAutoScrollDisabled]);

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
    router.push('/auth/login');
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

    setIsAddingToCart(true);
    try {
      await addItem(productToAdd);
      router.navigate('/cart');
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
    setIsAutoScrollDisabled(true);
  };

  // Function to handle product sharing
  const handleShare = async () => {
    if (!productData) return;
    try {
      const shareUrl = `https://sarangaayurveda.com/product/${productData.id}`;
      const message = `Check out this amazing product from Saranga Ayurveda: ${productData.name}\n\nPrice: ₹${productData.price}\n\nLink: ${shareUrl}`;
      await Share.share({
        message: message,
        title: productData.name,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  };

  // Function to handle image errors
  const handleImageError = (imageIndex: number) => {
    console.log(`Image ${imageIndex} failed to load`);
    setImageErrors(prev => ({ ...prev, [imageIndex]: true }));
  };

  // Function to get image URLs for the viewer (images and gifs, excluding videos)
  const getImageUrls = () => {
    if (!productData) return [];
    
    const mediaList = getMediaList();
    const imagesOnly = mediaList.filter(m => m.type !== 'video');
    
    if (imagesOnly.length > 0) {
      return imagesOnly.map((m, idx) => ({
        url: imageErrors[idx] ? 'https://via.placeholder.com/400x400/f8f9fa/666666?text=No+Image' : apiService.getFullImageUrl(m.url)
      }));
    }
    
    return [];
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
            {getMediaList().map((item, index) => (
              <View key={index} style={styles.imageWrapper}>
                {item.type === 'video' ? (
                  <Video
                    source={{ uri: apiService.getFullImageUrl(item.url) }}
                    rate={1.0}
                    volume={1.0}
                    isMuted={true}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={currentImageIndex === index}
                    isLooping
                    useNativeControls
                    style={styles.productVideo}
                  />
                ) : (
                  <TouchableOpacity 
                    onPress={() => handleImagePress(index)}
                    activeOpacity={0.9}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <OptimizedImage
                      source={{ uri: apiService.getFullImageUrl(item.url) }}
                      style={styles.productImage}
                      resizeMode="contain"
                      placeholderColor="#f8f9fa"
                      showLoader={true}
                      priority={index === 0 ? "high" : "normal"}
                      onError={() => handleImageError(index)}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Image Pagination Dots on Image */}
          {getMediaList().length > 1 && !isImageViewerVisible && (
            <View style={styles.paginationDots}>
              {getMediaList().map((_, idx) => (
                <View key={idx} style={[styles.dot, currentImageIndex === idx && styles.activeDot]} />
              ))}
            </View>
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
              onChange={(index) => {
                if (index !== undefined) {
                  setCurrentImageIndex(index);
                }
              }}
              enableSwipeDown={true}
              onSwipeDown={() => setIsImageViewerVisible(false)}
              renderHeader={() => null}
              renderIndicator={() => null}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsImageViewerVisible(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.productName, { flex: 1, marginBottom: 0 }]}>{productData.name}</Text>
            <TouchableOpacity onPress={handleShare} style={styles.shareButton} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={24} color="#2b3a1a" />
            </TouchableOpacity>
          </View>
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
          {productData.stock_quantity === 0 ? (
            <View style={styles.stockContainer}>
              <Text style={[styles.stockText, styles.outOfStock]}>Out of Stock</Text>
            </View>
          ) : productData.stock_quantity < 10 ? (
            <View style={styles.stockContainer}>
              <Animated.View style={{ opacity: pulseAnim, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="flame" size={16} color="#e74c3c" style={{ marginRight: 4 }} />
                <Text style={[styles.stockText, styles.lowStock]}>Only few left!</Text>
              </Animated.View>
            </View>
          ) : null}

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

          {/* Collapsible Accordions (Description, Ingredients, How to Use) */}
          <View style={styles.accordionContainer}>
            {/* Description Accordion */}
            {productData.description && (
              <View style={styles.accordionSection}>
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => setIsDescExpanded(!isDescExpanded)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isDescExpanded ? "remove" : "add"} 
                    size={18} 
                    color="#694d21" 
                    style={styles.accordionIcon} 
                  />
                  <Text style={styles.accordionTitle}>Description</Text>
                </TouchableOpacity>
                {isDescExpanded && (
                  <View style={styles.accordionContent}>
                    <Text style={styles.descriptionText}>{productData.description}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Benefits Accordion */}
            {productData.benefits && (
              <View style={styles.accordionSection}>
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => setIsBenefitsExpanded(!isBenefitsExpanded)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isBenefitsExpanded ? "remove" : "add"} 
                    size={18} 
                    color="#694d21" 
                    style={styles.accordionIcon} 
                  />
                  <Text style={styles.accordionTitle}>Benefits</Text>
                </TouchableOpacity>
                {isBenefitsExpanded && (
                  <View style={styles.accordionContent}>
                    <Text style={styles.descriptionText}>
                      {Array.isArray(productData.benefits) 
                        ? productData.benefits.join('\n') 
                        : productData.benefits}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Ingredients Accordion */}
            {productData.ingredients && (
              <View style={styles.accordionSection}>
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => setIsIngredientsExpanded(!isIngredientsExpanded)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isIngredientsExpanded ? "remove" : "add"} 
                    size={18} 
                    color="#694d21" 
                    style={styles.accordionIcon} 
                  />
                  <Text style={styles.accordionTitle}>Ingredients</Text>
                </TouchableOpacity>
                {isIngredientsExpanded && (
                  <View style={styles.accordionContent}>
                    <Text style={styles.descriptionText}>
                      {Array.isArray(productData.ingredients) 
                        ? productData.ingredients.join(', ') 
                        : productData.ingredients}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* How to Use Accordion */}
            {productData.usage_instructions && (
              <View style={styles.accordionSection}>
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => setIsHowToUseExpanded(!isHowToUseExpanded)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isHowToUseExpanded ? "remove" : "add"} 
                    size={18} 
                    color="#694d21" 
                    style={styles.accordionIcon} 
                  />
                  <Text style={styles.accordionTitle}>How to Use</Text>
                </TouchableOpacity>
                {isHowToUseExpanded && (
                  <View style={styles.accordionContent}>
                    {(Array.isArray(productData.usage_instructions) 
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
                    ).map((step) => (
                      <View key={step.step} style={styles.stepContainer}>
                        <View style={styles.stepNumberContainer}>
                          <Ionicons name="information-circle" size={18} color="#694d21" />
                        </View>
                        <View style={styles.stepContent}>
                          <Text style={styles.stepTitle}>Step {step.step}</Text>
                          <Text style={styles.stepInstruction}>{step.instruction}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

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

          {/* Frequently Bought Together */}
          {productData && (
            <FrequentlyBoughtTogether 
              currentProductId={productData.id}
              category={productData.category}
            />
          )}



          {/* Expandable details replaced by global accordion above */}

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

      {/* Sticky Action Buttons */}
      <View style={styles.actionButtons}>
        {productData.stock_quantity > 0 ? (
          <> 
            <TouchableOpacity 
              style={[styles.button, styles.addToCartButton]} 
              onPress={() => handleAddToCart()}
              disabled={isAddingToCart}
              activeOpacity={0.8}
            >
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

                const existingItem = await getCartItems().find(cartItem => cartItem.id === productData.id);
                if (!existingItem) {
                  await addItem(productData);
                }
                router.navigate('/cart');
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#2b3a1a', '#2b3a1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buyNowGradient}
              >
                <Text style={styles.buyNowText}>Buy Now</Text>
              </LinearGradient>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fbf7f4',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fbf7f4',
  },
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 4,
    backgroundColor: '#fbf7f4',
    zIndex: 10,
  },
  headerButton: {
    padding: 6,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  imageSection: {
    backgroundColor: '#fbf7f4',
    marginBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
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
    backgroundColor: '#fbf7f4',
  },
  productImage: {
    width: Dimensions.get('window').width,
    height: 400,
    resizeMode: 'contain',
  },
  productVideo: {
    width: Dimensions.get('window').width,
    height: 400,
    backgroundColor: '#000',
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
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#2b3a1a',
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  productInfo: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: '#fbf7f4',
  },
  productName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    color: '#111827',
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 22,
    fontWeight: '900',
    marginRight: 12,
    color: '#111827',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    color: '#9ca3af',
    marginRight: 12,
  },
  discount: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '800',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#efede4',
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  rating: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 6,
    color: '#2e3e1d',
  },
  reviews: {
    fontSize: 14,
    color: '#2e3e1d',
    marginLeft: 6,
    fontWeight: '600',
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
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    backgroundColor: '#ebe8da',
    fontSize: 16,
  },
  checkButton: {
    backgroundColor: '#2b3a1a',
    paddingHorizontal: 24,
    height: 48,
    justifyContent: 'center',
    borderRadius: 12,
  },
  checkButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#fbf7f4',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 28,
  },
  addToCartButton: {
    backgroundColor: '#ebe8da',
    borderWidth: 2,
    borderColor: '#2b3a1a',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addToCartText: {
    color: '#2b3a1a',
    fontWeight: '800',
    marginLeft: 0,
    fontSize: 16,
  },
  buyNowButton: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  buyNowGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buyNowText: {
    color: '#fff',
    fontWeight: '800',
    marginLeft: 0,
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
    top: Platform.OS === 'ios' ? 50 : 25,
    right: 20,
    zIndex: 9999,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
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
  accordionContainer: {
    marginVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  accordionSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  accordionIcon: {
    marginRight: 10,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  accordionContent: {
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  ingredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientItem: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ingredientText: {
    fontSize: 14,
    color: '#333',
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumberContainer: {
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepInstruction: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#efede4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
