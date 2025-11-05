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
  const deliveryCharge = subtotal > 999 ? 0 : 99;
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
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingTop: 30,
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
                    <View key={`${item.id}-${item.variant || 'no-variant'}-${item.quantity}`} style={styles.cartItem}>
                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => toggleItemSelection(item.id)}
                      >
                        <LinearGradient
                          colors={selectedItems.includes(item.id) ? ['#694d21', '#5a3f1a'] : ['#f0f0f0', '#e0e0e0']}
                          style={styles.checkbox}
                        >
                          {selectedItems.includes(item.id) && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </LinearGradient>
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
                          <View style={styles.stockContainer}>
                            <Ionicons 
                              name={item.stock_quantity > 3 ? "checkmark-circle" : "warning"} 
                              size={16} 
                              color={item.stock_quantity > 3 ? "#28a745" : "#ff4444"} 
                            />
                            <Text style={[
                              styles.stockText,
                              item.stock_quantity <= 3 && styles.lowStockText
                            ]}>
                              {item.stock_quantity > 3 
                                ? 'In Stock'
                                : `Only ${item.stock_quantity} left`
                              }
                            </Text>
                          </View>
                          <View style={styles.quantityContainer}>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.id, false);
                              }}
                            >
                              <Ionicons name="remove" size={16} color="#666" />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.id, true);
                              }}
                            >
                              <Ionicons name="add" size={16} color="#666" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => removeItem(item.id)}
                      >
                        <LinearGradient
                          colors={['#ff4444', '#cc0000']}
                          style={styles.deleteButtonGradient}
                        >
                          <Ionicons name="trash" size={18} color="#fff" />
                        </LinearGradient>
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
                      <TouchableOpacity
                        key={product.id}
                        style={styles.suggestedProduct}
                        onPress={() => router.push({
                          pathname: '/(product)/[id]',
                          params: { id: product.id }
                        })}
                      >
                        <Image 
                          source={{ uri: apiService.getFullImageUrl(product.image_url) }}
                          style={styles.suggestedProductImage}
                        />
                        <View style={styles.suggestedProductDetails}>
                          <Text style={styles.suggestedProductName} numberOfLines={2}>
                            {product.name}
                          </Text>
                          <Text style={styles.suggestedProductPrice}>
                            ₹{product.price}
                          </Text>
                          {product.offer_percentage > 0 && (
                            <View style={styles.offerBadge}>
                              <Text style={styles.offerText}>
                                {product.offer_percentage}% OFF
                              </Text>
                            </View>
                          )}
                          <TouchableOpacity
                            style={styles.addToCartButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              addItem(product);
                            }}
                          >
                            <Text style={styles.addToCartText}>Add to Cart</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Selected Items Summary */}
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>
                  Selected Items ({selectedItems.length})
                </Text>
                <Text style={styles.summaryTotal}>
                  Total: ₹{calculateSelectedTotal().toFixed(2)}
                </Text>
              </View>

              {/* Free Delivery Message */}
              <View style={styles.deliveryMessageContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#00a65a" />
                <Text style={styles.deliveryMessage}>
                  We noticed this is your First order in this category. Your order qualifies for FREE Delivery.
                </Text>
              </View>

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
                  colors={selectedItems.length === 0 ? ['#ccc', '#999'] : ['#694d21', '#5a3f1a']}
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
                <Ionicons name="close-circle-outline" size={20} color="#694d21" />
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
    shadowOpacity: 0.3,
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
    borderRadius: 16,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  shopButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 6,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    marginHorizontal: 12,
    marginVertical: 12,
    borderRadius: 14,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  proceedButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
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
    color: '#694d21',
    fontWeight: '600',
    marginLeft: 6,
  },
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#694d21',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
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
}); 