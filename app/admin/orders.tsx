import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  ViewStyle,
  TextStyle,
  Platform
} from 'react-native';
import { useOrders } from '../OrderContext';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { API_CONFIG, getBaseUrl, ENDPOINTS } from '../config/api';
import { Order, OrderStatus } from '../OrderContext';

const { width } = Dimensions.get('window');

interface Styles {
  container: ViewStyle;
  filterSection: ViewStyle;
  filterLabel: TextStyle;
  pickerContainer: ViewStyle;
  picker: TextStyle;
  ordersList: ViewStyle;
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

const AdminOrders = () => {
  const { orders, loading, fetchOrders, updateOrderStatus } = useOrders();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const filteredOrders = selectedStatus === 'all'
    ? orders
    : orders.filter(order => order.status === selectedStatus);

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const toYMD = (d: Date) => format(d, 'yyyy-MM-dd');

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
      setDownloading(true);
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
        const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || FileSystemLegacy.documentDirectory || FileSystemLegacy.cacheDirectory;
        if (!baseDir) throw new Error('No writable directory available');
        const downloadsDir = `${baseDir}downloads/`;
        const dirInfo = await FileSystemLegacy.getInfoAsync(downloadsDir);
        if (!dirInfo.exists) {
          await FileSystemLegacy.makeDirectoryAsync(downloadsDir, { intermediates: true });
        }
        const fileUri = `${downloadsDir}orders_${startDate ? toYMD(startDate) : 'all'}_${endDate ? toYMD(endDate) : 'all'}.pdf`;
        const headers = token ? { Authorization: `Bearer ${token}`, Accept: 'application/pdf' } : { Accept: 'application/pdf' };
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
      setDownloading(false);
    }
  };

  const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
    const statusColors = {
      pending: '#FFA500',
      confirmed: '#4169E1',
      shipped: '#8A2BE2',
      delivered: '#228B22',
      cancelled: '#DC143C'
    };

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColors[status] }]}>
        <Text style={styles.statusText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
      </View>
    );
  };

  const OrderStatusPicker = ({ currentStatus, orderId }: { currentStatus: OrderStatus, orderId: string }) => (
    <View style={[styles.pickerContainer, { 
      borderWidth: 1, 
      borderColor: '#ddd', 
      borderRadius: 8,
      backgroundColor: '#fff',
      marginTop: 8,
      ...Platform.select({
        android: {
          elevation: 2,
        },
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
        }
      })
    }]}>
      <Text style={[styles.filterLabel, { marginBottom: 4, paddingHorizontal: 12, paddingTop: 8 }]}>Update Status</Text>
      <View style={{ 
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
        marginHorizontal: 8,
        marginBottom: 8,
        overflow: 'hidden'
      }}>
        <Picker
          selectedValue={currentStatus}
          style={[
            styles.picker,
            {
              height: Platform.select({ ios: 150, android: 50 }),
              backgroundColor: '#f8f9fa',
              marginHorizontal: Platform.select({ ios: -8, android: 0 }),
              ...Platform.select({
                android: { color: '#333' },
                ios: { color: '#333' }
              })
            }
          ]}
          dropdownIconColor="#333"
          mode={Platform.select({ ios: 'dialog', android: 'dropdown' })}
          itemStyle={Platform.select({
            ios: { fontSize: 16, color: '#333', height: 120 }
          })}
          onValueChange={(itemValue) => handleStatusUpdate(orderId, itemValue as OrderStatus)}
        >
          <Picker.Item label="Pending" value="pending" color="#FFA500" />
          <Picker.Item label="Confirmed" value="confirmed" color="#4169E1" />
          <Picker.Item label="Shipped" value="shipped" color="#8A2BE2" />
          <Picker.Item label="Delivered" value="delivered" color="#228B22" />
          <Picker.Item label="Cancelled" value="cancelled" color="#DC143C" />
        </Picker>
      </View>
    </View>
  );

  const OrderCard = ({ order }: { order: Order }) => {
    const isExpanded = expandedOrder === order.id;

    return (
      <View style={styles.orderCard}>
        <TouchableOpacity
          style={styles.orderHeader}
          onPress={() => setExpandedOrder(isExpanded ? null : order.id)}
        >
          <View style={styles.orderHeaderLeft}>
            <View style={styles.orderTopRow}>
              <Text style={styles.orderId}>Order #{order.id}</Text>
              <OrderStatusBadge status={order.status} />
            </View>
            <Text style={styles.orderDate}>
              {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>
          <MaterialIcons
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color="#666"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.orderDetails}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Status</Text>
              <OrderStatusPicker currentStatus={order.status} orderId={order.id} />
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Details</Text>
              <View style={styles.customerInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{order.shipping_address.full_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{order.shipping_address.phone}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payment:</Text>
                  <Text style={styles.infoValue}>{order.payment_method_display || (order.payment_method?.toLowerCase() === 'cod' ? 'Cash on Delivery' : 'Online Payment')}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>
                    {order.shipping_address.address_line1}
                    {'\n'}
                    {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Items</Text>
              <View style={styles.itemsContainer}>
                {order.items.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.itemPrice}>₹{item.price_at_time * item.quantity}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.summaryContainer}>
                {(() => {
                  const itemsSubtotal = (order.items || []).reduce((sum, item) => sum + Number(item.price_at_time || 0) * Number(item.quantity || 0), 0);
                  const delivery = Number(order.delivery_charge || 0);
                  const discount = Number(order.discount_amount || 0);
                  return (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal:</Text>
                        <Text style={styles.summaryValue}>₹{itemsSubtotal}</Text>
                      </View>
                      {order.discount_amount ? (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Discount:</Text>
                          <Text style={[styles.summaryValue, styles.discountText]}>-₹{discount}</Text>
                        </View>
                      ) : null}
                      {order.delivery_charge ? (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Delivery:</Text>
                          <Text style={styles.summaryValue}>₹{delivery}</Text>
                        </View>
                      ) : null}
                      <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total:</Text>
                        <Text style={styles.totalValue}>₹{order.total_amount}</Text>
                      </View>
                    </>
                  );
                })()}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by status:</Text>
        <View style={styles.pickerContainer}>
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
            onValueChange={itemValue => setSelectedStatus(itemValue)}
          >
            <Picker.Item label="All Orders" value="all" />
            <Picker.Item label="Pending" value="pending" />
            <Picker.Item label="Confirmed" value="confirmed" />
            <Picker.Item label="Shipped" value="shipped" />
            <Picker.Item label="Delivered" value="delivered" />
            <Picker.Item label="Cancelled" value="cancelled" />
          </Picker>
        </View>
        <View style={{ marginTop: 12 }}>
          <Text style={styles.filterLabel}>Export orders by date:</Text>
          <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'stretch' }}>
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              style={{ flex: 1, marginRight: 8, backgroundColor: '#eef2ff', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#333', textAlign: 'center' }}>{startDate ? `Start: ${format(startDate, 'MMM dd, yyyy')}` : 'Select start date'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowEndPicker(true)}
              style={{ flex: 1, marginLeft: 8, backgroundColor: '#eef2ff', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#333', textAlign: 'center' }}>{endDate ? `End: ${format(endDate, 'MMM dd, yyyy')}` : 'Select end date'}</Text>
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

      <ScrollView
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.length === 0 ? (
          <Text style={styles.noOrders}>No orders found</Text>
        ) : (
          filteredOrders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

export default AdminOrders; 