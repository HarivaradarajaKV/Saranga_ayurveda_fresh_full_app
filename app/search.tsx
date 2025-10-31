import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './services/api';
import ProductCard from './components/ProductCard';
import { Product } from './types/product';

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSearchHistory();
    fetchProducts();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(apiService.ENDPOINTS.PRODUCTS);
      
      // Handle the response data structure properly
      let productsData: Product[] = [];
      if (response.data?.products) {
        productsData = response.data.products;
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      }
      
      setAllProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setAllProducts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

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

  const ensureProductsLoaded = async () => {
    if (allProducts.length > 0 || loading) return allProducts;
    try {
      setLoading(true);
      const response = await apiService.get(apiService.ENDPOINTS.PRODUCTS);
      let productsData: any[] = [];
      if (response.data?.products) {
        productsData = response.data.products;
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      }
      setAllProducts(productsData);
      return productsData;
    } catch (e) {
      setAllProducts([]);
      return [] as any[];
    } finally {
      setLoading(false);
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

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredProducts([]);
      return;
    }

    const list = await ensureProductsLoaded();
    const query = normalize(text);
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

  const handleSearchSubmit = async () => {
    if (searchQuery.trim()) {
      const newHistory = [searchQuery, ...searchHistory.filter(item => item !== searchQuery)].slice(0, 5);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  };

  const removeHistoryItem = async (item: string) => {
    const newHistory = searchHistory.filter(historyItem => historyItem !== item);
    setSearchHistory(newHistory);
    await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProducts([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#694d21" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#694d21" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={handleSearch}
            onSubmitEditing={handleSearchSubmit}
            autoFocus
            returnKeyType="search"
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearSearch}
            >
              <Ionicons name="close-circle" size={20} color="#694d21" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {!searchQuery && searchHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            {searchHistory.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <TouchableOpacity 
                  style={styles.historyItemContent}
                  onPress={() => handleSearch(item)}
                >
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.historyItemText}>{item}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeHistoryItem(item)}
                >
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {searchQuery && (
          <View style={styles.resultsContainer}>
            {loading ? (
              <View style={styles.centerContent}>
                <Text>Searching...</Text>
              </View>
            ) : filteredProducts.length > 0 ? (
              <View>
                <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Results ({filteredProducts.length})</Text>
                <View style={styles.productsGrid}>
                  {filteredProducts.map((product) => (
                    <View key={product.id} style={styles.productItem}>
                      <ProductCard product={product} />
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.centerContent}>
                <Ionicons name="search-outline" size={48} color="#694d21" />
                <Text style={styles.noResultsText}>No products found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  historySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productItem: {
    width: '48%',
    marginBottom: 16,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});

export default SearchScreen; 