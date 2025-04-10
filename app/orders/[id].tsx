import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrders, Order } from '../OrderContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

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
  
  // Use useEffect to fetch orders if not available
  useEffect(() => {
    console.log('[OrderDetailsPage] Initial load - id:', id);
    console.log('[OrderDetailsPage] Initial orders:', orders);
    fetchOrders();
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
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
              <p>Phone: ${order.shipping_address.phone}</p>
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
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if order is not found
  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => fetchOrders()}
          >
            <Text style={styles.refreshButtonText}>Refresh Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  console.log('[OrderDetailsPage] Order items:', order.items);
  console.log('[OrderDetailsPage] Order items structure:', order.items);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
      <Stack.Screen
        options={{
          title: `Order #${order.id}`,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={handleSupport}
                style={{ padding: 8, marginRight: 8 }}
                hitSlop={HIT_SLOP}
                activeOpacity={ACTIVE_OPACITY}
                delayPressIn={PRESS_DELAY}
              >
                <Ionicons name="help-circle-outline" size={24} color="#007bff" />
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
        <Text style={styles.sectionTitle}>Saranga Ayurveda Order Details</Text>
        {/* Order Status Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>Ordered on {formatDate(order.created_at)}</Text>
        </View>

        {/* Shipping Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.addressCard}>
            <Text style={styles.addressName}>{order.shipping_address.full_name}</Text>
            <Text style={styles.addressText}>{order.shipping_address.address_line1}</Text>
            {order.shipping_address.address_line2 && (
              <Text style={styles.addressText}>{order.shipping_address.address_line2}</Text>
            )}
            <Text style={styles.addressText}>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}</Text>
            <Text style={styles.addressText}>Phone: {order.shipping_address.phone}</Text>
          </View>
        </View>

        {/* Order Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name || 'Product Name Not Available'}</Text>
                {item.variant && (
                  <Text style={styles.itemVariant}>Variant: {item.variant}</Text>
                )}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>₹{item.price_at_time}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <Text style={styles.paymentValue}>
                {order.payment_method_display}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Total Amount</Text>
              <Text style={styles.paymentValue}>₹{order.total_amount}</Text>
            </View>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need Help?</Text>
          <View style={styles.helpButtons}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => router.push('/support/live-chat')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#007bff" />
              <Text style={styles.helpButtonText}>Chat with Us</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => router.push('/support/call')}
            >
              <Ionicons name="call-outline" size={24} color="#007bff" />
              <Text style={styles.helpButtonText}>Call Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT : 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 2,
    lineHeight: 20,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
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
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  paymentCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  helpButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  helpButtonText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336',
    marginBottom: 16,
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