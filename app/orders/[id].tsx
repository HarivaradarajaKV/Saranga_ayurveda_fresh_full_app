import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
  SafeAreaView,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrders, Order } from '../OrderContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { LinearGradient } from 'expo-linear-gradient';

// Add OrderItem interface
interface OrderItem {
  product_id: number;
  quantity: number;
  price_at_time: number;
  product_name: string;
  variant?: string;
  image_url?: string;
  category?: string;
  description?: string;
  offer_percentage?: number;
}

// Extended shipping address interface to include phone_number
interface ShippingAddress {
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  phone_number?: string;
}

// Constants moved outside component to prevent recreation
const { width, height } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - (CARD_MARGIN * 4)) / 2;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
const ACTIVE_OPACITY = 0.7;
const PRESS_DELAY = 150;
const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

// Mock order status steps
const orderSteps = [
  { id: 1, title: 'Order Placed', date: '15 Mar, 2024', completed: true },
  { id: 2, title: 'Packed', date: '16 Mar, 2024', completed: true },
  { id: 3, title: 'Shipped', date: '16 Mar, 2024', completed: true },
  { id: 4, title: 'Out for Delivery', date: '18 Mar, 2024', completed: false },
  { id: 5, title: 'Delivered', date: 'Expected by 18 Mar', completed: false },
];

// Mock order data
const orderData = {
  orderId: 'OD123456789',
  orderDate: '15 Mar, 2024',
  totalAmount: 4999,
  paymentMethod: 'UPI - Google Pay',
  deliveryAddress: {
    name: 'John Doe',
    address: '123, Sample Street, Sample Area',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    phone: '9876543210',
  },
  items: [
    {
      id: 1,
      name: 'Rose Glow Facial Cream',
      brand: 'Brand Name',
      variant: '50ml',
      price: 3499,
      originalPrice: 3999,
      quantity: 1,
      image: 'https://picsum.photos/200?random=1',
      returnable: true,
    },
    {
      id: 2,
      name: 'Vitamin C Serum',
      brand: 'Brand Name',
      variant: '30ml',
      price: 1500,
      originalPrice: 1799,
      quantity: 1,
      image: 'https://picsum.photos/200?random=2',
      returnable: true,
    },
  ],
  recommendations: [
    {
      id: 3,
      name: 'Hydrating Toner',
      price: 1999,
      originalPrice: 2499,
      image: 'https://picsum.photos/200?random=3',
    },
    {
      id: 4,
      name: 'Night Cream',
      price: 2999,
      originalPrice: 3499,
      image: 'https://picsum.photos/200?random=4',
    },
  ],
};

export default function OrderDetailsPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { orders, loading, fetchOrders } = useOrders();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Use useEffect to fetch orders if not available
  useEffect(() => {
    console.log('[OrderDetailsPage] Initial load - id:', id);
    console.log('[OrderDetailsPage] Initial orders:', orders);
    
    const loadData = async () => {
      await fetchOrders();
      setIsInitialLoading(false);
    };
    
    loadData();
    
    // Start animations
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

  // Use useMemo to prevent unnecessary recalculations
  const order = useMemo(() => {
    console.log('[OrderDetailsPage] Finding order with id:', id);
    console.log('[OrderDetailsPage] Available orders:', orders);
    console.log('[OrderDetailsPage] ID type:', typeof id);
    
    // Handle both string and object params
    const orderId = typeof id === 'object' ? id.toString() : String(id);
    return orders.find(o => String(o.id) === orderId);
  }, [id, orders]);

  // Add debug logging for order changes
  useEffect(() => {
    if (order) {
      console.log('[OrderDetailsPage] Order found:', order);
    } else {
      console.log('[OrderDetailsPage] Order not found for id:', id);
      console.log('[OrderDetailsPage] Available order IDs:', orders.map(o => o.id));
    }
  }, [order, id]);

  // Memoized format date function
  const formatDate = useMemo(() => (dateString: string) => {
    const date = new Date(dateString);
    
    // Convert UTC to IST (IST is UTC+5:30)
    const ISTOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istDate = new Date(date.getTime() + ISTOffset);
    
    // Format date in IST
    const day = istDate.getUTCDate();
    const month = istDate.toLocaleString('en-IN', { month: 'short' });
    const year = istDate.getUTCFullYear();
    const hours = String(istDate.getUTCHours()).padStart(2, '0');
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
    
    return `${day} ${month}, ${year}, ${hours}:${minutes}`;
  }, []);

  // Memoized status color function
  const getStatusColor = useMemo(() => (status: string) => {
    const statusColors: { [key: string]: string } = {
      delivered: '#4CAF50',
      shipped: '#2196F3',
      confirmed: '#FF9800',
      pending: '#FFC107',
      cancelled: '#f44336'
    };
    return statusColors[status.toLowerCase()] || '#666';
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my order #${id} from our cosmetics store!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSupport = () => {
    router.push('/support/live-chat');
  };

  const generateInvoice = async (order: Order) => {
    try {
      // Ensure all numeric values are properly converted and defaulted
      const discountAmount = Number(order.discount_amount || 0);
      const deliveryCharge = Number(order.delivery_charge || 0);
      const totalAmount = Number(order.total_amount || 0);

      const formatPrice = (price: number) => `₹${price.toFixed(2)}`;

      const invoiceContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .header { text-align: center; }
              .section { margin: 20px 0; }
              .item { margin: 10px 0; }
              .total { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Invoice</h1>
              <h2>Order #${order.id}</h2>
            </div>
            <div class="section">
              <h3>Shipping Address</h3>
              <p>${order.shipping_address.full_name}</p>
              <p>${order.shipping_address.address_line1}</p>
              <p>${order.shipping_address.city}, ${order.shipping_address.state} - ${order.shipping_address.pincode || ''}</p>
              <p>Phone: ${order.shipping_address.phone || (order.shipping_address as any)?.phone_number || (order as any)?.shipping_phone_number || 'N/A'}</p>
            </div>
            <div class="section">
              <h3>Order Details</h3>
              ${order.items.map(item => `
                <div class="item">
                  <p>${item.product_name} - Qty: ${item.quantity} - Price: ${formatPrice(Number(item.price_at_time))}</p>
                </div>
              `).join('')}
            </div>
            <div class="section">
              <h3>Price Details</h3>
              <p>Subtotal: ${formatPrice(totalAmount)}</p>
              ${discountAmount > 0 ? `<p>Discount: -${formatPrice(discountAmount)}</p>` : ''}
              <p>Delivery Charges: ${formatPrice(deliveryCharge)}</p>
              <p class="total">Total Amount: ${formatPrice(totalAmount - discountAmount + deliveryCharge)}</p>
            </div>
          </body>
        </html>
      `;

      const options = {
        html: invoiceContent,
        fileName: `invoice_${order.id}`,
        directory: 'Documents',
      };

      console.log('[generateInvoice] Generating PDF with options:', options);
      const file = await RNHTMLtoPDF.convert(options);

      console.log('[generateInvoice] PDF generated at:', file.filePath);
      if (file.filePath) {
        await Sharing.shareAsync(file.filePath, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download Invoice',
        });
      } else {
        Alert.alert('Error', 'Failed to generate PDF file path');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      Alert.alert('Error', 'Failed to generate invoice');
    }
  };

  // Show loading state while data is being fetched
  if (isInitialLoading || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#694d21" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if order is not found
  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
          <Text style={styles.errorText}>Order not found</Text>
          <Text style={styles.errorSubtext}>Order ID: {id}</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={async () => {
              await fetchOrders();
              setRetryCount(retryCount + 1);
            }}
          >
            <Text style={styles.refreshButtonText}>Refresh Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  console.log('[OrderDetailsPage] Order items:', order.items);
  console.log('[OrderDetailsPage] Order items structure:', order.items);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#f8f6f0" barStyle="dark-content" />
        <Stack.Screen
          options={{
            title: `Order #${order.id}`,
            headerStyle: {
              backgroundColor: '#f8f6f0',
            },
            headerTintColor: '#694d21',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 20,
            },
            headerShadowVisible: true,
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  onPress={handleSupport}
                  style={{ padding: 8, marginRight: 8 }}
                  hitSlop={HIT_SLOP}
                  activeOpacity={ACTIVE_OPACITY}
                  delayPressIn={PRESS_DELAY}
                >
                  <Ionicons name="help-circle-outline" size={24} color="#694d21" />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <ScrollView 
          style={styles.container} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
          removeClippedSubviews={true}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
          >
            <Text style={styles.mainTitle}>Saranga Ayurveda</Text>
            <Text style={styles.subTitle}>Order Details</Text>
          </Animated.View>
        {/* Order Status Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.titleContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#694d21" style={styles.icon} />
              <Text style={styles.sectionTitle}>Order Status</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>Ordered on {formatDate(order.created_at)}</Text>
        </Animated.View>

        {/* Shipping Address Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.titleContainer}>
            <Ionicons name="location" size={22} color="#694d21" style={styles.icon} />
            <Text style={styles.sectionTitle}>Shipping Address</Text>
          </View>
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Ionicons name="person" size={18} color="#694d21" />
              <Text style={styles.addressName}>{order.shipping_address.full_name}</Text>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="home" size={16} color="#666" />
              <Text style={styles.addressText}>{order.shipping_address.address_line1}</Text>
            </View>
            {order.shipping_address.address_line2 && (
              <View style={styles.addressRow}>
                <Ionicons name="map" size={16} color="#666" />
                <Text style={styles.addressText}>{order.shipping_address.address_line2}</Text>
              </View>
            )}
            <View style={styles.addressRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.addressText}>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}</Text>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="call" size={16} color="#666" />
              <Text style={styles.addressText}>
                {order.shipping_address?.phone || 
                 (order.shipping_address as any)?.phone_number || 
                 (order as any)?.shipping_phone_number || 
                 'N/A'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Order Items Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.titleContainer}>
            <Ionicons name="cube" size={22} color="#694d21" style={styles.icon} />
            <Text style={styles.sectionTitle}>Order Items</Text>
          </View>
          {order.items.map((item, index) => (
            <Animated.View 
              key={index} 
              style={[
                styles.itemCard,
                {
                  opacity: fadeAnim,
                  transform: [{ 
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 0]
                    })
                  }]
                }
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name || 'Product Name Not Available'}</Text>
                {item.variant && (
                  <Text style={styles.itemVariant}>Variant: {item.variant}</Text>
                )}
                <View style={styles.itemDetails}>
                  <View style={styles.quantityBadge}>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>₹{item.price_at_time}</Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Payment Details Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.titleContainer}>
            <Ionicons name="card" size={22} color="#694d21" style={styles.icon} />
            <Text style={styles.sectionTitle}>Payment Details</Text>
          </View>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentLeft}>
                <Ionicons name="wallet" size={18} color="#694d21" />
                <Text style={styles.paymentLabel}>Payment Method</Text>
              </View>
              <Text style={styles.paymentValue}>
                {order.payment_method_display}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.paymentRow}>
              <View style={styles.paymentLeft}>
                <Ionicons name="cash" size={18} color="#694d21" />
                <Text style={styles.paymentLabel}>Total Amount</Text>
              </View>
              <Text style={[styles.paymentValue, styles.totalAmount]}>₹{order.total_amount}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Help Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.titleContainer}>
            <Ionicons name="help-buoy" size={22} color="#694d21" style={styles.icon} />
            <Text style={styles.sectionTitle}>Need Help?</Text>
          </View>
          <View style={styles.helpButtons}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => router.push('/support/live-chat')}
            >
              <LinearGradient
                colors={['#694d21', '#5a3f1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.helpButtonGradient}
              >
                <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
                <Text style={styles.helpButtonText}>Chat with Us</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => router.push('/support/call')}
            >
              <LinearGradient
                colors={['#694d21', '#5a3f1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.helpButtonGradient}
              >
                <Ionicons name="call" size={24} color="#fff" />
                <Text style={styles.helpButtonText}>Call Support</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT : 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    paddingTop: 16,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#694d21',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  icon: {
    marginRight: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  addressCard: {
    padding: 16,
    backgroundColor: '#f8f6f0',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e5e1',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  addressText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    lineHeight: 22,
    flex: 1,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f8f6f0',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  itemVariant: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityBadge: {
    backgroundColor: '#694d21',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#694d21',
  },
  paymentCard: {
    backgroundColor: '#f8f6f0',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8e5e1',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentLabel: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#694d21',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  helpButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  helpButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 4,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  helpButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 10,
  },
  helpButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#694d21',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#694d21',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 12,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
}); 