import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { apiService } from './services/api';

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  payment_method: string;
  payment_method_display: string;
  status: OrderStatus;
  shipping_address: {
    full_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  created_at: string;
  updated_at: string;
  discount_amount?: number;
  delivery_charge?: number;
}

interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price_at_time: number;
  variant?: string;
  image_url?: string;
  category?: string;
  description?: string;
  offer_percentage?: number;
}

interface RawOrderData {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_full_name: string;
  shipping_phone_number: string;
  created_at: string;
  updated_at: string;
  subtotal: number;
  delivery_charge?: number;
  discount_amount?: number;
  payment_status: string;
  payment_id?: string;
  razorpay_order_id?: string;
  payment_method: string;
  payment_error?: string;
  payment_signature?: string;
  is_temporary: boolean;
  items: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    price_at_time: number;
    variant?: string;
    image_url?: string;
    category?: string;
    description?: string;
    offer_percentage?: number;
  }>;
  payment_method_display?: string;
}

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getOrderById: (id: string) => Order | undefined;
  deleteOrder: (orderId: string) => Promise<void>;
}

const OrderContext = createContext<OrderContextType>({
  orders: [],
  loading: false,
  createOrder: async () => { throw new Error('Not implemented') },
  fetchOrders: async () => { throw new Error('Not implemented') },
  updateOrderStatus: async () => { throw new Error('Not implemented') },
  getOrderById: () => undefined,
  deleteOrder: async () => { throw new Error('Not implemented') },
});

const ORDERS_CACHE_KEY = 'orders_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

const statusMapping: Record<OrderStatus, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled'
};

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Load cached orders on mount
  useEffect(() => {
    loadCachedOrders();
  }, []);

  const loadCachedOrders = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(ORDERS_CACHE_KEY);
      if (cachedData) {
        const { orders: cachedOrders, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          setOrders(cachedOrders);
          setLastFetch(timestamp);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[OrderContext] Error loading cached orders:', error);
      return false;
    }
  };

  const saveOrdersToCache = async (ordersData: Order[]) => {
    try {
      const cacheData = {
        orders: ordersData,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('[OrderContext] Error saving orders to cache:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Get auth data
      const [token, userRole] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('user_role')
      ]);
      
      const isAdmin = userRole === 'admin';
      
      if (!token) {
        throw new Error('Authentication required');
      }

      // Use different endpoint for admin
      const endpoint = isAdmin ? apiService.ENDPOINTS.ADMIN_ORDERS : apiService.ENDPOINTS.ORDERS;
      const response = await apiService.get(endpoint);
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        console.warn('[OrderContext] No orders data received');
        setOrders([]);
        return;
      }

      console.log('[OrderContext] Orders data received:', response.data);

      const processedOrders = response.data.map((order: RawOrderData) => {
        // Extract shipping address from flattened fields
        const shippingAddress = {
          full_name: order.shipping_full_name,
          address_line1: order.shipping_address_line1,
          address_line2: order.shipping_address_line2,
          city: order.shipping_city,
          state: order.shipping_state,
          pincode: order.shipping_postal_code,
          phone: order.shipping_phone_number
        };

        // Ensure status is lowercase and valid
        const normalizedStatus = order.status?.toLowerCase() || 'pending';
        const validStatus = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(normalizedStatus) 
          ? normalizedStatus 
          : 'pending';

        // Use the payment_method_display from backend
        const paymentMethodDisplay = order.payment_method_display || 
          (order.payment_method?.toLowerCase() === 'cod' ? 'Cash on Delivery' : 'Online Payment');

        return {
          id: order.id.toString(),
          user_id: order.user_id.toString(),
          items: order.items || [],
          total_amount: Number(order.total_amount) || 0,
          payment_method: order.payment_method?.toLowerCase() || 'online',
          payment_method_display: paymentMethodDisplay,
          status: validStatus as OrderStatus,
          shipping_address: shippingAddress,
          created_at: order.created_at || new Date().toISOString(),
          updated_at: order.updated_at || new Date().toISOString(),
          discount_amount: Number(order.discount_amount) || 0,
          delivery_charge: Number(order.delivery_charge) || 0
        };
      });

      setOrders(processedOrders);
      await saveOrdersToCache(processedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getOrderById = (id: string): Order | undefined => {
    return orders.find(order => order.id === id);
  };

  const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await apiService.post('/orders', orderData);
      if (response.data && response.data.order) {
        const newOrder = response.data.order;
        const updatedOrders = [...orders, newOrder];
        setOrders(updatedOrders);
        await saveOrdersToCache(updatedOrders);
        return newOrder;
      }
      throw new Error('Failed to create order');
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const isAdmin = await AsyncStorage.getItem('is_admin') === 'true';
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const endpoint = isAdmin ? `/admin/orders/${orderId}` : `/orders/${orderId}`;
      const response = await apiService.delete(endpoint);
      
      if (response.data && response.data.success) {
        const updatedOrders = orders.filter(order => order.id !== orderId);
        setOrders(updatedOrders);
        await saveOrdersToCache(updatedOrders);
        
        // Send notification to user about order deletion
        if (isAdmin) {
          await apiService.post('/notifications', {
            user_id: orders.find(o => o.id === orderId)?.user_id,
            title: 'Order Cancelled',
            message: `Your order #${orderId} has been cancelled by the administrator.`,
            type: 'ORDER_DELETED'
          });
        }
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const response = await apiService.updateOrderStatus(orderId, status);

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      // Update the local orders state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status } : order
        )
      );

      // Show success message
      Alert.alert('Success', 'Order status updated successfully');
    } catch (error) {
      console.error('[OrderContext] Error updating order status:', error);
      Alert.alert(
        'Error',
        'Unable to update order status. Please try again later.'
      );
    }
  };

  const transformOrder = (rawOrder: RawOrderData): Order => {
    try {
      // Create shipping address object from raw order data
      const shippingAddress = {
        full_name: rawOrder.shipping_full_name,
        address_line1: rawOrder.shipping_address_line1,
        address_line2: rawOrder.shipping_address_line2,
        city: rawOrder.shipping_city,
        state: rawOrder.shipping_state,
        pincode: rawOrder.shipping_postal_code,
        phone: rawOrder.shipping_phone_number
      };

      // Transform the order items
      const transformedItems = rawOrder.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price_at_time: item.price_at_time,
        variant: item.variant,
        image_url: item.image_url,
        category: item.category,
        description: item.description,
        offer_percentage: item.offer_percentage
      }));

      // Use the payment_method_display from backend
      const paymentMethodDisplay = rawOrder.payment_method_display || 
        (rawOrder.payment_method?.toLowerCase() === 'cod' ? 'Cash on Delivery' : 'Online Payment');

      // Transform the order
      return {
        id: rawOrder.id.toString(),
        user_id: rawOrder.user_id.toString(),
        items: transformedItems,
        total_amount: Number(rawOrder.total_amount) || 0,
        payment_method: rawOrder.payment_method?.toLowerCase() || 'online',
        payment_method_display: paymentMethodDisplay,
        status: (rawOrder.status?.toLowerCase() || 'pending') as OrderStatus,
        shipping_address: shippingAddress,
        created_at: rawOrder.created_at,
        updated_at: rawOrder.updated_at,
        discount_amount: rawOrder.discount_amount,
        delivery_charge: rawOrder.delivery_charge
      };
    } catch (error) {
      console.error('Error transforming order:', error);
      throw error;
    }
  };

  const value = {
    orders: orders || [],
    loading,
    createOrder,
    fetchOrders,
    updateOrderStatus,
    getOrderById,
    deleteOrder,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}; 