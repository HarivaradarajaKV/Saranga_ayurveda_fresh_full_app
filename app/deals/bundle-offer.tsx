import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import ProductCard from '../components/ProductCard';
import { products } from '../../data/products';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Create bundles from products (example: group related products)
const bundles = [
  {
    id: 1,
    title: "Skincare Routine Bundle",
    products: products.filter(p => p.category === "Skincare").slice(0, 3),
    discount: 33,
  },
  {
    id: 2,
    title: "Makeup Essentials Bundle",
    products: products.filter(p => p.category === "Makeup").slice(0, 3),
    discount: 33,
  },
];

export default function BundleOfferPage() {
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Bundle Offers',
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={bundles}
          renderItem={({ item }) => (
            <View style={styles.bundleContainer}>
              <View style={styles.bundleHeader}>
                <Text style={styles.bundleTitle}>{item.title}</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>Save {item.discount}%</Text>
                </View>
              </View>
              <View style={styles.bundleProducts}>
                {item.products.map((product, index) => (
                  <View key={product.id} style={styles.bundleProduct}>
                    <ProductCard product={product} />
                    {index < item.products.length - 1 && (
                      <View style={styles.plusContainer}>
                        <Ionicons name="add" size={24} color="#007bff" />
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.addBundleButton}>
                <Text style={styles.addBundleText}>Add Bundle to Cart</Text>
                <Text style={styles.bundlePrice}>
                  ₹{item.products.reduce((sum, p) => sum + p.price, 0)}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.bundleList}
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
  bundleList: {
    padding: 16,
  },
  bundleContainer: {
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bundleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  saveBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bundleProducts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bundleProduct: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  plusContainer: {
    width: 40,
    alignItems: 'center',
  },
  addBundleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
  },
  addBundleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bundlePrice: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 