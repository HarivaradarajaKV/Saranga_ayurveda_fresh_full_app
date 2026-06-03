import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Image,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';

const { width } = Dimensions.get('window');

interface Product {
  id: number;
  name: string;
  price: string | number;
  image_url: string;
  is_new_arrival: boolean;
  category_id: number;
  category_ids?: number[];
}

interface Category {
  id: number;
  name: string;
}

export default function AdminNewArrivals() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialIds, setInitialIds] = useState<Set<number>>(new Set());

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        apiService.get<Product[]>('/admin/new-arrivals'),
        apiService.getCategories(),
      ]);

      const prods = Array.isArray(prodRes.data) ? prodRes.data : [];
      setProducts(prods);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);

      // Load initially selected products
      const selected = new Set(prods.filter(p => p.is_new_arrival).map(p => p.id));
      setSelectedIds(new Set(selected));
      setInitialIds(new Set(selected));
    } catch (err) {
      console.error('Error fetching data:', err);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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
    Alert.alert('Reset', 'Selections reset to initial state');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiService.post('/admin/new-arrivals', {
        product_ids: Array.from(selectedIds),
      });
      if (res.error) {
        Alert.alert('Error', res.error || 'Failed to save changes');
      } else {
        Alert.alert('Success', 'New arrivals updated successfully');
        setInitialIds(new Set(selectedIds)); // Sync initial state
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Helper to map category name
  const getCategoryName = (catId: number) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : 'Unknown';
  };

  // Filter products locally based on viewMode, search, and category filter
  const filteredProducts = products.filter(p => {
    const matchesView = viewMode === 'all' || selectedIds.has(p.id);
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === null || 
      p.category_id === selectedCategory ||
      (Array.isArray(p.category_ids) && p.category_ids.includes(selectedCategory));
    return matchesView && matchesSearch && matchesCategory;
  });

  const hasChanges = Array.from(selectedIds).sort().join(',') !== Array.from(initialIds).sort().join(',');

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'New Arrivals',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      {/* Control Bar: Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products by name..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs Selector: All Products vs Selected New Arrivals */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, viewMode === 'all' && styles.tabButtonActive]}
          onPress={() => setViewMode('all')}
        >
          <Text style={[styles.tabButtonText, viewMode === 'all' && styles.tabButtonTextActive]}>
            All Products ({products.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, viewMode === 'selected' && styles.tabButtonActive]}
          onPress={() => setViewMode('selected')}
        >
          <Text style={[styles.tabButtonText, viewMode === 'selected' && styles.tabButtonTextActive]}>
            New Arrivals ({selectedIds.size})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Category Pill Selector */}
      <View style={styles.categoryFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === null && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.categoryPillText,
                selectedCategory === null && styles.categoryPillTextActive,
              ]}
            >
              All Products
            </Text>
          </TouchableOpacity>

          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryPill,
                selectedCategory === cat.id && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat.id && styles.categoryPillTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#694d21" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Ionicons name="alert-circle-outline" size={48} color="#999" />
          <Text style={styles.emptyText}>
            {viewMode === 'selected' 
              ? 'No products have been flagged as New Arrivals yet.' 
              : 'No products found matching criteria'}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.productsGrid}>
            {filteredProducts.map(p => {
              const isSelected = selectedIds.has(p.id);
              const fullImageUrl = apiService.getFullImageUrl(p.image_url);

              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.productCard,
                    isSelected && styles.productCardSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleToggle(p.id)}
                >
                  {/* Image wrapper - Perfect square with contain resizing mode */}
                  <View style={styles.imageContainer}>
                    {p.image_url ? (
                      <Image
                        source={{ uri: fullImageUrl }}
                        style={styles.productImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.noImage}>
                        <Ionicons name="image-outline" size={32} color="#aaa" />
                        <Text style={styles.noImageText}>No Image</Text>
                      </View>
                    )}
                    {/* Floating check status */}
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#694d21" />
                      </View>
                    )}
                  </View>

                  {/* Product Details */}
                  <View style={styles.detailsContainer}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text style={styles.categoryName}>
                      {getCategoryName(p.category_id)}
                    </Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>
                        ₹{parseFloat(String(p.price || 0)).toFixed(0)}
                      </Text>

                      {/* Custom premium toggle switch/checkbox indicator */}
                      <View style={[
                        styles.toggleTrack,
                        isSelected ? styles.toggleTrackActive : styles.toggleTrackInactive,
                      ]}>
                        <View style={[
                          styles.toggleThumb,
                          isSelected ? styles.toggleThumbActive : styles.toggleThumbInactive,
                        ]} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Floating Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarInfo}>
          <Text style={styles.selectedCountText}>
            {selectedIds.size} Selected
          </Text>
          <Text style={styles.subtitleText}>
            for New Arrivals
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.btnReset, !hasChanges && styles.btnDisabled]}
            disabled={!hasChanges || saving}
            onPress={handleReset}
          >
            <Ionicons name="refresh-outline" size={18} color={hasChanges ? '#694d21' : '#ccc'} />
            <Text style={[styles.btnResetText, !hasChanges && styles.btnDisabledText]}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSave, !hasChanges && styles.btnDisabled, saving && styles.btnLoading]}
            disabled={!hasChanges || saving}
            onPress={handleSave}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.btnSaveText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    color: '#888',
    textAlign: 'center',
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Safe padding for action bar
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#333',
    fontSize: 14,
  },
  clearIcon: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 4,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#694d21',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  categoryFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#694d21',
    borderColor: '#694d21',
  },
  categoryPillText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productCardSelected: {
    borderColor: '#694d21',
    backgroundColor: '#fbfaf8',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    position: 'relative',
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  detailsContainer: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
    height: 36,
    lineHeight: 18,
  },
  categoryName: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#694d21',
  },
  toggleTrack: {
    width: 32,
    height: 18,
    borderRadius: 9,
    position: 'relative',
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: '#694d21',
  },
  toggleTrackInactive: {
    backgroundColor: '#cbd5e1',
  },
  toggleThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    position: 'absolute',
  },
  toggleThumbActive: {
    right: 2,
  },
  toggleThumbInactive: {
    left: 2,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  actionBarInfo: {
    flexDirection: 'column',
  },
  selectedCountText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#694d21',
  },
  subtitleText: {
    fontSize: 11,
    color: '#64748b',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  btnReset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#694d21',
    backgroundColor: '#fff',
  },
  btnResetText: {
    color: '#694d21',
    fontWeight: '600',
    fontSize: 13,
  },
  btnSave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#694d21',
  },
  btnSaveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  btnDisabled: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
  btnDisabledText: {
    color: '#cbd5e1',
  },
  btnLoading: {
    opacity: 0.8,
  },
});
