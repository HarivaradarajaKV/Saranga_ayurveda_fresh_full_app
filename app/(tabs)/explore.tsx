import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ProductCard from '../components/ProductCard';
import { apiService } from '../services/api';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCategories } from '../CategoryContext';
import { getCategoryImage } from '../constants/categoryImages';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from './_layout';

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

interface Category {
  id: number;
  name: string;
  image_url: string;
  description: string;
  parent_id?: number | null;
  product_count?: number;
}

type CategoryImageType = {
  tile: string;
  banner: string;
};

type CategoryImagesType = {
  [key: string]: CategoryImageType;
};

// Helper to normalize category names for image lookup
const normalizeCategoryName = (name: string) => {
  // Map common variations to their standard form
  const categoryMap: { [key: string]: string } = {
    'baby care': 'Baby Care',
    'bath & body': 'Bath & Body',
    'body mists': 'Body Mists',
    'face care': 'Face Care',
    'fragrances': 'Fragrances',
    'haircare': 'Hair Care',
    'lip care': 'Lip Care',
    'lipstick': 'Lipsticks',
    'lipsticks': 'Lipsticks',
    'makeup': 'Makeup',
    'saranga ayurveda': 'Saranga Ayurveda',
    'skincare': 'Skincare',
    'sunscreen lotion': 'Sunscreen Lotion'
  };

  // Convert to lowercase for lookup
  const lowerName = name.toLowerCase();
  const normalizedName = categoryMap[lowerName] || name;
  console.log('Category name normalization:', { original: name, normalized: normalizedName });
  return normalizedName;
};

const getCategoryImageForDisplay = (categoryName: string, type: 'tile' | 'banner' = 'tile'): string => {
  const normalizedName = normalizeCategoryName(categoryName);
  const imageUrl = getCategoryImage(normalizedName, type);
  console.log('Category image lookup:', { 
    originalName: categoryName, 
    normalizedName, 
    imageUrl,
    type 
  });
  return imageUrl;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingBottom: 8,
  },
  fixedHeader: {
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 16,
    marginTop: 8,
  },
  titleContainer: {
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#694d21',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: -2,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 19,
    marginTop: 0,
  },
  menuIcon: {
    padding: 1,
    marginRight: 10,
    backgroundColor: 'transparent',
    width: 24,
    height: 31,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 26,
    padding: 7,
    borderWidth: 1.5,
    elevation: 2,
    flex: 1.2,
    marginHorizontal: 8,
    height: 45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 9,
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    color: '#333',
    fontSize: 15,
    paddingVertical: 8,
    height: 40,
    paddingHorizontal: 8,
    textAlign: 'left',
    width: '100%',
  },
  clearButton: {
    padding: 4,
  },
  searchHistoryContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
  },
  searchHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchHistoryText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  removeHistoryItem: {
    padding: 4,
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
    flexGrow: 1,
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
  categoryScrollView: {
    marginTop: 8,
    marginBottom: 8,
  },
  categoryScrollContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCategoryButton: {
    backgroundColor: '#694d21',
    borderColor: '#694d21',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#ffffff',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#694d21',
    fontWeight: '500',
  },
  imageScrollView: {
    marginTop: 8,
    marginBottom: 4,
  },
  imageScrollContainer: {
    paddingHorizontal: 6,
    gap: 8,
    alignItems: 'center',
  },
  roundImageWrapper: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  roundImageContainer: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#694d21',
  },
  roundImage: {
    width: '100%',
    height: '100%',
    borderRadius: 17.5,
  },
  imageLabel: {
    fontSize: 10,
    color: '#694d21',
    marginTop: 2,
    textAlign: 'center',
  },
  categoriesContainer: {
    padding: 16,
    paddingTop: 24,
  },
  categoryRowContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  rowImageContainer: {
    width: 120,
    height: 120,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    overflow: 'hidden',
  },
  rowImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  rowInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#694d21',
    marginBottom: 4,
  },
  rowDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#694d21',
  },
  exploreButtonText: {
    fontSize: 14,
    color: '#694d21',
    marginRight: 4,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

const MemoizedCategoryItem = React.memo(({ 
  category, 
  onPress, 
  isSelected, 
  isDisabled 
}: { 
  category: Category;
  onPress: (id: number) => void;
  isSelected: boolean;
  isDisabled: boolean;
}) => {
  const imageUrl = getCategoryImageForDisplay(category.name);
  console.log('Rendering category item:', { 
    categoryName: category.name, 
    imageUrl 
  });
  
  return (
    <TouchableOpacity 
      key={category.id}
      style={[
        styles.categoryRowContainer,
        isSelected && styles.selectedCategoryButton
      ]}
      disabled={isDisabled}
      onPress={() => onPress(category.id)}
    >
      <View style={styles.rowImageContainer}>
        <Image 
          source={{ uri: imageUrl }}
          style={styles.rowImage}
          resizeMode="cover"
          onError={(error) => {
            console.error('Image loading error:', {
              categoryName: category.name,
              imageUrl,
              error: error.nativeEvent
            });
          }}
          onLoad={() => {
            console.log('Image loaded successfully:', {
              categoryName: category.name,
              imageUrl
            });
          }}
        />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{category.name}</Text>
        <Text style={styles.rowDescription} numberOfLines={2}>
          {category.description || `Explore our ${category.name.toLowerCase()} collection for the best in beauty and wellness.`}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const ExploreScreen = () => {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { categories, loading: categoriesLoading, error: categoriesError, getCategoryById } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation();
  
  const bottomTabHeight = useBottomTabBarHeight();
  
  // Memoize categories to prevent unnecessary re-renders
  const stableCategories = useMemo(() => categories, [categories]);
  
  // Memoize getCategoryById to maintain stable reference
  const stableGetCategoryById = useCallback((id: number) => {
    return getCategoryById(id);
  }, [getCategoryById]);

  // Memoize category selection handler with stable references
  const handleCategorySelect = useCallback(async (categoryId: number) => {
    if (categoryLoading) return;
    
    try {
      setCategoryLoading(true);
      setSelectedCategory(categoryId);
      
      const category = stableGetCategoryById(categoryId);
      
      if (!category) {
        throw new Error('Category not found');
      }

      await router.push({
        pathname: "/category/[id]",
        params: { 
          id: categoryId.toString(),
          name: category.name
        }
      });

    } catch (error) {
      console.error('Navigation error:', error);
      setSelectedCategory(0);
      alert('Failed to load category. Please try again.');
    } finally {
      setCategoryLoading(false);
    }
  }, [stableGetCategoryById, router, categoryLoading]);

  // Memoize categories rendering with stable references
  const renderCategories = useMemo(() => {
    if (categoriesLoading) {
      return <ActivityIndicator size="large" color="#694d21" />;
    }
    
    if (categoriesError) {
      return <Text style={styles.errorText}>Failed to load categories. Please try again.</Text>;
    }
    
    if (!stableCategories || stableCategories.length === 0) {
      return <Text style={styles.noResultsText}>No categories found.</Text>;
    }

    return (
      <>
        {stableCategories.map((category) => (
          <MemoizedCategoryItem 
            key={category.id}
            category={category}
            onPress={handleCategorySelect}
            isSelected={selectedCategory === category.id}
            isDisabled={categoryLoading}
          />
        ))}
      </>
    );
  }, [stableCategories, categoriesLoading, categoriesError, selectedCategory, categoryLoading, handleCategorySelect]);

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
    if (isFocused) {
      setSelectedCategory(0);
    }
  }, [isFocused]);

  // Scroll-to-top when Explore tab icon is pressed
  const scrollToTop = useCallback(() => {
    if (scrollViewRef.current) {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
      if (isFocused) {
        e.preventDefault();
        scrollToTop();
      }
    });
    return unsubscribe;
  }, [navigation, isFocused, scrollToTop]);

  // Add search filtering effect
  const normalize = (s: string) => s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const getProductDisplayName = (product: any) => {
    const preferred = [
      product?.name,
      product?.title,
      product?.product_name,
      product?.productName,
      product?.attributes?.name,
      product?.details?.name,
    ].find((v) => typeof v === 'string' && v.trim().length > 0);
    if (preferred) return preferred as string;

    try {
      const entries = Object.entries(product || {});
      for (const [key, value] of entries) {
        if (typeof value === 'string' && /name|title/i.test(key)) {
          return value;
        }
      }
    } catch {}

    return '';
  };

  const fetchAllProductsForSearch = async (): Promise<any[]> => {
    try {
      const response = await apiService.get(apiService.ENDPOINTS.PRODUCTS);
      let productsData: any[] = [];
      if (response.data?.products) {
        productsData = response.data.products;
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      }
      setProducts(productsData);
      return productsData;
    } catch (e) {
      return products;
    }
  };

  const tryServerSearch = async (query: string): Promise<any[] | null> => {
    const keys = ['search', 'q', 'name'];
    for (const key of keys) {
      try {
        const endpoint = `${apiService.ENDPOINTS.PRODUCTS}?${key}=${encodeURIComponent(query)}`;
        const response = await apiService.get(endpoint);
        let productsData: any[] = [];
        if (response.data?.products) {
          productsData = response.data.products;
        } else if (Array.isArray(response.data)) {
          productsData = response.data;
        }
        if (productsData.length > 0) return productsData;
      } catch {}
    }
    return null;
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts([]);
      return;
    }

    const query = normalize(searchQuery);
    const runFilter = async (list: any[]) => {
      const filtered = list.filter((product: any) => {
        const name = normalize(getProductDisplayName(product));
        return name.includes(query);
      });
      if (filtered.length > 0) {
        setFilteredProducts(filtered);
        return;
      }
      const server = await tryServerSearch(query);
      if (server && server.length > 0) {
        setFilteredProducts(server);
      } else {
        setFilteredProducts([]);
      }
    };

    if (products.length === 0 || hasMore) {
      // Fetch full list for search to avoid missing items due to pagination
      fetchAllProductsForSearch().then(runFilter);
      return;
    }

    runFilter(products);
  }, [searchQuery, products]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProducts([]);
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: bottomTabHeight + 20 // Add extra 20 for spacing
        }}
      >
        <View style={styles.headerContainer}>
          <Animated.View style={[styles.fixedHeader, {
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })}]
          }]}>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text style={styles.subtitle}>
                  <Text style={{ color: '#176e14' }}>Tap in,</Text>
                  <Text> Into the Deep.. </Text>
                  <Ionicons name="leaf" size={14} color="#176e14" />
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imageScrollView}
                  contentContainerStyle={styles.imageScrollContainer}
                >
                  {stableCategories
                    .slice(0, 4)
                    .map((category, index) => (
                    <TouchableOpacity 
                      key={category.id} 
                      style={styles.roundImageWrapper}
                      onPress={() => handleCategorySelect(category.id)}
                    >
                      <View style={styles.roundImageContainer}>
                        <Image
                          source={{ uri: getCategoryImageForDisplay(category.name) }}
                          style={styles.roundImage}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={styles.imageLabel}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.searchRow}>
              <TouchableOpacity 
                style={styles.menuIcon}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={28} color="#694d21" />
              </TouchableOpacity>
              <View style={[
                styles.searchContainer,
                isSearchFocused && {
                  flex: 2,
                  marginRight: 4,
                  borderColor: '#694d21',
                  backgroundColor: '#ffffff',
                }
              ]}>
                <Ionicons name="search" size={18} color={isSearchFocused ? "#694d21" : "#999"} style={styles.searchIcon} />
                <TextInput
                  style={[
                    styles.searchInput,
                    isSearchFocused && {
                      fontSize: 16,
                    }
                  ]}
                  placeholder="Search products..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={(text) => {
                    handleSearch(text);
                    setShowSearchHistory(text.length > 0);
                  }}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    setShowSearchHistory(searchQuery.length > 0);
                    setIsSearchExpanded(true);
                  }}
                  onBlur={() => {
                    setIsSearchFocused(false);
                    setTimeout(() => {
                      setShowSearchHistory(false);
                      setIsSearchExpanded(false);
                    }, 200);
                  }}
                  onSubmitEditing={(e) => handleSearch(e.nativeEvent.text)}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery ? (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={clearSearch}
                  >
                    <Ionicons name="close-circle" size={18} color="#694d21" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {showSearchHistory && searchHistory.length > 0 && (
              <View style={styles.searchHistoryContainer}>
                {searchHistory.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchHistoryItem}
                    onPress={() => {
                      handleSearch(item);
                      setShowSearchHistory(false);
                    }}
                  >
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.searchHistoryText}>{item}</Text>
                    <TouchableOpacity
                      style={styles.removeHistoryItem}
                      onPress={() => {
                        const newHistory = searchHistory.filter((_, i) => i !== index);
                        setSearchHistory(newHistory);
                        AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
                      }}
                    >
                      <Ionicons name="close" size={16} color="#999" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Animated.View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#694d21" style={styles.loader} />
          ) : searchQuery.trim() ? (
            <View style={styles.categoriesContainer}>
              {filteredProducts.length > 0 ? (
                <View style={styles.productsContainer}>
                  {filteredProducts.map((product) => (
                    <View key={product.id} style={styles.productCardContainer}>
                      <ProductCard product={product} />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noResultsText}>No products found matching "{searchQuery}"</Text>
              )}
            </View>
          ) : (
            <View style={styles.categoriesContainer}>
              {renderCategories}
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default React.memo(ExploreScreen, () => true);
