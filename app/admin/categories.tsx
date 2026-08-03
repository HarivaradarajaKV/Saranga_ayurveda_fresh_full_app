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
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/api';
import { useCategories } from '../CategoryContext';
import { AdminMoreModal } from './components/AdminMoreModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_LIMIT = 8;

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Category {
  id: number;
  name: string;
  description: string;
  product_count: number;
  image_url?: string;
  created_at: string;
  is_active?: boolean;
}

interface CategoryStats {
  total: number; total_trend: number;
  active: number; active_trend: number;
  inactive: number; inactive_trend: number;
  products: number; products_trend: number;
}

// ─── Top-Level Memoized Image Component ─────────────────────────────────────

const SafeCategoryImage = React.memo(({ url, style }: { url?: string; style: any }) => {
  const resolvedUri = React.useMemo(() => {
    if (!url) return null;
    return apiService.getFullImageUrl(url);
  }, [url]);

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedUri]);

  if (!resolvedUri || hasError) {
    return (
      <View style={[style, styles.categoryIconPlaceholder]}>
        <Ionicons name="leaf-outline" size={20} color="#2D4B34" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={style}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminCategoriesScreen() {
  const router = useRouter();
  const isMounted = useRef(true);

  const { fetchCategories: refreshGlobalCategories } = useCategories();

  // Stats State
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Categories List State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  // Filters State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

  // Add Category State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImage, setNewCatImage] = useState<string | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Category State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatImage, setEditCatImage] = useState<string | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Options Modal State
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // ── Fetch Stats ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiService.get('/admin/categories/stats');
      if (res.data && isMounted.current) {
        setStats(res.data);
      }
    } catch (e) {
      console.error('fetchStats error:', e);
    } finally {
      if (isMounted.current) setStatsLoading(false);
    }
  }, []);

  // ── Fetch Categories ──────────────────────────────────────────────────────

  const fetchCategoriesList = useCallback(async (reset = false) => {
    if (!isMounted.current) return;
    if (reset) setLoading(true);
    try {
      const res = await apiService.getAdminCategories();
      if (res.data && Array.isArray(res.data) && isMounted.current) {
        const mapped: Category[] = res.data.map((cat: any) => ({
          id: cat.id,
          name: cat.name || '',
          description: cat.description || '',
          product_count: Number(cat.product_count || 0),
          image_url: cat.image_url,
          created_at: cat.created_at || new Date().toISOString(),
          is_active: cat.is_active !== false,
        }));
        setCategories(mapped);
      }
    } catch (e) {
      console.error('fetchCategoriesList error:', e);
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
    fetchCategoriesList(true);
    return () => { isMounted.current = false; };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    await fetchCategoriesList(true);
    refreshGlobalCategories();
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const pickImage = async (isEdit: boolean) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        if (isEdit) {
          setEditCatImage(result.assets[0].uri);
        } else {
          setNewCatImage(result.assets[0].uri);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAddCategorySubmit = async () => {
    if (!newCatName.trim()) {
      Alert.alert('Validation Error', 'Category name is required.');
      return;
    }
    setSubmittingAdd(true);
    try {
      const formData = new FormData();
      formData.append('name', newCatName.trim());
      formData.append('description', newCatDesc.trim());

      if (newCatImage) {
        const uriParts = newCatImage.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'jpg';
        // @ts-ignore
        formData.append('image', {
          uri: newCatImage,
          name: `category_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        });
      }

      const res = await apiService.addCategory(formData);
      if (res.error) throw new Error(res.error);

      Alert.alert('Success', 'Category created successfully!');
      setShowAddModal(false);
      setNewCatName('');
      setNewCatDesc('');
      setNewCatImage(null);
      fetchCategoriesList(true);
      fetchStats();
      refreshGlobalCategories();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create category');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatDesc(cat.description);
    setEditCatImage(null);
  };

  const handleEditCategorySubmit = async () => {
    if (!editingCategory || !editCatName.trim()) {
      Alert.alert('Validation Error', 'Category name is required.');
      return;
    }
    setSubmittingEdit(true);
    try {
      const formData = new FormData();
      formData.append('name', editCatName.trim());
      formData.append('description', editCatDesc.trim());

      if (editCatImage) {
        const uriParts = editCatImage.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'jpg';
        // @ts-ignore
        formData.append('image', {
          uri: editCatImage,
          name: `category_${editingCategory.id}_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        });
      }

      const res = await apiService.updateCategory(editingCategory.id, formData);
      if (res.error) throw new Error(res.error);

      Alert.alert('Success', 'Category updated successfully!');
      setEditingCategory(null);
      fetchCategoriesList(false);
      fetchStats();
      refreshGlobalCategories();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update category');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteCategory = (catId: number) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category? Products linked to this category will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiService.deleteCategory(catId);
              if (res.error) throw new Error(res.error);
              Alert.alert('Success', 'Category deleted successfully.');
              setShowOptionsModal(false);
              setSelectedCategory(null);
              fetchCategoriesList(true);
              fetchStats();
              refreshGlobalCategories();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  // ── Filtered & Paginated List ──────────────────────────────────────────────

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = !searchQuery.trim() ||
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && cat.is_active !== false) ||
      (statusFilter === 'inactive' && cat.is_active === false);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_LIMIT));
  const paginatedCategories = filteredCategories.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

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

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'May 10, 2025';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'May 10, 2025';
    }
  };

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
                <Text style={styles.headerTitle}>Categories</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>Manage your product categories and sub-categories.</Text>
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
            {/* ── Action Button Row (+ Add New Category) ── */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity style={styles.primaryAddBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.primaryAddBtnText}>Add New Category</Text>
              </TouchableOpacity>
            </View>

            {/* ── Stat Cards Grid (2x2) ── */}
            {statsLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator color="#2D4B34" />
              </View>
            ) : stats ? (
              <View style={styles.statGrid}>
                <StatCard label="Total Categories" value={stats.total} trend={stats.total_trend} iconName="grid-outline" iconBg="#FFF8E1" onPress={() => setStatusFilter('all')} />
                <StatCard label="Active Categories" value={stats.active} trend={stats.active_trend} iconName="folder-outline" iconBg="#EAF6ED" onPress={() => setStatusFilter('active')} />
                <StatCard label="Inactive Categories" value={stats.inactive} trend={stats.inactive_trend} iconName="eye-off-outline" iconBg="#FEE2E2" onPress={() => setStatusFilter('inactive')} />
                <StatCard label="Products in Categories" value={stats.products} trend={stats.products_trend} iconName="leaf-outline" iconBg="#EAF6ED" />
              </View>
            ) : null}

            {/* ── Search & Status Filter Controls Row ── */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search categories..."
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
                  {statusFilter === 'all' ? 'All Status' : statusFilter === 'active' ? 'Active' : 'Inactive'}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* ── Category Table Header ── */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>Category</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.9, textAlign: 'center' }]}>Products</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.1, textAlign: 'center' }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.4, textAlign: 'right' }]}>Created On</Text>
              <View style={{ width: 28 }} />
            </View>

            {/* ── Category Items List ── */}
            {loading && !refreshing ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#2D4B34" />
                <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 13 }}>Loading categories...</Text>
              </View>
            ) : paginatedCategories.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="folder-open-outline" size={48} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', marginTop: 12, fontSize: 14 }}>No categories found</Text>
              </View>
            ) : (
              paginatedCategories.map(item => {
                const isActive = item.is_active !== false;
                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={styles.categoryRow}
                    onPress={() => handleOpenEdit(item)}
                    activeOpacity={0.8}
                  >
                    {/* Drag Handle Icon */}
                    <Ionicons name="ellipsis-vertical" size={14} color="#9CA3AF" style={{ marginRight: 4 }} />

                    {/* Category Image / Icon */}
                    <SafeCategoryImage url={item.image_url} style={styles.categoryImg} />

                    {/* Category Name & Subtitle */}
                    <View style={styles.categoryMainInfo}>
                      <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.categorySubtext} numberOfLines={1}>{item.description || 'Natural Ayurvedic products'}</Text>
                    </View>

                    {/* Products Count */}
                    <Text style={styles.categoryProductsCount}>{item.product_count}</Text>

                    {/* Status Badge */}
                    <View style={styles.statusBadgeCol}>
                      <View style={[styles.statusBadge, { backgroundColor: isActive ? '#EAF6ED' : '#FEE2E2' }]}>
                        <Text style={[styles.statusBadgeText, { color: isActive ? '#15803D' : '#DC2626' }]}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    {/* Created Date */}
                    <Text style={styles.categoryCreatedDate} numberOfLines={1}>{formatDate(item.created_at)}</Text>

                    {/* Edit Icon */}
                    <TouchableOpacity
                      style={styles.iconActionBtn}
                      onPress={() => handleOpenEdit(item)}
                    >
                      <Ionicons name="create-outline" size={16} color="#374151" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}

            {/* ── Pagination ── */}
            {filteredCategories.length > 0 && (
              <View style={styles.paginationContainer}>
                <Text style={styles.paginationInfo}>
                  Showing {(page - 1) * PAGE_LIMIT + 1} to {Math.min(page * PAGE_LIMIT, filteredCategories.length)} of {filteredCategories.length} categories
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
              <Ionicons name="grid" size={22} color="#2D4B34" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Categories</Text>
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

          {/* ── Add Category Modal ── */}
          <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
              <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>Add New Category</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Category Name *"
                  placeholderTextColor="#9CA3AF"
                  value={newCatName}
                  onChangeText={setNewCatName}
                />
                <TextInput
                  style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Category Description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={newCatDesc}
                  onChangeText={setNewCatDesc}
                />
                <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(false)}>
                  <Ionicons name="image-outline" size={18} color="#2D4B34" />
                  <Text style={styles.imagePickerBtnText}>{newCatImage ? 'Change Image' : 'Select Image'}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddCategorySubmit} disabled={submittingAdd}>
                    {submittingAdd ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>Create Category</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Edit Category Modal ── */}
          <Modal visible={!!editingCategory} transparent animationType="slide" onRequestClose={() => setEditingCategory(null)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditingCategory(null)}>
              <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>Edit Category</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Category Name *"
                  placeholderTextColor="#9CA3AF"
                  value={editCatName}
                  onChangeText={setEditCatName}
                />
                <TextInput
                  style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Category Description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={editCatDesc}
                  onChangeText={setEditCatDesc}
                />
                <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(true)}>
                  <Ionicons name="image-outline" size={18} color="#2D4B34" />
                  <Text style={styles.imagePickerBtnText}>{editCatImage ? 'New Image Selected' : 'Change Image'}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingCategory(null)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleEditCategorySubmit} disabled={submittingEdit}>
                    {submittingEdit ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                </View>
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

  // Search & Filter
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
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterPillText: { fontSize: 11, color: '#374151', fontWeight: '500' },

  // Table Header
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 6,
  },
  tableHeaderCell: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  // Category Row Item
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 8,
  },
  categoryIconPlaceholder: {
    backgroundColor: '#EAF6ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMainInfo: { flex: 2.2, minWidth: 0 },
  categoryName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  categorySubtext: { fontSize: 10, color: '#6B7280', marginTop: 1 },

  categoryProductsCount: { flex: 0.9, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#374151' },

  statusBadgeCol: { flex: 1.1, alignItems: 'center' },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },

  categoryCreatedDate: { flex: 1.4, textAlign: 'right', fontSize: 10, color: '#6B7280' },

  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
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
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF6ED',
    borderWidth: 1,
    borderColor: '#D1E7D6',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  imagePickerBtnText: { fontSize: 12, color: '#2D4B34', fontWeight: '600' },
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