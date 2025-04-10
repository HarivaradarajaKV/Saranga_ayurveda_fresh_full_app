import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWishlist } from '../WishlistContext';
import { useCart, CartItem } from '../CartContext';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [isWishlistProcessing, setIsWishlistProcessing] = useState(false);
  const [isCartProcessing, setIsCartProcessing] = useState(false);
  const [lastTapTimestamp, setLastTapTimestamp] = useState(0);

  useEffect(() => {
    checkAuth();
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
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        {hasOffer && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>{product.offer_percentage}% OFF</Text>
          </View>
        )}
        {!hideActions && (
          <TouchableOpacity 
            style={[styles.wishlistButton, isWishlistProcessing && styles.wishlistButtonDisabled]}
            onPress={handleWishlistPress}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isWishlistProcessing}
          >
            <Ionicons 
              name={inWishlist ? "heart" : "heart-outline"} 
              size={24} 
              color={inWishlist ? "#FF69B4" : "#666"}
            />
          </TouchableOpacity>
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
            <TouchableOpacity 
              style={[
                styles.actionButton,
                styles.addToCartButton,
                product.stock_quantity === 0 && styles.disabledButton,
                isCartProcessing && styles.processingButton
              ]}
              onPress={handleAddToCart}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={product.stock_quantity === 0 || isCartProcessing}
            >
              <Ionicons name="cart-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  } as const,
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  content: {
    padding: 12,
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
    lineHeight: 18,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  offerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 8,
  },
  offerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007bff',
  },
  addToCartButton: {
    backgroundColor: '#007bff',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 6,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  wishlistButtonDisabled: {
    backgroundColor: '#ccc',
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
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  } as const,
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginRight: 2,
  } as const,
  starIcon: {
    marginRight: 2,
  } as const,
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
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