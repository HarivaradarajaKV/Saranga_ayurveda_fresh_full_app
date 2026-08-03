import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Switch,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { AdminMoreModal } from './components/AdminMoreModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  is_best_seller: boolean;
  category_name?: string;
}

export default function AdminBestSellers() {
  const router = useRouter();
  const isMounted = useRef(true);

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialIds, setInitialIds] = useState<Set<number>>(new Set());

  // Filter & Search Controls
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'selected' | 'unselected'>('all');
  const [showMoreModal, setShowMoreModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get<Product[]>('/admin/best-sellers');
      const prods = response.data || [];
      if (isMounted.current) {
        setProducts(prods);
        const selected = new Set(prods.filter(p => p.is_best_seller).map(p => p.id));
        setSelectedIds(new Set(selected));
        setInitialIds(new Set(selected));
      }
    } catch (err) {
      console.error('fetchData best-sellers error:', err);
      Alert.alert('Error', 'Failed to load products for best sellers');
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => { isMounted.current = false; };
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/admin/dashboard' as any);
    }
  };

  const handleToggle = (id: number) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleReset = () => {
    setSelectedIds(new Set(initialIds));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.post('/admin/best-sellers', {
        product_ids: Array.from(selectedIds),
      });
      Alert.alert('Success', 'Best sellers updated successfully');
      setInitialIds(new Set(selectedIds));
    } catch (err) {
      console.error('handleSave error:', err);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const hasChanges =
    Array.from(selectedIds).sort().join(',') !==
    Array.from(initialIds).sort().join(',');

  const filteredProducts = products.filter(p => {
    const isSelected = selectedIds.has(p.id);
    const matchesView =
      viewMode === 'all' ||
      (viewMode === 'selected' && isSelected) ||
      (viewMode === 'unselected' && !isSelected);

    const matchesSearch = !search.trim() || (p.name || '').toLowerCase().includes(search.toLowerCase());
    return matchesView && matchesSearch;
  });

  const renderProductItem = ({ item }: { item: Product }) => {
    const isSelected = selectedIds.has(item.id);
    const numPrice = Number(item.price || 0);

    return (
      <TouchableOpacity
        style={[styles.productCard, isSelected && styles.productCardSelected]}
        onPress={() => handleToggle(item.id)}
        activeOpacity={0.85}
      >
        {/* Product Thumbnail */}
        <View style={styles.imgWrap}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImg} resizeMode="cover" />
          ) : (
            <View style={[styles.productImg, styles.noImg]}>
              <Ionicons name="image-outline" size={24} color="#9CA3AF" />
            </View>
          )}
        </View>

        {/* Product Details */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>₹{numPrice.toFixed(2)}</Text>

          {isSelected && (
            <View style={styles.bestSellerBadge}>
              <Ionicons name="star" size={10} color="#D97706" />
              <Text style={styles.bestSellerBadgeText}>Best Seller</Text>
            </View>
          )}
        </View>

        {/* Toggle Switch */}
        <View style={styles.toggleWrap}>
          <Switch
            value={isSelected}
            onValueChange={() => handleToggle(item.id)}
            trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
            thumbColor={isSelected ? '#2D4B34' : '#F3F4F6'}
          />
        </View>
      </TouchableOpacity>
    );
  };

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
                <Text style={styles.headerTitle}>Best Sellers</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Highlight featured best seller products on mobile & web.
                </Text>
              </View>
            </View>

            <View style={styles.headerRightContainer}>
              {hasChanges && (
                <TouchableOpacity style={styles.iconBtn} onPress={handleReset}>
                  <Ionicons name="refresh-outline" size={18} color="#111827" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>

              <Image source={require('../assets/images/logo.png')} style={styles.profileAvatar} resizeMode="contain" />
            </View>
          </View>

          {/* ── Main Scroll Content ── */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D4B34']} tintColor="#2D4B34" />}
          >
            {/* ── Summary Stat Cards Grid (3 cards) ── */}
            <View style={styles.statGrid}>
              <TouchableOpacity style={styles.statCard} onPress={() => setViewMode('all')}>
                <View style={[styles.statIconBg, { backgroundColor: '#EAF6ED' }]}>
                  <Ionicons name="cube-outline" size={16} color="#2D4B34" />
                </View>
                <Text style={styles.statLabel}>Total Products</Text>
                <Text style={styles.statValue}>{products.length}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statCard} onPress={() => setViewMode('selected')}>
                <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="star" size={16} color="#D97706" />
                </View>
                <Text style={styles.statLabel}>Best Sellers</Text>
                <Text style={styles.statValue}>{selectedIds.size}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statCard} onPress={() => setViewMode('unselected')}>
                <View style={[styles.statIconBg, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="close-circle-outline" size={16} color="#6B7280" />
                </View>
                <Text style={styles.statLabel}>Standard</Text>
                <Text style={styles.statValue}>{products.length - selectedIds.size}</Text>
              </TouchableOpacity>
            </View>

            {/* ── Search Input ── */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search product by name..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Filter Pills Row ── */}
            <View style={styles.filterPillsRow}>
              <TouchableOpacity
                style={[styles.filterPill, viewMode === 'all' && styles.filterPillActive]}
                onPress={() => setViewMode('all')}
              >
                <Text style={[styles.filterPillText, viewMode === 'all' && styles.filterPillTextActive]}>
                  All ({products.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, viewMode === 'selected' && styles.filterPillActive]}
                onPress={() => setViewMode('selected')}
              >
                <Text style={[styles.filterPillText, viewMode === 'selected' && styles.filterPillTextActive]}>
                  Best Sellers ({selectedIds.size})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, viewMode === 'unselected' && styles.filterPillActive]}
                onPress={() => setViewMode('unselected')}
              >
                <Text style={[styles.filterPillText, viewMode === 'unselected' && styles.filterPillTextActive]}>
                  Standard ({products.length - selectedIds.size})
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Products List ── */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2D4B34" />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="star-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  {viewMode === 'selected'
                    ? 'No products marked as Best Sellers yet.'
                    : 'No products match your search.'}
                </Text>
              </View>
            ) : (
              filteredProducts.map(item => (
                <View key={String(item.id)}>
                  {renderProductItem({ item })}
                </View>
              ))
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
            <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admin/products' as any)}>
              <Ionicons name="cube-outline" size={22} color="#6B7280" />
              <Text style={styles.tabLabel}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
              <Ionicons name="star" size={22} color="#2D4B34" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Best Sellers</Text>
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

  /* Top Header */
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
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2D4B34',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  profileAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },

  /* Body */
  body: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },

  /* Stat Grid (3 cards) */
  statGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconBg: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 2 },

  /* Search */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
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

  /* Filter Pills */
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: '#EAF6ED',
    borderColor: '#2D4B34',
  },
  filterPillText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  filterPillTextActive: { color: '#2D4B34', fontWeight: '700' },

  /* Product Card Item */
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  productCardSelected: {
    borderColor: '#2D4B34',
    backgroundColor: '#FAFCFA',
  },
  imgWrap: {
    width: 54,
    height: 54,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  productImg: { width: '100%', height: '100%' },
  noImg: { alignItems: 'center', justifyContent: 'center' },

  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  productPrice: { fontSize: 12, fontWeight: '700', color: '#2D4B34', marginTop: 2 },

  bestSellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bestSellerBadgeText: { fontSize: 9, fontWeight: '700', color: '#D97706' },

  toggleWrap: { paddingLeft: 4 },

  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: '#6B7280', marginTop: 8, fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', marginTop: 10, fontSize: 13, textAlign: 'center' },

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
