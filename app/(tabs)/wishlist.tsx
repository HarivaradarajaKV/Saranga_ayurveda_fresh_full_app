import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useWishlist } from '../WishlistContext';
import { useCart } from '../CartContext';
import { useRouter } from 'expo-router';
import { apiService } from '../services/api';
import { useBottomTabBarHeight } from './_layout';
import { useIsFocused, useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function WishlistPage() {
  const { wishlist = [], setWishlist, removeFromWishlist } = useWishlist() || {};
  const { addItem, getCartItems, updateQuantity } = useCart() || {};
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const flatListRef = useRef<FlatList>(null);
  const isInitialMount = useRef(true);
  const lastFocusedState = useRef(false);
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const bottomTabHeight = useBottomTabBarHeight();

  useEffect(() => {
    // Start animations on mount
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

  // Scroll to top function for FlatList
  const scrollToTop = () => {
    if (flatListRef.current && wishlist.length > 0) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    }
  };

  // Handle tab press for scroll to top
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      if (isFocused) {
        e.preventDefault();
        scrollToTop();
      }
    });
    return unsubscribe;
  }, [navigation, isFocused, wishlist.length]);

  useEffect(() => {
    // Track focus changes to prevent unwanted scrolling
    if (isFocused && !lastFocusedState.current) {
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }
    lastFocusedState.current = isFocused;
  }, [isFocused]);

  const handleRemove = (item: any) => {
    const fadeAnim = new Animated.Value(1);

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      removeFromWishlist?.(item.id);
    });
  };

  const handleAddToCart = (item: any, moveToCart: boolean = false) => {
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
    ]).start(async () => {
      // Check if item already exists in the cart
      const existingItem = await getCartItems().find(cartItem => cartItem.id === item.id);

      if (existingItem) {
        // Increment quantity if item already exists
        await updateQuantity(existingItem.id, true);
      } else {
        // Add item to cart
        await addItem(item);
      }

      if (moveToCart) {
        Alert.alert(
          'Added to Cart',
          'Item moved to cart successfully!',
          [{ text: 'OK' }]
        );
        removeFromWishlist?.(item.id);
      } else {
        router.push('/checkout');
      }
    });
  };

  const loadWishlistItems = async () => {
    try {
      const response = await apiService.get(apiService.ENDPOINTS.WISHLIST);
      if (response.data) {
        const transformedItems = await Promise.all(response.data.map(async (item: any) => {
          const productResponse = await apiService.get(`/products/${item.product_id}`);
          return {
            id: Number(item.product_id),
            name: productResponse.data.name,
            description: productResponse.data.description || '',
            price: Number(productResponse.data.price),
            category: productResponse.data.category || 'Default Category',
            image_url: productResponse.data.image_url,
            stock_quantity: Number(productResponse.data.stock_quantity) || 0,
            offer_percentage: Number(productResponse.data.offer_percentage) || 0,
          };
        }));
        setWishlist(transformedItems);
      } else {
        setWishlist([]);
      }
    } catch (error) {
      console.error('Error loading wishlist items:', error);
      // Handle error appropriately
    }
  };

  if (!wishlist?.length) {
    return (
      <>
        <Stack.Screen 
          options={{
            title: 'Wishlist',
            headerShown: false,
            headerStyle: {
              backgroundColor: 'transparent',
            },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.container}>
          {/* Background Gradient */}
          <LinearGradient
            colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
            style={styles.backgroundGradient}
          />
          
          <Animated.View 
            style={[
              styles.emptyContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                paddingTop: 80,
              }
            ]}
          >
            <LinearGradient
              colors={['#694d21', '#5a3f1a']}
              style={styles.emptyIconContainer}
            >
              <View style={styles.heartsContainer}>
                <Ionicons name="heart" size={48} color="#fff" style={styles.largeHeart} />
                <Ionicons name="heart" size={32} color="rgba(255,255,255,0.7)" style={styles.smallHeart} />
              </View>
            </LinearGradient>
            <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
            <Text style={styles.emptySubtitle}>
              Discover and save your favorite beauty treasures
            </Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => router.push('/')}
            >
              <LinearGradient
                colors={['#694d21', '#5a3f1a']}
                style={styles.exploreButtonGradient}
              >
                <Text style={styles.exploreButtonText}>Explore Collection</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.exploreButtonIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <Animated.View
      style={[
        styles.productCard,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => router.push({
          pathname: "/(product)/[id]",
          params: { 
            id: item.id.toString(),
            productData: JSON.stringify({
              ...item,
              price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
              stock_quantity: typeof item.stock_quantity === 'string' ? 
                parseInt(item.stock_quantity) : item.stock_quantity,
              offer_percentage: item.offer_percentage || 0
            })
          }
        })}
      >
        <Image 
          source={{ uri: apiService.getFullImageUrl(item.image_url) }} 
          style={styles.productImage} 
        />
        <View style={styles.productInfo}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{item.price}</Text>
          </View>
          <View style={styles.stockContainer}>
            <Text style={[
              styles.stockStatus,
              item.stock_quantity > 0 ? styles.inStock : styles.outOfStock
            ]}>
              {item.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            styles.moveToCartButton,
            item.stock_quantity === 0 && styles.disabledButton
          ]}
          onPress={() => item.stock_quantity > 0 && handleAddToCart(item, true)}
          disabled={item.stock_quantity === 0}
        >
          <LinearGradient
            colors={item.stock_quantity === 0 ? ['#ccc', '#999'] : ['#694d21', '#5a3f1a']}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="cart" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Move to Cart</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleRemove(item)}
        >
          <LinearGradient
            colors={['#ff4444', '#cc0000']}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="trash" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Remove</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Wishlist',
          headerShown: false,
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient
          colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
          style={styles.backgroundGradient}
        />
        
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingTop: 30,
            }
          ]}
        >
          <FlatList
            ref={flatListRef}
            data={wishlist}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{
              paddingBottom: bottomTabHeight + 20,
              paddingHorizontal: 16,
              paddingTop: 40,
            }}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    paddingTop: 80,
    backgroundColor: 'transparent',
    minHeight: Dimensions.get('window').height * 0.7,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  exploreButton: {
    borderRadius: 16,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  exploreButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  exploreButtonIcon: {
    marginLeft: 4,
  },
  productCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  productImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
  },
  productInfo: {
    marginTop: 16,
  },
  category: {
    fontSize: 12,
    color: '#694d21',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    fontWeight: '600',
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    lineHeight: 24,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#694d21',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  inStock: {
    color: '#28a745',
  },
  outOfStock: {
    color: '#dc3545',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  moveToCartButton: {
    // Gradient handled by LinearGradient
  },
  buyNowButton: {
    backgroundColor: '#28a745',
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  removeButton: {
    // Gradient handled by LinearGradient
  },
  heartsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 80,
    height: 60,
  },
  largeHeart: {
    position: 'absolute',
    left: 5,
    zIndex: 1,
  },
  smallHeart: {
    position: 'absolute',
    right: 5,
    top: 10,
    zIndex: 2,
  },
}); 