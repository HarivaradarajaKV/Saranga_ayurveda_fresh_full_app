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
  Platform,
  StatusBar,
  useWindowDimensions,
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
import ProductCard from '../components/ProductCard';

const { width } = Dimensions.get('window');

export default function WishlistPage() {
  const { wishlist = [], setWishlist, removeFromWishlist } = useWishlist() || {};
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 800);
  const numColumns = screenWidth < 480 ? 2 : (screenWidth < 768 ? 3 : 4);
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
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
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
          
          <View style={styles.headerSection}>
            <Text style={styles.brandTitle}>Wishlist</Text>
          </View>
          
          <Animated.View 
            style={[
              styles.emptyContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                paddingTop: 40,
              }
            ]}
          >
            <LinearGradient
              colors={['#2b3a1a', '#1e2912']}
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
                colors={['#2b3a1a', '#1e2912']}
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
    <View style={[styles.gridItem, { flex: 1 / numColumns }]}>
      <ProductCard product={item} showTrash={true} />
    </View>
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
        
        <View style={{ width: '100%', maxWidth: 800, alignSelf: 'center', flex: 1 }}>
          <View style={styles.headerSection}>
            <Text style={styles.brandTitle}>Wishlist</Text>
          </View>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingTop: 10,
            }
          ]}
        >
          <FlatList
            ref={flatListRef}
            data={wishlist}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            key={numColumns}
            numColumns={numColumns}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={{
              paddingBottom: bottomTabHeight + 20,
              paddingHorizontal: 8,
              paddingTop: 40,
            }}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </View>
    </View>
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 20 : (StatusBar.currentHeight ?? 0) + 20,
    paddingBottom: 6,
    zIndex: 10,
  },
  brandTitle: {
    fontSize: 42,
    color: '#2b3a1a',
    textAlign: 'center',
    fontFamily: 'CormorantGaramond-Bold',
    letterSpacing: 1,
    marginBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  gridItem: {
    flex: 0.5,
    paddingHorizontal: 4,
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
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
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
    borderRadius: 20,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  exploreButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
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
    borderRadius: 24,
    marginBottom: 20,
    padding: 24,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 26, 0.05)',
  },
  productImage: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  productInfo: {
    marginTop: 16,
  },
  category: {
    fontSize: 12,
    color: '#2b3a1a',
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
    color: '#2b3a1a',
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
    borderRadius: 16,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
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
    marginLeft: 4,
    fontSize: 13,
    fontWeight: 'bold',
    flexShrink: 1,
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