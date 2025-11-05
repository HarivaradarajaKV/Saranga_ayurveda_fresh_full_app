import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Animated, Platform, Dimensions, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';
import { useCart } from '../CartContext';

const { width: screenWidth } = Dimensions.get('window');

// Separate component for combo card with animations
const ComboCard = ({ item, index, router }: { item: any; index: number; router: any }) => {
  const { addItem } = useCart();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(50)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stagger animations for each card
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 7,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 40,
        friction: 6,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Function to check combo status
  const getComboStatus = (combo: any): 'active' | 'upcoming' | 'expired' => {
    if (!combo.is_active) {
      return 'expired';
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (!combo.start_date && !combo.end_date) {
      return combo.is_active ? 'active' : 'expired';
    }

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (combo.start_date) {
      startDate = new Date(combo.start_date);
      startDate.setHours(0, 0, 0, 0);
    }

    if (combo.end_date) {
      endDate = new Date(combo.end_date);
      endDate.setHours(23, 59, 59, 999);
    }

    if (startDate && endDate) {
      if (now < startDate) {
        return 'upcoming';
      } else if (now > endDate) {
        return 'expired';
      } else {
        return 'active';
      }
    } else if (startDate) {
      if (now < startDate) {
        return 'upcoming';
      } else {
        return 'active';
      }
    } else if (endDate) {
      if (now > endDate) {
        return 'expired';
      } else {
        return 'active';
      }
    }

    return combo.is_active ? 'active' : 'expired';
  };

  const getStatusColor = (status: 'active' | 'upcoming' | 'expired'): string => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'upcoming':
        return '#FF9800';
      case 'expired':
        return '#999';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: 'active' | 'upcoming' | 'expired'): string => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'upcoming':
        return 'Upcoming';
      case 'expired':
        return 'Expired';
      default:
        return 'Expired';
    }
  };

  const status = getComboStatus(item);
  const statusColor = getStatusColor(status);
  const statusText = getStatusText(status);

  // Calculate prices
  const calculateTotalPrice = () => {
    return (item.items || []).reduce((sum: number, item: any) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 1);
      return sum + (price * quantity);
    }, 0);
  };

  const calculateDiscountedPrice = () => {
    const total = calculateTotalPrice();
    const discountValue = Number(item.discount_value || 0);
    if (item.discount_type === 'percentage') {
      return total - (total * (discountValue / 100));
    } else {
      return Math.max(0, total - discountValue);
    }
  };

  const totalPrice = calculateTotalPrice();
  const discountedPrice = calculateDiscountedPrice();

  // Get combo images (up to 2 for display)
  const comboImages = [
    item.image_url,
    item.image_url2,
    item.image_url3,
    item.image_url4
  ].filter(img => img && typeof img === 'string').slice(0, 2);

  const handleCardPress = () => {
    router.push({
      pathname: '/deals/combo-detail/[id]',
      params: {
        id: item.id.toString(),
        comboData: JSON.stringify(item),
      },
    });
  };

  const handleAddToCart = async () => {
    // Check if combo is active
    if (status !== 'active') {
      Alert.alert('Not Available', 'This combo is not currently available');
      return;
    }

    // Check authentication
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert(
          'Login Required',
          'Please login to add items to your cart',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Login',
              onPress: () => router.push('/auth/login'),
            },
          ]
        );
        return;
      }

      // Press animation
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      setIsAddingToCart(true);

      // Calculate combo prices
      const calculateTotalPrice = () => {
        return (item.items || []).reduce((sum: number, comboItem: any) => {
          const price = Number(comboItem.price || 0);
          const quantity = Number(comboItem.quantity || 1);
          return sum + (price * quantity);
        }, 0);
      };

      const calculateDiscountedPrice = () => {
        const total = calculateTotalPrice();
        const discountValue = Number(item.discount_value || 0);
        if (item.discount_type === 'percentage') {
          return total - (total * (discountValue / 100));
        } else {
          return Math.max(0, total - discountValue);
        }
      };

      const comboTotalPrice = calculateTotalPrice();
      const comboDiscountedPrice = calculateDiscountedPrice();

      // Add each item in the combo to cart with its quantity
      for (const comboItem of item.items || []) {
        const itemPrice = Number(comboItem.price || 0);
        const itemQuantity = Number(comboItem.quantity || 1);
        const itemTotalPrice = itemPrice * itemQuantity; // Total price for this item (with quantity)
        const offerPercentage = Number(comboItem.offer_percentage || 0);
        
        const product = {
          id: comboItem.product_id,
          name: comboItem.name || `Product ${comboItem.product_id}`,
          description: comboItem.description || comboItem.name || `Product ${comboItem.product_id}`,
          price: itemPrice,
          category: comboItem.category || '',
          image_url: comboItem.image_url || '',
          stock_quantity: Number(comboItem.stock_quantity || 999),
          created_at: comboItem.created_at || new Date().toISOString(),
          offer_percentage: offerPercentage,
          usage_instructions: comboItem.usage_instructions,
          benefits: comboItem.benefits,
          ingredients: comboItem.ingredients,
          shades: comboItem.shades,
        };

        // Combo info to pass to addItem
        const comboInfo = {
          comboId: item.id,
          comboDiscountType: item.discount_type || 'percentage',
          comboDiscountValue: Number(item.discount_value || 0),
          comboTotalPrice: comboTotalPrice,
          comboDiscountedPrice: comboDiscountedPrice,
          itemOriginalPrice: itemTotalPrice, // Total original price for this item (price * quantity)
        };

        // Add item quantity times
        for (let i = 0; i < itemQuantity; i++) {
          await addItem(product, '', comboInfo);
        }
      }

      // Success animation
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      Alert.alert('Success', 'Combo added to cart!');
    } catch (error) {
      console.error('Error adding combo to cart:', error);
      Alert.alert('Error', 'Failed to add combo to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <Animated.View
      style={{
        opacity: cardOpacity,
        transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
      }}
    >
      <TouchableOpacity
        style={styles.comboCard}
        onPress={handleCardPress}
        activeOpacity={0.8}
      >
        <View style={styles.comboHeader}>
          <Ionicons name="gift-outline" size={22} color="#694d21" />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.comboTitle} numberOfLines={1}>{item.title || 'Combo Offer'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Ionicons
                name={status === 'active' ? 'checkmark-circle' : status === 'upcoming' ? 'time' : 'close-circle'}
                size={10}
                color="#fff"
                style={{ marginRight: 2 }}
              />
              <Text style={styles.statusBadgeText}>{statusText}</Text>
            </View>
          </View>
        </View>
        {item.description && (
          <Text style={styles.comboDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.comboProductsRow}>
          {comboImages.length > 0 ? (
            comboImages.map((img, idx) => (
              <Image 
                key={idx}
                source={{ uri: apiService.getFullImageUrl(img) }}
                style={[styles.comboProductImage, idx === comboImages.length - 1 && styles.lastImage]}
                resizeMode="cover"
              />
            ))
          ) : (
            <View style={[styles.comboProductImage, styles.lastImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="image-outline" size={32} color="#999" />
            </View>
          )}
        </View>
        <View style={styles.comboPriceRow}>
          <View>
            <Text style={styles.comboPrice}>₹{discountedPrice.toFixed(2)}</Text>
            {totalPrice > discountedPrice && (
              <Text style={styles.originalPrice}>₹{totalPrice.toFixed(2)}</Text>
            )}
          </View>
          <Text style={styles.comboSaveText}>
            Save {item.discount_type === 'percentage' 
              ? `${Number(item.discount_value || 0)}%` 
              : `₹${Number(item.discount_value || 0)}`}
          </Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.viewComboButton}
            onPress={handleCardPress}
            activeOpacity={0.9}
          >
            <Ionicons name="eye-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.viewComboButtonText}>View</Text>
          </TouchableOpacity>
          {status === 'active' && (
            <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
              <TouchableOpacity 
                style={styles.addToCartButton}
                onPress={handleAddToCart}
                disabled={isAddingToCart}
                activeOpacity={0.9}
              >
                {isAddingToCart ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cart" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ComboOffersPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [combos, setCombos] = useState<any[]>([]);
  
  // Animation for list fade in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Function to check combo status
  const getComboStatus = (combo: any): 'active' | 'upcoming' | 'expired' => {
    if (!combo.is_active) {
      return 'expired';
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (!combo.start_date && !combo.end_date) {
      return combo.is_active ? 'active' : 'expired';
    }

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (combo.start_date) {
      startDate = new Date(combo.start_date);
      startDate.setHours(0, 0, 0, 0);
    }

    if (combo.end_date) {
      endDate = new Date(combo.end_date);
      endDate.setHours(23, 59, 59, 999);
    }

    if (startDate && endDate) {
      if (now < startDate) {
        return 'upcoming';
      } else if (now > endDate) {
        return 'expired';
      } else {
        return 'active';
      }
    } else if (startDate) {
      if (now < startDate) {
        return 'upcoming';
      } else {
        return 'active';
      }
    } else if (endDate) {
      if (now > endDate) {
        return 'expired';
      } else {
        return 'active';
      }
    }

    return combo.is_active ? 'active' : 'expired';
  };

  const getStatusColor = (status: 'active' | 'upcoming' | 'expired'): string => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'upcoming':
        return '#FF9800';
      case 'expired':
        return '#999';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: 'active' | 'upcoming' | 'expired'): string => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'upcoming':
        return 'Upcoming';
      case 'expired':
        return 'Expired';
      default:
        return 'Expired';
    }
  };

  const load = async () => {
    setLoading(true);
    const res = await apiService.getCombos();
    if (res.data) {
      // Show all combos (active, upcoming, expired)
      setCombos(res.data as any[]);
      
      // Animate list entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Calculate bottom padding for tab bar
  const bottomTabBarHeight = 60 + Math.max(insets.bottom, 4);
  const bottomPadding = bottomTabBarHeight + 16;

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Combo Offers',
          headerStyle: {
            backgroundColor: '#694d21',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
            color: '#fff',
          },
        }} 
      />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#694d21" />
            <Text style={styles.loadingText}>Loading combo offers...</Text>
          </View>
        ) : combos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="gift-outline" size={64} color="#999" />
            <Text style={styles.emptyText}>No combo offers available</Text>
          </View>
        ) : (
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <FlatList
              data={combos}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <ComboCard item={item} index={index} router={router} />
              )}
            />
          </Animated.View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  comboCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 12,
    padding: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  comboHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 8,
  },
  comboTitle: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '600',
    color: '#694d21',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
  },
  comboDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  comboProductsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  comboProductImage: {
    width: (screenWidth - 56) / 2,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  lastImage: {
    marginRight: 0,
  },
  comboPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  comboPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#694d21',
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  comboSaveText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  viewComboButton: {
    backgroundColor: '#694d21',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginRight: 6,
  },
  viewComboButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addToCartButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});





