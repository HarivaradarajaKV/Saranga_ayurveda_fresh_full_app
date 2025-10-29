import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWishlist } from '../WishlistContext';
import { useCart, CartItem } from '../CartContext';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

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

interface ProductCardProps {
  product: Product;
  hideActions?: boolean;
}

export default function ProductCard({ product, hideActions = false }: ProductCardProps) {
  const router = useRouter();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addItem, getCartItems } = useCart();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const inWishlist = isInWishlist(product.id);
  const [imageError, setImageError] = useState(false);
  const [isWishlistProcessing, setIsWishlistProcessing] = useState(false);
  const [isCartProcessing, setIsCartProcessing] = useState(false);
  const [lastTapTimestamp, setLastTapTimestamp] = useState(0);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const wishlistScaleAnim = useRef(new Animated.Value(1)).current;
  const cartScaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    checkAuth();
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      setIsAuthenticated(!!token);
    } catch (err) {
      console.error('Error checking auth status:', err);
      setIsAuthenticated(false);
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
          onPress: () => router.push({
            pathname: '/auth/login'
          })
        }
      ]
    );
  };

  const formatPrice = (price: number | undefined | null): string => {
    if (typeof price !== 'number') return '0.00';
    return Number(price).toFixed(2);
  };

  const handleWishlistPress = async () => {
    // Debounce logic to prevent double taps
    const currentTime = new Date().getTime();
    if (currentTime - lastTapTimestamp < 500) return; // Prevent taps within 500ms
    setLastTapTimestamp(currentTime);

    // Animate wishlist button
    Animated.sequence([
      Animated.timing(wishlistScaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(wishlistScaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(wishlistScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (!isAuthenticated) {
      handleAuthRequired();
      return;
    }

    try {
      if (inWishlist) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product);
      }
    } catch (error: any) {
      if (error.message === 'User not authenticated' || 
          error.message === 'Invalid or expired token' ||
          error.message === 'Token expired') {
        await AsyncStorage.removeItem('auth_token');
        setIsAuthenticated(false);
        handleAuthRequired();
      } else if (error.message === 'Item already in wishlist') {
        return;
      } else {
        Alert.alert(
          'Error',
          'Failed to update wishlist. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleAddToCart = async () => {
    // Debounce logic to prevent double taps
    const currentTime = new Date().getTime();
    if (currentTime - lastTapTimestamp < 500) return; // Prevent taps within 500ms
    setLastTapTimestamp(currentTime);

    // Animate cart button
    Animated.sequence([
      Animated.timing(cartScaleAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cartScaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cartScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (!isAuthenticated) {
      handleAuthRequired();
      return;
    }

    if (product.stock_quantity > 0) {
      try {
        await addItem(product);
        Alert.alert('Success', 'Product added to cart successfully');
      } catch (error) {
        console.error('Error adding to cart:', error);
        Alert.alert('Error', 'Failed to add product to cart');
      }
    } else {
      Alert.alert('Out of Stock', 'This product is currently unavailable');
    }
  };

  const imageUrl = apiService.getFullImageUrl(product.image_url);

  const handlePress = () => {
    // Animate card press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const cleanProduct = {
      ...product,
      price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
      offer_percentage: product.offer_percentage || 0,
      average_rating: product.average_rating || 0,
      review_count: product.review_count || 0
    };

    // Ensure all values are serializable
    const serializableProduct = JSON.parse(JSON.stringify(cleanProduct));

    router.push({
      pathname: "/(product)/[id]",
      params: { 
        id: product.id.toString(),
        productData: JSON.stringify(serializableProduct)
      }
    });
  };

  const displayPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const hasOffer = product.offer_percentage > 0;
  const finalPrice = hasOffer ? displayPrice * (1 - product.offer_percentage / 100) : displayPrice;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <TouchableOpacity 
        onPress={handlePress}
        activeOpacity={0.9}
        style={styles.cardTouchable}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: imageError ? 'https://via.placeholder.com/144x144/f8f9fa/666666?text=No+Image' : imageUrl }} 
            style={styles.image}
            onError={() => {
              console.log('Image failed to load:', imageUrl);
              setImageError(true);
            }}
            onLoad={() => setImageError(false)}
          />
          {hasOffer && (
            <Animated.View style={styles.offerBadge}>
              <Text style={styles.offerText}>{product.offer_percentage}% OFF</Text>
            </Animated.View>
          )}
          {!hideActions && (
            <Animated.View
              style={[
                styles.wishlistButton,
                isWishlistProcessing && styles.wishlistButtonDisabled,
                { transform: [{ scale: wishlistScaleAnim }] }
              ]}
            >
              <TouchableOpacity 
                onPress={handleWishlistPress}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={isWishlistProcessing}
                style={styles.wishlistTouchable}
              >
                <Ionicons 
                  name={inWishlist ? "heart" : "heart-outline"} 
                  size={24} 
                  color={inWishlist ? "#FF69B4" : "#666"}
                />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          <View style={styles.ratingContainer}>
            {product.review_count && product.review_count > 0 ? (
              <>
                <View style={styles.ratingWrapper}>
                  <Text style={styles.rating}>{Number(product.average_rating || 0).toFixed(1)}</Text>
                  <Ionicons name="star" size={14} color="#FFD700" style={styles.starIcon} />
                </View>
                <Text style={styles.reviewCount}>({product.review_count})</Text>
              </>
            ) : (
              <Text style={styles.noRating}>No ratings yet</Text>
            )}
          </View>
          <View style={styles.priceContainer}>
            <View style={styles.priceWrapper}>
              <Text style={styles.price}>₹{formatPrice(finalPrice)}</Text>
              {hasOffer && (
                <Text style={styles.originalPrice}>₹{formatPrice(displayPrice)}</Text>
              )}
            </View>
            {!hideActions && (
              <Animated.View
                style={[
                  styles.actionButton,
                  styles.addToCartButton,
                  product.stock_quantity === 0 && styles.disabledButton,
                  isCartProcessing && styles.processingButton,
                  { transform: [{ scale: cartScaleAnim }] }
                ]}
              >
                <TouchableOpacity 
                  onPress={handleAddToCart}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={product.stock_quantity === 0 || isCartProcessing}
                  style={styles.cartTouchable}
                >
                  <Ionicons name="cart-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    height: 320,
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: 6,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  } as const,
  cardTouchable: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 170,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  priceWrapper: {
    flexDirection: 'column',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  originalPrice: {
    fontSize: 13,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  offerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    elevation: 4,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  offerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007bff',
    elevation: 4,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addToCartButton: {
    backgroundColor: '#007bff',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  wishlistButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 22,
    padding: 8,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  wishlistButtonDisabled: {
    backgroundColor: '#ccc',
  },
  wishlistTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
    minHeight: 24,
  } as const,
  ratingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  } as const,
  rating: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d63031',
    marginRight: 2,
  } as const,
  starIcon: {
    marginRight: 2,
  } as const,
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  } as const,
  noRating: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  } as const,
  processingButton: {
    backgroundColor: '#ccc',
  },
}); 