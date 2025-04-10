import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiService } from '../../app/services/api';

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {relatedProducts.map((product) => (
          <TouchableOpacity 
            key={product.id} 
            style={styles.productCard}
            onPress={() => handleProductPress(product)}
          >
            <Image 
              source={{ uri: apiService.getFullImageUrl(product.image_url) }} 
              style={styles.productImage} 
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
              <View style={styles.priceContainer}>
                {product.offer_percentage > 0 ? (
                  <>
                    <Text style={styles.price}>
                      ₹{((typeof product.price === 'number' ? product.price : parseFloat(String(product.price || 0))) * (1 - (product.offer_percentage || 0) / 100)).toFixed(2)}
                    </Text>
                    <Text style={styles.originalPrice}>
                      ₹{(typeof product.price === 'number' ? product.price : parseFloat(String(product.price || 0))).toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.price}>₹{(typeof product.price === 'number' ? product.price : parseFloat(String(product.price || 0))).toFixed(2)}</Text>
                )}
              </View>
              {product.rating && (
                <View style={styles.ratingContainer}>
                  <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  {product.review_count && (
                    <Text style={styles.reviews}>({product.review_count})</Text>
                  )}
                </View>
              )}
              <TouchableOpacity 
                style={[
                  styles.addButton,
                  !product.stock_quantity && styles.disabledButton
                ]}
                disabled={!product.stock_quantity}
              >
                <Text style={styles.addButtonText}>
                  {product.stock_quantity ? 'Add' : 'Out of Stock'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
  productCard: {
    width: 160,
    marginLeft: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    height: 40,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
    color: '#007AFF',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 2,
  },
  reviews: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
}); 