import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCart } from '../CartContext';
import { useRouter } from 'expo-router';
import { apiService } from '../services/api';
import type { CartItem } from '../CartContext';
import { useBottomTabBarHeight } from './_layout';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import ProductCard from '../components/ProductCard';

const { width } = Dimensions.get('window');

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  image_url2?: string;
  image_url3?: string;
  usage_instructions?: string;
  size?: string;
  benefits?: string;
  ingredients?: string;
  product_details?: string;
  stock_quantity: number;
  created_at: string;
  offer_percentage: number;
}

import { useAddress } from '../AddressContext';

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    selectedItems,
    toggleItemSelection,
    setSelectedItems,
    getSelectedItems,
    addItem
  } = useCart();
  const { addresses } = useAddress();
  const router = useRouter();
  const [promoCode, setPromoCode] = useState('');
  const [pincode, setPincode] = useState('');
  const [deliveryDays, setDeliveryDays] = useState<number | null>(null);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [frequentlyBoughtProducts, setFrequentlyBoughtProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomTabHeight = useBottomTabBarHeight();
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialMount = useRef(true);
  const lastFocusedState = useRef(false);

  const calculateSelectedTotal = () => {
    return items
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => {
        const itemQuantity = typeof item.quantity === 'number' ? item.quantity : (parseInt(String(item.quantity)) || 1);

        // If item is from combo, use combo discounted price
        if (item.is_from_combo && item.combo_discounted_price !== undefined) {
          return total + (item.combo_discounted_price * itemQuantity);
        }

        // Otherwise use normal discounted price
        const itemPrice = typeof item.price === 'number' ? item.price : (parseFloat(String(item.price)) || 0);
        const itemOffer = typeof item.offer_percentage === 'number' ? item.offer_percentage : (parseFloat(String(item.offer_percentage)) || 0);
        return total + ((itemPrice * (1 - itemOffer / 100)) * itemQuantity);
      }, 0);
  };

  const subtotal = calculateSelectedTotal();
  const discount = 0; // Calculate based on applied promo
  // Delivery charge: ₹59 for orders below ₹500, free for ₹500+
  const deliveryCharge = subtotal >= 500 ? 0 : 59;
  const total = subtotal - discount + deliveryCharge;

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to checkout');
      return;
    }

    // Get only selected items for checkout
    const selectedCartItems = getSelectedItems();
    const checkoutData = {
      items: selectedCartItems,
      subtotal,
      deliveryCharge,
      total,
      itemCount: selectedItems.length
    };

    // Navigate to checkout with only selected items
    router.push({
      pathname: '/checkout',
      params: {
        checkoutData: JSON.stringify(checkoutData)
      }
    });
  };

  const handleCheckPincode = () => {
    if (!pincode.trim() || pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    // Bangalore pincodes range from 560001 to 560100
    const isBangaloreArea = pincode >= '560001' && pincode <= '560100';
    setDeliveryDays(isBangaloreArea ? 3 : 6);
  };

  const getEstimatedDeliveryDate = () => {
    if (!deliveryDays) return null;
    const date = new Date();
    date.setDate(date.getDate() + deliveryDays);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get suggested products based on cart items
  const fetchSuggestedProducts = async () => {
    try {
      const cartCategories = items.map((item: CartItem) => item.category);
      const response = await apiService.get(`${apiService.ENDPOINTS.PRODUCTS}?categories=${cartCategories.join(',')}`);

      if (response.error || !response.data || !response.data.products) {
        console.error('API Error or invalid data:', response.error || 'Invalid data format');
        setSuggestedProducts([]);
        return;
      }

      // Filter out products that are already in cart
      const cartProductIds = new Set(items.map((item: CartItem) => item.id));
      const suggestions = response.data.products
        .filter((product: Product) => !cartProductIds.has(product.id))
        .slice(0, 5);
      setSuggestedProducts(suggestions);
    } catch (error) {
      console.error('Error fetching suggested products:', error);
      setSuggestedProducts([]);
    }
  };

  // Get frequently bought together products
  const fetchFrequentlyBoughtProducts = async () => {
    try {
      const cartCategories = new Set(items.map((item: CartItem) => item.category));
      const response = await apiService.get(apiService.ENDPOINTS.PRODUCTS);

      if (response.error || !response.data || !response.data.products) {
        console.error('API Error or invalid data:', response.error || 'Invalid data format');
        setFrequentlyBoughtProducts([]);
        return;
      }

      // Filter out products that are already in cart and from different categories
      const cartProductIds = new Set(items.map((item: CartItem) => item.id));
      const frequentlyBought = response.data.products
        .filter((product: Product) =>
          !cartProductIds.has(product.id) &&
          !cartCategories.has(product.category)
        )
        .slice(0, 3);
      setFrequentlyBoughtProducts(frequentlyBought);
    } catch (error) {
      console.error('Error fetching frequently bought products:', error);
      setFrequentlyBoughtProducts([]);
    }
  };

  // Update useEffect to handle selected items state when items change
  useEffect(() => {
    if (items.length > 0) {
      // Keep only valid item IDs in selectedItems
      const validIds = items.map(item => item.id);
      setSelectedItems(validIds);
      setLoading(true);
      Promise.all([
        fetchSuggestedProducts(),
        fetchFrequentlyBoughtProducts()
      ]).finally(() => setLoading(false));
    } else {
      setSelectedItems([]);
    }
  }, [items]);

  useEffect(() => {
    // Start animations on mount
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

    // Pulse animation for free delivery text
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    if (scrollViewRef.current) {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });
    }
  };

  // Handle tab press for scroll to top
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      if (isFocused) {
        e.preventDefault();
        scrollToTop();
      }
    });
    return unsubscribe;
  }, [navigation, isFocused]);

  useEffect(() => {
    // Track focus changes to prevent unwanted scrolling
    if (isFocused && !lastFocusedState.current) {
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }
    lastFocusedState.current = isFocused;
  }, [isFocused]);

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerSection}>
          <Text style={styles.brandTitle}>Cart</Text>
        </View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingTop: 10,
            }
          ]}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={{
              paddingTop: 10,
              paddingBottom: bottomTabHeight + 20 // Add extra 20 for spacing
            }}
            showsVerticalScrollIndicator={false}
          >
            {items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={['#694d21', '#5a3f1a']}
                  style={styles.emptyIconContainer}
                >
                  <Ionicons name="cart-outline" size={48} color="#fff" />
                </LinearGradient>
                <Text style={styles.emptyTitle}>Your cart is empty</Text>
                <Text style={styles.emptySubtitle}>
                  Discover amazing products and add them to your cart
                </Text>
                <TouchableOpacity
                  style={styles.shopButton}
                  onPress={() => router.push('/')}
                >
                  <LinearGradient
                    colors={['#694d21', '#5a3f1a']}
                    style={styles.shopButtonGradient}
                  >
                    <Text style={styles.shopButtonText}>Start Shopping</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.shopButtonIcon} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>


                {/* Cart Items */}
                <BlurView intensity={20} style={styles.cartItemsContainer}>
                  {items.map((item: CartItem) => {
                    console.log('Rendering cart item:', item);
                    const displayPrice = typeof item.price === 'number' ? item.price : (parseFloat(String(item.price)) || 0);
                    const offerPercentage = typeof item.offer_percentage === 'number' ? item.offer_percentage : (parseFloat(String(item.offer_percentage)) || 0);

                    // Use combo discounted price if item is from combo, otherwise use normal discounted price
                    let finalPrice: number;
                    if (item.is_from_combo && item.combo_discounted_price !== undefined) {
                      finalPrice = item.combo_discounted_price;
                    } else {
                      finalPrice = displayPrice * (1 - offerPercentage / 100);
                    }

                    const formattedPrice = finalPrice.toFixed(2);
                    return (
                      <View key={`${item.id}-${item.variant || 'no-variant'}-${item.quantity}`} style={[styles.cartItem, item.stock_quantity === 0 && { opacity: 0.5 }]}>
                        <TouchableOpacity
                          style={styles.checkboxContainer}
                          onPress={() => toggleItemSelection(item.id)}
                          disabled={item.stock_quantity === 0}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              {
                                backgroundColor: '#fff',
                                borderWidth: 1.5,
                                borderColor: selectedItems.includes(item.id) && item.stock_quantity > 0 ? '#2b3a1a' : '#ccc'
                              }
                            ]}
                          >
                            {selectedItems.includes(item.id) && item.stock_quantity > 0 && (
                              <Ionicons name="checkmark" size={16} color="#2b3a1a" />
                            )}
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.itemContentContainer}
                          onPress={() => router.push({
                            pathname: '/(product)/[id]',
                            params: { id: item.id }
                          })}
                        >
                          <View style={styles.itemImageContainer}>
                            <Image
                              source={{ uri: apiService.getFullImageUrl(item.image_url) }}
                              style={styles.itemImage}
                            />
                            {offerPercentage > 0 && (
                              <View style={styles.offerBadge}>
                                <Text style={styles.offerText}>{offerPercentage}% OFF</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.itemDetails}>
                            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                            <View style={styles.priceContainer}>
                              <Text style={styles.price}>₹{formattedPrice}</Text>
                              {offerPercentage > 0 && (
                                <Text style={styles.originalPrice}>₹{displayPrice.toFixed(2)}</Text>
                              )}
                            </View>
                            {item.stock_quantity === 0 && (
                              <View style={styles.stockContainer}>
                                <Ionicons
                                  name="warning"
                                  size={16}
                                  color="#ff4444"
                                />
                                <Text style={[styles.stockText, styles.lowStockText]}>
                                  Out of Stock
                                </Text>
                              </View>
                            )}
                            <View style={styles.quantityContainer}>
                              <TouchableOpacity
                                style={[
                                  styles.quantityButton,
                                  item.stock_quantity === 0 && styles.quantityButtonDisabled
                                ]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.id, false);
                                }}
                                disabled={item.stock_quantity === 0}
                              >
                                <Ionicons name="remove" size={16} color="#2b3a1a" />
                              </TouchableOpacity>
                              <Text style={styles.quantityText}>{item.quantity}</Text>
                              <TouchableOpacity
                                style={[
                                  styles.quantityButton,
                                  item.stock_quantity === 0 && styles.quantityButtonDisabled
                                ]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.id, true);
                                }}
                                disabled={item.stock_quantity === 0}
                              >
                                <Ionicons name="add" size={16} color="#2b3a1a" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => removeItem(item.id)}
                        >
                          <Ionicons name="trash" size={22} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </BlurView>

                {/* Buy Along with This Product */}
                {suggestedProducts.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Buy Along with This Product</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.suggestedProductsContainer}
                    >
                      {suggestedProducts.map((product) => (
                        <View key={product.id} style={{ width: 160, marginRight: 8 }}>
                          <ProductCard product={product} />
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Selected Items Summary */}
                <View style={styles.summaryContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={[styles.summaryText, { fontSize: 16, fontWeight: '700', color: '#1a1a1a' }]}>
                      Order Summary
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666', fontWeight: '500' }}>
                      {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''} Selected
                    </Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: '#eee', marginBottom: 12 }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: '#666', fontSize: 14 }}>Subtotal</Text>
                    <Text style={{ fontWeight: '600', fontSize: 14, color: '#1a1a1a' }}>₹{subtotal.toFixed(2)}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ color: '#666', fontSize: 14 }}>Delivery</Text>
                    <Text style={{ color: deliveryCharge === 0 ? '#28a745' : '#1a1a1a', fontWeight: '600', fontSize: 14 }}>
                      {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                    </Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: '#eee', marginBottom: 12 }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' }}>Total Amount</Text>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3a1a' }}>
                      ₹{total.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#999', marginTop: 4, fontStyle: 'italic', textAlign: 'right' }}>
                    (Inc. GST)
                  </Text>
                </View>

                {/* Free Delivery Message */}
                {subtotal > 0 && subtotal < 500 && (
                  <Animated.View
                    style={[
                      styles.freeDeliveryContainer,
                      { transform: [{ scale: pulseAnim }] }
                    ]}
                  >
                    <Text style={styles.freeDeliveryText}>
                      Add ₹{(500 - subtotal).toFixed(2)} more to enjoy FREE delivery!
                    </Text>
                  </Animated.View>
                )}

                {/* Address Display */}
                {addresses && addresses.length > 0 ? (
                  <TouchableOpacity
                    style={[styles.deliveryMessageContainer, {
                      padding: 16,
                      backgroundColor: '#fff',
                      borderRadius: 16,
                      shadowColor: '#2b3a1a',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.08,
                      shadowRadius: 12,
                      elevation: 4,
                      borderWidth: 1,
                      borderColor: 'rgba(43, 58, 26, 0.1)',
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }]}
                    onPress={() => router.push('/profile/addresses')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#f2f4f0',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12
                      }}>
                        <Ionicons name="location" size={20} color="#2b3a1a" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: '#2b3a1a', fontWeight: '600', marginBottom: 2 }}>
                          DELIVER TO
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1a1a1a' }}>
                          {addresses[0].full_name}
                        </Text>
                      </View>
                      <View style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor: '#2b3a1a',
                        borderRadius: 20,
                        shadowColor: '#2b3a1a',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3
                      }}>
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>Change</Text>
                      </View>
                    </View>

                    <View style={{
                      backgroundColor: '#f8f9fa',
                      padding: 12,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'flex-start'
                    }}>
                      <Text style={{ color: '#4a4a4a', fontSize: 13, lineHeight: 20, flex: 1 }}>
                        {addresses[0].address_line1}, {addresses[0].city} - {addresses[0].postal_code}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.deliveryMessageContainer, {
                      padding: 20,
                      backgroundColor: '#fff',
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: '#eee',
                      borderStyle: 'dashed',
                      justifyContent: 'center'
                    }]}
                    onPress={() => router.push('/profile/addresses/new')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#f2f4f0',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12
                      }}>
                        <Ionicons name="add" size={24} color="#2b3a1a" />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#2b3a1a' }}>
                        Add Delivery Address
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Proceed to Buy Button */}
                <TouchableOpacity
                  style={[
                    styles.proceedButton,
                    selectedItems.length === 0 && styles.proceedButtonDisabled
                  ]}
                  onPress={handleCheckout}
                  disabled={selectedItems.length === 0}
                >
                  <LinearGradient
                    colors={selectedItems.length === 0 ? ['#ccc', '#999'] : ['#2b3a1a', '#1e2912']}
                    style={styles.proceedButtonGradient}
                  >
                    <Text style={styles.proceedButtonText}>
                      Proceed to Buy ({selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''})
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.proceedButtonIcon} />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Deselect All Items */}
                <TouchableOpacity
                  style={styles.deselectButton}
                  onPress={() => setSelectedItems([])}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#2b3a1a" />
                  <Text style={styles.deselectButtonText}>Deselect all items</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 20 : (StatusBar.currentHeight ?? 0) + 20,
    paddingBottom: 6,
    zIndex: 10,
    position: 'relative',
  },
  headerBackButton: {
    position: 'absolute',
    left: 16,
    bottom: 14,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(43,58,26,0.08)',
    zIndex: 20,
  },
  brandTitle: {
    fontSize: 42,
    color: '#2b3a1a',
    textAlign: 'center',
    fontFamily: 'CormorantGaramond-Bold',
    letterSpacing: 1,
    marginBottom: 16,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    minHeight: Dimensions.get('window').height * 0.7,
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  shopButton: {
    borderRadius: 20,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  shopButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  shopButtonIcon: {
    marginLeft: 4,
  },
  cartItemsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(105, 77, 33, 0.05)',
  },
  cartItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  offerBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#694d21',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  offerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#694d21',
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  lowStockText: {
    color: '#ff4444',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2b3a1a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quantityButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  quantityText: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    minWidth: 32,
    textAlign: 'center',
  },
  deleteButton: {
    marginLeft: 8,
    marginTop: 8,
  },
  deleteButtonGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deliveryMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(40, 167, 69, 0.2)',
  },
  deliveryMessage: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  proceedButton: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  proceedButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 6,
  },
  proceedButtonIcon: {
    marginLeft: 4,
  },
  proceedButtonDisabled: {
    opacity: 0.6,
  },
  deselectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 12,
  },
  deselectButtonText: {
    fontSize: 13,
    color: '#2b3a1a',
    fontWeight: '600',
    marginLeft: 6,
  },
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 20,
    flexDirection: 'column',
    alignItems: 'stretch',
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 26, 0.05)',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2b3a1a',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(105, 77, 33, 0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  suggestedProductsContainer: {
    paddingBottom: 8,
  },
  suggestedProduct: {
    width: 140,
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestedProductImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  suggestedProductDetails: {
    padding: 10,
  },
  suggestedProductName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 16,
  },
  suggestedProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#694d21',
    marginBottom: 8,
  },
  addToCartButton: {
    backgroundColor: '#694d21',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemContentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeDeliveryContainer: {
    backgroundColor: '#fffbeb',
    marginHorizontal: 12,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#694d21',
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  freeDeliveryText: {
    color: '#694d21',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 