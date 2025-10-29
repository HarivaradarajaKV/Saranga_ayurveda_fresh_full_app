import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, TextInput, Animated, Easing } from 'react-native';
import { apiService } from '../services/api';
import ProductCard from '../components/ProductCard';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Define the Product interface
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
}

const SarangaAyurvedaScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiService.get('/products?category=Saranga Ayurveda');
        console.log('Fetched products:', response.data.products);
        if (Array.isArray(response.data.products)) {
          setProducts(response.data.products);
          setFilteredProducts(response.data.products);
        } else {
          console.error('Expected an array of products, but received:', response.data);
          setProducts([]);
          setFilteredProducts([]);
        }
      } catch (error) {
        console.error('Error fetching Saranga Ayurveda products:', error);
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Add search filter effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = products.filter(product => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    });
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProducts(products);
  };

  // Add animation effect when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(searchBarAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#694d21" />
        <Text style={styles.loadingText}>Loading Ayurvedic Products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View style={[
          styles.fixedHeader,
          {
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })}]
          }
        ]}>
          <View style={styles.header}>
            <Text style={styles.title}>Saranga Ayurveda</Text>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push('/profile/notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={20} color="#694d21" />
            </TouchableOpacity>
          </View>

          <Animated.View style={[
            styles.searchContainer,
            {
              transform: [
                { scale: searchBarAnim },
                { translateX: searchBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0]
                })}
              ]
            }
          ]}>
            <Ionicons name="search" size={18} color="#694d21" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Ayurvedic products..."
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#999"
            />
            {searchQuery ? (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearSearch}
              >
                <Ionicons name="close-circle" size={18} color="#694d21" />
              </TouchableOpacity>
            ) : null}
          </Animated.View>
        </Animated.View>
        
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={[
            styles.gridContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <Animated.View 
                  key={product.id} 
                  style={[styles.productCardContainer]}
                >
                  <ProductCard product={product} />
                </Animated.View>
              ))
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="#694d21" />
                <Text style={styles.noResultsText}>No products found</Text>
                <Text style={styles.noResultsSubtext}>Try adjusting your search</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#694d21',
    fontWeight: '500',
  },
  fixedHeader: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 10 : 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E1',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#694d21',
    letterSpacing: 0.5,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF0F5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE4E1',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#333',
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCardContainer: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 16,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#694d21',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default SarangaAyurvedaScreen;