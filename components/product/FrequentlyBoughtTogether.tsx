import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiService } from '../../app/services/api';
import { OptimizedImage } from '../../app/components/OptimizedImage';
import ProductCard from '../../app/components/ProductCard';

interface Product {
  id: number;
  name: string;
  price: number;
  original_price?: number;
  rating?: number;
  review_count?: number;
  image_url: string;
  offer_percentage: number;
  stock_quantity: number;
  category: string;
  category_name?: string;
}

interface FrequentlyBoughtTogetherProps {
  currentProductId: number;
  category: string;
  categoryName?: string;
}

export const FrequentlyBoughtTogether: React.FC<FrequentlyBoughtTogetherProps> = ({ currentProductId, category, categoryName }) => {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchRelatedProducts();
  }, [currentProductId, category, categoryName]);

  const fetchRelatedProducts = async () => {
    try {
      setLoading(true);
      const catFilter = categoryName || category;
      let response;
      if (catFilter) {
        response = await apiService.get(`/products?category=${encodeURIComponent(catFilter)}`);
      }
      
      let products = [];
      if (response && response.data) {
        products = Array.isArray(response.data) ? response.data : (response.data.products || []);
      }

      // If we got no products or only the current one, fall back to fetching a larger pool of all products
      if (products.length <= 1) {
        const fallbackRes = await apiService.get('/products?limit=50');
        if (fallbackRes && fallbackRes.data) {
          products = Array.isArray(fallbackRes.data) ? fallbackRes.data : (fallbackRes.data.products || []);
        }
      }

      // Filter products from the same category, excluding the current product
      let filtered = products
        .filter((product: Product) => {
          const currentCat = (category || '').toLowerCase().trim();
          const currentCatName = (categoryName || '').toLowerCase().trim();
          const productCat = (product.category || '').toLowerCase().trim();
          const productCatName = (product.category_name || '').toLowerCase().trim();
          
          const matchesCategory = 
            (currentCatName && productCatName && currentCatName === productCatName) ||
            (currentCat && productCat && currentCat === productCat) ||
            (currentCatName && productCat && currentCatName === productCat) ||
            (currentCat && productCatName && currentCat === productCatName);
            
          return product.id !== currentProductId && 
            matchesCategory &&
            product.stock_quantity > 0;
        });

      // If still no products after filtering, take any products excluding the current one
      if (filtered.length === 0) {
        filtered = products
          .filter((p: Product) => p.id !== currentProductId && p.stock_quantity > 0);
      }

      setRelatedProducts(filtered.slice(0, 5));
    } catch (error) {
      console.error('Error fetching related products:', error);
      setRelatedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: "/(product)/[id]",
      params: { 
        id: product.id.toString(),
        productData: JSON.stringify(product)
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Frequently Bought Together</Text>
        <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
      </View>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Frequently Bought Together</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
      >
        {relatedProducts.map((product) => (
          <View key={product.id} style={styles.productCardWrapper}>
            <ProductCard product={product as any} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
    backgroundColor: '#fbf7f4',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b3a1a',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 20,
  },
  scrollView: {
    marginHorizontal: -20,
  },
  scrollContainer: {
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
  },
  productCardWrapper: {
    width: (Dimensions.get('window').width - 44) / 2,
    marginRight: 12,
  },
}); 