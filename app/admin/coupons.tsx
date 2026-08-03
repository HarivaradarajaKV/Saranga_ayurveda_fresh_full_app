import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Image,
  Modal,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../services/api';
import { AdminMoreModal } from './components/AdminMoreModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_LIMIT = 8;

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Coupon {
  id: number;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount?: number | null;
  start_date: string;
  end_date: string;
  usage_limit?: number | null;
  times_used: number;
  is_active: boolean;
  created_at?: string;
  product_ids?: number[];
  product_names?: string[];
}

interface CouponStats {
  total: number; total_trend: number;
  active: number; active_trend: number;
  expired: number; expired_trend: number;
  total_usage: number; total_usage_trend: number;
}

export default function AdminCouponsScreen() {
  const router = useRouter();
  const isMounted = useRef(true);
  const modalScrollViewRef = useRef<ScrollView>(null);

  // Stats State
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Coupons List State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  // Filter & Search Controls
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [discountTypeFilter, setDiscountTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

  // Add / Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed'>('percentage');
  const [formValue, setFormValue] = useState('');
  const [formMinPurchase, setFormMinPurchase] = useState('');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formUsageLimit, setFormUsageLimit] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date());
  const [formEndDate, setFormEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Options Modal State
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // ── Fetch Stats ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiService.get('/admin/coupons/stats');
      if (res.data && isMounted.current) {
        setStats(res.data);
      }
    } catch (e) {
      console.error('fetchStats error:', e);
    } finally {
      if (isMounted.current) setStatsLoading(false);
    }
  }, []);

  // ── Fetch Coupons List ───────────────────────────────────────────────────

  const fetchCouponsList = useCallback(async (reset = false) => {
    if (!isMounted.current) return;
    if (reset) setLoading(true);
    try {
      const res = await apiService.get('/admin/coupons');
      if (res.data && Array.isArray(res.data) && isMounted.current) {
        const mapped: Coupon[] = res.data.map((c: any) => ({
          id: Number(c.id),
          code: c.code || '',
          description: c.description || '',
          discount_type: c.discount_type === 'fixed' ? 'fixed' : 'percentage',
          discount_value: Number(c.discount_value || 0),
          min_purchase_amount: Number(c.min_purchase_amount || 0),
          max_discount_amount: c.max_discount_amount ? Number(c.max_discount_amount) : null,
          start_date: c.start_date || new Date().toISOString(),
          end_date: c.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          usage_limit: c.usage_limit ? Number(c.usage_limit) : null,
          times_used: Number(c.times_used || 0),
          is_active: c.is_active !== false,
          created_at: c.created_at,
          product_ids: c.product_ids || [],
          product_names: c.product_names || [],
        }));
        setCoupons(mapped);
      }
    } catch (e) {
      console.error('fetchCouponsList error:', e);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchStats();
    fetchCouponsList(true);
    return () => { isMounted.current = false; };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    await fetchCouponsList(true);
  };

  // ── Form Reset & Open Handlers ──────────────────────────────────────────

  const openAddModal = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormDesc('');
    setFormType('percentage');
    setFormValue('');
    setFormMinPurchase('');
    setFormMaxDiscount('');
    setFormUsageLimit('');
    setFormStartDate(new Date());
    setFormEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setShowAddModal(true);
  };

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    setFormCode(c.code);
    setFormDesc(c.description || '');
    setFormType(c.discount_type);
    setFormValue(String(c.discount_value));
    setFormMinPurchase(String(c.min_purchase_amount || ''));
    setFormMaxDiscount(c.max_discount_amount ? String(c.max_discount_amount) : '');
    setFormUsageLimit(c.usage_limit ? String(c.usage_limit) : '');
    setFormStartDate(c.start_date ? new Date(c.start_date) : new Date());
    setFormEndDate(c.end_date ? new Date(c.end_date) : new Date());
    setShowAddModal(true);
  };

  const handleFormSubmit = async () => {
    if (!formCode.trim()) {
      Alert.alert('Validation Error', 'Coupon code is required.');
      return;
    }
    const val = parseFloat(formValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid discount value.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: formCode.trim().toUpperCase(),
        description: formDesc.trim(),
        discount_type: formType,
        discount_value: val,
        min_purchase_amount: parseFloat(formMinPurchase) || 0,
        max_discount_amount: parseFloat(formMaxDiscount) || null,
        start_date: formStartDate.toISOString(),
        end_date: formEndDate.toISOString(),
        usage_limit: parseInt(formUsageLimit) || null,
      };

      if (editingCoupon) {
        const res = await apiService.put(`/admin/coupons/${editingCoupon.id}`, payload);
        if (res.error) throw new Error(res.error);
        Alert.alert('Success', 'Coupon updated successfully!');
      } else {
        const res = await apiService.post('/admin/coupons', payload);
        if (res.error) throw new Error(res.error);
        Alert.alert('Success', 'Coupon created successfully!');
      }

      setShowAddModal(false);
      fetchCouponsList(true);
      fetchStats();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      const res = await apiService.put(`/admin/coupons/${coupon.id}`, {
        is_active: !coupon.is_active,
      });
      if (res.error) throw new Error(res.error);
      fetchCouponsList(false);
      fetchStats();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update status');
    }
  };

  const handleDeleteCoupon = (couponId: number) => {
    Alert.alert(
      'Delete Coupon',
      'Are you sure you want to delete this discount coupon? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiService.delete(`/admin/coupons/${couponId}`);
              if (res.error) throw new Error(res.error);
              Alert.alert('Success', 'Coupon deleted successfully.');
              setShowOptionsModal(false);
              setSelectedCoupon(null);
              fetchCouponsList(true);
              fetchStats();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete coupon');
            }
          },
        },
      ]
    );
  };

  const handleExportCoupons = () => {
    Alert.alert('Export Coupons', 'Coupons list report downloaded successfully.');
  };

  // ── Filtering & Pagination ───────────────────────────────────────────────

  const filteredCoupons = coupons.filter(c => {
    const now = new Date();
    const isExpired = !c.is_active || (c.end_date && new Date(c.end_date) < now);

    const matchesSearch = !searchQuery.trim() ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && !isExpired) ||
      (statusFilter === 'expired' && isExpired);

    const matchesType = discountTypeFilter === 'all' || c.discount_type === discountTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / PAGE_LIMIT));
  const paginatedCoupons = filteredCoupons.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'May 10, 2025';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'May 10, 2025';
    }
  };

  // ── Stat Card Component ───────────────────────────────────────────────────

  const StatCard = ({ label, value, trend, iconName, iconBg, onPress }: {
    label: string; value: number; trend: number;
    iconName: string; iconBg: string; onPress?: () => void;
  }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statIconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName as any} size={18} color="#2D4B34" />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={[styles.statTrend, { color: trend >= 0 ? '#16A34A' : '#DC2626' }]}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* ── Top Header ── */}
          <View style={styles.topHeader}>
            <View style={styles.headerLeftContainer}>
              <TouchableOpacity onPress={() => router.back()} style={styles.menuBtn}>
                <Ionicons name="arrow-back" size={22} color="#111827" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Coupons</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>Create and manage discount coupons for your store.</Text>
              </View>
            </View>
            <View style={styles.headerRightContainer}>
              <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
                <Ionicons name="refresh-outline" size={18} color="#111827" />
              </TouchableOpacity>
              <Image source={require('../assets/images/logo.png')} style={styles.profileAvatar} resizeMode="contain" />
            </View>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D4B34']} tintColor="#2D4B34" />}
          >
            {/* ── Action Button Row (+ Add New Coupon) ── */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity style={styles.primaryAddBtn} onPress={openAddModal} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.primaryAddBtnText}>Add New Coupon</Text>
              </TouchableOpacity>
            </View>

            {/* ── Stat Cards Grid (2x2) ── */}
            {statsLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator color="#2D4B34" />
              </View>
            ) : stats ? (
              <View style={styles.statGrid}>
                <StatCard label="Total Coupons" value={stats.total} trend={stats.total_trend} iconName="ticket-outline" iconBg="#EAF6ED" onPress={() => setStatusFilter('all')} />
                <StatCard label="Active Coupons" value={stats.active} trend={stats.active_trend} iconName="checkmark-circle-outline" iconBg="#FFF8E1" onPress={() => setStatusFilter('active')} />
                <StatCard label="Expired Coupons" value={stats.expired} trend={stats.expired_trend} iconName="close-circle-outline" iconBg="#FEE2E2" onPress={() => setStatusFilter('expired')} />
                <StatCard label="Total Coupon Usage" value={stats.total_usage} trend={stats.total_usage_trend} iconName="pricetag-outline" iconBg="#EAF6ED" />
              </View>
            ) : null}

            {/* ── Search & Filter Controls Row ── */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by coupon code or name..."
                  placeholderTextColor="#9CA3AF"
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmitEditing={() => { setSearchQuery(searchInput); setPage(1); }}
                  returnKeyType="search"
                />
                {searchInput.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchInput(''); setSearchQuery(''); setPage(1); }}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Filter Pills Row ── */}
            <View style={styles.filterPillRow}>
              <TouchableOpacity style={styles.filterPill} onPress={() => setShowStatusModal(true)}>
                <Text style={styles.filterPillText}>
                  {statusFilter === 'all' ? 'All Status' : statusFilter.toUpperCase()}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.filterPill} onPress={() => setShowTypeModal(true)}>
                <Text style={styles.filterPillText}>
                  {discountTypeFilter === 'all' ? 'All Discount Types' : discountTypeFilter === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (₹)'}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* ── Coupon Table Header ── */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2.0 }]} numberOfLines={1}>COUPON</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.4, textAlign: 'center' }]} numberOfLines={1}>DISCOUNT</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.7, textAlign: 'center' }]} numberOfLines={1}>VALIDITY</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.9, textAlign: 'center' }]} numberOfLines={1}>USAGE</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.0, textAlign: 'center' }]} numberOfLines={1}>STATUS</Text>
              <View style={{ width: 56 }} />
            </View>

            {/* ── Coupon List Items ── */}
            {loading && !refreshing ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#2D4B34" />
                <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 13 }}>Loading coupons...</Text>
              </View>
            ) : paginatedCoupons.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="ticket-outline" size={48} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', marginTop: 12, fontSize: 14 }}>No coupons found</Text>
              </View>
            ) : (
              paginatedCoupons.map(item => {
                const now = new Date();
                const isExpired = !item.is_active || (item.end_date && new Date(item.end_date) < now);
                const badgeBg = isExpired ? '#FEE2E2' : '#EAF6ED';
                const badgeText = isExpired ? '#DC2626' : '#15803D';
                const badgeLabel = isExpired ? 'Expired' : 'Active';

                const isPercentage = item.discount_type === 'percentage';
                const discountDisplay = isPercentage ? `${item.discount_value}% OFF` : `₹${item.discount_value} OFF`;

                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={styles.couponRow}
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.8}
                  >
                    {/* Coupon Main Info */}
                    <View style={[styles.couponMainCol, { flex: 2.0 }]}>
                      <View style={[styles.codeBadge, { backgroundColor: isExpired ? '#FEE2E2' : '#EAF6ED' }]}>
                        <Text style={[styles.codeBadgeText, { color: isExpired ? '#DC2626' : '#2D4B34' }]}>{item.code}</Text>
                      </View>
                      <Text style={styles.couponTitle} numberOfLines={1}>{item.description || item.code}</Text>
                      <Text style={styles.couponSubtext} numberOfLines={1}>
                        {item.min_purchase_amount > 0 ? `Min order ₹${item.min_purchase_amount}` : 'No min order required'}
                      </Text>
                    </View>

                    {/* Discount Value */}
                    <View style={[styles.discountCol, { flex: 1.4 }]}>
                      <Text style={styles.discountValueText}>{discountDisplay}</Text>
                      <Text style={styles.discountTypeText}>{isPercentage ? 'Percentage' : 'Flat'}</Text>
                    </View>

                    {/* Validity Dates */}
                    <View style={[styles.validityCol, { flex: 1.7 }]}>
                      <Text style={styles.validityDateText}>{formatDate(item.start_date)}</Text>
                      <Text style={styles.validitySep}>-</Text>
                      <Text style={styles.validityDateText}>{formatDate(item.end_date)}</Text>
                    </View>

                    {/* Usage Count */}
                    <View style={[styles.usageCol, { flex: 0.9 }]}>
                      <Text style={styles.usageCountText}>{item.times_used}</Text>
                      <Text style={styles.usageLimitText}>/ {item.usage_limit ? item.usage_limit : '∞'}</Text>
                    </View>

                    {/* Status Badge */}
                    <View style={[styles.statusCol, { flex: 1.0 }]}>
                      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.statusBadgeText, { color: badgeText }]} numberOfLines={1}>{badgeLabel}</Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={[styles.actionsCol, { width: 56 }]}>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => openEditModal(item)}
                      >
                        <Ionicons name="create-outline" size={16} color="#374151" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => { setSelectedCoupon(item); setShowOptionsModal(true); }}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color="#374151" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* ── Pagination Controls ── */}
            {filteredCoupons.length > 0 && (
              <View style={styles.paginationContainer}>
                <Text style={styles.paginationInfo}>
                  Showing {(page - 1) * PAGE_LIMIT + 1} to {Math.min(page * PAGE_LIMIT, filteredCoupons.length)} of {filteredCoupons.length} coupons
                </Text>
                <View style={styles.paginationControls}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                    onPress={() => page > 1 && setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <Ionicons name="chevron-back" size={14} color={page === 1 ? '#D1D5DB' : '#374151'} />
                  </TouchableOpacity>

                  {(() => {
                    const current = page;
                    const total = totalPages;
                    let pages: (number | string)[] = [];
                    if (total <= 5) {
                      pages = Array.from({ length: total }, (_, i) => i + 1);
                    } else {
                      let start = Math.max(1, current - 1);
                      let end = Math.min(total, current + 1);
                      if (current <= 2) {
                        start = 1;
                        end = 3;
                      } else if (current >= total - 1) {
                        start = total - 2;
                        end = total;
                      }
                      if (start > 1) {
                        pages.push(1);
                        if (start > 2) pages.push('...');
                      }
                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }
                      if (end < total) {
                        if (end < total - 1) pages.push('...');
                        pages.push(total);
                      }
                    }

                    return pages.map((p, idx) => (
                      typeof p === 'number' ? (
                        <TouchableOpacity
                          key={p}
                          style={[styles.pageBtn, p === page && styles.pageBtnActive]}
                          onPress={() => setPage(p)}
                        >
                          <Text style={[styles.pageBtnText, p === page && styles.pageBtnActiveText]}>{p}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text key={`dots-${idx}`} style={[styles.pageBtnText, { marginHorizontal: 2 }]}>...</Text>
                      )
                    ));
                  })()}

                  <TouchableOpacity
                    style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                    onPress={() => page < totalPages && setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <Ionicons name="chevron-forward" size={14} color={page === totalPages ? '#D1D5DB' : '#374151'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* ── Bottom Nav Bar ── */}
          <View style={styles.bottomTabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admin/dashboard' as any)}>
              <Ionicons name="grid-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admin/orders' as any)}>
              <Ionicons name="bag-handle-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admin/products' as any)}>
              <Ionicons name="cube-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
              <Ionicons name="pricetag" size={22} color="#2D4B34" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Coupons</Text>
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

          {/* ── Add / Edit Coupon Modal ── */}
          <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
            >
              <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddModal(false)} />
              <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>{editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}</Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={20} color="#111827" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  ref={modalScrollViewRef}
                  style={{ flexShrink: 1, maxHeight: SCREEN_HEIGHT * 0.48 }}
                  contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <Text style={styles.fieldLabel}>Coupon Code *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. SARANGA10"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                    value={formCode}
                    onChangeText={setFormCode}
                  />

                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                    placeholder="e.g. Flat 10% off on min order"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    value={formDesc}
                    onChangeText={setFormDesc}
                  />

                  {/* Discount Type Selector */}
                  <Text style={styles.fieldLabel}>Discount Type</Text>
                  <View style={styles.typeSelectorRow}>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formType === 'percentage' && styles.typeOptionBtnActive]}
                      onPress={() => setFormType('percentage')}
                    >
                      <Text style={[styles.typeOptionText, formType === 'percentage' && styles.typeOptionTextActive]}>Percentage (%)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formType === 'fixed' && styles.typeOptionBtnActive]}
                      onPress={() => setFormType('fixed')}
                    >
                      <Text style={[styles.typeOptionText, formType === 'fixed' && styles.typeOptionTextActive]}>Fixed Amount (₹)</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.fieldLabel}>{formType === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (₹) *'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={formType === 'percentage' ? 'e.g. 10' : 'e.g. 100'}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={formValue}
                    onChangeText={setFormValue}
                  />

                  <Text style={styles.fieldLabel}>Minimum Purchase Amount (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 500 (0 for no minimum)"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={formMinPurchase}
                    onChangeText={setFormMinPurchase}
                  />

                  {formType === 'percentage' && (
                    <>
                      <Text style={styles.fieldLabel}>Max Discount Amount (₹)</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Optional"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={formMaxDiscount}
                        onChangeText={setFormMaxDiscount}
                      />
                    </>
                  )}

                  <Text style={styles.fieldLabel}>Usage Limit</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Optional (e.g. 500)"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={formUsageLimit}
                    onChangeText={setFormUsageLimit}
                  />

                  {/* Date Pickers */}
                  <Text style={styles.fieldLabel}>Validity Period</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                    <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartDatePicker(true)}>
                      <Ionicons name="calendar-outline" size={16} color="#2D4B34" />
                      <Text style={styles.datePickerBtnText}>Start: {formatDate(formStartDate.toISOString())}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndDatePicker(true)}>
                      <Ionicons name="calendar-outline" size={16} color="#2D4B34" />
                      <Text style={styles.datePickerBtnText}>End: {formatDate(formEndDate.toISOString())}</Text>
                    </TouchableOpacity>
                  </View>

                  {showStartDatePicker && (
                    <DateTimePicker
                      value={formStartDate}
                      mode="date"
                      display="default"
                      onChange={(event: any, selectedDate?: Date) => {
                        setShowStartDatePicker(false);
                        if (selectedDate) setFormStartDate(selectedDate);
                      }}
                    />
                  )}
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={formEndDate}
                      mode="date"
                      display="default"
                      onChange={(event: any, selectedDate?: Date) => {
                        setShowEndDatePicker(false);
                        if (selectedDate) setFormEndDate(selectedDate);
                      }}
                    />
                  )}
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleFormSubmit} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>{editingCoupon ? 'Save Changes' : 'Create Coupon'}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* ── Coupon Options Modal ── */}
          <Modal visible={showOptionsModal} transparent animationType="slide" onRequestClose={() => setShowOptionsModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
              <View style={styles.modalSheet}>
                {selectedCoupon && (
                  <>
                    <Text style={styles.modalTitle}>Coupon: {selectedCoupon.code}</Text>
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        setShowOptionsModal(false);
                        openEditModal(selectedCoupon);
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#374151" style={{ marginRight: 10 }} />
                      <Text style={styles.modalOptionText}>Edit Coupon Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        setShowOptionsModal(false);
                        handleToggleStatus(selectedCoupon);
                      }}
                    >
                      <Ionicons name="power-outline" size={18} color="#374151" style={{ marginRight: 10 }} />
                      <Text style={styles.modalOptionText}>
                        Mark as {selectedCoupon.is_active ? 'Expired / Inactive' : 'Active'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => handleDeleteCoupon(selectedCoupon.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 10 }} />
                      <Text style={[styles.modalOptionText, { color: '#DC2626' }]}>Delete Coupon</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Status Filter Modal ── */}
          <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusModal(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Filter by Status</Text>
                {[
                  { label: 'All Status', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Expired', value: 'expired' },
                ].map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.modalOption, statusFilter === s.value && styles.modalOptionActive]}
                    onPress={() => { setStatusFilter(s.value as any); setPage(1); setShowStatusModal(false); }}
                  >
                    <Text style={[styles.modalOptionText, statusFilter === s.value && styles.modalOptionTextActive]}>{s.label}</Text>
                    {statusFilter === s.value && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Discount Type Filter Modal ── */}
          <Modal visible={showTypeModal} transparent animationType="slide" onRequestClose={() => setShowTypeModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypeModal(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Filter by Discount Type</Text>
                {[
                  { label: 'All Discount Types', value: 'all' },
                  { label: 'Percentage (%)', value: 'percentage' },
                  { label: 'Fixed Amount (₹)', value: 'fixed' },
                ].map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.modalOption, discountTypeFilter === t.value && styles.modalOptionActive]}
                    onPress={() => { setDiscountTypeFilter(t.value as any); setPage(1); setShowTypeModal(false); }}
                  >
                    <Text style={[styles.modalOptionText, discountTypeFilter === t.value && styles.modalOptionTextActive]}>{t.label}</Text>
                    {discountTypeFilter === t.value && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                  </TouchableOpacity>
                ))}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 6,
  },
  headerTitleContainer: { flex: 1 },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  menuBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 10, color: '#6B7280', marginTop: 1 },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#E5E7EB' },

  body: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },

  // Action Button
  actionBtnRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  primaryAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D4B34',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  primaryAddBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Stat Grid (2x2)
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 34) / 2,
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

  // Search Row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  searchInput: { flex: 1, fontSize: 12, color: '#111827' },

  // Filter Pills Row
  filterPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  filterPillText: { fontSize: 11, color: '#374151', fontWeight: '500' },
  secondaryExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 'auto',
  },
  secondaryExportBtnText: { fontSize: 11, color: '#2D4B34', fontWeight: '600' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
    marginTop: 4,
    gap: 4,
  },
  tableHeaderCell: { fontSize: 9.5, fontWeight: '700', color: '#6B7280' },

  // Coupon Row Item
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  couponMainCol: { flex: 2.0, minWidth: 0 },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  codeBadgeText: { fontSize: 11, fontWeight: '800' },
  couponTitle: { fontSize: 12, fontWeight: '700', color: '#111827' },
  couponSubtext: { fontSize: 10, color: '#6B7280', marginTop: 1 },

  discountCol: { flex: 1.4, alignItems: 'center' },
  discountValueText: { fontSize: 12, fontWeight: '800', color: '#111827' },
  discountTypeText: { fontSize: 9, color: '#6B7280' },

  validityCol: { flex: 1.7, alignItems: 'center' },
  validityDateText: { fontSize: 9, color: '#374151', fontWeight: '500' },
  validitySep: { fontSize: 9, color: '#9CA3AF' },

  usageCol: { flex: 0.9, alignItems: 'center' },
  usageCountText: { fontSize: 12, fontWeight: '800', color: '#111827' },
  usageLimitText: { fontSize: 9, color: '#6B7280' },

  statusCol: { flex: 1.0, alignItems: 'center', minWidth: 50 },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },

  actionsCol: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  iconActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

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

  // Bottom Nav
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { flex: 1 },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    maxHeight: SCREEN_HEIGHT * 0.72,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#111827',
    marginBottom: 10,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  typeOptionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  typeOptionBtnActive: {
    backgroundColor: '#EAF6ED',
    borderColor: '#2D4B34',
  },
  typeOptionText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  typeOptionTextActive: { color: '#2D4B34', fontWeight: '700' },

  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  datePickerBtnText: { fontSize: 11, color: '#374151', fontWeight: '600' },

  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
  },
  modalCancelBtnText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  modalSubmitBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D4B34',
    borderRadius: 10,
    paddingVertical: 12,
  },
  modalSubmitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

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
});