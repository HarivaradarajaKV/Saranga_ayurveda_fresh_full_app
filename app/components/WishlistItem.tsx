import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiService } from '../services/api';
import { navigateToProduct } from '../utils/navigation';

interface WishlistItemProps {
  item: any;
  onRemove: (id: number) => void;
  onAddToCart: (item: any) => void;
}

const WishlistItem: React.FC<WishlistItemProps> = ({ item, onRemove, onAddToCart }) => {
  const router = useRouter();

  const handlePress = () => {
    navigateToProduct(router, {
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || '',
      image_url: item.image_url,
      stock_quantity: item.stock_quantity || 0,
      offer_percentage: item.offer_percentage || 0
    });
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: apiService.getFullImageUrl(item.image_url) }} 
        style={styles.image}
      />
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.price}>₹{parseFloat(item.price).toFixed(2)}</Text>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.addToCartButton]}
            onPress={() => onAddToCart(item)}
          >
            <Ionicons name="cart-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => onRemove(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close-circle" size={24} color="#ff4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addToCartButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default WishlistItem; 