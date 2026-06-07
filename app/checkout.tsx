import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  TextInput,
  Modal,
  FlatList,
  Button,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams, Stack } from 'expo-router';
import { apiService } from './services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart, CartItem } from './CartContext';
import { initializeRazorpayPayment } from './services/razorpay';
import RazorpayWebView from './components/RazorpayWebView';

// Checkout page uses useWindowDimensions for responsive layout

// Local Address type for checkout page
interface Address {
  id?: number;
  full_name: string;
  phone?: string;
  phone_number?: string;
  pincode?: string;
  postal_code?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country?: string;
  address_type?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  description: string;
}

interface Coupon {
  id: number;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount: number | null;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  product_ids?: number[];
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  prefill: {
    name: string;
    contact: string;
  };
  theme?: {
    color: string;
  };
  handler?: (response: any) => void;
  modal?: {
    ondismiss: () => void;
  };
}

const CheckoutPage = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { items: cartItems, clearCart, getSelectedItems } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [subtotal, setSubtotal] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [gstMap, setGstMap] = useState<Record<number, number>>({});
  const [gstAmount, setGstAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]); // For dropdown filtering
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState<RazorpayOptions | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [sectionExpanded, setSectionExpanded] = useState({
    orderSummary: true,
    coupons: true,
    address: true,
    payment: true
  });
  const fadeAnims = {
    orderSummary: useRef(new Animated.Value(1)).current,
    coupons: useRef(new Animated.Value(1)).current,
    address: useRef(new Animated.Value(1)).current,
    payment: useRef(new Animated.Value(1)).current
  };
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const buyNowProductParam = params?.buyNowProduct;
  const buyNowQuantityParam = params?.quantity;

  const buyNowProduct = React.useMemo(() => {
    if (buyNowProductParam && typeof buyNowProductParam === 'string') {
      try {
        const prod = JSON.parse(buyNowProductParam);
        const qty = buyNowQuantityParam ? Number(buyNowQuantityParam) : 1;
        const basePrice = Number(prod.price) || 0;
        const offerPct = Number(prod.offer_percentage || 0);
        return [{
          id: Number(prod.id),
          name: prod.name || '',
          description: prod.description || '',
          price: basePrice,
          category: prod.category || '',
          image_url: prod.image_url || '',
          stock_quantity: typeof prod.stock_quantity === 'number' ? prod.stock_quantity : (parseInt(String(prod.stock_quantity)) || 999),
          created_at: prod.created_at || new Date().toISOString(),
          offer_percentage: offerPct,
          quantity: qty,
          discounted_price: basePrice * (1 - offerPct / 100)
        }] as CartItem[];
      } catch (e) {
        console.error('Error parsing buyNowProduct param:', e);
      }
    }
    return null;
  }, [buyNowProductParam, buyNowQuantityParam]);

  // Filter only selected cart items
  const selectedCartItems = React.useMemo(() => {
    if (buyNowProduct) {
      return buyNowProduct;
    }
    return getSelectedItems();
  }, [cartItems, buyNowProduct]);

  // Consolidated focus effect for address handling
  useFocusEffect(
    React.useCallback(() => {
      const loadAddresses = async () => {
        try {
          const response = await apiService.getAddresses();
          console.log('Fetched addresses:', response);
          if (Array.isArray(response) && response.length > 0) {
            // Map phone_number to phone
            const addressesWithPhone = response.map(addr => ({
              ...addr,
              phone: addr.phone_number // Ensure phone is set correctly
            }));
            console.log('Addresses with phone:', addressesWithPhone);
            setAddresses(addressesWithPhone as Address[]);

            // Check for selected address from navigation params
            if (params?.selectedAddressId) {
              const selected = addressesWithPhone.find(addr => addr.id === Number(params.selectedAddressId));
              console.log('Selected address from params:', selected);
              if (selected) {
                setSelectedAddress(selected as Address);
                return;
              }
            }

            // Fallback to default or first address
            const defaultAddress = addressesWithPhone.find(addr => addr.is_default) || addressesWithPhone[0];
            console.log('Default address:', defaultAddress);
            setSelectedAddress(defaultAddress as Address);
          }
        } catch (error) {
          console.error('Error loading addresses:', error);
        }
      };

      loadAddresses();
    }, [params?.selectedAddressId])
  );

  const handleChangeAddress = () => {
    router.push({
      pathname: '/profile/addresses',
      params: {
        mode: 'select',
        returnTo: 'checkout'
      }
    });
  };

  // Payment methods
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cod',
      type: 'cod',
      name: 'Cash on Delivery',
      description: 'Pay when you receive your order'
    },
    {
      id: 'razorpay',
      type: 'online',
      name: 'Pay Online',
      description: 'Pay securely using UPI, Card, or Net Banking'
    }
  ];

  // Set the default payment method to Razorpay (Online)
  useEffect(() => {
    setSelectedPayment(paymentMethods[1]);
  }, []);

  useEffect(() => {
    loadCheckoutData();
    fetchAvailableCoupons();
    fetchProductGstRates();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [selectedCartItems]);

  const loadCheckoutData = async () => {
    try {
      setPageLoading(true);
      await Promise.all([
        fetchAddresses(),
        validateCart()
      ]);
    } catch (error) {
      console.error('Error loading checkout data:', error);
      Alert.alert(
        'Error',
        'Failed to load checkout data. Please try again.'
      );
    } finally {
      setPageLoading(false);
    }
  };

  const validateCart = async () => {
    if (!selectedCartItems || selectedCartItems.length === 0) {
      Alert.alert(
        'No Items Selected',
        'Please select items from your cart to proceed.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
      throw new Error('No items selected');
    }

    // Validate each selected cart item has required fields
    const invalidItems = selectedCartItems.filter(
      item => !item.id || !item.price || !item.quantity || !item.name
    );

    if (invalidItems.length > 0) {
      Alert.alert(
        'Error',
        'Some items in your cart are invalid. Please try removing and adding them again.'
      );
      throw new Error('Invalid cart items');
    }
  };

  const fetchAddresses = async () => {
    try {
      const response = await apiService.getAddresses();
      if (Array.isArray(response)) {
        setAddresses(response as Address[]);
        if (response.length > 0) {
          setSelectedAddress(response[0] as Address);
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      throw error;
    }
  };

  const fetchProductGstRates = async () => {
    try {
      const response = await apiService.get('/gst/products');
      if (response.data && Array.isArray(response.data)) {
        const map: Record<number, number> = {};
        response.data.forEach((item: any) => {
          map[Number(item.product_id)] = Number(item.percentage || 0);
        });
        setGstMap(map);
      }
    } catch (error) {
      console.error('Error fetching product GST rates:', error);
      setGstMap({});
    }
  };

  const fetchAvailableCoupons = async () => {
    try {
      const response = await apiService.getCoupons();
      if (response.data) {
        // Filter out inactive coupons and those that have expired
        const validCoupons = response.data.filter((coupon: Coupon) => {
          const isActive = coupon.is_active;
          const hasNotExpired = new Date(coupon.end_date) > new Date();
          return isActive && hasNotExpired;
        });
        setCoupons(validCoupons);
        setAvailableCoupons(validCoupons);
        setFilteredCoupons(validCoupons);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
  };

  const toggleSection = (section: keyof typeof sectionExpanded) => {
    const newValue = !sectionExpanded[section];
    setSectionExpanded(prev => ({ ...prev, [section]: newValue }));

    Animated.timing(fadeAnims[section], {
      toValue: newValue ? 1 : 0,
      duration: 200,
      useNativeDriver: true
    }).start();
  };

  const handleApplyCoupon = async () => {
    try {
      setIsApplyingCoupon(true);
      setCouponError('');
      if (!couponCode) {
        setCouponError('Please enter a coupon code');
        return;
      }

      const response = await apiService.validateCoupon(
        couponCode,
        selectedCartItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: Number(item.price)
        }))
      );

      if (response.error) {
        let errorMessage = response.error
          .replace('POST post error: request error: ', '')
          .replace('POST request error: ', '');

        // Check if it's a minimum purchase error
        if (errorMessage.includes('Minimum purchase amount')) {
          const amount = errorMessage.match(/₹(\d+(\.\d{2})?)/);
          if (amount) {
            errorMessage = `Minimum purchase amount of ${amount[0]} required`;
          }
        }

        setCouponError(errorMessage);
        setAppliedCoupon(null);
        setDiscountAmount(0);
        calculateTotals(0);
        return;
      }

      if (response.data?.valid) {
        const coupon = response.data.coupon;

        // Validate minimum purchase amount
        if (subtotal < coupon.min_purchase_amount) {
          setCouponError(`Minimum purchase amount of ₹${coupon.min_purchase_amount.toFixed(2)} required`);
          setAppliedCoupon(null);
          setDiscountAmount(0);
          calculateTotals(0);
          return;
        }

        setAppliedCoupon(coupon);
        calculateDiscount(coupon);
        Alert.alert('Success', 'Coupon applied successfully!');
      } else {
        setCouponError(response.data?.error || 'Invalid coupon code');
        setAppliedCoupon(null);
        setDiscountAmount(0);
        calculateTotals(0);
      }
    } catch (error: any) {
      console.error('Error applying coupon:', error);
      let errorMessage = error.message || 'Failed to apply coupon';
      errorMessage = errorMessage
        .replace('POST post error: request error: ', '')
        .replace('POST request error: ', '');

      setCouponError(errorMessage);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      calculateTotals(0);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const calculateDiscount = (coupon: Coupon) => {
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount_amount) {
        discount = Math.min(discount, coupon.max_discount_amount);
      }
    } else {
      discount = coupon.discount_value;
    }
    setDiscountAmount(discount);
    calculateTotals(discount);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    calculateTotals(0);
    setCouponCode('');
  };

  const calculateTotals = (discount: number = 0) => {
    if (!selectedCartItems || selectedCartItems.length === 0) return;

    const itemsTotal = selectedCartItems.reduce((sum, item) => {
      // Use combo discounted price if item is from combo, otherwise use normal discounted price
      let finalPrice: number;
      if (item.is_from_combo && item.combo_discounted_price !== undefined) {
        finalPrice = item.combo_discounted_price;
      } else {
        finalPrice = Number(item.price) * (1 - (item.offer_percentage / 100));
      }
      return sum + (finalPrice * item.quantity);
    }, 0);

    setSubtotal(itemsTotal);

    // Calculate subtotal after discount
    const subtotalAfterDiscount = itemsTotal - discount;

    // Calculate GST per product (after discount allocation). Since discount may be coupon-level,
    // we apply GST on finalPrice (already includes product-level offers) without reducing further.
    let gstTotal = 0;
    for (const item of selectedCartItems) {
      const gstPct = gstMap[item.id] || 0;
      // Use same finalPrice logic as above
      let finalPrice: number;
      if (item.is_from_combo && item.combo_discounted_price !== undefined) {
        finalPrice = item.combo_discounted_price;
      } else {
        finalPrice = Number(item.price) * (1 - (item.offer_percentage / 100));
      }
      gstTotal += finalPrice * item.quantity * (gstPct / 100);
    }
    setGstAmount(gstTotal);

    // Calculate delivery charge (₹59 for orders below ₹599, free for ₹599+)
    const delivery = itemsTotal >= 599 ? 0 : 59;
    setDeliveryCharge(delivery);

    // Apply discount, GST, and delivery to get final total
    const finalTotal = subtotalAfterDiscount + gstTotal + delivery;
    setTotal(finalTotal);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (!selectedPayment) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      setLoading(true);

      // Validate stock availability before placing order
      const stockValidation = await Promise.all(
        selectedCartItems.map(async (item) => {
          const response = await apiService.get(`/products/${item.id}`);
          const currentStock = response.data.stock_quantity;

          if (currentStock < item.quantity) {
            throw new Error(`Only ${currentStock} units available for ${item.name}`);
          }
          return true;
        })
      );

      const orderData = {
        shipping_address: {
          address_line1: selectedAddress.address_line1,
          address_line2: selectedAddress.address_line2,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postal_code: selectedAddress.postal_code || selectedAddress.pincode || '',
          country: selectedAddress.country,
          full_name: selectedAddress.full_name,
          phone_number: selectedAddress.phone_number || selectedAddress.phone || '',
        },
        payment_method: selectedPayment.id === 'cod' ? 'cod' : 'online',
        items: selectedCartItems.map(item => {
          // Use combo discounted price if item is from combo, otherwise use normal discounted price
          let effective: number;
          if (item.is_from_combo && item.combo_discounted_price !== undefined) {
            effective = Math.round(item.combo_discounted_price * 100) / 100;
          } else {
            const base = Number(item.price) || 0;
            const offerPct = Number(item.offer_percentage || 0);
            effective = Math.round(base * (1 - (offerPct / 100)) * 100) / 100;
          }
          return {
            product_id: item.id,
            quantity: item.quantity,
            price: effective,
            name: item.name
          };
        }),
        total_amount: total,
        delivery_charge: deliveryCharge,
        coupon_id: appliedCoupon?.id || null,
        discount_amount: discountAmount
      };

      if (selectedPayment.id === 'cod') {
        // Handle COD payment
        const response = await apiService.post('/orders', orderData);

        if (response.data?.order && response.data.order.id) {
          if (!buyNowProduct) {
            await clearCart();
          }

          router.replace({
            pathname: "/orders/[id]",
            params: {
              id: String(response.data.order.id),
              status: 'success',
              totalAmount: total
            }
          });
        } else {
          throw new Error('Invalid order response');
        }
      } else {
        // Handle Razorpay payment
        try {
          const response = await apiService.post('/orders', orderData);
          if (response.error) {
            throw new Error(response.error);
          }
          const { order } = response.data || {};

          if (!order || !order.razorpay_order) {
            throw new Error('Failed to create order');
          }

          const razorpayOrderData = order.razorpay_order;
          setCurrentOrderId(order.id);

          // Configure Razorpay options
          const options: RazorpayOptions = {
            key: razorpayOrderData.key || razorpayOrderData.key_id,
            amount: razorpayOrderData.amount,
            currency: razorpayOrderData.currency,
            name: "Saranga Ayurveda LLP",
            description: `Order #${order.id}`,
            image: "https://sarangaayurveda.com/wp-content/uploads/2021/05/cropped-Saranga-Ayurveda-Logo-1.png",
            order_id: razorpayOrderData.id,
            prefill: {
              name: selectedAddress.full_name,
              contact: selectedAddress.phone || selectedAddress.phone_number || '',
            },
            theme: {
              color: "#2b3a1a"
            }
          };

          setRazorpayOptions(options);
          setShowRazorpay(true);
        } catch (error: any) {
          console.error('Payment initialization error:', error);
          Alert.alert(
            'Payment Error',
            error.message || 'Failed to initialize payment. Please try again.'
          );
        }
      }
    } catch (error: any) {
      console.error('Order creation error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to place your order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      setLoading(true);

      // Verify payment with backend
      const verifyRes = await apiService.post('/razorpay/verify-payment', {
        ...paymentData,
        order_id: currentOrderId
      });

      const actualOrderId = verifyRes.data?.order_id || currentOrderId;

      // Clear cart silently - don't let errors affect the user experience
      try {
        if (!buyNowProduct) {
          await clearCart();
        }
      } catch (error) {
        // Just log the error, don't show it to the user
        console.error('Error clearing cart:', error);
      }

      // Always navigate to success page
      router.replace({
        pathname: "/orders/[id]",
        params: {
          id: String(actualOrderId),
          status: 'success',
          totalAmount: total
        }
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      Alert.alert(
        'Error',
        'Payment verification failed. Please contact support.'
      );
    } finally {
      setShowRazorpay(false);
      setLoading(false);
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    setShowRazorpay(false);
    setCurrentOrderId(null);
    setRazorpayOptions(null);
    Alert.alert(
      'Payment Failed',
      'Your payment was not completed. Please try again or choose a different payment method.'
    );
  };

  const applyCoupon = (coupon: Coupon) => {
    // Validate minimum purchase amount before applying
    if (subtotal < coupon.min_purchase_amount) {
      setCouponError(`Minimum purchase amount of ₹${coupon.min_purchase_amount.toFixed(2)} required`);
      setShowCouponsModal(false);
      return;
    }

    setSelectedCoupon(coupon);
    setCouponCode(coupon.code);
    setAppliedCoupon(coupon);
    calculateDiscount(coupon);
    setShowCouponsModal(false);
  };

  // Filter coupons based on input
  const handleCouponInputChange = (text: string) => {
    setCouponCode(text);
    const filtered = coupons.filter(coupon =>
      coupon.code.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredCoupons(filtered);
  };

  // Update the coupon item render to show minimum purchase amount
  const renderCouponItem = (coupon: Coupon) => (
    <TouchableOpacity
      key={`coupon-${coupon.id}`}
      style={styles.couponItem}
      onPress={() => applyCoupon(coupon)}
    >
      <View style={styles.couponItemHeader}>
        <Text style={styles.couponCode}>{coupon.code}</Text>
        <Text style={styles.couponDiscount}>
          {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
        </Text>
      </View>
      <Text style={styles.couponDescription}>{coupon.description}</Text>
      <Text style={styles.minPurchaseText}>
        Minimum purchase: ₹{coupon.min_purchase_amount.toFixed(2)}
      </Text>
      {coupon.max_discount_amount && (
        <Text style={styles.maxDiscountText}>
          Maximum discount: ₹{coupon.max_discount_amount.toFixed(2)}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (pageLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b3a1a" />
      </SafeAreaView>
    );
  }

  console.log('Selected Address:', selectedAddress);

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf7f4' }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.headerSection, { paddingTop: insets.top > 0 ? insets.top : 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#2b3a1a" />
          </TouchableOpacity>
          <Text style={styles.brandTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView 
            style={{ flex: 1 }} 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ width: '100%', maxWidth: 800, alignSelf: 'center' }}>
            {/* Order Summary Section */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('orderSummary')}
            >
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <Ionicons
                name={sectionExpanded.orderSummary ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#333"
              />
            </TouchableOpacity>
            <Animated.View style={[
              styles.section,
              { opacity: fadeAnims.orderSummary }
            ]}>
              {sectionExpanded.orderSummary && (
                <View style={styles.orderItems}>
                  {selectedCartItems.map((item) => (
                    <View key={`order-item-${item.id}-${item.cartId || Date.now()}`} style={styles.orderItem}>
                      <Image
                        source={{ uri: apiService.getFullImageUrl(item.image_url) }}
                        style={styles.itemImage}
                      />
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
                        <Text style={styles.itemPrice}>
                          ₹{(() => {
                            // Use combo discounted price if item is from combo, otherwise use normal discounted price
                            let finalPrice: number;
                            if (item.is_from_combo && item.combo_discounted_price !== undefined) {
                              finalPrice = item.combo_discounted_price;
                            } else {
                              finalPrice = Number(item.price) * (1 - (item.offer_percentage / 100));
                            }
                            return (finalPrice * item.quantity).toFixed(2);
                          })()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>

            {/* Coupon Section */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('coupons')}
            >
              <Text style={styles.sectionTitle}>Apply Coupon</Text>
              <Ionicons
                name={sectionExpanded.coupons ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#333"
              />
            </TouchableOpacity>
            <Animated.View style={[
              styles.section,
              { opacity: fadeAnims.coupons }
            ]}>
              {sectionExpanded.coupons && (
                <View style={styles.couponContainer}>
                  <View style={styles.couponInputContainer}>
                    <TextInput
                      style={styles.couponInput}
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChangeText={handleCouponInputChange}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[
                        styles.applyCouponButton,
                        (!couponCode.trim() || isApplyingCoupon) && styles.applyCouponButtonDisabled
                      ]}
                      onPress={handleApplyCoupon}
                      disabled={!couponCode.trim() || isApplyingCoupon}
                    >
                      {isApplyingCoupon ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[
                          styles.applyCouponText,
                          !couponCode.trim() && styles.applyCouponTextDisabled
                        ]}>Apply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {couponError ? (
                    <Text style={styles.errorText}>{couponError}</Text>
                  ) : null}
                  {availableCoupons.length > 0 ? (
                    <TouchableOpacity
                      style={styles.viewCouponsButton}
                      onPress={() => setShowCouponsModal(true)}
                    >
                      <Ionicons name="pricetag" size={20} color="#2b3a1a" style={styles.couponIcon} />
                      <Text style={styles.viewCouponsText}>
                        View Available Coupons ({availableCoupons.length})
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noCouponsText}>No coupons available</Text>
                  )}
                  {appliedCoupon && (
                    <View style={styles.appliedCouponContainer}>
                      <View style={styles.appliedCouponInfo}>
                        <View style={styles.appliedCouponDetails}>
                          <Text style={styles.appliedCouponCode}>{appliedCoupon.code}</Text>
                          <Text style={styles.appliedCouponDesc}>{appliedCoupon.description}</Text>
                          <Text style={styles.discountText}>
                            Discount: {appliedCoupon.discount_type === 'percentage'
                              ? `${appliedCoupon.discount_value}%`
                              : `₹${appliedCoupon.discount_value}`}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeCouponButton}
                          onPress={removeCoupon}
                        >
                          <Ionicons name="close-circle" size={24} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Animated.View>

            {/* Delivery Address Section */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('address')}
            >
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <Ionicons
                name={sectionExpanded.address ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#333"
              />
            </TouchableOpacity>
            <Animated.View style={[
              styles.section,
              { opacity: fadeAnims.address }
            ]}>
              {sectionExpanded.address && (
                <View style={styles.addressSection}>
                  {selectedAddress ? (
                    <>
                      <View style={styles.addressCard}>
                        <View style={styles.addressHeader}>
                          <View style={styles.addressType}>
                            <Ionicons name="location" size={20} color="#2b3a1a" />
                            <Text style={styles.addressTypeText}>
                              {selectedAddress.address_type || 'Delivery Address'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.changeAddressButton}
                            onPress={handleChangeAddress}
                          >
                            <Text style={styles.changeAddressText}>Change</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.addressName}>{selectedAddress.full_name}</Text>
                        <Text style={styles.addressText}>
                          {selectedAddress.address_line1}
                          {selectedAddress.address_line2 ? `, ${selectedAddress.address_line2}` : ''}
                        </Text>
                        <Text style={styles.addressText}>
                          {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode || selectedAddress.postal_code || ''}
                        </Text>
                        <Text style={styles.addressPhone}>
                          <Ionicons name="call-outline" size={16} color="#666" /> {selectedAddress.phone || selectedAddress.phone_number || ''}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.addAddressButton}
                      onPress={() => router.push('/profile/addresses/new')}
                    >
                      <View style={styles.addAddressContent}>
                        <Ionicons name="add-circle-outline" size={24} color="#2b3a1a" />
                        <Text style={styles.addAddressText}>Add New Delivery Address</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Animated.View>

            {/* Payment Method */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('payment')}
            >
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <Ionicons
                name={sectionExpanded.payment ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#333"
              />
            </TouchableOpacity>
            <Animated.View style={[
              styles.section,
              { opacity: fadeAnims.payment }
            ]}>
              {sectionExpanded.payment && (
                <View style={styles.paymentMethodsContainer}>
                  {paymentMethods.map((method) => {
                    const isCOD = method.id === 'cod';
                    return (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.paymentMethodCard,
                          selectedPayment?.id === method.id && styles.selectedPaymentCard,
                          isCOD && {
                            backgroundColor: '#fafafa',
                            borderColor: '#eee',
                            opacity: 0.8
                          }
                        ]}
                        onPress={() => !isCOD && setSelectedPayment(method)}
                        disabled={isCOD}
                      >
                        <View style={styles.paymentMethodContent}>
                          <View style={styles.paymentMethodHeader}>
                            <View style={[
                              styles.paymentMethodIconContainer,
                              isCOD && { backgroundColor: '#e0e0e0' }
                            ]}>
                              <Ionicons
                                name={method.id === 'cod' ? 'lock-closed' : 'card'}
                                size={24}
                                color={isCOD ? '#757575' : '#2b3a1a'}
                              />
                            </View>
                            <View style={styles.paymentMethodInfo}>
                              <Text style={[
                                styles.paymentMethodName,
                                selectedPayment?.id === method.id && styles.selectedPaymentText,
                                isCOD && { color: '#757575' }
                              ]}>
                                {method.name}
                              </Text>
                              <Text style={[
                                styles.paymentMethodDescription,
                                selectedPayment?.id === method.id && styles.selectedPaymentText,
                                isCOD && { color: '#9e9e9e' }
                              ]}>
                                {method.id === 'razorpay' ? 'UPI, Cards, NetBanking' : method.description}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.paymentMethodRadio}>
                            {!isCOD && (
                              <View style={[
                                styles.radioOuter,
                                selectedPayment?.id === method.id && styles.radioOuterSelected
                              ]}>
                                {selectedPayment?.id === method.id && (
                                  <View style={styles.radioInner} />
                                )}
                              </View>
                            )}
                            {isCOD && (
                              <Ionicons name="ban" size={20} color="#bdbdbd" />
                            )}
                          </View>
                        </View>
                        {isCOD && (
                          <View style={{
                            backgroundColor: '#fff0f0',
                            marginHorizontal: 16,
                            marginBottom: 16,
                            padding: 12,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: '#ffcdd2'
                          }}>
                            <Ionicons name="information-circle" size={20} color="#e57373" style={{ marginRight: 8 }} />
                            <Text style={{
                              fontSize: 12,
                              color: '#d32f2f',
                              flex: 1,
                              lineHeight: 18,
                              fontFamily: 'CormorantGaramond-Medium'
                            }}>
                              Cash on Delivery is currently unavailable for your PIN code. We’ll be enabling COD soon. Please use prepaid payment options to place your order.
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Animated.View>

            {/* Price Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Details</Text>
              <View style={styles.priceDetails}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Subtotal</Text>
                  <Text style={styles.priceValue}>₹{subtotal.toFixed(2)}</Text>
                </View>
                {appliedCoupon && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Discount</Text>
                    <Text style={[styles.priceValue, styles.discountText]}>
                      -₹{discountAmount.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Subtotal (after discount)</Text>
                  <Text style={styles.priceValue}>
                    ₹{(subtotal - discountAmount).toFixed(2)}
                  </Text>
                </View>
                {gstAmount > 0 && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>GST (per product rates)</Text>
                    <Text style={styles.priceValue}>
                      ₹{gstAmount.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Delivery Charges</Text>
                  <Text style={styles.priceValue}>
                    {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}
                  </Text>
                </View>
                <View style={[styles.priceRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
                </View>
              </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer with Order Total and Place Order Button */}
          <View style={[styles.footer, { paddingBottom: Math.max(16, (insets?.bottom || 0) + 8) }]}>
            <View style={styles.totalContainer}>
              <Text style={styles.footerTotalLabel}>Total: </Text>
              <Text style={styles.footerTotal}>₹{total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.placeOrderButton,
                (!selectedAddress || !selectedPayment) && styles.placeOrderButtonDisabled
              ]}
              onPress={handlePlaceOrder}
              disabled={!selectedAddress || !selectedPayment || loading}
              delayPressIn={0}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.placeOrderText}>Place Order</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.placeOrderIcon} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Available Coupons Modal */}
          <Modal
            visible={showCouponsModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowCouponsModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Available Coupons</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowCouponsModal(false)}
                  >
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={filteredCoupons.length > 0 ? filteredCoupons : coupons}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => renderCouponItem(item)}
                />
              </View>
            </View>
          </Modal>

          {razorpayOptions && (
            <RazorpayWebView
              isVisible={showRazorpay}
              options={razorpayOptions}
              orderId={currentOrderId!}
              onClose={() => setShowRazorpay(false)}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fbf7f4',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  scrollViewContent: {
    padding: 20,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    letterSpacing: 0.3,
    fontFamily: 'CormorantGaramond-Bold',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#694d21',
  },
  changeButtonText: {
    fontSize: 14,
    color: '#694d21',
    fontWeight: '500',
    fontFamily: 'CormorantGaramond-Medium',
  },
  orderItems: {
    marginBottom: 20,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
    fontFamily: 'CormorantGaramond-Bold',
  },
  itemQuantity: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 2,
    fontFamily: 'CormorantGaramond-Medium',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2b3a1a',
    fontFamily: 'CormorantGaramond-Bold',
  },
  couponContainer: {
    marginBottom: 20,
  },
  couponInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 4,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  couponInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 16,
    fontFamily: 'CormorantGaramond-Medium',
  },
  applyCouponButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2b3a1a',
    borderRadius: 10,
    marginLeft: 8,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  applyCouponText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Bold',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'CormorantGaramond-Medium',
  },
  viewCouponsButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewCouponsText: {
    color: '#2b3a1a',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'CormorantGaramond-Bold',
  },
  noCouponsText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    fontFamily: 'CormorantGaramond-Medium',
  },
  appliedCouponContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  appliedCouponInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appliedCouponCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'CormorantGaramond-Bold',
  },
  appliedCouponDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontFamily: 'CormorantGaramond-Medium',
  },
  discountText: {
    fontSize: 14,
    color: '#2b3a1a',
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'CormorantGaramond-Bold',
  },
  removeCouponButton: {
    padding: 4,
  },
  addressSection: {
    marginTop: 8,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressTypeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    fontFamily: 'CormorantGaramond-Medium',
  },
  changeAddressButton: {
    backgroundColor: '#fef5e7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2b3a1a',
  },
  changeAddressText: {
    color: '#2b3a1a',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'CormorantGaramond-Bold',
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    fontFamily: 'CormorantGaramond-Bold',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
    fontFamily: 'CormorantGaramond-Medium',
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    fontFamily: 'CormorantGaramond-Medium',
  },
  addAddressButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2b3a1a',
    borderStyle: 'dashed',
  },
  addAddressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAddressText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2b3a1a',
    fontWeight: '500',
    fontFamily: 'CormorantGaramond-Medium',
  },
  paymentMethodsContainer: {
    padding: 16,
  },
  paymentMethodCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  selectedPaymentCard: {
    backgroundColor: '#fbf7f4',
    borderColor: '#2b3a1a',
    borderWidth: 2.5,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#b89c72',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'CormorantGaramond-Bold',
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'CormorantGaramond-Medium',
  },
  selectedPaymentText: {
    color: '#2b3a1a',
  },
  paymentMethodRadio: {
    marginLeft: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2b3a1a',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioOuterSelected: {
    borderColor: '#2b3a1a',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2b3a1a',
  },
  priceDetails: {
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'CormorantGaramond-Medium',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'CormorantGaramond-Bold',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'CormorantGaramond-Medium',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'CormorantGaramond-Bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'CormorantGaramond-Bold',
  },
  footerTotalLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 4,
    fontFamily: 'CormorantGaramond-Medium',
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#2b3a1a',
    borderRadius: 12,
    minWidth: 160,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    fontFamily: 'CormorantGaramond-Bold',
  },
  placeOrderIcon: {
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    maxHeight: '80%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'CormorantGaramond-Bold',
  },
  closeButton: {
    padding: 8,
  },
  couponItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  couponItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  couponCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'CormorantGaramond-Bold',
  },
  couponDiscount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2b3a1a',
    fontFamily: 'CormorantGaramond-Bold',
  },
  couponDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'CormorantGaramond-Medium',
  },
  minPurchaseText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    fontFamily: 'CormorantGaramond-Medium',
  },
  maxDiscountText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    fontFamily: 'CormorantGaramond-Medium',
  },
  applyCouponButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  applyCouponTextDisabled: {
    color: '#999',
  },
  couponIcon: {
    marginRight: 8,
  },
  appliedCouponDetails: {
    flex: 1,
    marginRight: 16,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
    paddingBottom: 10,
    backgroundColor: '#fbf7f4',
  },
  brandTitle: {
    fontSize: 36,
    color: '#2b3a1a',
    textAlign: 'center',
    fontFamily: 'CormorantGaramond-Bold',
    letterSpacing: 1,
    flex: 1,
    marginRight: 24,
  },
  backButton: {
    padding: 4,
  },
  logosContainer: {
    marginTop: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  logoImage: {
    width: 34,
    height: 22,
    resizeMode: 'contain',
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b89c72',
    paddingHorizontal: 6,
    borderRadius: 4,
    height: 22,
    justifyContent: 'center',
  },
  selectedBankBadge: {
    backgroundColor: '#2b3a1a',
  },
  bankBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'System',
  },
  selectedBankBadgeText: {
    color: '#fff',
  },
});

export default CheckoutPage;