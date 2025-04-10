import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../CartContext';
import { useRouter } from 'expo-router';
import { apiService } from '../services/api';
import type { CartItem } from '../CartContext';

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

  const calculateSelectedTotal = () => {
    return items
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => total + ((item.price*(1-item.offer_percentage/100)) * item.quantity), 0);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Your cart is empty</Text>
              <TouchableOpacity
                style={styles.shopButton}
                onPress={() => router.push('/')}
              >
                <Text style={styles.shopButtonText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Cart Items */}
              <View style={styles.cartItemsContainer}>
                {items.map((item: CartItem) => {
                  console.log('Rendering cart item:', item);
                  const displayPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price)|| 0;
                  const formattedPrice = (displayPrice*(1-item.offer_percentage/100)).toFixed(2);
                  return (
                    <View key={`${item.id}-${item.variant || 'no-variant'}-${item.quantity}`} style={styles.cartItem}>
                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => toggleItemSelection(item.id)}
                      >
                        <View style={[
                          styles.checkbox,
                          selectedItems.includes(item.id) && styles.checkboxSelected
                        ]}>
                          {selectedItems.includes(item.id) && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
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
                        <Image 
                          source={{ uri: apiService.getFullImageUrl(item.image_url) }} 
                          style={styles.itemImage}
                        />
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                          <View style={styles.priceContainer}>
                            <Text style={styles.price}>₹{formattedPrice}</Text>
                            {/* {item.offer_percentage > 0 && (
                              <Text style={styles.originalPrice}>₹{typeof item.price === 'number' ? item.price.toFixed(2) : 'N/A'}</Text>
                            )}
                            {item.offer_percentage > 0 && (
                              <Text style={styles.discount}>({item.offer_percentage}% OFF)</Text>
                            )} */}
                          </View>
                          <Text style={[
                            styles.stockText,
                            item.stock_quantity <= 3 && styles.lowStockText
                          ]}>
                            {item.stock_quantity > 3 
                              ? 'In Stock'
                              : `Only ${item.stock_quantity} left in stock`
                            }
                          </Text>
                          <View style={styles.quantityContainer}>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.id, false);
                              }}
                            >
                              <Text style={styles.quantityButtonText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.id, true);
                              }}
                            >
                              <Text style={styles.quantityButtonText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => removeItem(item.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

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
                <Text style={styles.proceedButtonText}>
                  Proceed to Buy ({selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''})
                </Text>
              </TouchableOpacity>

              {/* Deselect All Items */}
              <TouchableOpacity
                style={styles.deselectButton}
                onPress={() => setSelectedItems([])}
              >
                <Text style={styles.deselectButtonText}>Deselect all items</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    minHeight: Dimensions.get('window').height - (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) - 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cartItemsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cartItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 4,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    textDecorationLine: 'line-through',
  },
  discount: {
    fontSize: 12,
    color: '#00a65a',
    marginLeft: 4,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lowStockText: {
    color: '#ff4444',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quantityButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  quantityText: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  deleteButton: {
    padding: 8,
  },
  deliveryMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  deliveryMessage: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#00a65a',
  },
  proceedButton: {
    backgroundColor: '#ffd814',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  deselectButton: {
    padding: 16,
  },
  deselectButtonText: {
    fontSize: 14,
    color: '#007bff',
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#007bff',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  proceedButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  suggestedProductsContainer: {
    paddingBottom: 8,
  },
  suggestedProduct: {
    width: 160,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  suggestedProductImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  suggestedProductDetails: {
    padding: 8,
  },
  suggestedProductName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  suggestedProductPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF69B4',
    marginBottom: 8,
  },
  offerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF69B4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addToCartButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  itemContentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 