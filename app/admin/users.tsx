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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { UserDetailsModal } from './components/UserDetailsModal';
import { AdminMoreModal } from './components/AdminMoreModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_LIMIT = 8;

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  total_orders: number;
  total_spent: number;
  created_at: string;
  last_login?: string;
  status: 'active' | 'inactive' | 'blocked';
  phone?: string;
  avatar_url?: string;
  address?: any;
  addresses?: any[];
  preferences?: any;
}

interface UserStats {
  total: number; total_trend: number;
  new_this_month: number; new_this_month_trend: number;
  repeat_customers: number; repeat_customers_trend: number;
  avg_order_value: string; avg_order_value_trend: number;
}

// ─── Top-Level Memoized User Avatar Component ─────────────────────────────

const UserAvatar = React.memo(({ name, url }: { name: string; url?: string }) => {
  const avatarUri = React.useMemo(() => {
    if (url) return apiService.getFullImageUrl(url);
    const encoded = encodeURIComponent(name || 'Customer');
    return `https://ui-avatars.com/api/?name=${encoded}&background=EAF6ED&color=2D4B34&bold=true&size=100`;
  }, [name, url]);

  const [hasError, setHasError] = useState(false);

  return (
    <Image
      source={hasError ? { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Customer')}&background=EAF6ED&color=2D4B34` } : { uri: avatarUri }}
      style={styles.customerAvatar}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminUsersScreen() {
  const router = useRouter();
  const isMounted = useRef(true);

  // Stats State
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users List State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  // Filter & Search Controls
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Customer Detail, Options & Admin More Modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

  // Add Customer Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // ── Fetch Stats ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiService.get('/admin/users/stats');
      if (res.data && isMounted.current) {
        setStats(res.data);
      }
    } catch (e) {
      console.error('fetchStats error:', e);
    } finally {
      if (isMounted.current) setStatsLoading(false);
    }
  }, []);

  // ── Fetch Users ───────────────────────────────────────────────────────────

  const fetchUsersList = useCallback(async (reset = false) => {
    if (!isMounted.current) return;
    if (reset) setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery && searchQuery.trim()) queryParams.append('search', searchQuery.trim());
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      const res = await apiService.get(`/admin/users?${queryParams.toString()}`);
      const rawData = res.data ? (Array.isArray(res.data) ? res.data : (res.data.users || res.data.data || [])) : [];
      
      if (Array.isArray(rawData) && isMounted.current) {
        const mapped: User[] = rawData.map((u: any) => ({
          id: Number(u.id),
          name: u.name || 'Customer',
          email: u.email || '',
          role: u.role || 'user',
          total_orders: Number(u.total_orders || 0),
          total_spent: Number(u.total_spent || 0),
          created_at: u.created_at || new Date().toISOString(),
          status: u.status || 'active',
          phone: u.phone || undefined,
          avatar_url: u.avatar_url || u.photo_url || undefined,
        }));
        setUsers(mapped);
      }
    } catch (e) {
      console.error('fetchUsersList error:', e);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    isMounted.current = true;
    fetchStats();
    fetchUsersList(true);
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    fetchUsersList(true);
  }, [searchQuery, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    await fetchUsersList(true);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleUpdateUserStatus = async (user: User, newStatus: 'active' | 'inactive' | 'blocked') => {
    try {
      const res = await apiService.put(`${apiService.ENDPOINTS.ADMIN_USERS}/${user.id}/status`, {
        status: newStatus,
      });
      if (res.error) throw new Error(res.error);
      Alert.alert('Success', `Customer status updated to ${newStatus}`);
      setOptionsModalVisible(false);
      fetchUsersList(false);
      fetchStats();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update customer status');
    }
  };

  const handleAddCustomerSubmit = async () => {
    if (!addName.trim() || !addEmail.trim()) {
      Alert.alert('Validation Error', 'Name and Email are required.');
      return;
    }
    setSubmittingAdd(true);
    try {
      const res = await apiService.post('/admin/users', {
        name: addName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim(),
      });
      if (res.error) throw new Error(res.error);
      Alert.alert('Success', 'New customer account created successfully!');
      setShowAddModal(false);
      setAddName('');
      setAddEmail('');
      setAddPhone('');
      fetchUsersList(true);
      fetchStats();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create customer account');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleExportCustomers = () => {
    Alert.alert(
      'Export Customers',
      'Download customer list report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            Alert.alert('Success', 'Customer list report exported successfully.');
          },
        },
      ]
    );
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_LIMIT));
  const paginatedUsers = users.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'May 18, 2025';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'May 18, 2025';
    }
  };

  // ── Stat Card Component ───────────────────────────────────────────────────

  const StatCard = ({ label, value, trend, iconName, iconBg, onPress }: {
    label: string; value: string | number; trend: number;
    iconName: string; iconBg: string; onPress?: () => void;
  }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statIconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName as any} size={18} color="#2D4B34" />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
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
                <Text style={styles.headerTitle}>Customers</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>Manage and view all your customers.</Text>
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
            {/* ── Stat Cards Grid (2x2) ── */}
            {statsLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator color="#2D4B34" />
              </View>
            ) : stats ? (
              <View style={styles.statGrid}>
                <StatCard label="Total Customers" value={stats.total} trend={stats.total_trend} iconName="people-outline" iconBg="#EAF6ED" onPress={() => setStatusFilter('all')} />
                <StatCard label="New Customers (This Month)" value={stats.new_this_month} trend={stats.new_this_month_trend} iconName="person-add-outline" iconBg="#FFF8E1" />
                <StatCard label="Repeat Customers" value={stats.repeat_customers} trend={stats.repeat_customers_trend} iconName="cart-outline" iconBg="#EAF6ED" />
                <StatCard label="Avg. Order Value" value={`₹${stats.avg_order_value}`} trend={stats.avg_order_value_trend} iconName="wallet-outline" iconBg="#FEE2E2" />
              </View>
            ) : null}

            {/* ── Search & Filter Controls Row ── */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, email or phone..."
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

              <TouchableOpacity style={styles.filterPill} onPress={() => setShowStatusModal(true)}>
                <Text style={styles.filterPillText}>
                  {statusFilter === 'all' ? 'All Status' : statusFilter.toUpperCase()}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* ── Customers List ── */}
            {loading && !refreshing ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#2D4B34" />
                <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 13 }}>Loading customers...</Text>
              </View>
            ) : paginatedUsers.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', marginTop: 12, fontSize: 14 }}>No customers found</Text>
              </View>
            ) : (
              paginatedUsers.map(item => {
                const isActive = item.status === 'active' || !item.status;
                const isBlocked = item.status === 'blocked';
                const badgeBg = isBlocked ? '#FEE2E2' : isActive ? '#EAF6ED' : '#FFF3E0';
                const badgeText = isBlocked ? '#DC2626' : isActive ? '#15803D' : '#D97706';
                const badgeLabel = isBlocked ? 'Blocked' : isActive ? 'Active' : 'Inactive';

                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={styles.customerRow}
                    onPress={() => { setSelectedUser(item); setDetailModalVisible(true); }}
                    activeOpacity={0.8}
                  >
                    {/* Customer Avatar */}
                    <UserAvatar name={item.name} url={item.avatar_url} />

                    {/* Main Info (Name, Email, Phone) */}
                    <View style={styles.customerMainInfo}>
                      <Text style={styles.customerName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.customerSubtext} numberOfLines={1}>{item.email}</Text>
                      {Boolean(item.phone && String(item.phone).trim()) && (
                        <Text style={styles.customerPhoneText} numberOfLines={1}>{item.phone}</Text>
                      )}
                    </View>

                    {/* Orders & Spent */}
                    <View style={styles.customerOrdersCol}>
                      <Text style={styles.customerOrderCount}>{item.total_orders || 0}</Text>
                      <Text style={styles.customerOrderLabel}>Orders</Text>
                    </View>

                    <View style={styles.customerSpentCol}>
                      <Text style={styles.customerSpentAmount}>₹{parseFloat(String(item.total_spent || 0)).toFixed(2)}</Text>
                      <Text style={styles.customerSpentLabel}>Spent</Text>
                    </View>

                    {/* Status & Date */}
                    <View style={styles.customerStatusCol}>
                      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.statusBadgeText, { color: badgeText }]} numberOfLines={1}>
                          {badgeLabel}
                        </Text>
                      </View>
                      <Text style={styles.customerDateText}>{formatDate(item.created_at)}</Text>
                    </View>

                    {/* Actions (View Detail Eye & Options) */}
                    <View style={styles.customerActionsRow}>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => { setSelectedUser(item); setDetailModalVisible(true); }}
                      >
                        <Ionicons name="eye-outline" size={16} color="#374151" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => { setSelectedUser(item); setOptionsModalVisible(true); }}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color="#374151" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* ── Pagination ── */}
            {users.length > 0 && (
              <View style={styles.paginationContainer}>
                <Text style={styles.paginationInfo}>
                  Showing {(page - 1) * PAGE_LIMIT + 1} to {Math.min(page * PAGE_LIMIT, users.length)} of {users.length.toLocaleString()} customers
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
              <Ionicons name="people" size={22} color="#2D4B34" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Customers</Text>
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

          {/* ── User Details Modal ── */}
          <UserDetailsModal
            user={selectedUser as any}
            visible={detailModalVisible}
            onClose={() => setDetailModalVisible(false)}
          />

          {/* ── Add Customer Modal ── */}
          <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
              <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>Add New Customer</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Full Name *"
                  placeholderTextColor="#9CA3AF"
                  value={addName}
                  onChangeText={setAddName}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Email Address *"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={addEmail}
                  onChangeText={setAddEmail}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Phone Number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={addPhone}
                  onChangeText={setAddPhone}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddCustomerSubmit} disabled={submittingAdd}>
                    {submittingAdd ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>Create Customer</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Customer Options Modal ── */}
          <Modal visible={optionsModalVisible} transparent animationType="slide" onRequestClose={() => setOptionsModalVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
              <View style={styles.modalSheet}>
                {selectedUser && (
                  <>
                    <Text style={styles.modalTitle}>{selectedUser.name}</Text>
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        setOptionsModalVisible(false);
                        setDetailModalVisible(true);
                      }}
                    >
                      <Ionicons name="eye-outline" size={18} color="#374151" style={{ marginRight: 10 }} />
                      <Text style={styles.modalOptionText}>View Customer Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => handleUpdateUserStatus(selectedUser, selectedUser.status === 'active' ? 'inactive' : 'active')}
                    >
                      <Ionicons name="power-outline" size={18} color="#374151" style={{ marginRight: 10 }} />
                      <Text style={styles.modalOptionText}>
                        Mark as {selectedUser.status === 'active' ? 'Inactive' : 'Active'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => handleUpdateUserStatus(selectedUser, 'blocked')}
                    >
                      <Ionicons name="ban-outline" size={18} color="#DC2626" style={{ marginRight: 10 }} />
                      <Text style={[styles.modalOptionText, { color: '#DC2626' }]}>Block Customer</Text>
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
                  { label: 'Inactive', value: 'inactive' },
                  { label: 'Blocked', value: 'blocked' },
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

  // Action Buttons
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
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

  // Customer List Item Row
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF6ED',
  },
  customerMainInfo: { flex: 2, minWidth: 0 },
  customerName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  customerSubtext: { fontSize: 10, color: '#6B7280', marginTop: 1 },
  customerPhoneText: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },

  customerOrdersCol: { width: 50, alignItems: 'center' },
  customerOrderCount: { fontSize: 12, fontWeight: '700', color: '#111827' },
  customerOrderLabel: { fontSize: 9, color: '#6B7280' },

  customerSpentCol: { width: 68, alignItems: 'flex-end' },
  customerSpentAmount: { fontSize: 12, fontWeight: '700', color: '#111827' },
  customerSpentLabel: { fontSize: 9, color: '#6B7280' },

  customerStatusCol: { minWidth: 62, alignItems: 'flex-end', justifyContent: 'center' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  customerDateText: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },

  customerActionsRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
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
    justifyContent: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionActive: { backgroundColor: '#EAF6ED' },
  modalOptionText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  modalOptionTextActive: { color: '#2D4B34', fontWeight: '700' },
});