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
}

interface FrequentlyBoughtTogetherProps {
  currentProductId: number;
  category: string;
}

export const FrequentlyBoughtTogether: React.FC<FrequentlyBoughtTogetherProps> = ({ currentProductId, category }) => {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchRelatedProducts();
  }, [currentProductId, category]);

  const fetchRelatedProducts = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/products');
      if (response.data) {
        let products = Array.isArray(response.data) ? response.data : response.data.products;
        // Filter products from the same category, excluding the current product
        products = products
          .filter((product: Product) => 
            product.id !== currentProductId && 
            product.category === category &&
            product.stock_quantity > 0
          )
          .slice(0, 5); // Limit to 5 products
        setRelatedProducts(products);
      }
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
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  loader: {
    marginVertical: 20,
  },
  scrollContainer: {
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 8,
  },
  productCardWrapper: {
    width: (Dimensions.get('window').width - 44) / 2,
    marginRight: 12,
  },
}); 