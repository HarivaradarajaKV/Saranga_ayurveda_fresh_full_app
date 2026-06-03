import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  is_best_seller: boolean;
  category_id?: number;
  category_ids?: number[];
}

export default function AdminBestSellers() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialIds, setInitialIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiService.get<Product[]>('/admin/best-sellers');
      const prods = response.data || [];
      setProducts(prods);
      const selected = new Set(prods.filter(p => p.is_best_seller).map(p => p.id));
      setSelectedIds(new Set(selected));
      setInitialIds(new Set(selected));
    } catch (err) {
      Alert.alert('Error', 'Failed to load products');
    }
    setLoading(false);
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
      Alert.alert('Error', 'Failed to save changes');
    }
    setSaving(false);
  };

  const hasChanges =
    Array.from(selectedIds).sort().join(',') !==
    Array.from(initialIds).sort().join(',');

  const filteredProducts = products.filter(p => {
    const matchesView = viewMode === 'all' || selectedIds.has(p.id);
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    return matchesView && matchesSearch;
  });

  const renderProduct = ({ item }: { item: Product }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.productCard, isSelected && styles.productCardSelected]}
        onPress={() => handleToggle(item.id)}
        activeOpacity={0.8}
      >
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.productImage, styles.noImage]}>
            <Ionicons name="image-outline" size={28} color="#ccc" />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>₹{parseFloat(String(item.price)).toFixed(0)}</Text>
        </View>
        <View style={[styles.toggle, isSelected && styles.toggleOn]}>
          <View style={[styles.toggleKnob, isSelected && styles.toggleKnobOn]} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Manage Best Sellers',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 4 }}>
              {hasChanges && (
                <TouchableOpacity onPress={handleReset} style={styles.headerBtn}>
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSave}
                disabled={!hasChanges || saving}
                style={[styles.headerBtn, styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'all' && styles.tabActive]}
            onPress={() => setViewMode('all')}
          >
            <Text style={[styles.tabText, viewMode === 'all' && styles.tabTextActive]}>
              All Products ({products.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'selected' && styles.tabActive]}
            onPress={() => setViewMode('selected')}
          >
            <Text style={[styles.tabText, viewMode === 'selected' && styles.tabTextActive]}>
              Best Sellers ({selectedIds.size})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF69B4" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="star-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {viewMode === 'selected'
                ? 'No products marked as Best Sellers yet.'
                : 'No products match your search.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#e8e8e8',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#1a1a1a' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  list: { padding: 12, paddingTop: 4 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  productCardSelected: {
    borderColor: '#FF69B4',
    backgroundColor: '#FFF0F6',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { flex: 1, paddingHorizontal: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#FF69B4' },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    padding: 2,
  },
  toggleOn: { backgroundColor: '#FF69B4' },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleKnobOn: { alignSelf: 'flex-end' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, color: '#999', fontSize: 14 },
  emptyText: { marginTop: 12, color: '#999', fontSize: 15, textAlign: 'center' },
  headerBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  saveBtn: { backgroundColor: '#FF69B4', paddingHorizontal: 14 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
