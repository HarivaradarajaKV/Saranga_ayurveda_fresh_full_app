import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from './WishlistContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function WishlistPage() {
  const { items, removeFromWishlist } = useWishlist();
  const router = useRouter();
  const wishlistItems = Array.isArray(items) ? items : [];

  if (wishlistItems.length === 0) {
    return (
      <>
        <Stack.Screen 
          options={{
            title: 'My Wishlist',
            headerShown: true,
          }}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="heart" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Your wishlist is empty</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'My Wishlist',
          headerShown: true,
        }}
      />
      <FlatList
        data={wishlistItems}
        numColumns={2}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/product/[id]',
                params: { id: item.id, productData: JSON.stringify(item) }
              })}
            >
              <Image source={{ uri: item.image }} style={styles.productImage} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removeFromWishlist(item.id)}
            >
              <Ionicons name="heart" size={20} color="#ff4444" />
            </TouchableOpacity>
            <Text style={styles.productName}>{item.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₹{item.price}</Text>
              <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
            </View>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#ffd700" />
              <Text style={styles.rating}>{item.rating}</Text>
              <Text style={styles.reviewCount}>({item.reviewCount})</Text>
            </View>
            <TouchableOpacity 
              style={styles.addToCartButton}
              onPress={() => {
                // Handle add to cart
              }}
            >
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={item => String(item?.id)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
  },
  shopButton: {
    marginTop: 20,
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginTop: 8,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d63384',
    marginRight: 4,
  },
  originalPrice: {
    fontSize: 14,
    color: '#888',
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 2,
  },
  reviewCount: {
    fontSize: 12,
    color: '#888',
  },
  addToCartButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  addToCartText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
}); 