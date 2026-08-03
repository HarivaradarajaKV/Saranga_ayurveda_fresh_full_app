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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { useCategories } from '../CategoryContext';
import AddProductForm from './components/AddProductForm';
import EditProductForm from './components/EditProductForm';
import { AdminMoreModal } from './components/AdminMoreModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_LIMIT = 10;

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  category_id: number;
  image_url: string;
  image_url2?: string;
  image_url3?: string;
  image_url4?: string;
  usage_instructions?: string;
  size?: string;
  benefits?: string;
  ingredients?: string;
  product_details?: string;
  stock_quantity: number;
  created_at: string;
  offer_percentage: number;
  is_active?: boolean;
  sku_display?: string;
  categories?: { id: number; name: string }[];
}

interface ProductStats {
  total: number; total_trend: number;
  active: number; active_trend: number;
  inactive: number; inactive_trend: number;
  out_of_stock: number; out_of_stock_trend: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AdminProductsProps {
  initialShowAddForm?: boolean;
}

export default function AdminProductsScreen({ initialShowAddForm = false }: AdminProductsProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isMounted = useRef(true);

  const { categories = [] } = useCategories();

  // Stats State
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & View Controls
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Filter Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // Add / Edit / Options / Admin More Modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

  // Auto-navigate to /admin/products/new if initialShowAddForm is true
  useEffect(() => {
    if (initialShowAddForm || params.showAddForm === 'true') {
      router.push('/admin/products/new' as any);
    }
  }, [initialShowAddForm, params.showAddForm]);

  // ── Fetch Stats ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiService.get('/admin/products/stats');
      if (res.data && isMounted.current) {
        setStats(res.data);
      }
    } catch (e) {
      console.error('fetchStats error:', e);
    } finally {
      if (isMounted.current) setStatsLoading(false);
    }
  }, []);

  // ── Fetch Products ────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (p = page, reset = false) => {
    if (!isMounted.current) return;
    if (reset) setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(p));
      queryParams.append('limit', String(PAGE_LIMIT));
      if (selectedCategory !== 'all') queryParams.append('category_id', selectedCategory);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (stockStatusFilter !== 'all') queryParams.append('stock_status', stockStatusFilter);
      if (searchQuery && searchQuery.trim()) queryParams.append('search', searchQuery.trim());

      const res = await apiService.get(`/admin/products?${queryParams.toString()}`);
      if (res.data && isMounted.current) {
        const list = Array.isArray(res.data) ? res.data : (res.data.products || []);
        const totalCount = Array.isArray(res.data) ? res.data.length : (res.data.total ?? list.length);
        setProducts(list);
        setTotal(totalCount);
        setPage(p);
      }
    } catch (e) {
      console.error('fetchProducts error:', e);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedCategory, statusFilter, stockStatusFilter, searchQuery, page]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDeleteProduct = (productId: number) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiService.delete(`${apiService.ENDPOINTS.PRODUCTS}/${productId}`);
              if (res.error) throw new Error(res.error);
              Alert.alert('Success', 'Product deleted successfully');
              setShowOptionsModal(false);
              setSelectedProduct(null);
              fetchProducts(page, true);
              fetchStats();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleToggleProductStatus = async (product: Product) => {
    const newStatus = !(product.is_active !== false);
    try {
      const formData = new FormData();
      formData.append('is_active', String(newStatus));
      const res = await apiService.updateProduct(product.id, formData);
      if (res.error) throw new Error(res.error);
      Alert.alert('Success', `Product set to ${newStatus ? 'Active' : 'Inactive'}`);
      setShowOptionsModal(false);
      fetchProducts(page, false);
      fetchStats();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update product status');
    }
  };

  const handleUpdateProduct = async (formData: FormData) => {
    if (!editingProduct) return;
    try {
      const res = await apiService.updateProduct(editingProduct.id, formData);
      if (res.error) throw new Error(res.error);
      Alert.alert('Success', 'Product updated successfully!');
      setEditingProduct(null);
      fetchProducts(page, false);
      fetchStats();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update product');
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchStats();
    fetchProducts(1, true);
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    fetchProducts(1, true);
  }, [selectedCategory, statusFilter, stockStatusFilter, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchProducts(1, true);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  // ── Render Form Modals if Open ────────────────────────────────────────────

  if (editingProduct) {
    return (
      <EditProductForm
        product={editingProduct as any}
        onSubmit={handleUpdateProduct}
        onCancel={() => setEditingProduct(null)}
      />
    );
  }

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
                <Text style={styles.headerTitle}>Products</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>Manage and organize all your products.</Text>
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
            {/* ── Action Button Row ── */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity style={styles.primaryAddBtn} onPress={() => router.push('/admin/products/new' as any)} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.primaryAddBtnText}>Add New Product</Text>
              </TouchableOpacity>
            </View>

            {/* ── Stat Cards (2x2 Grid) ── */}
            {statsLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator color="#2D4B34" />
              </View>
            ) : stats ? (
              <View style={styles.statGrid}>
                <StatCard label="Total Products" value={stats.total} trend={stats.total_trend} iconName="cube-outline" iconBg="#FFF8E1" onPress={() => { setStatusFilter('all'); setStockStatusFilter('all'); }} />
                <StatCard label="Active Products" value={stats.active} trend={stats.active_trend} iconName="eye-outline" iconBg="#EAF6ED" onPress={() => setStatusFilter('active')} />
                <StatCard label="Inactive Products" value={stats.inactive} trend={stats.inactive_trend} iconName="pause-circle-outline" iconBg="#FEE2E2" onPress={() => setStatusFilter('inactive')} />
                <StatCard label="Out of Stock" value={stats.out_of_stock} trend={stats.out_of_stock_trend} iconName="pricetag-outline" iconBg="#FEE2E2" onPress={() => setStockStatusFilter('out_of_stock')} />
              </View>
            ) : null}

            {/* ── Search & View Mode Controls Row ── */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by product name, SKU or category..."
                  placeholderTextColor="#9CA3AF"
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmitEditing={() => setSearchQuery(searchInput)}
                  returnKeyType="search"
                />
                {searchInput.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchInput(''); setSearchQuery(''); }}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.viewToggleGroup}>
                <TouchableOpacity
                  style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
                  onPress={() => setViewMode('list')}
                >
                  <Ionicons name="list" size={16} color={viewMode === 'list' ? '#2D4B34' : '#6B7280'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
                  onPress={() => setViewMode('grid')}
                >
                  <Ionicons name="grid" size={16} color={viewMode === 'grid' ? '#2D4B34' : '#6B7280'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Filter Pills Row ── */}
            <View style={styles.filterPillRow}>
              <TouchableOpacity style={styles.filterPill} onPress={() => setShowCategoryModal(true)}>
                <Text style={styles.filterPillText} numberOfLines={1}>
                  {selectedCategory === 'all' ? 'All Categories' : (categories.find(c => String(c.id) === String(selectedCategory))?.name || 'All Categories')}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.filterPill} onPress={() => setShowStatusModal(true)}>
                <Text style={styles.filterPillText}>
                  {statusFilter === 'all' ? 'All Status' : statusFilter === 'active' ? 'Active' : 'Inactive'}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.filterPill} onPress={() => setShowStockModal(true)}>
                <Text style={styles.filterPillText}>
                  {stockStatusFilter === 'all' ? 'All Stock Status' : stockStatusFilter === 'in_stock' ? 'In Stock' : stockStatusFilter === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* ── Products List / Grid ── */}
            {loading && !refreshing ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#2D4B34" />
                <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 13 }}>Loading products...</Text>
              </View>
            ) : products.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', marginTop: 12, fontSize: 14 }}>No products found</Text>
              </View>
            ) : viewMode === 'list' ? (
              products.map(item => <ProductRowItem key={String(item.id)} item={item} onEdit={setEditingProduct} />)
            ) : (
              <View style={styles.gridContainer}>
                {products.map(item => <ProductGridItem key={String(item.id)} item={item} onEdit={setEditingProduct} />)}
              </View>
            )}

            {/* ── Pagination ── */}
            {products.length > 0 && (
              <View style={styles.paginationContainer}>
                <Text style={styles.paginationInfo}>
                  Showing {(page - 1) * PAGE_LIMIT + 1} to {Math.min(page * PAGE_LIMIT, total)} of {total.toLocaleString()} products
                </Text>
                <View style={styles.paginationControls}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                    onPress={() => page > 1 && fetchProducts(page - 1, true)}
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
                          onPress={() => p !== page && fetchProducts(p, true)}
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
                    onPress={() => page < totalPages && fetchProducts(page + 1, true)}
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
            <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
              <Ionicons name="cube" size={22} color="#2D4B34" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Products</Text>
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

          {/* ── Category Filter Modal ── */}
          <Modal visible={showCategoryModal} transparent animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategoryModal(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  <TouchableOpacity
                    style={[styles.modalOption, selectedCategory === 'all' && styles.modalOptionActive]}
                    onPress={() => { setSelectedCategory('all'); setShowCategoryModal(false); }}
                  >
                    <Text style={[styles.modalOptionText, selectedCategory === 'all' && styles.modalOptionTextActive]}>All Categories</Text>
                    {selectedCategory === 'all' && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                  </TouchableOpacity>
                  {categories.map(c => (
                    <TouchableOpacity
                      key={String(c.id)}
                      style={[styles.modalOption, String(selectedCategory) === String(c.id) && styles.modalOptionActive]}
                      onPress={() => { setSelectedCategory(String(c.id)); setShowCategoryModal(false); }}
                    >
                      <Text style={[styles.modalOptionText, String(selectedCategory) === String(c.id) && styles.modalOptionTextActive]}>{c.name}</Text>
                      {String(selectedCategory) === String(c.id) && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
                ].map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.modalOption, statusFilter === s.value && styles.modalOptionActive]}
                    onPress={() => { setStatusFilter(s.value as any); setShowStatusModal(false); }}
                  >
                    <Text style={[styles.modalOptionText, statusFilter === s.value && styles.modalOptionTextActive]}>{s.label}</Text>
                    {statusFilter === s.value && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Stock Status Filter Modal ── */}
          <Modal visible={showStockModal} transparent animationType="slide" onRequestClose={() => setShowStockModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStockModal(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Filter by Stock Status</Text>
                {[
                  { label: 'All Stock Status', value: 'all' },
                  { label: 'In Stock (>10)', value: 'in_stock' },
                  { label: 'Low Stock (1-10)', value: 'low_stock' },
                  { label: 'Out of Stock (0)', value: 'out_of_stock' },
                ].map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.modalOption, stockStatusFilter === s.value && styles.modalOptionActive]}
                    onPress={() => { setStockStatusFilter(s.value as any); setShowStockModal(false); }}
                  >
                    <Text style={[styles.modalOptionText, stockStatusFilter === s.value && styles.modalOptionTextActive]}>{s.label}</Text>
                    {stockStatusFilter === s.value && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Product Options Modal (Edit / Delete / Toggle Status) ── */}
          <Modal visible={showOptionsModal} transparent animationType="slide" onRequestClose={() => setShowOptionsModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
              <View style={styles.modalSheet}>
                {selectedProduct && (
                  <>
                    <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        setShowOptionsModal(false);
                        setEditingProduct(selectedProduct);
                      }}
                    >
                      <Ionicons name="pencil-outline" size={18} color="#374151" style={{ marginRight: 10 }} />
                      <Text style={styles.modalOptionText}>Edit Product</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => handleToggleProductStatus(selectedProduct)}
                    >
                      <Ionicons name="power-outline" size={18} color="#374151" style={{ marginRight: 10 }} />
                      <Text style={styles.modalOptionText}>
                        Mark as {selectedProduct.is_active !== false ? 'Inactive' : 'Active'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalOption, { marginTop: 8 }]}
                      onPress={() => handleDeleteProduct(selectedProduct.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 10 }} />
                      <Text style={[styles.modalOptionText, { color: '#DC2626', fontWeight: '700' }]}>Delete Product</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

        </View>
      </SafeAreaView>
    </>
  );
}

// ─── Top-Level Components to Prevent Flicker/Fluctuation ──────────────────

const SafeProductImage = React.memo(({ url, style }: { url: string; style: any }) => {
  const resolvedUri = React.useMemo(() => {
    return apiService.getFullImageUrl(url);
  }, [url]);

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedUri]);

  return (
    <Image
      source={hasError ? require('../assets/images/logo.png') : { uri: resolvedUri }}
      style={style}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
});

const StatCard = React.memo(({ label, value, trend, iconName, iconBg, onPress }: {
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
));

const ProductRowItem = React.memo(({ item, onEdit }: { item: Product; onEdit: (p: Product) => void }) => {
  const stock = Number(item.stock_quantity || 0);
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock <= 10;
  const sku = item.sku_display || `SA-${(item.name || 'PR').slice(0, 2).toUpperCase()}-${item.id}`;

  const badgeBg = isOutOfStock ? '#FEE2E2' : isLowStock ? '#FFF3E0' : '#EAF6ED';
  const badgeText = isOutOfStock ? '#DC2626' : isLowStock ? '#D97706' : '#15803D';
  const badgeLabel = isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Active';

  return (
    <TouchableOpacity
      style={styles.productRow}
      onPress={() => onEdit(item)}
      activeOpacity={0.8}
    >
      <SafeProductImage url={item.image_url} style={styles.productImg} />

      <View style={styles.productMainInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productSubtext} numberOfLines={1}>{item.size || item.category || 'Cosmetics'}</Text>
      </View>

      <View style={styles.productSkuPrice}>
        <Text style={styles.productSkuText}>{sku}</Text>
        <Text style={styles.productPriceText}>₹{parseFloat(String(item.price || 0)).toFixed(2)}</Text>
      </View>

      <View style={styles.productStockBadgeCol}>
        <Text style={[styles.productStockCount, { color: isOutOfStock ? '#DC2626' : isLowStock ? '#D97706' : '#15803D' }]}>
          {stock}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.statusBadgeText, { color: badgeText }]}>{badgeLabel}</Text>
        </View>
      </View>

      <View style={styles.productActionBtns}>
        <TouchableOpacity style={styles.iconActionBtn} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={16} color="#374151" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const ProductGridItem = React.memo(({ item, onEdit }: { item: Product; onEdit: (p: Product) => void }) => {
  const stock = Number(item.stock_quantity || 0);
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock <= 10;
  const sku = item.sku_display || `SA-${(item.name || 'PR').slice(0, 2).toUpperCase()}-${item.id}`;

  const badgeBg = isOutOfStock ? '#FEE2E2' : isLowStock ? '#FFF3E0' : '#EAF6ED';
  const badgeText = isOutOfStock ? '#DC2626' : isLowStock ? '#D97706' : '#15803D';
  const badgeLabel = isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Active';

  return (
    <View style={styles.gridCard}>
      <SafeProductImage url={item.image_url} style={styles.gridCardImg} />
      <View style={styles.gridCardContent}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productSubtext} numberOfLines={1}>{sku}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <Text style={styles.productPriceText}>₹{parseFloat(String(item.price || 0)).toFixed(2)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusBadgeText, { color: badgeText }]}>{badgeLabel}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
          <TouchableOpacity style={styles.iconActionBtn} onPress={() => onEdit(item)}>
            <Ionicons name="create-outline" size={16} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

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
  headerTitleContainer: {
    flex: 1,
  },
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
  secondaryImportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D4B34',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  secondaryImportBtnText: { color: '#2D4B34', fontSize: 13, fontWeight: '700' },

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

  // Search & View Toggle
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
  searchInput: { flex: 1, fontSize: 12, color: '#111827' },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: '#EAF6ED',
  },

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

  // Product List Row
  productRow: {
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
  productImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  productMainInfo: { flex: 1.8, minWidth: 0 },
  productName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  productSubtext: { fontSize: 11, color: '#6B7280', marginTop: 1 },

  productSkuPrice: { flex: 1.2, minWidth: 0 },
  productSkuText: { fontSize: 10, color: '#9CA3AF' },
  productPriceText: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 1 },

  productStockBadgeCol: { flex: 1.2, alignItems: 'flex-end', minWidth: 0 },
  productStockCount: { fontSize: 12, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },

  productActionBtns: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Grid View Layout
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: (SCREEN_WIDTH - 34) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 10,
  },
  gridCardImg: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  gridCardContent: {
    padding: 10,
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
