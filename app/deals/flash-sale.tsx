import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import ProductCard from '../components/ProductCard';
import { products } from '../../data/products';

// Filter products for flash sale (example: products with high discount)
const flashSaleProducts = products.filter(product => {
  const discountPercentage = ((product.originalPrice - product.price) / product.originalPrice) * 100;
  return discountPercentage >= 20; // Products with 20% or more discount
});

export default function FlashSalePage() {
  const { width } = useWindowDimensions();
  const screenWidth = Math.min(width, 800);
  const numColumns = screenWidth < 480 ? 2 : (screenWidth < 768 ? 3 : 4);
  const itemWidth = (screenWidth - 16) / numColumns;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Flash Sale',
          headerShown: true,
        }}
      />
      <View style={{ flex: 1, width: '100%', maxWidth: 800, alignSelf: 'center' }}>
        <View style={styles.header}>
          <Text style={styles.timerTitle}>Flash Sale Ends In</Text>
          <Text style={styles.timer}>23:59:59</Text>
        </View>
        <FlatList
          key={numColumns}
          data={flashSaleProducts}
          numColumns={numColumns}
          renderItem={({ item }) => (
            <View style={{ width: itemWidth, padding: 8 }}>
              <ProductCard product={item as any} />
            </View>
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFE8E8',
  },
  timerTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  timer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d63384',
  },
  productList: {
    padding: 8,
  },
}); 