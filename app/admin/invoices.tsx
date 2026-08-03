import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { AdminMoreModal } from './components/AdminMoreModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  invoice_date: string;
  due_date: string | null;
  sales_person: string;
  grand_total: string;
  status: 'draft' | 'finalized' | 'cancelled';
  company_name: string;
}

interface Pagination {
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Immediate';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft:      { bg: '#FEF9C3', text: '#CA8A04', border: '#FDE047' },
  finalized:  { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' },
  cancelled:  { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminInvoices() {
  const router = useRouter();
  const isMounted = useRef(true);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [salesPersonFilter, setSalesPersonFilter] = useState('');

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const LIMIT = 10;

  const [showMoreModal, setShowMoreModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchInvoices = useCallback(async (pageNum = page, reset = false) => {
    try {
      if (reset) setLoading(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(LIMIT),
        search: searchQuery,
        status: statusFilter,
        sales_person: salesPersonFilter,
        _t: String(Date.now()),
      });
      const res = await apiService.get<{ invoices: Invoice[]; pagination: Pagination }>(
        `/admin/invoices?${params.toString()}`
      );
      if (isMounted.current) {
        setInvoices(res.data?.invoices || []);
        setPagination(res.data?.pagination || null);
      }
    } catch (err) {
      console.error('fetchInvoices error:', err);
      Alert.alert('Error', 'Failed to fetch invoices');
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, searchQuery, statusFilter, salesPersonFilter]);

  useEffect(() => {
    isMounted.current = true;
    fetchInvoices(page, true);
    return () => { isMounted.current = false; };
  }, [page, statusFilter, salesPersonFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchInvoices(1, false);
  };

  const handleSearch = () => {
    setPage(1);
    fetchInvoices(1, true);
  };

  // ── Back navigation ────────────────────────────────────────────────────────

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/admin/dashboard' as any);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = (id: number, invoiceNo: string) => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete Invoice "${invoiceNo}"?\nWARNING: If finalized, stock counts will be restored.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await apiService.delete(`/admin/invoices/${id}`);
              Alert.alert('Success', 'Invoice deleted and stock adjusted');
              fetchInvoices(page, true);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete invoice');
            } finally {
              if (isMounted.current) setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Download PDF ───────────────────────────────────────────────────────────

  const handleDownloadPDF = async (id: number, invoiceNo: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      // Use backend base URL
      const baseUrl = 'http://localhost:5001/api';
      const url = `${baseUrl}/admin/invoices/${id}/pdf?Authorization=Bearer%20${token}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Info', `PDF for invoice ${invoiceNo} can be downloaded via the web admin panel.`);
      }
    } catch (err) {
      Alert.alert('Info', 'PDF download available in the web admin panel.');
    }
  };

  // ── Email PDF ──────────────────────────────────────────────────────────────

  const handleEmailPDF = (id: number) => {
    Alert.prompt(
      'Send Invoice PDF',
      'Enter customer email to send invoice:',
      async (email) => {
        if (!email?.trim()) return;
        try {
          await apiService.post(`/admin/invoices/${id}/email`, { email });
          Alert.alert('Success', `Invoice emailed successfully to ${email}`);
        } catch (err) {
          Alert.alert('Error', 'Failed to email invoice PDF');
        }
      },
      'plain-text'
    );
  };

  // ── Render Invoice Card ────────────────────────────────────────────────────

  const renderInvoiceCard = (inv: Invoice) => {
    const colors = STATUS_COLORS[inv.status] || STATUS_COLORS.draft;
    const isDeleting = deletingId === inv.id;

    return (
      <View key={inv.id} style={styles.invoiceCard}>
        {/* Card Top Row */}
        <View style={styles.cardTopRow}>
          <View style={styles.invoiceNumWrap}>
            <Ionicons name="document-text-outline" size={14} color="#2D4B34" />
            <Text style={styles.invoiceNum}>{inv.invoice_number}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.statusBadgeText, { color: colors.text }]}>
              {(inv.status || 'draft').charAt(0).toUpperCase() + (inv.status || 'draft').slice(1)}
            </Text>
          </View>
        </View>

        {/* Customer */}
        <Text style={styles.customerName} numberOfLines={1}>{inv.customer_name}</Text>
        <Text style={styles.companyName} numberOfLines={1}>{inv.company_name}</Text>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Invoice Date</Text>
            <Text style={styles.infoValue}>{formatDate(inv.invoice_date)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Due Date</Text>
            <Text style={styles.infoValue}>{formatDate(inv.due_date)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Salesperson</Text>
            <Text style={styles.infoValue}>{inv.sales_person || 'Direct'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Grand Total</Text>
            <Text style={[styles.infoValue, styles.totalText]}>₹{parseFloat(inv.grand_total || '0').toFixed(2)}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/admin/invoice-detail?id=${inv.id}` as any)}
          >
            <Ionicons name="eye-outline" size={15} color="#2D4B34" />
            <Text style={styles.actionBtnText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDownloadPDF(inv.id, inv.invoice_number)}
          >
            <Ionicons name="download-outline" size={15} color="#6B7280" />
            <Text style={[styles.actionBtnText, { color: '#6B7280' }]}>PDF</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleEmailPDF(inv.id)}
            >
              <Ionicons name="mail-outline" size={15} color="#6B7280" />
              <Text style={[styles.actionBtnText, { color: '#6B7280' }]}>Email</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(inv.id, inv.invoice_number)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={15} color="#DC2626" />
                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* ── Top Header ── */}
          <View style={styles.topHeader}>
            <View style={styles.headerLeftContainer}>
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#111827" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Invoice Records</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Create & manage sales invoices
                </Text>
              </View>
            </View>

            <View style={styles.headerRightContainer}>
              <TouchableOpacity
                style={styles.newInvoiceBtn}
                onPress={() => router.push('/admin/invoice-form' as any)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.newInvoiceBtnText}>New</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
                <Ionicons name="refresh-outline" size={18} color="#111827" />
              </TouchableOpacity>
              <Image source={require('../assets/images/logo.png')} style={styles.profileAvatar} resizeMode="contain" />
            </View>
          </View>

          {/* ── Search & Filters ── */}
          <View style={styles.filterSection}>
            {/* Search Row */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={15} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search invoice number or customer..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setPage(1); fetchInvoices(1, true); }}>
                  <Ionicons name="close-circle" size={15} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Status Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
              {[
                { label: 'All', value: '' },
                { label: 'Drafts', value: 'draft' },
                { label: 'Finalized', value: 'finalized' },
                { label: 'Cancelled', value: 'cancelled' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.filterPill, statusFilter === opt.value && styles.filterPillActive]}
                  onPress={() => { setStatusFilter(opt.value); setPage(1); }}
                >
                  <Text style={[styles.filterPillText, statusFilter === opt.value && styles.filterPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Sales person filter pills */}
              {['Direct Sales', 'Field Agent 1', 'Field Agent 2'].map(sp => (
                <TouchableOpacity
                  key={sp}
                  style={[styles.filterPill, salesPersonFilter === sp && styles.filterPillActive]}
                  onPress={() => { setSalesPersonFilter(salesPersonFilter === sp ? '' : sp); setPage(1); }}
                >
                  <Text style={[styles.filterPillText, salesPersonFilter === sp && styles.filterPillTextActive]}>
                    {sp}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Body Content ── */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90, paddingHorizontal: 12, paddingTop: 8 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D4B34']} tintColor="#2D4B34" />
            }
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2D4B34" />
                <Text style={styles.loadingText}>Loading invoices...</Text>
              </View>
            ) : invoices.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={52} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Invoices Found</Text>
                <Text style={styles.emptySubtitle}>No invoice transactions match your current filters.</Text>
                <TouchableOpacity style={styles.createFirstBtn} onPress={() => router.push('/admin/invoice-form' as any)}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.createFirstBtnText}>Create First Invoice</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Summary Line */}
                <Text style={styles.summaryLine}>
                  {pagination
                    ? `Showing ${invoices.length} of ${pagination.total} invoices`
                    : `${invoices.length} invoice(s)`}
                </Text>

                {/* Invoice Cards */}
                {invoices.map(inv => renderInvoiceCard(inv))}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                      onPress={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <Ionicons name="chevron-back" size={16} color={page === 1 ? '#9CA3AF' : '#2D4B34'} />
                      <Text style={[styles.pageBtnText, page === 1 && { color: '#9CA3AF' }]}>Prev</Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfo}>Page {page} of {pagination.totalPages}</Text>

                    <TouchableOpacity
                      style={[styles.pageBtn, page === pagination.totalPages && styles.pageBtnDisabled]}
                      onPress={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                    >
                      <Text style={[styles.pageBtnText, page === pagination.totalPages && { color: '#9CA3AF' }]}>Next</Text>
                      <Ionicons name="chevron-forward" size={16} color={page === pagination.totalPages ? '#9CA3AF' : '#2D4B34'} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* ── Bottom Navigation Bar ── */}
          <View style={styles.bottomTabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admin/dashboard' as any)}>
              <Ionicons name="grid-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admin/orders' as any)}>
              <Ionicons name="bag-handle-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
              <Ionicons name="document-text" size={22} color="#2D4B34" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Invoices</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admin/products' as any)}>
              <Ionicons name="cube-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setShowMoreModal(true)}>
              <Ionicons name="ellipsis-horizontal-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>More</Text>
            </TouchableOpacity>
          </View>

          {/* ── Admin Navigation Shared Modal ── */}
          <AdminMoreModal
            visible={showMoreModal}
            onClose={() => setShowMoreModal(false)}
          />

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

  /* Header */
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
  backBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 10, color: '#6B7280', marginTop: 1 },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  newInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2D4B34',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newInvoiceBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },

  /* Filters */
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginHorizontal: 12,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 12, color: '#111827' },
  pillsScroll: { flexShrink: 0 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: { backgroundColor: '#EAF6ED', borderColor: '#2D4B34' },
  filterPillText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  filterPillTextActive: { color: '#2D4B34', fontWeight: '700' },

  /* Body */
  body: { flex: 1 },

  summaryLine: { fontSize: 11, color: '#6B7280', marginBottom: 8 },

  /* Invoice Card */
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  invoiceNumWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  invoiceNum: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  customerName: { fontSize: 13, fontWeight: '600', color: '#374151' },
  companyName: { fontSize: 11, color: '#9CA3AF', marginBottom: 8 },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  infoItem: { flex: 1, minWidth: '40%' },
  infoLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 12, color: '#374151', fontWeight: '600' },
  totalText: { fontSize: 14, fontWeight: '800', color: '#2D4B34' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 10 },

  /* Action Buttons */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF6ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: '#2D4B34' },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },

  /* Loading / Empty */
  loadingContainer: { alignItems: 'center', paddingVertical: 50 },
  loadingText: { color: '#6B7280', marginTop: 10, fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 14 },
  emptySubtitle: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4, paddingHorizontal: 30 },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2D4B34',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  createFirstBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  /* Pagination */
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 12, fontWeight: '600', color: '#2D4B34' },
  pageInfo: { fontSize: 12, color: '#6B7280' },

  /* Bottom Bar */
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
});
