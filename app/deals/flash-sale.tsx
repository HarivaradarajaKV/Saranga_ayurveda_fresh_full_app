import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import ProductCard from '../components/ProductCard';
import { products } from '../../data/products';

const { width } = Dimensions.get('window');

// Filter products for flash sale (example: products with high discount)
const flashSaleProducts = products.filter(product => {
  const discountPercentage = ((product.originalPrice - product.price) / product.originalPrice) * 100;
  return discountPercentage >= 20; // Products with 20% or more discount
});

export default function FlashSalePage() {
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Flash Sale',
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.timerTitle}>Flash Sale Ends In</Text>
          <Text style={styles.timer}>23:59:59</Text>
        </View>
        <FlatList
          data={flashSaleProducts}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.productWrapper}>
              <ProductCard product={item} />
            </View>
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </>
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
  productWrapper: {
    width: width / 2,
    padding: 8,
  },
  productList: {
    padding: 8,
  },
}); 