import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Platform,
  Animated,
  Image,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ProductCard from '../components/ProductCard';
import { apiService } from '../services/api';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;
const HEADER_HEIGHT = Platform.OS === 'ios' ? 120 : 100;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_quantity: number;
  offer_percentage: number;
  created_at: string;
  rating: number;
  review_count: number;
}

const ExploreScreen = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating' | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchProducts = async (pageNum = 1, shouldAppend = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await apiService.get(`/products?page=${pageNum}&limit=20`);
      
      let productsData: Product[] = [];
      
      // Handle both array and object response formats
      if (response.data?.products) {
        productsData = response.data.products;
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      }

      // Ensure all required fields have default values
      productsData = productsData.map((product: any) => ({
        ...product,
        rating: product.rating || product.average_rating || 0,
        review_count: product.review_count || 0,
        offer_percentage: product.offer_percentage || 0,
        stock_quantity: product.stock_quantity || 0
      }));

      console.log('Total products fetched:', productsData.length);
      
      // Update hasMore based on whether we received less items than requested
      setHasMore(productsData.length === 20);
      
      if (shouldAppend) {
        setProducts(prev => [...prev, ...productsData]);
      } else {
        setProducts(productsData);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
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

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
    
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

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

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProducts([]);
  };

  const handleFilterPress = () => {
    setShowFilters(!showFilters);
    Animated.spring(filterAnim, {
      toValue: showFilters ? 0 : 1,
      useNativeDriver: true,
    }).start();
  };

  const applyFilters = (products: Product[]) => {
    // If no filters are active, return all products
    if (!selectedRating && !sortBy && priceRange[0] === 0 && priceRange[1] === 1000) {
      return products;
    }

    let filtered = [...products];

    // Apply price filter only if it's not the default range
    if (priceRange[0] !== 0 || priceRange[1] !== 1000) {
      filtered = filtered.filter(
        product => product.price >= priceRange[0] && product.price <= priceRange[1]
      );
    }

    // Apply rating filter only if rating is selected
    if (selectedRating !== null) {
      filtered = filtered.filter(product => {
        const productRating = product.rating || 0;
        return Math.floor(productRating) === selectedRating;
      });
    }

    // Apply sorting only if sort option is selected
    if (sortBy) {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'price_asc':
            return a.price - b.price;
          case 'price_desc':
            return b.price - a.price;
          case 'rating':
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            return ratingB - ratingA;
          default:
            return 0;
        }
      });
    }

    return filtered;
  };

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          transform: [{
            translateY: scrollY.interpolate({
              inputRange: [0, 50],
              outputRange: [0, -50],
              extrapolate: 'clamp',
            }),
          }],
        },
      ]}
    >
      <BlurView intensity={100} style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleFilterPress}
        >
          <Ionicons name="options" size={20} color="#666" />
        </TouchableOpacity>
      </BlurView>
    </Animated.View>
  );

  const renderFilters = () => (
    <Animated.View
      style={[
        styles.filtersContainer,
        {
          transform: [{
            translateY: filterAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-200, 0],
            }),
          }],
        },
      ]}
    >
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Price Range</Text>
        {/* Add your price range slider component here */}
      </View>
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Rating</Text>
        <View style={styles.ratingButtons}>
          {[5, 4, 3, 2, 1].map((rating) => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.ratingButton,
                selectedRating === rating && styles.selectedRatingButton,
              ]}
              onPress={() => setSelectedRating(rating === selectedRating ? null : rating)}
            >
              <Text style={styles.ratingButtonText}>{rating}★</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Sort By</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'price_asc' && styles.selectedSortButton,
            ]}
            onPress={() => setSortBy(sortBy === 'price_asc' ? null : 'price_asc')}
          >
            <Text style={styles.sortButtonText}>Price ↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'price_desc' && styles.selectedSortButton,
            ]}
            onPress={() => setSortBy(sortBy === 'price_desc' ? null : 'price_desc')}
          >
            <Text style={styles.sortButtonText}>Price ↓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'rating' && styles.selectedSortButton,
            ]}
            onPress={() => setSortBy(sortBy === 'rating' ? null : 'rating')}
          >
            <Text style={styles.sortButtonText}>Rating</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderProductGrid = () => {
    const displayProducts = searchQuery ? filteredProducts : products;
    let productsToDisplay = displayProducts;
    
    // Only apply filters if any filter is active
    if (selectedRating || sortBy || priceRange[0] !== 0 || priceRange[1] !== 1000) {
      productsToDisplay = applyFilters(displayProducts);
    }
    
    console.log('Total products:', products.length);
    console.log('Display products:', displayProducts.length);
    console.log('Products after filtering:', productsToDisplay.length);

    return (
      <AnimatedScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.productGrid,
          { paddingBottom: 100 }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            progressViewOffset={HEADER_HEIGHT}
          />
        }
        bounces={true}
        overScrollMode="always"
        onScrollEndDrag={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 50;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            loadMore();
          }
        }}
      >
        {productsToDisplay.length === 0 && !loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={{ fontSize: 16, color: '#666', marginTop: 12, textAlign: 'center' }}>
              No products found
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.productsContainer}>
              {productsToDisplay.map((item: Product) => (
                <View key={item.id} style={styles.productCardContainer}>
                  <ProductCard product={item} />
                </View>
              ))}
            </View>
            {isLoadingMore && (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color="#FF69B4" />
              </View>
            )}
          </>
        )}
      </AnimatedScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}
      {showFilters && renderFilters()}
      {loading ? (
        <ActivityIndicator size="large" color="#FF69B4" style={styles.loader} />
      ) : (
        renderProductGrid()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    height: HEADER_HEIGHT,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 16,
    height: Platform.OS === 'ios' ? 76 : 56,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
    height: '100%',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    padding: 16,
    paddingTop: HEADER_HEIGHT + 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    minWidth: 60,
    alignItems: 'center',
  },
  selectedRatingButton: {
    backgroundColor: '#FF69B4',
  },
  ratingButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedSortButton: {
    backgroundColor: '#FF69B4',
  },
  sortButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  productsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    width: '100%',
    gap: 12,
  },
  productGrid: {
    paddingTop: HEADER_HEIGHT + 16,
    paddingBottom: 100,
  },
  productCardContainer: {
    width: ITEM_WIDTH,
    marginBottom: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: HEADER_HEIGHT,
  },
});

export default ExploreScreen;
