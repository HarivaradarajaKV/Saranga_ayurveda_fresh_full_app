import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  ViewStyle,
  TextStyle,
  Platform,
  SafeAreaView,
  Modal,
  ScrollView,
} from 'react-native';
import { useOrders } from '../OrderContext';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
// Removed date-fns format import to reduce bundle size and computation
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { API_CONFIG, getBaseUrl, ENDPOINTS } from '../config/api';
import { Order, OrderStatus } from '../OrderContext';
import { ErrorBoundary } from '../ErrorBoundary';

const { width } = Dimensions.get('window');

interface Styles {
  safeArea: ViewStyle;
  container: ViewStyle;
  filterSection: ViewStyle;
  filterLabel: TextStyle;
  pickerContainer: ViewStyle;
  picker: TextStyle;
  ordersList: ViewStyle;
  scrollContent: ViewStyle;
  loadingContainer: ViewStyle;
  noOrders: TextStyle;
  orderCard: ViewStyle;
  orderHeader: ViewStyle;
  orderHeaderLeft: ViewStyle;
  orderTopRow: ViewStyle;
  orderId: TextStyle;
  orderDate: TextStyle;
  statusBadge: ViewStyle;
  statusText: TextStyle;
  orderDetails: ViewStyle;
  section: ViewStyle;
  sectionTitle: TextStyle;
  customerInfo: ViewStyle;
  infoRow: ViewStyle;
  infoLabel: TextStyle;
  infoValue: TextStyle;
  itemsContainer: ViewStyle;
  orderItem: ViewStyle;
  itemDetails: ViewStyle;
  itemName: TextStyle;
  itemQuantity: TextStyle;
  itemPrice: TextStyle;
  summaryContainer: ViewStyle;
  summaryRow: ViewStyle;
  summaryLabel: TextStyle;
  summaryValue: TextStyle;
  discountText: TextStyle;
  totalRow: ViewStyle;
  totalLabel: TextStyle;
  totalValue: TextStyle;
}

type OrderSummary = Order;

const AdminOrdersInner = () => {
  let ordersContext;
  try {
    ordersContext = useOrders();
  } catch (error) {
    console.error('Error accessing OrderContext:', error);
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#ff4444', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
            Error loading orders. Please try again.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#0066cc', padding: 12, borderRadius: 8 }}
            onPress={() => {
              // Force reload by navigating away and back
              if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
              }
            }}
          >
            <Text style={{ color: '#fff', textAlign: 'center' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { 
    orders: orderSummaries = [], 
    loading = false, 
    fetchOrders, 
    updateOrderStatus,
    getOrderById,
  } = ordersContext || {};
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(20); // Show 20 orders initially
  const [canRender, setCanRender] = useState(false); // Defer rendering to prevent crashes
  const [loadingMore, setLoadingMore] = useState(false); // Track if we're loading more orders
  const mountedRef = React.useRef(true);
  const fetchInProgressRef = React.useRef(false);
  const lastFetchTimeRef = React.useRef(0);
  const fetchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreInProgressRef = React.useRef(false); // Prevent multiple simultaneous loadMore calls

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear any pending fetches
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
        loadMoreTimeoutRef.current = null;
      }
      fetchInProgressRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    setCanRender(true);

    if ((!orderSummaries || orderSummaries.length === 0) && typeof fetchOrders === 'function') {
      fetchOrders().catch((error: any) => {
        console.error('Error fetching orders on mount:', error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildOrderDetails = React.useCallback((summary: OrderSummary): Order | null => {
    if (!summary || !summary.id) return null;
    try {
      const detail = typeof getOrderById === 'function' ? getOrderById(String(summary.id)) : undefined;
      if (detail) return detail;

      const shipping = summary.shipping_address || {
        full_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
      };

      return {
        ...summary,
        id: String(summary.id),
        items: Array.isArray((summary as any).items) ? [...(summary as any).items] : [],
        shipping_address: shipping,
        payment_method: summary.payment_method || 'online',
        payment_method_display: summary.payment_method_display || (summary.payment_method?.toLowerCase() === 'cod' ? 'Cash on Delivery' : 'Online Payment'),
        discount_amount: Number(summary.discount_amount || 0),
        delivery_charge: Number(summary.delivery_charge || 0),
        total_amount: Number(summary.total_amount || 0),
      } as Order;
    } catch (error) {
      console.error('Error hydrating order summary:', error);
      return null;
    }
  }, [getOrderById]);

  const onRefresh = React.useCallback(async () => {
    if (!mountedRef.current || !fetchOrders || typeof fetchOrders !== 'function') return;
    if (fetchInProgressRef.current) {
      // If a fetch is already in progress, just update the refreshing state
      setRefreshing(false);
      return;
    }
    
    fetchInProgressRef.current = true;
    lastFetchTimeRef.current = Date.now();
    if (mountedRef.current) setRefreshing(true);
    
    try {
      await fetchOrders();
      // Reset visible count on refresh to show initial batch
      if (mountedRef.current) {
        setVisibleCount(20);
        loadMoreInProgressRef.current = false;
        setLoadingMore(false);
      }
    } catch (error) {
      console.error('Error refreshing orders:', error);
    } finally {
      fetchInProgressRef.current = false;
      if (mountedRef.current) setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove fetchOrders dependency to prevent recreation

  const filteredOrders = React.useMemo(() => {
    try {
      if (!Array.isArray(orderSummaries)) return [];
      const filtered = selectedStatus === 'all'
        ? orderSummaries
        : orderSummaries.filter(order => order && order.status === selectedStatus);
      return filtered || [];
    } catch (error) {
      console.error('Error filtering orders:', error);
      return [];
    }
  }, [orderSummaries, selectedStatus]);
  
  const visibleOrders = React.useMemo(() => {
    try {
      if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) return [];
      if (visibleCount <= 0) return [];
      return filteredOrders.slice(0, Math.min(visibleCount, filteredOrders.length));
    } catch (error) {
      console.error('Error creating visible orders:', error);
      return [];
    }
  }, [filteredOrders, visibleCount]);
  
  // Update visible count when filtered orders change
  useEffect(() => {
    if (!mountedRef.current) return;
    
    try {
      if (!mountedRef.current) return;
      setVisibleCount((prevCount) => {
        const safeLength = Array.isArray(filteredOrders) ? filteredOrders.length : 0;
        
        if (safeLength > 0) {
          // If we have more orders available, ensure we show at least 20
          if (prevCount < 20) {
            return Math.min(20, safeLength);
          }
          // If visibleCount exceeds available orders, adjust it
          if (prevCount > safeLength) {
            return safeLength;
          }
          return prevCount;
        } else {
          // Reset if no filtered orders
          return 20;
        }
      });
    } catch (error) {
      console.error('Error updating visible count:', error);
    }
  }, [filteredOrders.length]);
  
  const loadMore = React.useCallback(() => {
    if (!mountedRef.current || loadMoreInProgressRef.current) return;
    
    try {
      const totalAvailable = Array.isArray(filteredOrders) ? filteredOrders.length : 0;
      if (totalAvailable === 0) return;
      
      // Check if there are more orders to load using current visibleCount
      setVisibleCount((prevCount) => {
        // Check if there are more orders to load
        if (prevCount >= totalAvailable) {
          return prevCount; // Already showing all orders
        }
        
        // Load 20 more orders at a time for better performance
        const increment = 20;
        const next = Math.min(prevCount + increment, totalAvailable);
        
        // If we're close to the end (within 20 orders), just show all remaining
        if (totalAvailable - prevCount <= increment) {
          return totalAvailable;
        }
        return next;
      });
      
      // Set loading state outside of setState callback
      loadMoreInProgressRef.current = true;
      if (mountedRef.current) setLoadingMore(true);
      
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
      loadMoreTimeoutRef.current = setTimeout(() => {
        loadMoreInProgressRef.current = false;
        if (mountedRef.current) setLoadingMore(false);
        loadMoreTimeoutRef.current = null;
      }, 200);
    } catch (error) {
      console.error('Error in loadMore:', error);
      loadMoreInProgressRef.current = false;
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [filteredOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    if (!mountedRef.current || !updateOrderStatus || typeof updateOrderStatus !== 'function') return;
    if (!orderId || !newStatus) return;
    
    try {
      await updateOrderStatus(orderId, newStatus);
      // Refresh orders after status update
      if (mountedRef.current && fetchOrders && typeof fetchOrders === 'function') {
        setTimeout(() => {
          if (mountedRef.current) {
            fetchOrders().catch((error: any) => {
              console.error('Error refreshing after status update:', error);
            });
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const toYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const buildExportUrl = () => {
    const base = getBaseUrl();
    const params: string[] = [];
    if (startDate) params.push(`start=${encodeURIComponent(toYMD(startDate))}`);
    if (endDate) params.push(`end=${encodeURIComponent(toYMD(endDate))}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return `${base}${ENDPOINTS.ADMIN_ORDERS_EXPORT}${qs}`;
  };

  const downloadPdf = async () => {
    try {
      if (mountedRef.current) setDownloading(true);
      const url = buildExportUrl();
      const token = await AsyncStorage.getItem('auth_token');

      if (Platform.OS === 'web') {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/pdf' } : { Accept: 'application/pdf' }
        });
        if (!res.ok) throw new Error('Failed to download');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `orders_${startDate ? toYMD(startDate) : 'all'}_${endDate ? toYMD(endDate) : 'all'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      } else {
        const baseDir = FileSystemLegacy.documentDirectory || FileSystemLegacy.cacheDirectory;
        if (!baseDir) throw new Error('No writable directory available');
        const downloadsDir = `${baseDir}downloads/`;
        const dirInfo = await FileSystemLegacy.getInfoAsync(downloadsDir);
        if (!dirInfo.exists) {
          await FileSystemLegacy.makeDirectoryAsync(downloadsDir, { intermediates: true });
        }
        const fileUri = `${downloadsDir}orders_${startDate ? toYMD(startDate) : 'all'}_${endDate ? toYMD(endDate) : 'all'}.pdf`;
        const headers: Record<string, string> = { Accept: 'application/pdf' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const downloadResumable = FileSystemLegacy.createDownloadResumable(
          url,
          fileUri,
          { headers }
        );
        const result = await downloadResumable.downloadAsync();
        const savedUri = result?.uri || fileUri;
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(savedUri);
        } else {
          await Linking.openURL(savedUri);
        }
      }
    } catch (e) {
      console.error('Download PDF error:', e);
    } finally {
      if (mountedRef.current) setDownloading(false);
    }
  };

  // REMOVED: OrderStatusBadge component entirely to prevent crashes

  // Simplified status picker using buttons instead of heavy Picker component
  const OrderStatusPicker = React.memo(({ currentStatus, orderId }: { currentStatus: OrderStatus, orderId: string }) => {
    const statusOptions: { label: string; value: OrderStatus; color: string }[] = [
      { label: 'Pending', value: 'pending', color: '#FFA500' },
      { label: 'Confirmed', value: 'confirmed', color: '#4169E1' },
      { label: 'Shipped', value: 'shipped', color: '#8A2BE2' },
      { label: 'Delivered', value: 'delivered', color: '#228B22' },
      { label: 'Cancelled', value: 'cancelled', color: '#DC143C' },
    ];

    return (
      <View style={{ marginTop: 8 }}>
        <Text style={[styles.filterLabel, { marginBottom: 8 }]}>Update Status</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleStatusUpdate(orderId, option.value)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: currentStatus === option.value ? option.color : '#f0f0f0',
                borderWidth: 1,
                borderColor: currentStatus === option.value ? option.color : '#ddd',
                minWidth: 90,
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{
                color: currentStatus === option.value ? '#fff' : '#333',
                fontSize: 12,
                fontWeight: currentStatus === option.value ? '600' : '400',
                textAlign: 'center',
              }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  });

  // Ultra-minimal OrderCard - absolute bare minimum to prevent crashes
  const OrderCard = React.memo(({ order, isExpanded, onToggle }: { order: OrderSummary | Order; isExpanded: boolean; onToggle: () => void }) => {
    // Add null checks to prevent crashes
    if (!order || !order.id) {
      return null;
    }

    // Extract only what we need - no processing
    const orderId = String(order.id || 'N/A');
    const orderStatus = String(order.status || 'pending');
    const orderDate = order.created_at ? String(order.created_at).slice(0, 10) : 'N/A';

    return (
      <View style={styles.orderCard}>
        <TouchableOpacity
          style={styles.orderHeader}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <View style={styles.orderHeaderLeft}>
            <View style={styles.orderTopRow}>
              <Text style={styles.orderId}>Order #{orderId}</Text>
              <Text style={{ fontSize: 11, color: '#666', marginLeft: 8 }}>
                {orderStatus}
              </Text>
            </View>
            <Text style={styles.orderDate}>{orderDate}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        {/* REMOVED: Inline expansion to prevent memory crashes - details now shown in modal */}
      </View>
    );
  }, (prevProps, nextProps) => {
    // Ultra-simple comparison - only check ID to minimize computation
    return prevProps.order.id === nextProps.order.id;
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by status:</Text>
        <View style={styles.pickerContainer}>
          {Platform.OS !== 'web' ? (
            <Picker
              selectedValue={selectedStatus}
              style={[styles.picker, Platform.select({
                android: { color: '#333' },
                ios: { color: '#333' }
              })]}
              dropdownIconColor="#333"
              mode={Platform.select({ ios: 'dialog', android: 'dropdown' })}
              itemStyle={Platform.select({
                ios: { fontSize: 16, color: '#333' }
              })}
              onValueChange={itemValue => {
                if (mountedRef.current) {
                  setSelectedStatus(itemValue);
                }
              }}
            >
              <Picker.Item label="All Orders" value="all" />
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="Confirmed" value="confirmed" />
              <Picker.Item label="Shipped" value="shipped" />
              <Picker.Item label="Delivered" value="delivered" />
              <Picker.Item label="Cancelled" value="cancelled" />
            </Picker>
          ) : (
            <select
              value={selectedStatus}
              onChange={(e) => {
                if (mountedRef.current) {
                  setSelectedStatus(e.target.value);
                }
              }}
              style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8 }}
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </View>
        <View style={{ marginTop: 12 }}>
          <Text style={styles.filterLabel}>Export orders by date:</Text>
          <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'stretch' }}>
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              style={{ flex: 1, marginRight: 8, backgroundColor: '#eef2ff', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#333', textAlign: 'center' }}>{startDate ? `Start: ${startDate.toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })}` : 'Select start date'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowEndPicker(true)}
              style={{ flex: 1, marginLeft: 8, backgroundColor: '#eef2ff', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#333', textAlign: 'center' }}>{endDate ? `End: ${endDate.toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })}` : 'Select end date'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            disabled={downloading}
            onPress={downloadPdf}
            style={{ marginTop: 8, backgroundColor: '#0066cc', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{downloading ? 'Downloading...' : 'Download PDF'}</Text>
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowStartPicker(false);
                if (date) setStartDate(date);
              }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowEndPicker(false);
                if (date) setEndDate(date);
              }}
            />
          )}
        </View>
      </View>

      {!canRender ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={{ marginTop: 12, color: '#666' }}>Loading orders...</Text>
        </View>
      ) : (
      <FlatList
        style={styles.ordersList}
        contentContainerStyle={styles.scrollContent}
        data={Array.isArray(visibleOrders) ? visibleOrders : []}
        keyExtractor={(order) => {
          if (!order || !order.id) return `order-${Math.random()}`;
          return String(order.id);
        }}
        renderItem={({ item }: { item: OrderSummary }) => {
          if (!item) return null;
          try {
            const hydrated = buildOrderDetails(item);
            if (!hydrated) return null;
            return (
              <OrderCard 
                order={hydrated} 
                isExpanded={false}
                onToggle={() => {
                  if (!mountedRef.current) return;
                  try {
                    const detail = typeof getOrderById === 'function' ? getOrderById(String(item.id)) : undefined;
                    setSelectedOrderForDetails(detail || hydrated);
                    setShowOrderDetailsModal(true);
                    if (!detail && typeof fetchOrders === 'function') {
                      fetchOrders().catch(err => console.error('Error refetching orders for detail:', err));
                    }
                  } catch (error) {
                    console.error('Error opening order details:', error);
                  }
                }}
              />
            );
          } catch (error) {
            console.error('Error rendering OrderCard:', error);
            return null;
          }
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={true}
        removeClippedSubviews={Platform.OS !== 'web'} // Disable on web for better scroll detection
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={<Text style={styles.noOrders}>No orders found</Text>}
        ListFooterComponent={
          (() => {
            try {
              const visibleLength = Array.isArray(visibleOrders) ? visibleOrders.length : 0;
              const filteredLength = Array.isArray(filteredOrders) ? filteredOrders.length : 0;
              
              if (visibleLength < filteredLength) {
                return (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    {loadingMore && <ActivityIndicator size="small" color="#0066cc" style={{ marginBottom: 8 }} />}
                    <TouchableOpacity
                      onPress={loadMore}
                      disabled={loadingMore}
                      style={{ 
                        paddingVertical: 8, 
                        paddingHorizontal: 16, 
                        backgroundColor: loadingMore ? '#ccc' : '#0066cc', 
                        borderRadius: 8 
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                        {loadingMore ? 'Loading...' : `Load More (${filteredLength - visibleLength} remaining)`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              } else if (visibleLength > 0) {
                return (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#666', fontSize: 12 }}>
                      All orders loaded ({filteredLength} total)
                    </Text>
                  </View>
                );
              }
              return null;
            } catch (error) {
              console.error('Error rendering ListFooterComponent:', error);
              return null;
            }
          })()
        }
      />
      )}
      </View>

      {/* Order Details Modal - Moved from inline expansion to prevent memory crashes */}
      {showOrderDetailsModal && selectedOrderForDetails && (
        <Modal
          visible={showOrderDetailsModal}
          animationType="slide"
          onRequestClose={() => {
            setShowOrderDetailsModal(false);
            setSelectedOrderForDetails(null);
          }}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Order Details</Text>
              <TouchableOpacity onPress={() => {
                setShowOrderDetailsModal(false);
                setSelectedOrderForDetails(null);
              }}>
                <MaterialIcons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Status</Text>
                <OrderStatusPicker currentStatus={selectedOrderForDetails.status || 'pending'} orderId={selectedOrderForDetails.id} />
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Customer Details</Text>
                <View style={styles.customerInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{selectedOrderForDetails.shipping_address?.full_name || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{selectedOrderForDetails.shipping_address?.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Payment:</Text>
                    <Text style={styles.infoValue}>{selectedOrderForDetails.payment_method_display || (selectedOrderForDetails.payment_method?.toLowerCase() === 'cod' ? 'Cash on Delivery' : 'Online Payment')}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Address:</Text>
                    <Text style={styles.infoValue}>
                      {selectedOrderForDetails.shipping_address?.address_line1 || 'N/A'}
                      {'\n'}
                      {selectedOrderForDetails.shipping_address?.city || ''}, {selectedOrderForDetails.shipping_address?.state || ''} - {selectedOrderForDetails.shipping_address?.pincode || ''}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Items ({(selectedOrderForDetails.items?.length || 0)})</Text>
                <View style={styles.itemsContainer}>
                  {selectedOrderForDetails.items && selectedOrderForDetails.items.length > 0 ? (
                    selectedOrderForDetails.items.slice(0, 10).map((item, index) => {
                      if (!item) return null;
                      const price = Number(item.price_at_time || 0);
                      const qty = Number(item.quantity || 0);
                      return (
                        <View key={`${selectedOrderForDetails.id}-item-${index}`} style={styles.orderItem}>
                          <View style={styles.itemDetails}>
                            <Text style={styles.itemName} numberOfLines={1}>{item.product_name || 'Unknown Product'}</Text>
                            <Text style={styles.itemQuantity}>Qty: {qty}</Text>
                          </View>
                          <Text style={styles.itemPrice}>₹{(price * qty).toFixed(2)}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noOrders}>No items found</Text>
                  )}
                  {(selectedOrderForDetails.items?.length || 0) > 10 && (
                    <Text style={{ padding: 8, color: '#666', fontSize: 12, textAlign: 'center' }}>
                      +{(selectedOrderForDetails.items?.length || 0) - 10} more items
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>₹{(Number(selectedOrderForDetails.total_amount || 0) - Number(selectedOrderForDetails.delivery_charge || 0) + Number(selectedOrderForDetails.discount_amount || 0)).toFixed(2)}</Text>
                  </View>
                  {Number(selectedOrderForDetails.discount_amount || 0) > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Discount:</Text>
                      <Text style={[styles.summaryValue, styles.discountText]}>-₹{Number(selectedOrderForDetails.discount_amount || 0).toFixed(2)}</Text>
                    </View>
                  )}
                  {Number(selectedOrderForDetails.delivery_charge || 0) > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Delivery:</Text>
                      <Text style={styles.summaryValue}>₹{Number(selectedOrderForDetails.delivery_charge || 0).toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>₹{Number(selectedOrderForDetails.total_amount || 0).toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  pickerContainer: {
    marginVertical: 8,
    backgroundColor: '#fff',
  },
  picker: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    ...Platform.select({
      android: {
        paddingHorizontal: 10,
      },
      ios: {
        paddingHorizontal: 10,
      }
    })
  },
  ordersList: {
    flex: 1,
    padding: 12,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 120, // Extra padding to ensure content is accessible above navigation buttons
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noOrders: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    color: '#666',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 24,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  customerInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  itemsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  discountText: {
    color: '#28a745',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

const AdminOrders = () => {
  try {
    return (
      <ErrorBoundary>
        <AdminOrdersInner />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Fatal error in AdminOrders:', error);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ff4444', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          An error occurred. Please restart the app.
        </Text>
      </SafeAreaView>
    );
  }
};

export default AdminOrders; 