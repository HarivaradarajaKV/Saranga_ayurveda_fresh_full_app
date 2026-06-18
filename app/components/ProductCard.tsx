import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWishlist } from '../WishlistContext';
import { useCart, CartItem } from '../CartContext';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../services/authEvents';
import { OptimizedImage } from './OptimizedImage';

const { width } = Dimensions.get('window');

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  category_name?: string;
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
  hideWishlist?: boolean;
  showTrash?: boolean;
}

export default function ProductCard({ product, hideActions = false, hideWishlist = false, showTrash = false }: ProductCardProps) {
  const router = useRouter();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addItem, getCartItems, items } = useCart();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isInCart = items?.some(item => item.id === product.id) || false;
  const inWishlist = isInWishlist(product.id);
  const [isWishlistProcessing, setIsWishlistProcessing] = useState(false);
  const [isCartProcessing, setIsCartProcessing] = useState(false);
  const [lastTapTimestamp, setLastTapTimestamp] = useState(0);

  const [cardWidth, setCardWidth] = useState<number | null>(null);

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width && width !== cardWidth) {
      setCardWidth(width);
    }
  };

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const wishlistScaleAnim = useRef(new Animated.Value(1)).current;
  const cartScaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

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

    // Pulse animation for selling fast text
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
    router.push({
      pathname: '/auth/login'
    });
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
        await AsyncStorage.removeItem('user_role');
        await AsyncStorage.removeItem('name');
        await AsyncStorage.removeItem('user_name');
        authEvents.notify();
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
      category_name: product.category_name,
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
      onLayout={handleLayout}
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          height: cardWidth ? cardWidth + 95 : 255,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={product.stock_quantity === 0 ? 1 : 0.9}
        disabled={product.stock_quantity === 0}
        style={[styles.cardTouchable, product.stock_quantity === 0 && { opacity: 0.6 }]}
      >
        <View style={styles.imageContainer}>
          <OptimizedImage
            source={{ uri: imageUrl }}
            style={styles.image}
            placeholderColor="#f8f9fa"
            showLoader={true}
            priority="normal"
            resizeMode="contain"
            onError={(error) => {
              console.log('Image failed to load:', imageUrl, error);
            }}
          />
          {hasOffer && (
            <Animated.View style={styles.offerBadge}>
              <Text style={styles.offerText}>{product.offer_percentage}% OFF</Text>
            </Animated.View>
          )}
          {!hideActions && !hideWishlist && (
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
                {showTrash ? (
                  <Ionicons
                    name="trash"
                    size={16}
                    color="#e74c3c"
                  />
                ) : (
                  <Ionicons
                    name={inWishlist ? "heart" : "heart-outline"}
                    size={18}
                    color="#2b3a1a"
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.category} numberOfLines={1}>{product.category_name || product.category}</Text>
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          {((product.stock_quantity > 0 && product.stock_quantity < 10) || product.stock_quantity === 0) && (
            <Animated.View style={{ opacity: pulseAnim, flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name="flame" size={10} color="#e74c3c" style={{ marginRight: 2 }} />
              <Text style={[styles.sellingFastText, { marginBottom: 0 }]}>
                {product.stock_quantity === 0 ? 'Sold out' : 'Selling fast'}
              </Text>
            </Animated.View>
          )}
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
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  disabled={product.stock_quantity === 0 || isCartProcessing}
                  style={styles.cartTouchable}
                >
                  <Ionicons name={isInCart ? "checkmark" : "add"} size={14} color="#2b3a1a" />
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
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: 'contain',
  },
  content: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    flex: 1,
    justifyContent: 'space-between',
  },
  category: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 10,
    fontWeight: '600',
    color: '#8e8e8e',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333333',
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  price: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333333',
  },
  originalPrice: {
    fontSize: 10,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  offerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 6,
    elevation: 2,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  offerText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2b3a1a',
    elevation: 2,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  addToCartButton: {
    backgroundColor: '#fff',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  wishlistButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  wishlistButtonDisabled: {
    backgroundColor: '#ccc',
  },
  wishlistTouchable: {
    width: '100%',
    height: '100%',
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
    marginBottom: 1,
    marginTop: 1,
    minHeight: 14,
  } as const,
  ratingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  } as const,
  rating: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d63031',
    marginRight: 2,
  } as const,
  starIcon: {
    marginRight: 1,
  } as const,
  reviewCount: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  } as const,
  noRating: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  } as const,
  processingButton: {
    backgroundColor: '#ccc',
  },
  sellingFastText: {
    fontSize: 10,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  outOfStockText: {
    fontSize: 10,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginBottom: 2,
  },
});