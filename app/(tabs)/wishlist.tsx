import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from '../WishlistContext';
import { useCart } from '../CartContext';
import { useRouter } from 'expo-router';
import { apiService } from '../services/api';

const { width } = Dimensions.get('window');

export default function WishlistPage() {
  const { wishlist = [], setWishlist, removeFromWishlist } = useWishlist() || {};
  const { addItem, getCartItems, updateQuantity } = useCart() || {};
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleRemove = (item: any) => {
    const fadeAnim = new Animated.Value(1);

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      removeFromWishlist?.(item.id);
    });
  };

  const handleAddToCart = (item: any, moveToCart: boolean = false) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      // Check if item already exists in the cart
      const existingItem = await getCartItems().find(cartItem => cartItem.id === item.id);

      if (existingItem) {
        // Increment quantity if item already exists
        await updateQuantity(existingItem.id, true);
      } else {
        // Add item to cart
        await addItem(item);
      }

      if (moveToCart) {
        Alert.alert(
          'Added to Cart',
          'Item moved to cart successfully!',
          [{ text: 'OK' }]
        );
        removeFromWishlist?.(item.id);
      } else {
        router.push('/checkout');
      }
    });
  };

  const loadWishlistItems = async () => {
    try {
      const response = await apiService.get(apiService.ENDPOINTS.WISHLIST);
      if (response.data) {
        const transformedItems = await Promise.all(response.data.map(async (item: any) => {
          const productResponse = await apiService.get(`/products/${item.product_id}`);
          return {
            id: Number(item.product_id),
            name: productResponse.data.name,
            description: productResponse.data.description || '',
            price: Number(productResponse.data.price),
            category: productResponse.data.category || 'Default Category',
            image_url: productResponse.data.image_url,
            stock_quantity: Number(productResponse.data.stock_quantity) || 0,
            offer_percentage: Number(productResponse.data.offer_percentage) || 0,
          };
        }));
        setWishlist(transformedItems);
      } else {
        setWishlist([]);
      }
    } catch (error) {
      console.error('Error loading wishlist items:', error);
      // Handle error appropriately
    }
  };

  if (!wishlist?.length) {
    return (
      <>
        <Stack.Screen 
          options={{
            title: 'Wishlist',
            headerShown: true,
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color="#FFB6C1" />
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Discover and save your favorite beauty treasures
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.exploreButtonText}>Explore Collection</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <Animated.View
      style={[
        styles.productCard,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => router.push({
          pathname: "/(product)/[id]",
          params: { 
            id: item.id.toString(),
            productData: JSON.stringify({
              ...item,
              price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
              stock_quantity: typeof item.stock_quantity === 'string' ? 
                parseInt(item.stock_quantity) : item.stock_quantity,
              offer_percentage: item.offer_percentage || 0
            })
          }
        })}
      >
        <Image 
          source={{ uri: apiService.getFullImageUrl(item.image_url) }} 
          style={styles.productImage} 
        />
        <View style={styles.productInfo}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{item.price}</Text>
          </View>
          <View style={styles.stockContainer}>
            <Text style={[
              styles.stockStatus,
              item.stock_quantity > 0 ? styles.inStock : styles.outOfStock
            ]}>
              {item.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            styles.moveToCartButton,
            item.stock_quantity === 0 && styles.disabledButton
          ]}
          onPress={() => item.stock_quantity > 0 && handleAddToCart(item, true)}
          disabled={item.stock_quantity === 0}
        >
          <Ionicons name="cart" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Move to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            styles.buyNowButton,
            item.stock_quantity === 0 && styles.disabledButton
          ]}
          onPress={async () => {
            const existingItem = await getCartItems().find(cartItem => cartItem.id === item.id);
            if (existingItem) {
              Alert.alert('Item already in cart', 'You can view it in your cart.');
              router.push('/cart');
            } else {
              await addItem(item);
              Alert.alert(
                'Added to Cart',
                'Item added to cart successfully',
                [{ text: 'View Cart', onPress: () => router.push('/cart') }]
              );
            }
          }}
          disabled={item.stock_quantity === 0}
        >
          <Ionicons name="flash" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => handleRemove(item)}
      >
        <Ionicons name="close" size={20} color="#666" />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Wishlist',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Wishlist</Text>
          <Text style={styles.subtitle}>{wishlist.length} items saved</Text>
        </View>
        <FlatList
          data={wishlist}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  productInfo: {
    marginTop: 12,
  },
  category: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 22,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF69B4',
  },
  stockContainer: {
    marginBottom: 8,
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  inStock: {
    color: '#28a745',
  },
  outOfStock: {
    color: '#dc3545',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  moveToCartButton: {
    backgroundColor: '#007bff',
  },
  buyNowButton: {
    backgroundColor: '#28a745',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 6,
  },
}); 