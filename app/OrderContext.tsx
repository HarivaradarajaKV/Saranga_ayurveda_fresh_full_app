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

export type OrderSummary = Omit<Order, 'items'> & {
  itemCount: number;
};

interface OrderContextType {
  orders: OrderSummary[];
  loading: boolean;
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getOrderById: (id: string) => Order | undefined;
  deleteOrder: (orderId: string) => Promise<void>;
  getOrderDetails: (id: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType>({
  orders: [],
  loading: false,
  createOrder: async () => { throw new Error('Not implemented') },
  fetchOrders: async () => { throw new Error('Not implemented') },
  updateOrderStatus: async () => { throw new Error('Not implemented') },
  getOrderById: () => undefined,
  deleteOrder: async () => { throw new Error('Not implemented') },
  getOrderDetails: () => undefined,
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
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const mountedRef = React.useRef(true);
  const fetchInProgressRef = React.useRef(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const orderDetailsRef = React.useRef<Map<string, Order>>(new Map());

  const summarizeOrder = React.useCallback((order: Order): OrderSummary => {
    const { items, ...rest } = order;
    return {
      ...rest,
      itemCount: Array.isArray(items) ? items.length : 0,
    };
  }, []);

  const setOrdersState = React.useCallback((ordersData: Order[]) => {
    const detailsMap = new Map<string, Order>();
    ordersData.forEach(order => {
      detailsMap.set(order.id, order);
    });
    orderDetailsRef.current = detailsMap;
    if (mountedRef.current) {
      setOrders(ordersData.map(summarizeOrder));
    }
  }, [summarizeOrder]);

  const clearOrdersState = React.useCallback(() => {
    orderDetailsRef.current.clear();
    if (mountedRef.current) {
      setOrders([]);
    }
  }, []);

  // Load cached orders on mount
  useEffect(() => {
    mountedRef.current = true;
    loadCachedOrders();
    return () => {
      mountedRef.current = false;
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      fetchInProgressRef.current = false;
    };
  }, []);

  const loadCachedOrders = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(ORDERS_CACHE_KEY);
      if (cachedData) {
        const { orders: cachedOrders, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          if (mountedRef.current) {
            const limitedOrders = Array.isArray(cachedOrders) ? cachedOrders as Order[] : [];
            setOrdersState(limitedOrders);
            setLastFetch(timestamp);
          }
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
    // Prevent multiple simultaneous fetches
    if (fetchInProgressRef.current) {
      console.log('[OrderContext] Fetch already in progress, skipping...');
      return;
    }

    // Return cached orders if they're still valid (within 30 seconds)
    const now = Date.now();
    if (now - lastFetch < 30000 && orders.length > 0 && mountedRef.current) {
      console.log('[OrderContext] Using cached orders');
      return;
    }

    fetchInProgressRef.current = true;

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (mountedRef.current) setLoading(true);
      
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
        if (mountedRef.current) clearOrdersState();
        return;
      }

      // Avoid huge console logs that can cause memory spikes on large payloads
      // Process ALL orders - no limit to ensure all orders from database are loaded
      const ordersToProcess = Array.isArray(response.data) ? response.data : [];

      const processedOrders = ordersToProcess.map((order: RawOrderData) => {
        // Extract shipping address from flattened fields
        const sanitize = (v: any) => {
          if (v === null || v === undefined) return '';
          const s = String(v);
          const lower = s.toLowerCase();
          return (lower === 'null' || lower === 'undefined') ? '' : s;
        };

        const shippingAddress = {
          full_name: sanitize(order.shipping_full_name),
          address_line1: sanitize(order.shipping_address_line1),
          address_line2: sanitize(order.shipping_address_line2),
          city: sanitize(order.shipping_city),
          state: sanitize(order.shipping_state),
          pincode: sanitize((order as any).shipping_postal_code || (order as any).shipping_pincode),
          phone: sanitize(order.shipping_phone_number)
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

      if (mountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setOrdersState(processedOrders);
        setLastFetch(Date.now());
        await saveOrdersToCache(processedOrders);
      }
    } catch (error: any) {
      // Don't log or alert if request was aborted
      if (error?.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        console.log('[OrderContext] Request was cancelled');
        return;
      }
      console.error('Error fetching orders:', error);
      try {
        if (mountedRef.current && !abortControllerRef.current?.signal.aborted) {
          Alert.alert('Error', 'Failed to fetch orders');
        }
      } catch {}
    } finally {
      fetchInProgressRef.current = false;
      if (mountedRef.current) setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const getOrderById = React.useCallback((id: string): Order | undefined => {
    return orderDetailsRef.current.get(id);
  }, []);

  const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
    try {
      if (mountedRef.current) setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await apiService.post('/orders', orderData);
      if (response.data && response.data.order) {
        const newOrder = response.data.order as Order;
        orderDetailsRef.current.set(newOrder.id, newOrder);
        if (mountedRef.current) {
          setOrders(prev => [...prev, summarizeOrder(newOrder)]);
          await saveOrdersToCache(Array.from(orderDetailsRef.current.values()));
        }
        return newOrder;
      }
      throw new Error('Failed to create order');
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      if (mountedRef.current) setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const isAdmin = await AsyncStorage.getItem('is_admin') === 'true';
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const endpoint = isAdmin ? `/admin/orders/${orderId}` : `/orders/${orderId}`;
      const response = await apiService.delete(endpoint);
      
      if (response.data && response.data.success) {
        orderDetailsRef.current.delete(orderId);
        if (mountedRef.current) {
          setOrders(prev => prev.filter(order => order.id !== orderId));
          await saveOrdersToCache(Array.from(orderDetailsRef.current.values()));
        }
        
        // Send notification to user about order deletion
        if (isAdmin) {
          await apiService.post('/notifications', {
            user_id: orderDetailsRef.current.get(orderId)?.user_id,
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
      if (mountedRef.current) setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const response = await apiService.updateOrderStatus(orderId, status);

      if (response.error) {
        try {
          if (mountedRef.current) Alert.alert('Error', response.error);
        } catch {}
        return;
      }

      // Update the local orders state
      if (mountedRef.current) {
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status } : order
          )
        );
        const existing = orderDetailsRef.current.get(orderId);
        if (existing) {
          orderDetailsRef.current.set(orderId, { ...existing, status });
        }
        await saveOrdersToCache(Array.from(orderDetailsRef.current.values()));
      }

      // Show success message
      try {
        if (mountedRef.current) Alert.alert('Success', 'Order status updated successfully');
      } catch {}
    } catch (error) {
      console.error('[OrderContext] Error updating order status:', error);
      try {
        if (mountedRef.current) {
          Alert.alert(
            'Error',
            'Unable to update order status. Please try again later.'
          );
        }
      } catch {}
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
    getOrderDetails: (id: string) => orderDetailsRef.current.get(id),
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