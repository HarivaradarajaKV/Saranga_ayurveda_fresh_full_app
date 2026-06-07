import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from './WishlistContext';
import { useRouter } from 'expo-router';
import { apiService } from './services/api';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const numColumns = width >= 768 ? 3 : 2;
  const wishlistItems = Array.isArray(wishlist) ? wishlist : [];

  if (wishlistItems.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <Stack.Screen 
          options={{
            title: 'My Wishlist',
            headerShown: true,
          }}
        />
        <View style={[styles.emptyContainer, { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
          <Ionicons name="heart" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Your wishlist is empty</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen 
        options={{
          title: 'My Wishlist',
          headerShown: true,
        }}
      />
      <View style={{ flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' }}>
        <FlatList
          key={String(numColumns)}
          data={wishlistItems}
          numColumns={numColumns}
          contentContainerStyle={styles.container}
          renderItem={({ item }) => {
            const base = Number(item.price) || 0;
            const offerPct = Number(item.offer_percentage) || 0;
            const discounted = base * (1 - offerPct / 100);
            return (
              <View style={[styles.productCard, { flex: 1 / numColumns }]}>
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: '/(product)/[id]',
                    params: { id: item.id, productData: JSON.stringify(item) }
                  })}
                >
                  <Image
                    source={{ uri: apiService.getFullImageUrl(item.image_url) }}
                    style={styles.productImage}
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => removeFromWishlist(item.id)}
                >
                  <Ionicons name="heart" size={20} color="#ff4444" />
                </TouchableOpacity>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>₹{discounted.toFixed(2)}</Text>
                  {offerPct > 0 && (
                    <Text style={styles.originalPrice}>₹{base.toFixed(2)}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.addToCartButton}
                  onPress={() => {
                    router.push({
                      pathname: '/(product)/[id]',
                      params: { id: item.id, productData: JSON.stringify(item) }
                    });
                  }}
                >
                  <Text style={styles.addToCartText}>View Product</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          keyExtractor={item => String(item?.id)}
        />
      </View>
    </View>
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
    backgroundColor: '#2b3a1a',
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
    backgroundColor: '#f5f5f5',
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
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2b3a1a',
    marginRight: 4,
  },
  originalPrice: {
    fontSize: 12,
    color: '#888',
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    backgroundColor: '#2b3a1a',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  addToCartText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 13,
  },
});