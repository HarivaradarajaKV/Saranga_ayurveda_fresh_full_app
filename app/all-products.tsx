import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  TextInput,
  Keyboard,
  Animated,
  StatusBar,
  FlatList,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCard from './components/ProductCard';
import { apiService } from './services/api';
import { useWishlist } from './WishlistContext';
import { useCart } from './CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';

const HEADER_HEIGHT = Platform.OS === 'ios' ? 120 : 100;
// Calculate responsive card width accounting for padding and margins
// Grid padding: 12px on each side, 6px margin between cards
const GRID_PADDING = 12;
const CARD_SPACING = 6; // Space between cards

const AnimatedScrollView = Animated.createAnimatedComponent(Animated.ScrollView);

const mergeProducts = (
  existing: Product[],
  incoming: Product[],
  shouldAppend: boolean
) => {
  if (shouldAppend) {
    const productsById = new Map<number, Product>();
    existing.forEach(product => {
      productsById.set(product.id, product);
    });
    incoming.forEach(product => {
      productsById.set(product.id, product);
    });
    return Array.from(productsById.values());
  }

  const uniqueProducts = new Map<number, Product>();
  incoming.forEach(product => {
    if (!uniqueProducts.has(product.id)) {
      uniqueProducts.set(product.id, product);
    }
  });
  return Array.from(uniqueProducts.values());
};

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
}

export default function AllProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const params = useLocalSearchParams();
  const { type, title } = params;
  const router = useRouter();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addItem } = useCart();
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  
  // Get responsive dimensions
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  
  // Calculate header height with status bar for production builds
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  const headerBaseHeight = Platform.OS === 'ios' ? 44 : 56;
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);
  
  // Calculate responsive card width
  const currentWidth = screenData.width;
  const responsiveGridPadding = currentWidth < 360 ? 8 : GRID_PADDING;
  const responsiveCardSpacing = currentWidth < 360 ? 4 : CARD_SPACING;
  const responsiveItemWidth = (currentWidth - (responsiveGridPadding * 2) - responsiveCardSpacing) / 2;

  useEffect(() => {
    checkAuth();
    fetchProducts();
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
          onPress: () => router.push('/auth/login')
        }
      ]
    );
  };

  const handleAddToCart = async (product: Product) => {
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

  const handleWishlistPress = async (product: Product) => {
    if (!isAuthenticated) {
      handleAuthRequired();
      return;
    }

    try {
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product);
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

  const fetchProducts = async (pageNum = 1, shouldAppend = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await apiService.get(`/products?page=${pageNum}&limit=20`);
      
      if (response.data) {
        const productsData = Array.isArray(response.data) ? response.data : 
                           response.data.products ? response.data.products : [];
        
        // Update hasMore based on whether we received less items than requested
        setHasMore(productsData.length === 20);
        
        setProducts(prev =>
          mergeProducts(prev, productsData, shouldAppend)
        );
      } else {
        if (!shouldAppend) {
          setProducts([]);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      if (!shouldAppend) {
        setProducts([]);
      }
    } finally {
      if (pageNum === 1) {
        setLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  const loadMore = () => {
    if (!hasMore || isLoadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, true);
  };

  const handleProductPress = (item: Product) => {
    Keyboard.dismiss();
    router.push({
      pathname: "/(product)/[id]",
      params: { id: item.id, productData: JSON.stringify(item) }
    });
  };

  const renderHeader = () => null;

  const renderItem = ({ item }: { item: Product }) => (
    <View style={[styles.productCardContainer, { width: responsiveItemWidth }]}>
      <TouchableOpacity
        onPress={() => handleProductPress(item)}
        style={styles.productTouchable}
      >
        <ProductCard product={item} />
      </TouchableOpacity>
    </View>
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    try {
      await fetchProducts(1);
    } catch (error) {
      console.error('Error refreshing products:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#694d21" />
        <Text style={styles.loadingText}>Loading amazing products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#694d21" 
        translucent={false}
      />
      {/* Custom header that properly accounts for status bar - positioned absolutely at top */}
      <View style={[
        styles.customHeader,
        {
          top: 0,
          left: 0,
          right: 0,
          position: 'absolute',
          zIndex: 1000,
          ...(Platform.OS === 'android' && statusBarHeight > 0 && {
            paddingTop: statusBarHeight,
            height: headerBaseHeight + statusBarHeight,
          })
        }
      ]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title as string || 'All Products'}</Text>
        <View style={styles.headerRight} />
      </View>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView 
        style={[
          styles.safeArea,
          {
            paddingTop: Platform.OS === 'android' && statusBarHeight > 0 
              ? headerBaseHeight + statusBarHeight 
              : headerBaseHeight,
          }
        ]} 
        edges={['left', 'right', 'bottom']}
      >
      {products.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#8E8E93" />
          <Text style={styles.emptyText}>No products available</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={[
            styles.productGrid,
            { 
              paddingHorizontal: responsiveGridPadding,
              paddingBottom: Math.max(insets.bottom, 16)
            }
          ]}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => (
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#694d21" />
              </View>
            ) : null
          )}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#694d21']}
              tintColor="#694d21"
            />
          }
        />
      )}
      </SafeAreaView>
    </View>
  );
}

const colors = {
  primary: '#694d21', // rich brown (from Home tab icon)
  accent: '#007AFF', // blue (from active tab)
  secondary: '#8E8E93', // gray (from tabBar)
  background: '#fcf5ed', // soft natural background
  card: '#fff',
  highlight: '#ffe5c5', // subtle highlight/light brown
  success: '#27ae60',
  error: '#e74c3c',
  shadow: '#e0d2c1',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrapper: {
    flex: 1,
  },
  statusBarSpacer: {
    backgroundColor: '#694d21',
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  customHeader: {
    backgroundColor: '#694d21',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: Platform.OS === 'ios' ? 44 : 56,
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  headerBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
    color: colors.secondary,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: colors.primary,
  },
  productGrid: {
    paddingVertical: 8,
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  productCardContainer: {
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  productTouchable: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  clearSearchButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 13,
    backgroundColor: colors.primary,
    borderRadius: 20,
    elevation: 1,
  },
  clearSearchText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 17,
    color: colors.secondary,
    fontWeight: '500',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
}); 