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
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Keyboard,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductCard from '../components/ProductCard';
import { apiService } from '../services/api';
import { useCategories } from '../CategoryContext';
import { getCategoryImage } from '../constants/categoryImages';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from './_layout';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

// Category icon sizes
const CAT_ICON_SIZE = 65;
const CAT_RADIUS = CAT_ICON_SIZE / 2;
const CAT_ITEM_WIDTH = CAT_ICON_SIZE + 14;

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

const normalizeCategoryName = (name: string) => {
  const map: { [key: string]: string } = {
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
    'sunscreen lotion': 'Sunscreen Lotion',
  };
  return map[name.toLowerCase()] || name;
};

const getCategoryImageForDisplay = (name: string): string =>
  getCategoryImage(normalizeCategoryName(name), 'tile');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },

  // ── Top section with title + single category row ──
  topSection: {
    paddingTop: Platform.OS === 'ios' ? 20 : (StatusBar.currentHeight ?? 0) + 20,
    paddingBottom: 6,
  },
  brandTitle: {
    fontSize: 42,
    color: '#2b3a1a',
    textAlign: 'center',
    fontFamily: 'CormorantGaramond-Bold',
    letterSpacing: 1,
    marginBottom: 16,
  },

  // ── Single scrollable category row ──
  categoryRow: {
    marginBottom: 4,
  },
  categoryRowContent: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  catItem: {
    alignItems: 'center',
    width: CAT_ITEM_WIDTH,
    marginHorizontal: 5,
  },
  catImageWrap: {
    width: CAT_ICON_SIZE,
    height: CAT_ICON_SIZE,
    borderRadius: CAT_RADIUS,
    overflow: 'hidden',
    marginBottom: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catImageWrapSelected: {
    borderColor: '#2b3a1a',
  },
  catImage: {
    width: '100%',
    height: '100%',
    borderRadius: CAT_RADIUS,
  },
  catLabel: {
    fontSize: 10,
    color: '#444',
    textAlign: 'center',
    lineHeight: 13,
    width: CAT_ITEM_WIDTH,
    fontWeight: '500',
  },
  catLabelSelected: {
    color: '#2b3a1a',
    fontWeight: '700',
  },

  // ── Search bar (narrower) ──
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebe8da',
    borderRadius: 22,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#d8d3c5',
  },
  searchBoxFocused: {
    borderColor: '#2b3a1a',
    backgroundColor: '#fff',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    height: 42,
  },
  clearBtn: {
    padding: 4,
  },

  // ── Search results ──
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    color: '#888',
    fontSize: 12,
  },
  resultsContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCardContainer: {
    width: ITEM_WIDTH,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 15,
    marginTop: 40,
    paddingHorizontal: 24,
  },
  loader: {
    marginTop: 40,
  },

  // ── Recent Searches ──
  recentSearchesContainer: {
    paddingHorizontal: 36,
    paddingTop: 4,
    paddingBottom: 16,
  },
  recentSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentSearchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2b3a1a',
  },
  clearRecentText: {
    fontSize: 12,
    color: '#888',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recentSearchIcon: {
    marginRight: 12,
  },
  recentSearchText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
  },
});

interface ExploreCategoryNavigationProps {
  categories: Category[];
  selectedCategory: number;
  onSelectCategory: (categoryId: number) => void;
  categoryLoading: boolean;
}

const ExploreCategoryNavigation: React.FC<ExploreCategoryNavigationProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  categoryLoading,
}) => {
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const triggerWiggle = useCallback(() => {
    Animated.sequence([
      Animated.spring(wiggleAnim, {
        toValue: 15,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(wiggleAnim, {
        toValue: -10,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(wiggleAnim, {
        toValue: 0,
        tension: 60,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [wiggleAnim]);

  useEffect(() => {
    // Trigger initial wiggle after categories render
    const initialWiggleTimer = setTimeout(() => {
      triggerWiggle();
    }, 1000);

    // Run wiggle animation every 5 seconds
    const interval = setInterval(() => {
      triggerWiggle();
    }, 5000);

    // Scroll peek once on mount
    const peekTimer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 90, animated: true });
      const returnTimer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: 0, animated: true });
      }, 700);
      return () => clearTimeout(returnTimer);
    }, 1200);

    return () => {
      clearTimeout(initialWiggleTimer);
      clearTimeout(peekTimer);
      clearInterval(interval);
    };
  }, [triggerWiggle]);

  const renderCatItem = (cat: Category) => {
    const imageUrl = cat.image_url
      ? apiService.getFullImageUrl(cat.image_url)
      : getCategoryImageForDisplay(cat.name);
    const selected = selectedCategory === cat.id;
    return (
      <Animated.View
        key={cat.id}
        style={{ transform: [{ translateX: wiggleAnim }] }}
      >
        <TouchableOpacity
          style={styles.catItem}
          onPress={() => onSelectCategory(cat.id)}
          activeOpacity={0.75}
          disabled={categoryLoading}
        >
          <View style={[styles.catImageWrap, selected && styles.catImageWrapSelected]}>
            <Image source={{ uri: imageUrl }} style={styles.catImage} resizeMode="cover" />
          </View>
          <Text style={[styles.catLabel, selected && styles.catLabelSelected]} numberOfLines={2}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryRow}
      contentContainerStyle={styles.categoryRowContent}
      nestedScrollEnabled
    >
      {categories.map((cat) => renderCatItem(cat))}
    </ScrollView>
  );
};

const ExploreScreen = () => {
  const router = useRouter();
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const bottomTabHeight = useBottomTabBarHeight();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 800);
  const numColumns = screenWidth < 480 ? 2 : (screenWidth < 768 ? 3 : 4);
  const gap = 12;
  const padding = 24;
  const itemWidth = (screenWidth - padding - (gap * (numColumns - 1))) / numColumns;

  const { categories, loading: categoriesLoading, getCategoryById } = useCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  // Reset selected when screen refocused
  useEffect(() => {
    if (isFocused) setSelectedCategory(0);
  }, [isFocused]);

  // Scroll to top on tab press
  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useEffect(() => {
    const unsub = (navigation as any).addListener('tabPress', (e: any) => {
      if (isFocused) { e.preventDefault(); scrollToTop(); }
    });
    return unsub;
  }, [navigation, isFocused, scrollToTop]);

  // Pre-fetch ALL products on mount so search is instant
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await apiService.get('/products?limit=200');
        let list: Product[] = [];
        if (res.data?.products && Array.isArray(res.data.products)) {
          list = res.data.products;
        } else if (Array.isArray(res.data)) {
          list = res.data;
        }
        setAllProducts(list);
        setProductsLoaded(true);
      } catch (err) {
        console.error('[ExploreSearch] Failed to fetch products:', err);
        setProductsLoaded(true);
      }
    };
    fetchAll();
  }, []);

  // Load recent searches
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const stored = await AsyncStorage.getItem('recentSearches');
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load recent searches', err);
      }
    };
    loadRecentSearches();
  }, []);

  const saveRecentSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    try {
      const updated = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
      setRecentSearches(updated);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save recent search', err);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('recentSearches');
    } catch (err) {
      console.error('Failed to clear recent searches', err);
    }
  };

  const handleRecentSearchSelect = (query: string) => {
    setSearchQuery(query);
    setIsSearchFocused(false);
    Keyboard.dismiss();
    saveRecentSearch(query);
  };

  // Category navigation
  const handleCategorySelect = useCallback(async (categoryId: number) => {
    if (categoryLoading) return;
    try {
      setCategoryLoading(true);
      setSelectedCategory(categoryId);
      const cat = getCategoryById(categoryId);
      if (!cat) throw new Error('Not found');
      await router.push({ pathname: '/category/[id]', params: { id: categoryId.toString(), name: cat.name } });
    } catch {
      setSelectedCategory(0);
    } finally {
      setCategoryLoading(false);
    }
  }, [getCategoryById, router, categoryLoading]);

  // Live search — filter as user types
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setFilteredProducts([]);
      return;
    }

    if (!productsLoaded) {
      setSearchLoading(true);
      return;
    }

    setSearchLoading(true);
    const query = normalize(q);
    const results = allProducts.filter((p: any) => {
      const name = normalize(p.name || p.title || '');
      return name.includes(query);
    });
    setFilteredProducts(results);
    setSearchLoading(false);
  }, [searchQuery, allProducts, productsLoaded]);

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProducts([]);
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: bottomTabHeight + 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 800, alignSelf: 'center', flex: 1 }}>
        {/* ── Brand heading + single category row ── */}
        <View style={styles.topSection}>
          <Text style={styles.brandTitle}>Saranga Space</Text>

          {/* All categories in ONE horizontally scrollable row */}
          {categoriesLoading ? (
            <ActivityIndicator size="small" color="#2b3a1a" style={{ marginVertical: 10 }} />
          ) : (
            <ExploreCategoryNavigation
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
              categoryLoading={categoryLoading}
            />
          )}
        </View>

        {/* ── Search bar ── */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, isSearchFocused && styles.searchBoxFocused]}>
            <Ionicons
              name="search"
              size={17}
              color={isSearchFocused ? '#2b3a1a' : '#888'}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              onSubmitEditing={() => {
                Keyboard.dismiss();
                if (searchQuery.trim()) saveRecentSearch(searchQuery);
              }}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearSearch}>
                <Ionicons name="close-circle" size={17} color="#2b3a1a" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Recent Searches ── */}
        {isSearchFocused && !searchQuery.trim() && recentSearches.length > 0 && (
          <View style={styles.recentSearchesContainer}>
            <View style={styles.recentSearchHeader}>
              <Text style={styles.recentSearchTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={clearRecentSearches}>
                <Text style={styles.clearRecentText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((term, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.recentSearchItem}
                onPress={() => handleRecentSearchSelect(term)}
              >
                <Ionicons name="time-outline" size={18} color="#888" style={styles.recentSearchIcon} />
                <Text style={styles.recentSearchText}>{term}</Text>
                <Ionicons name="arrow-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Search results ── */}
        {searchQuery.trim() ? (
          searchLoading ? (
            <ActivityIndicator size="large" color="#2b3a1a" style={styles.loader} />
          ) : filteredProducts.length > 0 ? (
            <>
              <Text style={styles.resultsHeader}>
                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for "{searchQuery}"
              </Text>
              <View style={styles.resultsContainer}>
                {filteredProducts.map((product) => (
                  <View key={product.id} style={[styles.productCardContainer, { width: itemWidth }]}>
                    <ProductCard product={product} />
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.noResultsText}>
              No products found for "{searchQuery}"
            </Text>
          )
        ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default React.memo(ExploreScreen, () => true);