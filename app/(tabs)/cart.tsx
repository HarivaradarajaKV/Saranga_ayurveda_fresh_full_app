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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCart } from '../CartContext';
import { useRouter } from 'expo-router';
import { apiService } from '../services/api';
import type { CartItem } from '../CartContext';
import { useBottomTabBarHeight } from './_layout';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import ProductCard from '../components/ProductCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
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
  // Delivery charge: ₹59 for orders below ₹599, free for ₹599+
  const deliveryCharge = subtotal >= 599 ? 0 : 59;
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

  // Update useEffect to handle suggested/frequently bought products when items change
  useEffect(() => {
    if (items.length > 0) {
      setLoading(true);
      Promise.all([
        fetchSuggestedProducts(),
        fetchFrequentlyBoughtProducts()
      ]).finally(() => setLoading(false));
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
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
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

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await new Promise(r => setTimeout(r, 600));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const allProductIds = items.filter(item => item.stock_quantity > 0).map(item => item.id);
  const isAllSelected = allProductIds.length > 0 && allProductIds.every(id => selectedItems.includes(id));

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center', flex: 1 }}>
          <View style={[styles.headerSection, { paddingTop: insets.top > 0 ? insets.top + 10 : (Platform.OS === 'ios' ? 10 : (StatusBar.currentHeight ?? 0) + 10) }]}>
            <View style={styles.headerTextContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.brandTitle}>My Cart</Text>
                <Text style={styles.brandTitleCount}> ({items.length})</Text>
              </View>
              <Text style={styles.brandSubtitle}>Review your items and proceed to checkout</Text>
            </View>
          </View>

          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={{
                paddingTop: 10,
                paddingBottom: bottomTabHeight + 20
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#2b3a1a"
                  colors={['#2b3a1a']}
                />
              }
            >
              {items.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <LinearGradient
                    colors={['#2b3a1a', '#1e2912']}
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
                    delayPressIn={0}
                  >
                    <LinearGradient
                      colors={['#2b3a1a', '#1e2912']}
                      style={styles.shopButtonGradient}
                    >
                      <Text style={styles.shopButtonText}>Start Shopping</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.shopButtonIcon} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Cart Items List */}
                  <View style={styles.cartCard}>
                    {/* Select All Row */}
                    <View style={styles.selectAllRow}>
                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => {
                          if (isAllSelected) {
                            setSelectedItems([]);
                          } else {
                            setSelectedItems(allProductIds);
                          }
                        }}
                        delayPressIn={0}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            {
                              backgroundColor: '#fff',
                              borderWidth: 1.5,
                              borderColor: isAllSelected ? '#2b3a1a' : '#ccc'
                            }
                          ]}
                        >
                          {isAllSelected && (
                            <Ionicons name="checkmark" size={14} color="#2b3a1a" />
                          )}
                        </View>
                      </TouchableOpacity>
                      <Text style={styles.selectAllText}>Select All Items</Text>
                    </View>
                    
                    <View style={styles.itemDivider} />

                    {items.map((item: CartItem, index: number) => {
                      const displayPrice = typeof item.price === 'number' ? item.price : (parseFloat(String(item.price)) || 0);
                      const offerPercentage = typeof item.offer_percentage === 'number' ? item.offer_percentage : (parseFloat(String(item.offer_percentage)) || 0);

                      let finalPrice: number;
                      if (item.is_from_combo && item.combo_discounted_price !== undefined) {
                        finalPrice = item.combo_discounted_price;
                      } else {
                        finalPrice = displayPrice * (1 - offerPercentage / 100);
                      }

                      return (
                        <View key={`${item.id}-${item.variant || 'no-variant'}-${item.quantity}`} style={{ width: '100%' }}>
                          <View style={[styles.cartItemRow, item.stock_quantity === 0 && { opacity: 0.5 }]}>
                            {/* Checkbox */}
                            <TouchableOpacity
                              style={styles.checkboxContainer}
                              onPress={() => toggleItemSelection(item.id)}
                              disabled={item.stock_quantity === 0}
                              delayPressIn={0}
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
                                  <Ionicons name="checkmark" size={14} color="#2b3a1a" />
                                )}
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.itemImageWrapper}
                              onPress={() => router.push({
                                pathname: '/(product)/[id]',
                                params: { id: item.id }
                              })}
                            >
                              <Image
                                source={{ uri: apiService.getFullImageUrl(item.image_url) }}
                                style={styles.productImage}
                              />
                            </TouchableOpacity>
                            
                            <View style={styles.itemDetailsCol}>
                              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                              <Text style={styles.productSize} numberOfLines={1}>{item.size || item.variant || 'Standard'}</Text>
                              <Text style={styles.productPriceGreen} numberOfLines={1}>₹{finalPrice.toFixed(2)}</Text>
                            </View>
                            
                            <View style={styles.itemActionCol}>
                              <Text style={styles.productOriginalPriceRight} numberOfLines={1}>₹{displayPrice.toFixed(2)}</Text>
                              <View style={styles.quantityAndTrashRow}>
                                <View style={styles.qtyBox}>
                                  <TouchableOpacity
                                    style={[styles.qtyBoxBtn, (item.stock_quantity === 0 || item.quantity <= 1) && { opacity: 0.5 }]}
                                    onPress={() => updateQuantity(item.id, false)}
                                    disabled={item.stock_quantity === 0 || item.quantity <= 1}
                                    delayPressIn={0}
                                  >
                                    <Text style={styles.qtyBoxBtnText}>−</Text>
                                  </TouchableOpacity>
                                  <Text style={styles.qtyBoxValue}>{item.quantity}</Text>
                                  <TouchableOpacity
                                    style={[styles.qtyBoxBtn, (item.stock_quantity === 0 || item.quantity >= item.stock_quantity) && { opacity: 0.5 }]}
                                    onPress={() => updateQuantity(item.id, true)}
                                    disabled={item.stock_quantity === 0 || item.quantity >= item.stock_quantity}
                                    delayPressIn={0}
                                  >
                                    <Text style={styles.qtyBoxBtnText}>+</Text>
                                  </TouchableOpacity>
                                </View>
                                
                                <TouchableOpacity
                                  style={styles.trashBtn}
                                  onPress={() => removeItem(item.id)}
                                  delayPressIn={0}
                                >
                                  <Ionicons name="trash-outline" size={20} color="#888" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                          {index < items.length - 1 && <View style={styles.itemDivider} />}
                        </View>
                      );
                    })}
                  </View>

                  {/* Coupon Card */}
                  <View style={styles.couponCard}>
                    <View style={styles.couponLeft}>
                      <View style={styles.couponIconCircle}>
                        <Ionicons name="pricetag-outline" size={18} color="#2b3a1a" />
                      </View>
                      <View style={styles.couponTextContainer}>
                        <Text style={styles.couponTitle}>Have a coupon code?</Text>
                        <Text style={styles.couponSubtitle}>Apply code to get instant discount</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.couponApplyBtn}
                      onPress={() => {
                        Alert.alert('Coupon', 'Please enter coupon code at the checkout screen.');
                      }}
                      delayPressIn={0}
                    >
                      <Text style={styles.couponApplyText}>Apply</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Order Summary Card */}
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Order Summary</Text>
                    
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
                      <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
                    </View>
                    
                    <View style={styles.summaryRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.summaryLabel}>Shipping</Text>
                        <View style={styles.infoIconCircle}>
                          <Ionicons name="information-outline" size={10} color="#666" />
                        </View>
                      </View>
                      <Text style={[styles.summaryValue, { color: '#2b3a1a', fontWeight: 'bold' }]}>
                        {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}
                      </Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryTotalLabel}>Total</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.summaryTotalValue}>₹{total.toFixed(2)}</Text>
                        <Text style={styles.summaryTaxesLabel}>(Inclusive of all taxes)</Text>
                      </View>
                    </View>

                    {/* Free Delivery Message */}
                    {subtotal > 0 && subtotal < 599 && (
                      <Animated.View
                        style={[
                          styles.freeDeliveryContainer,
                          { transform: [{ scale: pulseAnim }], marginTop: 16 }
                        ]}
                      >
                        <Text style={styles.freeDeliveryText}>
                          Add ₹{(599 - subtotal).toFixed(2)} more to enjoy FREE delivery!
                        </Text>
                      </Animated.View>
                    )}
                  </View>

                  {/* Feature Badges Card */}
                  <View style={styles.featureBadgesCard}>
                    <View style={styles.featureBadgeItem}>
                      <Ionicons name="leaf-outline" size={24} color="#2b3a1a" />
                      <Text style={styles.featureBadgeText}>100% Natural{"\n"}& Safe</Text>
                    </View>
                    <View style={styles.featureVerticalDivider} />
                    <View style={styles.featureBadgeItem}>
                      <Ionicons name="flower-outline" size={24} color="#2b3a1a" />
                      <Text style={styles.featureBadgeText}>Ayurvedic{"\n"}& Authentic</Text>
                    </View>
                    <View style={styles.featureVerticalDivider} />
                    <View style={styles.featureBadgeItem}>
                      <Ionicons name="shield-checkmark-outline" size={24} color="#2b3a1a" />
                      <Text style={styles.featureBadgeText}>Secure{"\n"}Payments</Text>
                    </View>
                  </View>

                  <Text style={styles.customizedText}>This order has been specially customised for you</Text>

                  {/* Checkout Action Button */}
                  <TouchableOpacity
                    style={[
                      styles.checkoutBtn,
                      selectedItems.length === 0 && styles.checkoutBtnDisabled
                    ]}
                    onPress={handleCheckout}
                    disabled={selectedItems.length === 0}
                    delayPressIn={0}
                  >
                    <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
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
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 10 : (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 80,
  },
  brandTitle: {
    fontSize: 32,
    color: '#2b3a1a',
    fontFamily: 'CormorantGaramond-Bold',
    fontWeight: '700',
  },
  brandTitleCount: {
    fontSize: 32,
    color: '#3d5229',
    fontFamily: 'CormorantGaramond-Bold',
    fontWeight: '700',
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  leafDecoration: {
    position: 'absolute',
    right: -10,
    top: Platform.OS === 'ios' ? -10 : (StatusBar.currentHeight ?? 0) - 20,
    width: 120,
    height: 120,
    opacity: 0.85,
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
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2b3a1a',
    fontFamily: 'CormorantGaramond-Bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  shopButton: {
    borderRadius: 20,
  },
  shopButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
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
  cartCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f2f2ef',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2b3a1a',
    marginLeft: 6,
  },
  checkboxContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  itemImageWrapper: {
    marginRight: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#f9f9f9',
  },
  itemDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 20,
    marginBottom: 4,
  },
  productSize: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  productPriceGreen: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2b3a1a',
  },
  itemActionCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
  },
  productOriginalPriceRight: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  quantityAndTrashRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e5',
    borderRadius: 20,
    paddingHorizontal: 4,
    backgroundColor: '#fafaf9',
    marginRight: 12,
  },
  qtyBoxBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBoxBtnText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
  qtyBoxValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 20,
    textAlign: 'center',
  },
  trashBtn: {
    padding: 6,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#f2f2ef',
    width: '100%',
  },
  couponCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f2f2ef',
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  couponIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f2f4f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  couponTextContainer: {
    flex: 1,
  },
  couponTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  couponSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  couponApplyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  couponApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2b3a1a',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f2f2ef',
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'CormorantGaramond-Bold',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  infoIconCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f2f2ef',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2b3a1a',
  },
  summaryTaxesLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  featureBadgesCard: {
    backgroundColor: '#f4f6f0',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  featureBadgeItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2b3a1a',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },
  featureVerticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(43, 58, 26, 0.1)',
  },
  checkoutBtn: {
    backgroundColor: '#2b3a1a',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  checkoutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  freeDeliveryContainer: {
    backgroundColor: '#f5f7f2',
    borderWidth: 1,
    borderColor: '#e2ebda',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeDeliveryText: {
    fontSize: 13,
    color: '#3d5236',
    fontWeight: '600',
    textAlign: 'center',
  },
  customizedText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
}); 