import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getBaseUrl, ENDPOINTS } from '../config/api';
import { apiService } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AdminMoreModal } from './components/AdminMoreModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_LIMIT = 10;

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderStats {
  total: number; total_trend: number;
  pending: number; pending_trend: number;
  processing: number; processing_trend: number;
  shipped: number; shipped_trend: number;
  delivered: number; delivered_trend: number;
  cancelled: number; cancelled_trend: number;
}

interface AdminOrderItem {
  product_id?: number;
  product_name?: string;
  name?: string;
  title?: string;
  quantity?: number;
  price_at_time?: number | string;
  price?: number | string;
  unit_price?: number | string;
  image_url?: string;
}

interface AdminOrder {
  id: number;
  status: string;
  total_amount: string;
  created_at: string;
  payment_method: string;
  payment_method_display: string;
  payment_status: string;
  customer_name: string;
  customer_email: string;
  user_name?: string;
  user_email?: string;
  shipping_full_name?: string;
  shipping_phone_number?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  item_count: number;
  items?: AdminOrderItem[] | string;
  shipment_status?: string;
  shiprocket_order_id?: string;
  shiprocket_shipment_id?: string;
  awb_number?: string;
  courier_name?: string;
  tracking_url?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtYMD = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fmtCurrency = (v: string | number) => `₹${parseFloat(String(v || 0)).toFixed(2)}`;

type StatusKey = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'confirmed';

const STATUS_STYLES: Record<StatusKey, { bg: string; text: string; icon: string; iconColor: string }> = {
  pending:    { bg: '#FFF8E1', text: '#F59E0B', icon: 'time-outline',           iconColor: '#F59E0B' },
  processing: { bg: '#FFF3E0', text: '#EA580C', icon: 'settings-outline',        iconColor: '#EA580C' },
  shipped:    { bg: '#E8F5E9', text: '#16A34A', icon: 'car-outline',             iconColor: '#16A34A' },
  delivered:  { bg: '#EAF6ED', text: '#15803D', icon: 'checkmark-circle-outline', iconColor: '#15803D' },
  cancelled:  { bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle-outline',    iconColor: '#DC2626' },
  confirmed:  { bg: '#E8F4FD', text: '#2563EB', icon: 'checkmark-done-outline',  iconColor: '#2563EB' },
};

const getStatusStyle = (status: string) =>
  STATUS_STYLES[(status?.toLowerCase() as StatusKey)] || STATUS_STYLES.pending;

const trendLabel = (val: number) => {
  if (val === 0) return '0% vs last week';
  const sign = val > 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(val)}% vs last week`;
};

const trendColor = (val: number) => (val >= 0 ? '#16A34A' : '#DC2626');

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminOrdersScreen() {
  const router = useRouter();
  const isMounted = useRef(true);

  // Stats
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Orders list
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Order detail / status update modal
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<Date | null>(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const [exportEndDate, setExportEndDate] = useState<Date | null>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Preset Date Ranges
  const setPresetRange = (preset: 'today' | '7days' | 'month' | 'all') => {
    const now = new Date();
    if (preset === 'today') {
      setExportStartDate(new Date());
      setExportEndDate(new Date());
    } else if (preset === '7days') {
      setExportStartDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
      setExportEndDate(new Date());
    } else if (preset === 'month') {
      setExportStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
      setExportEndDate(new Date());
    } else if (preset === 'all') {
      setExportStartDate(null);
      setExportEndDate(null);
    }
  };

  // PDF Export Download Handler
  const downloadPdf = async (startD: Date | null, endD: Date | null) => {
    setDownloading(true);
    try {
      const base = getBaseUrl();
      const token = await AsyncStorage.getItem('auth_token');
      const params: string[] = [];
      if (startD) params.push(`start=${fmtYMD(startD)}`);
      if (endD) params.push(`end=${fmtYMD(endD)}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const url = `${base}/admin/orders/export${qs}`;

      if (Platform.OS === 'web') {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to download PDF');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Saranga_Orders_${startD ? fmtYMD(startD) : 'all'}_to_${endD ? fmtYMD(endD) : 'all'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
        Alert.alert('Success', 'PDF report downloaded successfully');
      } else {
        const FileSystemLegacy = require('expo-file-system/legacy');
        const Sharing = require('expo-sharing');

        const baseDir = FileSystemLegacy.documentDirectory || FileSystemLegacy.cacheDirectory;
        if (!baseDir) throw new Error('No storage directory available');
        const downloadsDir = `${baseDir}downloads/`;
        const dirInfo = await FileSystemLegacy.getInfoAsync(downloadsDir);
        if (!dirInfo.exists) {
          await FileSystemLegacy.makeDirectoryAsync(downloadsDir, { intermediates: true });
        }
        const fileName = `Saranga_Orders_${startD ? fmtYMD(startD) : 'all'}_to_${endD ? fmtYMD(endD) : 'all'}.pdf`;
        const fileUri = `${downloadsDir}${fileName}`;

        const downloadResumable = FileSystemLegacy.createDownloadResumable(
          url,
          fileUri,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        const result = await downloadResumable.downloadAsync();
        const savedUri = result?.uri || fileUri;

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(savedUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save / Share PDF Report',
            UTI: 'com.adobe.pdf',
          });
        } else {
          await Linking.openURL(savedUri);
        }
      }
      setShowExportModal(false);
    } catch (e: any) {
      console.error('downloadPdf error:', e);
      Alert.alert('Error', 'Failed to download PDF report: ' + (e.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  // Package dimensions & Shiprocket state
  const [packageWeight, setPackageWeight] = useState('0.5');
  const [packageLength, setPackageLength] = useState('10');
  const [packageBreadth, setPackageBreadth] = useState('10');
  const [packageHeight, setPackageHeight] = useState('10');
  const [shiprocketLoading, setShiprocketLoading] = useState(false);

  // ── Shiprocket Helpers ──────────────────────────────────────────────────

  const hasShiprocketData = (order: AdminOrder | null) => {
    if (!order) return false;
    return !!(
      order.shiprocket_order_id ||
      order.shiprocket_shipment_id ||
      order.awb_number ||
      order.shipment_status === 'created' ||
      order.shipment_status === 'awb_generated' ||
      order.shipment_status === 'pickup_scheduled'
    );
  };

  const hasAWB = (order: AdminOrder | null) => {
    if (!order) return false;
    return !!(
      order.awb_number ||
      order.shipment_status === 'awb_generated' ||
      order.shipment_status === 'pickup_scheduled'
    );
  };

  // ── Shiprocket Handlers ─────────────────────────────────────────────────

  const handleCreateShipment = async (orderId: number) => {
    setShiprocketLoading(true);
    try {
      const res = await apiService.post(`/shiprocket/create-shipment/${orderId}`, {
        weight: parseFloat(packageWeight) || 0.5,
        length: parseInt(packageLength) || 10,
        breadth: parseInt(packageBreadth) || 10,
        height: parseInt(packageHeight) || 10,
      });
      if (res.data?.success) {
        Alert.alert('Success', 'Shipment created successfully!');
        fetchOrders(page, false);
        if (selectedOrder) {
          setSelectedOrder({
            ...selectedOrder,
            shiprocket_order_id: res.data.data?.order_id,
            shiprocket_shipment_id: res.data.data?.shipment_id,
            shipment_status: 'created',
          });
        }
      } else {
        Alert.alert('Error', res.data?.error || res.error || 'Failed to create shipment');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create shipment');
    } finally {
      setShiprocketLoading(false);
    }
  };

  const handleAssignCourier = async (orderId: number) => {
    setShiprocketLoading(true);
    try {
      const res = await apiService.post(`/shiprocket/assign-courier/${orderId}`, {});
      if (res.data?.success) {
        Alert.alert('Success', 'Courier assigned & AWB generated successfully!');
        fetchOrders(page, false);
        if (selectedOrder) {
          setSelectedOrder({
            ...selectedOrder,
            awb_number: res.data.data?.awb_code,
            courier_name: res.data.data?.courier_name,
            shipment_status: 'awb_generated',
          });
        }
      } else {
        Alert.alert('Error', res.data?.error || res.error || 'Failed to assign courier');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to assign courier');
    } finally {
      setShiprocketLoading(false);
    }
  };

  const handleDownloadLabel = async (orderId: number) => {
    setShiprocketLoading(true);
    try {
      const res = await apiService.post(`/shiprocket/generate-label/${orderId}`, {});
      if (res.data?.success && res.data.data?.label_url) {
        await Linking.openURL(res.data.data.label_url);
        Alert.alert('Success', 'Shipping label opened!');
      } else {
        Alert.alert('Error', res.data?.error || res.error || 'Failed to generate label');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate label');
    } finally {
      setShiprocketLoading(false);
    }
  };

  const handleSchedulePickup = async (orderId: number) => {
    setShiprocketLoading(true);
    try {
      const res = await apiService.post(`/shiprocket/request-pickup/${orderId}`, {});
      if (res.data?.success) {
        Alert.alert('Success', 'Pickup scheduled successfully!');
        fetchOrders(page, false);
        if (selectedOrder) {
          setSelectedOrder({
            ...selectedOrder,
            shipment_status: 'pickup_scheduled',
          });
        }
      } else {
        Alert.alert('Error', res.data?.error || res.error || 'Failed to schedule pickup');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to schedule pickup');
    } finally {
      setShiprocketLoading(false);
    }
  };

  const handleResetShipment = async (orderId: number) => {
    Alert.alert(
      'Reset Shipment',
      'Are you sure you want to reset/cancel this shipment? This will clear all local Shiprocket data for this order so you can recreate it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setShiprocketLoading(true);
            try {
              const res = await apiService.post(`/shiprocket/reset-shipment/${orderId}`, {});
              if (res.data?.success) {
                Alert.alert('Success', res.data.message || 'Shipment reset successfully!');
                fetchOrders(page, false);
                if (selectedOrder) {
                  setSelectedOrder({
                    ...selectedOrder,
                    shiprocket_order_id: undefined,
                    shiprocket_shipment_id: undefined,
                    shipment_status: undefined,
                    awb_number: undefined,
                    courier_name: undefined,
                    tracking_url: undefined,
                  });
                }
              } else {
                Alert.alert('Error', res.data?.error || res.error || 'Failed to reset shipment');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reset shipment');
            } finally {
              setShiprocketLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Auth helper ───────────────────────────────────────────────────────────

  const getAuthHeader = async (): Promise<Record<string, string>> => {
    const token = await AsyncStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  };

  // ── Fetch stats ───────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiService.get('/admin/orders/stats');
      if (res.data && isMounted.current) {
        setStats(res.data);
      }
    } catch (e) {
      console.error('fetchStats error:', e);
    } finally {
      if (isMounted.current) setStatsLoading(false);
    }
  }, []);

  // ── Fetch orders list ─────────────────────────────────────────────────────

  const fetchOrders = useCallback(async (p = page, reset = false) => {
    if (!isMounted.current) return;
    if (reset) setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(p));
      queryParams.append('limit', String(PAGE_LIMIT));
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (paymentFilter !== 'all') queryParams.append('payment', paymentFilter);
      if (search && search.trim()) queryParams.append('search', search.trim());

      const res = await apiService.get(`/admin/orders?${queryParams.toString()}`);
      if (res.data && isMounted.current) {
        const list = Array.isArray(res.data) ? res.data : (res.data.orders || []);
        const totalCount = Array.isArray(res.data) ? res.data.length : (res.data.total ?? list.length);
        setOrders(list);
        setTotal(totalCount);
        setPage(p);
      }
    } catch (e) {
      console.error('fetchOrders error:', e);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [statusFilter, paymentFilter, search, page]);

  // ── Update order status ───────────────────────────────────────────────────

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await apiService.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      if (res.error) throw new Error(res.error);
      Alert.alert('Success', `Order #SA${orderId} status updated to ${newStatus}`);
      setShowDetailModal(false);
      setSelectedOrder(null);
      fetchOrders(page, false);
      fetchStats();
    } catch (e) {
      Alert.alert('Error', 'Could not update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    isMounted.current = true;
    fetchStats();
    fetchOrders(1, true);
    return () => { isMounted.current = false; };
  }, []);

  // Re-fetch when filters/search change
  useEffect(() => {
    fetchOrders(1, true);
  }, [statusFilter, paymentFilter, search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchOrders(1, true);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  // ── Render stat card ──────────────────────────────────────────────────────

  const StatCard = ({ label, value, trend, iconName, iconBg, onPress }: {
    label: string; value: number; trend: number;
    iconName: string; iconBg: string; onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.statIconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName as any} size={18} color="#2D4B34" />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={[styles.statTrend, { color: trendColor(trend) }]}>{trendLabel(trend)}</Text>
    </TouchableOpacity>
  );

  // ── Render order row ──────────────────────────────────────────────────────

  const OrderRow = ({ item }: { item: AdminOrder }) => {
    const st = getStatusStyle(item.status);
    const isPaid = item.payment_status?.toLowerCase() === 'paid' || item.payment_method?.toLowerCase() !== 'cod';
    const fulfillment = item.shipment_status
      ? item.shipment_status.charAt(0).toUpperCase() + item.shipment_status.slice(1)
      : item.status?.charAt(0).toUpperCase() + item.status?.slice(1);

    return (
      <TouchableOpacity
        style={styles.orderRow}
        onPress={() => { setSelectedOrder(item); setShowDetailModal(true); }}
        activeOpacity={0.75}
      >
        {/* Status icon */}
        <View style={[styles.orderStatusIcon, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon as any} size={16} color={st.iconColor} />
        </View>

        {/* Order info */}
        <View style={styles.orderInfo}>
          <Text style={styles.orderIdText}>#SA{item.id}</Text>
          <Text style={styles.orderCustomer} numberOfLines={1}>{item.customer_name}</Text>
          <Text style={styles.orderEmail} numberOfLines={1}>{item.customer_email}</Text>
        </View>

        {/* Amount + payment */}
        <View style={styles.orderMiddle}>
          <Text style={styles.orderAmount}>{fmtCurrency(item.total_amount)}</Text>
          <Text style={styles.orderPayPaid}>• {isPaid ? 'Paid' : 'Unpaid'}</Text>
          <Text style={styles.orderPayMethod}>{item.payment_method_display}</Text>
        </View>

        {/* Status badge + fulfillment + date */}
        <View style={styles.orderRight}>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusBadgeText, { color: st.text }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.fulfillmentText}>{fulfillment}</Text>
          <Text style={styles.orderDate}>{fmtDate(item.created_at)}</Text>
        </View>

        {/* Actions */}
        <View style={styles.orderActions}>
          <TouchableOpacity onPress={() => { setSelectedOrder(item); setShowDetailModal(true); }}>
            <Ionicons name="eye-outline" size={18} color="#6B7280" />
          </TouchableOpacity>
          <View style={{ height: 8 }} />
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* Top Header */}
          <View style={styles.topHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Orders</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D4B34']} tintColor="#2D4B34" />}
          >
            {/* ── Stat Cards ── */}
            {statsLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator color="#2D4B34" />
              </View>
            ) : stats ? (
              <>
                <View style={styles.statRow}>
                  <StatCard label="Total Orders" value={stats.total} trend={stats.total_trend} iconName="bag-handle-outline" iconBg="#EAF6ED" onPress={() => setStatusFilter('all')} />
                  <StatCard label="Pending" value={stats.pending} trend={stats.pending_trend} iconName="time-outline" iconBg="#FFF8E1" onPress={() => setStatusFilter('pending')} />
                  <StatCard label="Processing" value={stats.processing} trend={stats.processing_trend} iconName="settings-outline" iconBg="#FFF3E0" onPress={() => setStatusFilter('processing')} />
                </View>
                <View style={[styles.statRow, { marginTop: 0 }]}>
                  <StatCard label="Delivered" value={stats.delivered} trend={stats.delivered_trend} iconName="checkmark-circle-outline" iconBg="#EAF6ED" onPress={() => setStatusFilter('delivered')} />
                  <StatCard label="Cancelled" value={stats.cancelled} trend={stats.cancelled_trend} iconName="close-circle-outline" iconBg="#FEE2E2" onPress={() => setStatusFilter('cancelled')} />
                </View>
              </>
            ) : null}

            {/* ── Search Bar ── */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by Order ID, Customer or Email..."
                  placeholderTextColor="#9CA3AF"
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmitEditing={() => setSearch(searchInput)}
                  returnKeyType="search"
                />
                {searchInput.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchInput(''); setSearch(''); }}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Filter Pills Row ── */}
            <View style={styles.filterPillRow}>
              {/* Status filter */}
              <TouchableOpacity style={styles.filterPill} onPress={() => setShowStatusModal(true)}>
                <Text style={styles.filterPillText}>
                  {statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>

              {/* Payment filter */}
              <TouchableOpacity style={styles.filterPill} onPress={() => setShowPaymentModal(true)}>
                <Text style={styles.filterPillText}>
                  {paymentFilter === 'all' ? 'All Payment' : paymentFilter.charAt(0).toUpperCase() + paymentFilter.slice(1)}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              {/* Export */}
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={() => setShowExportModal(true)}
              >
                <Ionicons name="download-outline" size={14} color="#FFFFFF" />
                <Text style={styles.exportBtnText}>Export PDF</Text>
              </TouchableOpacity>
            </View>

            {/* ── Orders List ── */}
            {loading && !refreshing ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#2D4B34" />
                <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 13 }}>Loading orders...</Text>
              </View>
            ) : orders.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="bag-handle-outline" size={48} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', marginTop: 12, fontSize: 14 }}>No orders found</Text>
              </View>
            ) : (
              <>
                {orders.map(item => <OrderRow key={String(item.id)} item={item} />)}

                {/* ── Pagination ── */}
                <View style={styles.paginationContainer}>
                  <Text style={styles.paginationInfo}>
                    Showing {(page - 1) * PAGE_LIMIT + 1} to {Math.min(page * PAGE_LIMIT, total)} of {total.toLocaleString()} orders
                  </Text>
                  <View style={styles.paginationControls}>
                    <TouchableOpacity
                      style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                      onPress={() => page > 1 && fetchOrders(page - 1, true)}
                      disabled={page === 1}
                    >
                      <Ionicons name="chevron-back" size={14} color={page === 1 ? '#D1D5DB' : '#374151'} />
                    </TouchableOpacity>

                    {/* Page number pills */}
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let p = i + 1;
                      if (totalPages > 5 && page > 3) {
                        p = page - 2 + i;
                      }
                      if (p > totalPages) return null;
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.pageBtn, p === page && styles.pageBtnActive]}
                          onPress={() => p !== page && fetchOrders(p, true)}
                        >
                          <Text style={[styles.pageBtnText, p === page && styles.pageBtnActiveText]}>{p}</Text>
                        </TouchableOpacity>
                      );
                    })}

                    {totalPages > 5 && (
                      <Text style={styles.pageBtnText}>... {totalPages}</Text>
                    )}

                    <TouchableOpacity
                      style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                      onPress={() => page < totalPages && fetchOrders(page + 1, true)}
                      disabled={page === totalPages}
                    >
                      <Ionicons name="chevron-forward" size={14} color={page === totalPages ? '#D1D5DB' : '#374151'} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* ── Bottom Nav Bar ── */}
          <View style={styles.bottomTabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admin/dashboard' as any)}>
              <Ionicons name="grid-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
              <Ionicons name="bag-handle" size={22} color="#2D4B34" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/admin/products' as any)}>
              <Ionicons name="cube-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/admin/users' as any)}>
              <Ionicons name="people-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Customers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setShowMoreModal(true)}>
              <Ionicons name="ellipsis-horizontal-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>More</Text>
            </TouchableOpacity>
          </View>

          {/* ── Admin More Options Modal ── */}
          <AdminMoreModal
            visible={showMoreModal}
            onClose={() => setShowMoreModal(false)}
          />

          {/* ── Export PDF Date Range Modal ── */}
          <Modal visible={showExportModal} transparent animationType="slide" onRequestClose={() => setShowExportModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowExportModal(false)}>
              <View style={styles.modalSheet}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.modalTitle}>Export Orders PDF</Text>
                  <TouchableOpacity onPress={() => setShowExportModal(false)}>
                    <Ionicons name="close" size={22} color="#374151" />
                  </TouchableOpacity>
                </View>

                {/* Preset Ranges */}
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                  Quick Date Presets
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  <TouchableOpacity style={styles.presetPill} onPress={() => setPresetRange('today')}>
                    <Text style={styles.presetPillText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetPill} onPress={() => setPresetRange('7days')}>
                    <Text style={styles.presetPillText}>Last 7 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetPill} onPress={() => setPresetRange('month')}>
                    <Text style={styles.presetPillText}>This Month</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetPill} onPress={() => setPresetRange('all')}>
                    <Text style={styles.presetPillText}>All Time</Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Date Inputs */}
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                  Custom Range
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#2D4B34" />
                    <Text style={styles.datePickerBtnText}>
                      {exportStartDate ? `Start: ${fmtYMD(exportStartDate)}` : 'Select Start Date'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#2D4B34" />
                    <Text style={styles.datePickerBtnText}>
                      {exportEndDate ? `End: ${fmtYMD(exportEndDate)}` : 'Select End Date'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Mobile Date Pickers */}
                {showStartPicker && (
                  <DateTimePicker
                    value={exportStartDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowStartPicker(false);
                      if (date) setExportStartDate(date);
                    }}
                  />
                )}
                {showEndPicker && (
                  <DateTimePicker
                    value={exportEndDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowEndPicker(false);
                      if (date) setExportEndDate(date);
                    }}
                  />
                )}

                {/* Download Action Button */}
                <TouchableOpacity
                  style={[styles.exportSubmitBtn, downloading && { opacity: 0.6 }]}
                  onPress={() => downloadPdf(exportStartDate, exportEndDate)}
                  disabled={downloading}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="document-text-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.exportSubmitBtnText}>Download PDF Report</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Status Filter Modal ── */}
          <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusModal(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Filter by Status</Text>
                {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'confirmed'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.modalOption, statusFilter === s && styles.modalOptionActive]}
                    onPress={() => { setStatusFilter(s); setShowStatusModal(false); }}
                  >
                    <Text style={[styles.modalOptionText, statusFilter === s && styles.modalOptionTextActive]}>
                      {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                    {statusFilter === s && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Payment Filter Modal ── */}
          <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPaymentModal(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Filter by Payment</Text>
                {['all', 'cod', 'online', 'upi', 'netbanking', 'creditcard'].map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.modalOption, paymentFilter === p && styles.modalOptionActive]}
                    onPress={() => { setPaymentFilter(p); setShowPaymentModal(false); }}
                  >
                    <Text style={[styles.modalOptionText, paymentFilter === p && styles.modalOptionTextActive]}>
                      {p === 'all' ? 'All Payment' : p === 'cod' ? 'Cash on Delivery' : p === 'upi' ? 'UPI' : p === 'netbanking' ? 'Net Banking' : p === 'creditcard' ? 'Credit Card' : 'Online Payment'}
                    </Text>
                    {paymentFilter === p && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Order Detail Modal ── */}
          <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDetailModal(false)}>
              <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
                {selectedOrder && (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Text style={styles.modalTitle}>Order #SA{selectedOrder.id}</Text>
                      <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                        <Ionicons name="close" size={22} color="#374151" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Customer</Text>
                      <Text style={styles.detailValue}>{selectedOrder.shipping_full_name || selectedOrder.customer_name || selectedOrder.user_name || 'Customer'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{selectedOrder.customer_email || selectedOrder.user_email || '—'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>{selectedOrder.shipping_phone_number || '—'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address</Text>
                      <Text style={styles.detailValue}>
                        {[
                          selectedOrder.shipping_address_line1,
                          selectedOrder.shipping_address_line2,
                          selectedOrder.shipping_city,
                          selectedOrder.shipping_state,
                          selectedOrder.shipping_postal_code
                        ].filter(Boolean).join(', ') || '—'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount</Text>
                      <Text style={styles.detailValue}>{fmtCurrency(selectedOrder.total_amount)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment</Text>
                      <Text style={styles.detailValue}>{selectedOrder.payment_method_display}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{fmtDate(selectedOrder.created_at)}</Text>
                    </View>

                    {/* Order Items Section */}
                    <Text style={[styles.modalTitle, { fontSize: 14, marginTop: 16, marginBottom: 8 }]}>
                      Order Items ({(() => {
                        let itms = selectedOrder.items;
                        if (typeof itms === 'string') {
                          try { itms = JSON.parse(itms); } catch { itms = []; }
                        }
                        return Array.isArray(itms) ? itms.filter(Boolean).length : 0;
                      })()})
                    </Text>
                    <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 }}>
                      {(() => {
                        let itms = selectedOrder.items;
                        if (typeof itms === 'string') {
                          try { itms = JSON.parse(itms); } catch { itms = []; }
                        }
                        const list = Array.isArray(itms) ? itms.filter(Boolean) : [];
                        if (list.length === 0) {
                          return <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', py: 4 }}>No items details recorded</Text>;
                        }
                        return list.map((item, idx) => {
                          const pName = item?.product_name || item?.name || item?.title || 'Item';
                          const pQty = parseInt(String(item?.quantity || 1));
                          const pPrice = parseFloat(String(item?.price_at_time || item?.price || item?.unit_price || 0));
                          return (
                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: idx === list.length - 1 ? 0 : 1, borderBottomColor: '#F3F4F6' }}>
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>{pName}</Text>
                                <Text style={{ fontSize: 11, color: '#6B7280' }}>Qty: {pQty} × ₹{pPrice.toFixed(0)}</Text>
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#2D4B34' }}>₹{(pPrice * pQty).toFixed(0)}</Text>
                            </View>
                          );
                        });
                      })()}
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Current Status</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(selectedOrder.status).bg }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusStyle(selectedOrder.status).text }]}>
                          {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.modalTitle, { fontSize: 14, marginTop: 16, marginBottom: 8 }]}>Update Status</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as StatusKey[]).map(s => {
                        const st = getStatusStyle(s);
                        const isActive = selectedOrder.status === s;
                        return (
                          <TouchableOpacity
                            key={s}
                            style={[styles.updateStatusBtn, { backgroundColor: isActive ? st.bg : '#F9FAFB', borderColor: isActive ? st.text : '#E5E7EB' }]}
                            onPress={() => {
                              if (!isActive) {
                                Alert.alert('Update Status', `Change to ${s}?`, [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Update', onPress: () => handleStatusUpdate(selectedOrder.id, s) },
                                ]);
                              }
                            }}
                          >
                            {updatingStatus ? <ActivityIndicator size="small" color={st.text} /> : (
                              <Text style={{ color: isActive ? st.text : '#374151', fontSize: 12, fontWeight: isActive ? '700' : '500' }}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {/* ── Shiprocket Fulfillment Section ── */}
                    <Text style={[styles.modalTitle, { fontSize: 14, marginTop: 20, marginBottom: 8 }]}>
                      Shiprocket Fulfillment
                    </Text>

                    {!hasShiprocketData(selectedOrder) && (
                      <View style={styles.dimensionsBox}>
                        <Text style={styles.dimensionsBoxTitle}>Package Dimensions</Text>
                        <View style={styles.dimensionsRow}>
                          <View style={styles.dimField}>
                            <Text style={styles.dimLabel}>Weight (kg)</Text>
                            <TextInput
                              style={styles.dimInput}
                              keyboardType="numeric"
                              value={packageWeight}
                              onChangeText={setPackageWeight}
                            />
                          </View>
                          <View style={styles.dimField}>
                            <Text style={styles.dimLabel}>Length (cm)</Text>
                            <TextInput
                              style={styles.dimInput}
                              keyboardType="numeric"
                              value={packageLength}
                              onChangeText={setPackageLength}
                            />
                          </View>
                          <View style={styles.dimField}>
                            <Text style={styles.dimLabel}>Width (cm)</Text>
                            <TextInput
                              style={styles.dimInput}
                              keyboardType="numeric"
                              value={packageBreadth}
                              onChangeText={setPackageBreadth}
                            />
                          </View>
                          <View style={styles.dimField}>
                            <Text style={styles.dimLabel}>Height (cm)</Text>
                            <TextInput
                              style={styles.dimInput}
                              keyboardType="numeric"
                              value={packageHeight}
                              onChangeText={setPackageHeight}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    <View style={{ gap: 8, marginTop: 4 }}>
                      {/* Step 1: Create Shipment */}
                      <TouchableOpacity
                        style={[
                          styles.shipActionBtn,
                          hasShiprocketData(selectedOrder) ? styles.shipActionBtnDone : styles.shipActionBtnPrimary,
                        ]}
                        onPress={() => handleCreateShipment(selectedOrder.id)}
                        disabled={hasShiprocketData(selectedOrder) || shiprocketLoading}
                      >
                        {shiprocketLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={[
                            styles.shipActionBtnText,
                            hasShiprocketData(selectedOrder) && styles.shipActionBtnTextDone,
                          ]}>
                            {hasShiprocketData(selectedOrder) ? '✓ Shipment Created' : 'Create Shiprocket Shipment'}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {/* Step 2: Assign Courier & Generate AWB */}
                      {hasShiprocketData(selectedOrder) && !hasAWB(selectedOrder) && (
                        <TouchableOpacity
                          style={[styles.shipActionBtn, styles.shipActionBtnPrimary]}
                          onPress={() => handleAssignCourier(selectedOrder.id)}
                          disabled={shiprocketLoading}
                        >
                          {shiprocketLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.shipActionBtnText}>Assign Courier & Generate AWB</Text>
                          )}
                        </TouchableOpacity>
                      )}

                      {/* Step 3: Download Label & Request Pickup */}
                      {hasAWB(selectedOrder) && (
                        <>
                          <TouchableOpacity
                            style={[styles.shipActionBtn, styles.shipActionBtnSecondary]}
                            onPress={() => handleDownloadLabel(selectedOrder.id)}
                            disabled={shiprocketLoading}
                          >
                            <Ionicons name="document-text-outline" size={16} color="#A37217" style={{ marginRight: 4 }} />
                            <Text style={styles.shipActionBtnTextSecondary}>Download Shipping Label</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.shipActionBtn,
                              selectedOrder.shipment_status === 'pickup_scheduled' ? styles.shipActionBtnDone : styles.shipActionBtnPrimary,
                            ]}
                            onPress={() => handleSchedulePickup(selectedOrder.id)}
                            disabled={shiprocketLoading || selectedOrder.shipment_status === 'pickup_scheduled'}
                          >
                            <Ionicons
                              name="calendar-outline"
                              size={16}
                              color={selectedOrder.shipment_status === 'pickup_scheduled' ? '#2E5D34' : '#FFFFFF'}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[
                              styles.shipActionBtnText,
                              selectedOrder.shipment_status === 'pickup_scheduled' && styles.shipActionBtnTextDone,
                            ]}>
                              {selectedOrder.shipment_status === 'pickup_scheduled' ? '✓ Pickup Scheduled' : 'Request Pickup'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* Step 4: Reset Shipment */}
                      {hasShiprocketData(selectedOrder) && (
                        <TouchableOpacity
                          style={[styles.shipActionBtn, styles.shipActionBtnDanger]}
                          onPress={() => handleResetShipment(selectedOrder.id)}
                          disabled={shiprocketLoading}
                        >
                          <Text style={styles.shipActionBtnTextDanger}>
                            {shiprocketLoading ? 'Resetting...' : 'Reset & Recreate Shipment'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Shiprocket Details Summary Box */}
                    {hasShiprocketData(selectedOrder) && (
                      <View style={styles.shipDetailsBox}>
                        <Text style={styles.shipDetailItem}>
                          <Text style={{ fontWeight: '700' }}>Shiprocket Order ID: </Text>
                          {selectedOrder.shiprocket_order_id || '—'}
                        </Text>
                        <Text style={styles.shipDetailItem}>
                          <Text style={{ fontWeight: '700' }}>Shipment ID: </Text>
                          {selectedOrder.shiprocket_shipment_id || '—'}
                        </Text>
                        {selectedOrder.awb_number ? (
                          <Text style={styles.shipDetailItem}>
                            <Text style={{ fontWeight: '700' }}>AWB Number: </Text>
                            {selectedOrder.awb_number} ({selectedOrder.courier_name || 'Courier'})
                          </Text>
                        ) : null}
                        {selectedOrder.tracking_url ? (
                          <TouchableOpacity
                            style={{ marginTop: 6 }}
                            onPress={() => Linking.openURL(selectedOrder.tracking_url!)}
                          >
                            <Text style={{ color: '#2D4B34', fontWeight: '700', fontSize: 12 }}>
                              Track Order →
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    )}
                  </ScrollView>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

        </View>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },

  body: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },

  // Stat cards
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827', marginVertical: 2 },
  statTrend: { fontSize: 10, fontWeight: '600' },

  // Search + filters
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#111827' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },

  filterPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterPillText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2D4B34',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exportBtnText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },

  // Order row
  orderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  orderStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  orderInfo: { flex: 1.5, minWidth: 0 },
  orderIdText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  orderCustomer: { fontSize: 12, color: '#374151', marginTop: 2 },
  orderEmail: { fontSize: 11, color: '#6B7280', marginTop: 1 },

  orderMiddle: { flex: 1.2, alignItems: 'flex-end', minWidth: 0 },
  orderAmount: { fontSize: 13, fontWeight: '700', color: '#111827' },
  orderPayPaid: { fontSize: 11, color: '#374151', marginTop: 2 },
  orderPayMethod: { fontSize: 11, color: '#6B7280', marginTop: 1 },

  orderRight: { flex: 1.5, alignItems: 'flex-end', minWidth: 0 },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 3,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  fulfillmentText: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  orderDate: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },

  orderActions: { alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },

  // Pagination
  paginationContainer: {
    paddingVertical: 16,
    gap: 8,
  },
  paginationInfo: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnActive: { backgroundColor: '#2D4B34', borderColor: '#2D4B34' },
  pageBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  pageBtnActiveText: { color: '#FFFFFF' },

  // Bottom nav
  bottomTabBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: Platform.OS === 'ios' ? 76 : 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, fontWeight: '500', color: '#6B7280', marginTop: 2 },
  tabLabelActive: { color: '#2D4B34', fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionActive: { backgroundColor: '#EAF6ED' },
  modalOptionText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  modalOptionTextActive: { color: '#2D4B34', fontWeight: '700' },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 13, color: '#111827', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },

  updateStatusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Shiprocket Styles
  dimensionsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  dimensionsBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  dimensionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dimField: {
    flex: 1,
  },
  dimLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  dimInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
  },
  shipActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  shipActionBtnPrimary: {
    backgroundColor: '#2D4B34',
  },
  shipActionBtnSecondary: {
    backgroundColor: '#FAF3E5',
    borderWidth: 1,
    borderColor: '#EBEBE3',
  },
  shipActionBtnDone: {
    backgroundColor: '#E0E0E0',
  },
  shipActionBtnDanger: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  shipActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  shipActionBtnTextDone: {
    color: '#777777',
  },
  shipActionBtnTextSecondary: {
    color: '#A37217',
    fontSize: 12,
    fontWeight: '700',
  },
  shipActionBtnTextDanger: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  shipDetailsBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  shipDetailItem: {
    fontSize: 11,
    color: '#374151',
  },

  // Export Modal Styles
  presetPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetPillText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF6ED',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1E7D6',
    gap: 6,
  },
  datePickerBtnText: {
    fontSize: 12,
    color: '#2D4B34',
    fontWeight: '600',
  },
  exportSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D4B34',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  exportSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});