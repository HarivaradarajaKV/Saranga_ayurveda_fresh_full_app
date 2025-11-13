import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrders, Order, OrderSummary } from '../../OrderContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateInvoice } from '../../components/OrderInvoice';

interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price_at_time: number;
  variant?: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const { orders: orderSummaries, loading, fetchOrders, getOrderDetails } = useOrders();

  // Add initial fetch and debug logging
  useEffect(() => {
    const initOrders = async () => {
      await checkAuthAndOrders();
    };
    initOrders();
  }, []);

  // Add debug logging for orders changes
  useEffect(() => {
    console.log('[OrdersPage] Orders updated:', orderSummaries);
  }, [orderSummaries]);

  const checkAuthAndOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('[OrdersPage] Auth token exists:', !!token);
      console.log('[OrdersPage] Current orders:', orderSummaries);
      
      if (!token) {
        Alert.alert(
          'Authentication Required',
          'Please log in to view your orders',
          [
            {
              text: 'Login',
              onPress: () => router.push('/auth/login')
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return;
      }
      
      await fetchOrders();
    } catch (error) {
      console.error('[OrdersPage] Error checking auth and orders:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return '#4CAF50';
      case 'shipped':
        return '#2196F3';
      case 'processing':
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    // Convert UTC to IST (IST is UTC+5:30)
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + ISTOffset);
    
    // Format date in IST
    const day = istDate.getUTCDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[istDate.getUTCMonth()];
    const year = istDate.getUTCFullYear();
    const hours = istDate.getUTCHours();
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    const formattedDate = `${day} ${month}, ${year}`;
    const formattedTime = `${displayHours}:${minutes} ${ampm}`;

    if (diffMinutes < 60) {
      return {
        relative: `${diffMinutes} minutes ago`,
        full: `${formattedDate} at ${formattedTime}`,
      };
    } else if (diffHours < 24) {
      return {
        relative: `${diffHours} hours ago`,
        full: `${formattedDate} at ${formattedTime}`,
      };
    } else if (diffDays < 7) {
      return {
        relative: `${diffDays} days ago`,
        full: `${formattedDate} at ${formattedTime}`,
      };
    } else {
      return {
        relative: formattedDate,
        full: `${formattedDate} at ${formattedTime}`,
      };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!orderSummaries || orderSummaries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bag-outline" size={64} color="#666" />
        <Text style={styles.emptyText}>No orders found</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.shopButtonText}>Start Shopping</Text>
        </TouchableOpacity>
        
        {/* Debug button */}
        <TouchableOpacity
          style={[styles.shopButton, { marginTop: 20, backgroundColor: '#666' }]}
          onPress={checkAuthAndOrders}
        >
          <Text style={styles.shopButtonText}>Refresh Orders</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'My Orders',
          headerRight: () => (
            <TouchableOpacity
              onPress={checkAuthAndOrders}
              style={{ marginRight: 15 }}
            >
              <Ionicons name="refresh-outline" size={24} color="#007bff" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            colors={['#007bff']}
          />
        }
      >
        {(Array.isArray(orderSummaries) ? orderSummaries : []).map((orderSummary: OrderSummary) => {
          if (!orderSummary) return null;
          const detail = typeof getOrderDetails === 'function' ? getOrderDetails(orderSummary.id) : undefined;
          const { itemCount: _itemCount, ...summaryRest } = orderSummary;
          const fallbackOrder: Order = {
            ...summaryRest,
            items: (detail && detail.items) ? detail.items : [],
          };
          const order = detail ?? fallbackOrder;
          const orderDate = formatDate(orderSummary.created_at);
          return (
            <TouchableOpacity
              key={order.id || Math.random().toString()}
              style={styles.orderCard}
              onPress={() => router.push({
                pathname: '/orders/[id]',
                params: { id: order.id }
              })}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  <Text style={styles.orderDate}>{orderDate.relative}</Text>
                  <Text style={styles.orderFullDate}>{orderDate.full}</Text>
                </View>
                <View style={styles.orderStatus}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(order.status) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(order.status) },
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
              </View>

              <View style={styles.itemsContainer}>
                {Array.isArray(order.items) ? order.items.map((item: OrderItem) => (
                  <View key={item.product_id} style={styles.itemRow}>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.itemPrice}>₹{item.price_at_time}</Text>
                  </View>
                )) : (
                  <Text style={styles.noDataText}>No items available</Text>
                )}
              </View>

              <View style={styles.orderFooter}>
                <View style={styles.footerLeft}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  {(() => {
                    const itemsSubtotal = (order.items || []).reduce((sum, it) => sum + Number(it.price_at_time || 0) * Number(it.quantity || 0), 0);
                    const discount = Number(order.discount_amount || 0);
                    const delivery = Number(order.delivery_charge || 0);
                    const payable = itemsSubtotal - discount + delivery;
                    return <Text style={styles.totalAmount}>₹{payable.toFixed(2)}</Text>;
                  })()}
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      // Call the generateInvoice function
                      generateInvoice(order);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={20} color="#007bff" />
                    <Text style={styles.actionButtonText}>Invoice</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push('/support/live-chat')}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="#007bff" />
                    <Text style={styles.actionButtonText}>Help</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  shopButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '80%',
    maxWidth: 280,
    alignItems: 'center',
    marginVertical: 8,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  orderFullDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
    minWidth: 60,
    textAlign: 'right',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 11,
    color: '#007bff',
    marginLeft: 3,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
}); 