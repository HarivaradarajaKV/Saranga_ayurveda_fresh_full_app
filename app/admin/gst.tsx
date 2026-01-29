import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { ErrorBoundary } from '../ErrorBoundary';

interface GstRate {
  id: number;
  name: string;
  description: string | null;
  percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GstFormData {
  name: string;
  description: string;
  percentage: number;
  is_active: boolean;
}

interface ProductGst {
  product_id: number;
  product_name: string;
  percentage: number;
  is_active: boolean;
}

function GstPageInner() {
  const [gstRates, setGstRates] = useState<GstRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGst, setEditingGst] = useState<GstRate | null>(null);
  const [formData, setFormData] = useState<GstFormData>({
    name: '',
    description: '',
    percentage: 18,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const mountedRef = useRef(true);
  const [productGst, setProductGst] = useState<ProductGst[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<ProductGst[]>([]);
  const productGstMap = React.useMemo(() => {
    const map = new Map<number, number>();
    productGst.forEach((p) => map.set(p.product_id, p.percentage));
    return map;
  }, [productGst]);

  const getDisplayPercentage = (productId: number, fallback: number) =>
    productGstMap.get(productId) ?? fallback;
  const [savingProductId, setSavingProductId] = useState<number | null>(null);

  const toNumberOrZero = (value: any): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const formatPercentage = (value: number) => `${toNumberOrZero(value).toFixed(2)}`;

  useEffect(() => {
    mountedRef.current = true;
    fetchGstRates();
    fetchProductGst();
    fetchAllProducts();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Debug logging
    if (productGst.length > 0 || allProducts.length > 0) {
      console.log('GST Data State:', {
        productGstCount: productGst.length,
        allProductsCount: allProducts.length,
        mergedCount: mergedProductGst.length,
        sampleProductGst: productGst.slice(0, 2),
        sampleMerged: mergedProductGst.slice(0, 2)
      });
    }
  }, [productGst, allProducts, mergedProductGst]);

  const fetchGstRates = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/gst');
      if (response.data && Array.isArray(response.data)) {
        if (mountedRef.current) {
          setGstRates(
            response.data.map((item: any) => ({
              id: Number(item.id),
              name: item.name || 'Unnamed',
              description: item.description ?? '',
              percentage: toNumberOrZero(item.percentage ?? item.rate),
              is_active: Boolean(item.is_active),
              created_at: item.created_at || '',
              updated_at: item.updated_at || '',
            }))
          );
        }
      }
    } catch (error: any) {
      console.error('Error fetching GST rates:', error);
      Alert.alert('Error', 'Failed to fetch GST rates. Please try again.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const extractArray = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    const candidates = [
      payload.data,
      payload.products,
      payload.rows,
      payload.data?.rows,
      payload.result,
      payload.result?.rows,
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
    }
    // Fallback: search first array in object values (1 level deep) to handle unexpected shapes
    if (payload && typeof payload === 'object') {
      for (const value of Object.values(payload)) {
        if (Array.isArray(value)) return value;
      }
    }
    return [];
  };

  const fetchProductGst = async () => {
    try {
      setProductLoading(true);
      const response = await apiService.get('/gst/products');
      if (response.data && mountedRef.current) {
        const rawList = extractArray(response.data);
        if (!rawList.length) {
          console.warn('GST products response empty/unrecognized shape', response.data);
        }

        const normalized = rawList.map((item: any) => {
          const product = item.product || item;
          const productId = product.product_id ?? product.id ?? item.id;
          const name =
            product.product_name ||
            product.name ||
            item.product_name ||
            item.name ||
            'Product';
          const percentage =
            item.percentage ??
            item.gst_percentage ??
            item.gst_rate ??
            item.rate ??
            item.gst?.percentage ??
            item.gst?.rate ??
            product.percentage ??
            product.gst_percentage ??
            product.gst_rate ??
            product.rate ??
            product.gst?.percentage ??
            product.gst?.rate;

          return {
            product_id: Number(productId),
            product_name: name,
            percentage: toNumberOrZero(percentage),
            is_active: Boolean(
              item.is_active ?? item.active ?? product.is_active ?? true
            ),
          };
        });

        setProductGst(normalized);
      }
    } catch (error: any) {
      console.error('Error fetching product GST rates:', error);
      Alert.alert('Error', 'Failed to fetch product GST rates.');
    } finally {
      if (mountedRef.current) setProductLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await apiService.getAdminProducts();
      if (response?.data && Array.isArray(response.data) && mountedRef.current) {
        const mapped = response.data.map((p: any) => ({
          product_id: Number(p.id),
          product_name: p.name || p.product_name || 'Product',
          percentage: 0,
          is_active: true,
        }));
        setAllProducts(mapped);
      }
    } catch (error) {
      console.error('Error fetching products for GST:', error);
    }
  };

  // Merge product catalog with existing GST rows so admin can set GST for any product
  const mergedProductGst = React.useMemo(() => {
    if (allProducts.length === 0) return productGst;
    const gstMap = new Map<number, ProductGst>();
    productGst.forEach((p) => gstMap.set(p.product_id, p));
    return allProducts
      .map((prod) => {
        const gst = gstMap.get(prod.product_id);
        if (gst) {
          return { ...prod, percentage: gst.percentage, is_active: gst.is_active };
        }
        return prod;
      })
      .sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
  }, [allProducts, productGst]);

  useEffect(() => {
    // Debug logging
    if (productGst.length > 0 || allProducts.length > 0) {
      console.log('GST Data State:', {
        productGstCount: productGst.length,
        allProductsCount: allProducts.length,
        mergedCount: mergedProductGst.length,
        sampleProductGst: productGst.slice(0, 2),
        sampleMerged: mergedProductGst.slice(0, 2)
      });
    }
  }, [productGst, allProducts, mergedProductGst]);

  const handleAdd = () => {
    setEditingGst(null);
    setFormData({
      name: '',
      description: '',
      percentage: 18,
      is_active: true,
    });
    setShowAddModal(true);
  };

  const handleEdit = (gst: GstRate) => {
    setEditingGst(gst);
    setFormData({
      name: gst.name,
      description: gst.description || '',
      percentage: gst.percentage,
      is_active: gst.is_active,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name for the GST rate');
      return;
    }

    if (formData.percentage < 0 || formData.percentage > 100) {
      Alert.alert('Error', 'GST percentage must be between 0 and 100');
      return;
    }

    try {
      setSubmitting(true);
      if (editingGst) {
        // Update existing GST rate
        await apiService.put(`/gst/${editingGst.id}`, formData);
        Alert.alert('Success', 'GST rate updated successfully');
      } else {
        // Create new GST rate
        await apiService.post('/gst', formData);
        Alert.alert('Success', 'GST rate created successfully');
      }
      setShowAddModal(false);
      fetchGstRates();
    } catch (error: any) {
      console.error('Error saving GST rate:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save GST rate. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductGstChange = (productId: number, value: string) => {
    const parsed = toNumberOrZero(value);
    setProductGst((prev) => {
      const exists = prev.some((p) => p.product_id === productId);
      if (exists) {
        return prev.map((p) =>
          p.product_id === productId ? { ...p, percentage: parsed } : p
        );
      }
      // If product doesn't have a GST row yet, add one so the input reflects typed value
      const productName =
        allProducts.find((p) => p.product_id === productId)?.product_name ||
        'Product';
      return [
        ...prev,
        { product_id: productId, product_name: productName, percentage: parsed, is_active: true },
      ];
    });
  };

  const handleSaveProductGst = async (productId: number, percentage: number) => {
    if (percentage < 0 || percentage > 100) {
      Alert.alert('Error', 'GST percentage must be between 0 and 100');
      return;
    }
    try {
      setSavingProductId(productId);
      await apiService.put(`/gst/product/${productId}`, { percentage, is_active: true });
      Alert.alert('Success', 'GST rate updated for product');
      fetchProductGst();
    } catch (error: any) {
      console.error('Error updating product GST:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update product GST');
    } finally {
      setSavingProductId(null);
    }
  };

  const handleDelete = (gst: GstRate) => {
    Alert.alert(
      'Delete GST Rate',
      `Are you sure you want to delete "${gst.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.delete(`/gst/${gst.id}`);
              Alert.alert('Success', 'GST rate deleted successfully');
              fetchGstRates();
            } catch (error: any) {
              console.error('Error deleting GST rate:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete GST rate. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (gst: GstRate) => {
    try {
      await apiService.put(`/gst/${gst.id}`, {
        is_active: !gst.is_active,
      });
      fetchGstRates();
    } catch (error: any) {
      console.error('Error toggling GST rate:', error);
      Alert.alert('Error', 'Failed to update GST rate. Please try again.');
    }
  };

  const renderGstItem = (gst: GstRate) => (
    <View key={gst.id} style={styles.gstItem}>
      <View style={styles.gstItemHeader}>
        <View style={styles.gstItemInfo}>
          <Text style={styles.gstItemName}>{gst.name}</Text>
          {gst.description && (
            <Text style={styles.gstItemDescription}>{gst.description}</Text>
          )}
          <Text style={styles.gstItemPercentage}>
            GST: {formatPercentage(gst.percentage)}%
          </Text>
        </View>
        <View style={styles.gstItemActions}>
          <Switch
            value={gst.is_active}
            onValueChange={() => handleToggleActive(gst)}
            trackColor={{ false: '#767577', true: '#FF69B4' }}
            thumbColor={gst.is_active ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
      <View style={styles.gstItemFooter}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(gst)}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(gst)}
        >
          <Ionicons name="trash" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
      {gst.is_active && (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'GST Management',
          headerStyle: { backgroundColor: '#FF69B4' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {gstRates.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No GST rates found</Text>
                <Text style={styles.emptySubtext}>Add your first GST rate to get started</Text>
              </View>
            ) : (
              gstRates.map(renderGstItem)
            )}

            {/* Product-level GST */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Product GST Rates</Text>
              {productLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FF69B4" />
                </View>
              ) : (
                mergedProductGst.map((p) => (
                  <View key={p.product_id} style={styles.gstItem}>
                    <View style={styles.gstItemHeader}>
                      <View style={styles.gstItemInfo}>
                        <Text style={styles.gstItemName}>{p.product_name}</Text>
                        <Text style={styles.gstItemPercentage}>
                          Current: {formatPercentage(getDisplayPercentage(p.product_id, p.percentage))}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>GST Percentage</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={getDisplayPercentage(p.product_id, p.percentage).toString()}
                        onChangeText={(text) => handleProductGstChange(p.product_id, text)}
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.editButton,
                        savingProductId === p.product_id && styles.submitButtonDisabled,
                      ]}
                      onPress={() => handleSaveProductGst(p.product_id, p.percentage)}
                      disabled={savingProductId === p.product_id}
                    >
                      {savingProductId === p.product_id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="save" size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Save</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add GST Rate</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingGst ? 'Edit GST Rate' : 'Add GST Rate'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="e.g., Standard GST"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Optional description"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>GST Percentage *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.percentage.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    setFormData({ ...formData, percentage: num });
                  }}
                  placeholder="18"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <Text style={styles.helperText}>Enter a value between 0 and 100</Text>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Active</Text>
                  <Switch
                    value={formData.is_active}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                    trackColor={{ false: '#767577', true: '#FF69B4' }}
                    thumbColor={formData.is_active ? '#fff' : '#f4f3f4'}
                  />
                </View>
                <Text style={styles.helperText}>
                  Only one GST rate can be active at a time
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingGst ? 'Update' : 'Create'} GST Rate
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function GstPage() {
  return (
    <ErrorBoundary>
      <GstPageInner />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  gstItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  gstItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gstItemInfo: {
    flex: 1,
  },
  gstItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  gstItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  gstItemPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF69B4',
  },
  gstItemActions: {
    marginLeft: 12,
  },
  gstItemFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF69B4',
    paddingVertical: 16,
    margin: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  formScroll: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
});

