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
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from './components/ProductCard';
import { apiService } from './services/api';
import { useWishlist } from './WishlistContext';
import { useCart } from './CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 120 : 100;
const ITEM_WIDTH = (width - 48) / 2;

const AnimatedScrollView = Animated.createAnimatedComponent(Animated.ScrollView);

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
        
        if (shouldAppend) {
          setProducts(prev => [...prev, ...productsData]);
        } else {
          setProducts(productsData);
        }
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
    <View style={styles.productCardContainer}>
      <TouchableOpacity
        onPress={() => handleProductPress(item)}
        style={styles.productTouchable}
      >
        <ProductCard product={item} hideActions={true} />
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
        <ActivityIndicator size="large" color="#FF69B4" />
        <Text style={styles.loadingText}>Loading amazing products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen 
        options={{
          title: title as string || 'All Products',
          headerShown: true,
        }}
      />
      {products.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No products available</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.productGrid}
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
                <ActivityIndicator size="small" color="#FF69B4" />
              </View>
            ) : null
          )}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#FF69B4']}
              tintColor="#FF69B4"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  productGrid: {
    padding: 8,
  },
  productCardContainer: {
    flex: 1,
    margin: 8,
    maxWidth: '50%',
  },
  productTouchable: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  clearSearchButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FF69B4',
    borderRadius: 20,
  },
  clearSearchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
}); 