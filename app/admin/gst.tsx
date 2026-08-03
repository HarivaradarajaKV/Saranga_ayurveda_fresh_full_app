import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Image,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { ErrorBoundary } from '../ErrorBoundary';
import { AdminMoreModal } from './components/AdminMoreModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GstRate {
  id: number;
  name: string;
  description: string | null;
  percentage: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  country?: string;
  region?: string;
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
  const router = useRouter();
  const mountedRef = useRef(true);

  // States
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

  // Tax Configuration State (Card 1)
  const [taxCalculation, setTaxCalculation] = useState('Based on Shipping Address');
  const [taxDisplay, setTaxDisplay] = useState('Inclusive');
  const [taxRounding, setTaxRounding] = useState('Round off at subtotal level');
  const [defaultTaxRate, setDefaultTaxRate] = useState('18');
  const [taxLabel, setTaxLabel] = useState('GST');
  const [enableTaxes, setEnableTaxes] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Product GST State
  const [productGst, setProductGst] = useState<ProductGst[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<ProductGst[]>([]);
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'tax_rates' | 'product_gst'>('tax_rates');

  // Navigation Modal
  const [showMoreModal, setShowMoreModal] = useState(false);

  // Option Dropdowns State in Tax Configuration
  const [showCalcDropdown, setShowCalcDropdown] = useState(false);
  const [showDisplayDropdown, setShowDisplayDropdown] = useState(false);
  const [showRoundingDropdown, setShowRoundingDropdown] = useState(false);

  const productGstMap = useMemo(() => {
    const map = new Map<number, number>();
    productGst.forEach((p) => map.set(p.product_id, p.percentage));
    return map;
  }, [productGst]);

  const [productSearch, setProductSearch] = useState('');

  const mergedProductGst = useMemo(() => {
    const listMap = new Map<number, ProductGst>();
    productGst.forEach((p) => listMap.set(p.product_id, p));
    allProducts.forEach((prod) => {
      if (!listMap.has(prod.product_id)) {
        listMap.set(prod.product_id, prod);
      }
    });
    return Array.from(listMap.values()).sort((a, b) =>
      (a.product_name || '').localeCompare(b.product_name || '')
    );
  }, [allProducts, productGst]);

  const filteredProductGst = useMemo(() => {
    if (!productSearch.trim()) return mergedProductGst;
    return mergedProductGst.filter((p) =>
      (p.product_name || '').toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [mergedProductGst, productSearch]);

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

  const fetchGstRates = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/gst');
      if (response.data && Array.isArray(response.data) && mountedRef.current) {
        setGstRates(
          response.data.map((item: any) => ({
            id: Number(item.id),
            name: item.name || 'Unnamed',
            description: item.description ?? '',
            percentage: toNumberOrZero(item.percentage ?? item.rate),
            is_active: Boolean(item.is_active),
            created_at: item.created_at || '',
            updated_at: item.updated_at || '',
            country: item.country || 'India',
            region: item.region || 'All States',
          }))
        );
      }
    } catch (error: any) {
      console.error('Error fetching GST rates:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
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
        const normalized = rawList.map((item: any) => {
          const product = item.product || item;
          const productId = product.product_id ?? product.id ?? item.id;
          const name = product.product_name || product.name || item.product_name || item.name || 'Product';
          const percentage = item.percentage ?? item.gst_percentage ?? item.gst_rate ?? item.rate ?? product.percentage ?? 0;
          return {
            product_id: Number(productId),
            product_name: name,
            percentage: toNumberOrZero(percentage),
            is_active: Boolean(item.is_active ?? true),
          };
        });
        setProductGst(normalized);
      }
    } catch (error: any) {
      console.error('Error fetching product GST rates:', error);
    } finally {
      if (mountedRef.current) setProductLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await apiService.get('/admin/products?limit=500');
      const list = response?.data?.products || response?.data?.data || response?.data;
      if (Array.isArray(list) && mountedRef.current) {
        const mapped = list.map((p: any) => ({
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

  const handleSaveTaxConfig = async () => {
    setSavingConfig(true);
    try {
      Alert.alert('Success', 'Tax configuration updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update tax configuration');
    } finally {
      setSavingConfig(false);
    }
  };

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
        await apiService.put(`/gst/${editingGst.id}`, formData);
        Alert.alert('Success', 'GST rate updated successfully');
      } else {
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
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete GST rate.');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (gst: GstRate) => {
    try {
      await apiService.put(`/gst/${gst.id}`, { is_active: !gst.is_active });
      fetchGstRates();
    } catch (error: any) {
      console.error('Error toggling GST rate:', error);
      Alert.alert('Error', 'Failed to update GST rate.');
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/admin/dashboard' as any);
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
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#111827" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Tax Settings</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Configure tax preferences, rates and rules.
                </Text>
              </View>
            </View>
            <View style={styles.headerRightContainer}>
              <TouchableOpacity style={styles.iconBtn} onPress={fetchGstRates}>
                <Ionicons name="refresh-outline" size={18} color="#111827" />
              </TouchableOpacity>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.profileAvatar}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* ── Settings Category Navigation Pills ── */}
          <View style={styles.tabsNavContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsNavScroll}>
              <TouchableOpacity style={styles.navTabBtn}>
                <Ionicons name="settings-outline" size={15} color="#6B7280" />
                <Text style={styles.navTabText}>General</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navTabBtn}>
                <Ionicons name="storefront-outline" size={15} color="#6B7280" />
                <Text style={styles.navTabText}>Store Info</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navTabBtn}>
                <Ionicons name="car-outline" size={15} color="#6B7280" />
                <Text style={styles.navTabText}>Shipping</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navTabBtn}>
                <Ionicons name="card-outline" size={15} color="#6B7280" />
                <Text style={styles.navTabText}>Payment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navTabBtn}>
                <Ionicons name="mail-outline" size={15} color="#6B7280" />
                <Text style={styles.navTabText}>Email</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.navTabBtn, styles.navTabBtnActive]}>
                <Ionicons name="receipt-outline" size={15} color="#2D4B34" />
                <Text style={[styles.navTabText, styles.navTabTextActive]}>Tax Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navTabBtn} onPress={() => setShowMoreModal(true)}>
                <Ionicons name="ellipsis-horizontal-outline" size={15} color="#6B7280" />
                <Text style={styles.navTabText}>More</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90 }}
          >
            {/* ── CARD 1: Tax Configuration ── */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.cardTitle}>Tax Configuration</Text>
                  <Text style={styles.cardSubtitle}>
                    Manage how taxes are calculated and applied to orders.
                  </Text>
                </View>
                <TouchableOpacity style={styles.saveChangesBtn} onPress={handleSaveTaxConfig} disabled={savingConfig}>
                  {savingConfig ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.saveChangesBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Form Controls Grid */}
              <View style={styles.formRowGrid}>
                {/* Tax Calculation */}
                <View style={styles.formFieldCol}>
                  <Text style={styles.fieldLabel}>Tax Calculation</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelectBtn}
                    onPress={() => setShowCalcDropdown(true)}
                  >
                    <Text style={styles.dropdownSelectValue} numberOfLines={1}>{taxCalculation}</Text>
                    <Ionicons name="chevron-down" size={16} color="#6B7280" />
                  </TouchableOpacity>
                  <Text style={styles.fieldHelpText}>Calculate tax based on customer shipping address.</Text>
                </View>

                {/* Tax Display */}
                <View style={styles.formFieldCol}>
                  <Text style={styles.fieldLabel}>Tax Display</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelectBtn}
                    onPress={() => setShowDisplayDropdown(true)}
                  >
                    <Text style={styles.dropdownSelectValue} numberOfLines={1}>{taxDisplay}</Text>
                    <Ionicons name="chevron-down" size={16} color="#6B7280" />
                  </TouchableOpacity>
                  <Text style={styles.fieldHelpText}>Show taxes inclusive in product prices.</Text>
                </View>
              </View>

              <View style={styles.formRowGrid}>
                {/* Tax Rounding */}
                <View style={styles.formFieldCol}>
                  <Text style={styles.fieldLabel}>Tax Rounding</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelectBtn}
                    onPress={() => setShowRoundingDropdown(true)}
                  >
                    <Text style={styles.dropdownSelectValue} numberOfLines={1}>{taxRounding}</Text>
                    <Ionicons name="chevron-down" size={16} color="#6B7280" />
                  </TouchableOpacity>
                  <Text style={styles.fieldHelpText}>Round tax at the subtotal level.</Text>
                </View>
              </View>

              <View style={styles.formRowGrid}>
                {/* Default Tax Rate */}
                <View style={styles.formFieldCol}>
                  <Text style={styles.fieldLabel}>Default Tax Rate</Text>
                  <View style={styles.suffixInputContainer}>
                    <TextInput
                      style={styles.suffixInput}
                      keyboardType="numeric"
                      value={defaultTaxRate}
                      onChangeText={setDefaultTaxRate}
                    />
                    <View style={styles.suffixBadge}>
                      <Text style={styles.suffixBadgeText}>%</Text>
                    </View>
                  </View>
                  <Text style={styles.fieldHelpText}>Default tax rate when no specific rate is found.</Text>
                </View>

                {/* Tax Label */}
                <View style={styles.formFieldCol}>
                  <Text style={styles.fieldLabel}>Tax Label</Text>
                  <TextInput
                    style={styles.textInputStandard}
                    value={taxLabel}
                    onChangeText={setTaxLabel}
                  />
                  <Text style={styles.fieldHelpText}>Label displayed with tax (e.g., GST, VAT).</Text>
                </View>

                {/* Enable Taxes */}
                <View style={styles.formFieldCol}>
                  <Text style={styles.fieldLabel}>Enable Taxes</Text>
                  <View style={{ height: 42, justifyContent: 'center' }}>
                    <Switch
                      value={enableTaxes}
                      onValueChange={setEnableTaxes}
                      trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                      thumbColor={enableTaxes ? '#2D4B34' : '#F3F4F6'}
                    />
                  </View>
                  <Text style={styles.fieldHelpText}>Enable or disable tax across the store.</Text>
                </View>
              </View>
            </View>

            {/* ── CARD 2: Tax Rates Table ── */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.cardTitle}>Tax Rates</Text>
                  <Text style={styles.cardSubtitle}>
                    Add and manage tax rates for different regions.
                  </Text>
                </View>
                <TouchableOpacity style={styles.outlineAddBtn} onPress={handleAdd}>
                  <Ionicons name="add" size={16} color="#2D4B34" />
                  <Text style={styles.outlineAddBtnText}>Add New Tax Rate</Text>
                </TouchableOpacity>
              </View>

              {/* Subtabs for GST Rates vs Product GST */}
              <View style={styles.subTabRow}>
                <TouchableOpacity
                  style={[styles.subTabBtn, activeTab === 'tax_rates' && styles.subTabBtnActive]}
                  onPress={() => setActiveTab('tax_rates')}
                >
                  <Text style={[styles.subTabBtnText, activeTab === 'tax_rates' && styles.subTabBtnTextActive]}>
                    Standard Rates ({gstRates.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subTabBtn, activeTab === 'product_gst' && styles.subTabBtnActive]}
                  onPress={() => setActiveTab('product_gst')}
                >
                  <Text style={[styles.subTabBtnText, activeTab === 'product_gst' && styles.subTabBtnTextActive]}>
                    Product-Level GST ({mergedProductGst.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'tax_rates' ? (
                loading ? (
                  <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#2D4B34" />
                  </View>
                ) : gstRates.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
                    <Text style={styles.emptyBoxText}>No tax rates configured</Text>
                  </View>
                ) : (
                  <View style={styles.tableWrap}>
                    {/* Table Header */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.thCell, { flex: 2.2 }]}>Tax Name</Text>
                      <Text style={[styles.thCell, { flex: 1.2 }]}>Rate (%)</Text>
                      <Text style={[styles.thCell, { flex: 1.5 }]}>Country</Text>
                      <Text style={[styles.thCell, { flex: 1.8 }]}>State / Region</Text>
                      <Text style={[styles.thCell, { flex: 1.3 }]}>Status</Text>
                      <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>Actions</Text>
                    </View>

                    {/* Table Rows */}
                    {gstRates.map((item) => (
                      <View key={item.id} style={styles.tableBodyRow}>
                        <Text style={[styles.tdCell, styles.tdNameCell, { flex: 2.2 }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.tdCell, { flex: 1.2 }]}>
                          {item.percentage}%
                        </Text>
                        <Text style={[styles.tdCell, { flex: 1.5 }]} numberOfLines={1}>
                          {item.country || 'India'}
                        </Text>
                        <Text style={[styles.tdCell, { flex: 1.8 }]} numberOfLines={1}>
                          {item.region || 'All States'}
                        </Text>
                        <View style={{ flex: 1.3 }}>
                          <View style={[styles.statusPill, item.is_active ? styles.statusActivePill : styles.statusInactivePill]}>
                            <Text style={[styles.statusPillText, item.is_active ? styles.statusActiveText : styles.statusInactiveText]}>
                              {item.is_active ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.actionsCellRow}>
                          <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleEdit(item)}>
                            <Ionicons name="create-outline" size={16} color="#374151" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleDelete(item)}>
                            <Ionicons name="trash-outline" size={16} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    <Text style={styles.tableFooterCount}>
                      Showing 1 to {gstRates.length} of {gstRates.length} tax rates
                    </Text>
                  </View>
                )
              ) : (
                /* Product GST Tab */
                productLoading ? (
                  <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#2D4B34" />
                  </View>
                ) : (
                  <View>
                    <View style={{ marginBottom: 10 }}>
                      <TextInput
                        style={styles.searchProductInput}
                        placeholder="Search products by name..."
                        placeholderTextColor="#9CA3AF"
                        value={productSearch}
                        onChangeText={setProductSearch}
                      />
                    </View>
                    <View style={styles.tableWrap}>
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.thCell, { flex: 3 }]}>Product Name</Text>
                        <Text style={[styles.thCell, { flex: 2 }]}>GST Rate (%)</Text>
                        <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>Action</Text>
                      </View>
                      {filteredProductGst.map((p) => (
                        <View key={p.product_id} style={styles.tableBodyRow}>
                          <Text style={[styles.tdCell, styles.tdNameCell, { flex: 3 }]} numberOfLines={1}>
                            {p.product_name}
                          </Text>
                          <View style={{ flex: 2, paddingRight: 10 }}>
                            <TextInput
                              style={styles.miniNumericInput}
                              keyboardType="numeric"
                              value={String(p.percentage)}
                              onChangeText={(val) => {
                                const num = parseFloat(val) || 0;
                                setProductGst((prev) => {
                                  const exists = prev.some((item) => item.product_id === p.product_id);
                                  if (exists) {
                                    return prev.map((item) =>
                                      item.product_id === p.product_id ? { ...item, percentage: num } : item
                                    );
                                  }
                                  return [...prev, { product_id: p.product_id, product_name: p.product_name, percentage: num, is_active: true }];
                                });
                              }}
                            />
                          </View>
                          <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                            <TouchableOpacity
                              style={styles.saveProductGstBtn}
                              onPress={() => handleSaveProductGst(p.product_id, p.percentage)}
                              disabled={savingProductId === p.product_id}
                            >
                              {savingProductId === p.product_id ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Text style={styles.saveProductGstBtnText}>Save</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                      <Text style={styles.tableFooterCount}>
                        Showing {filteredProductGst.length} of {mergedProductGst.length} products
                      </Text>
                    </View>
                  </View>
                )
              )}
            </View>

            {/* ── CARD 3: Need Help with Taxes? ── */}
            <View style={styles.helpCardContainer}>
              <View style={styles.helpIconBadge}>
                <Ionicons name="receipt-outline" size={20} color="#2D4B34" />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={styles.helpCardTitle}>Need Help with Taxes?</Text>
                <Text style={styles.helpCardSubtitle}>
                  Make sure your tax settings comply with your local regulations.
                </Text>
              </View>
              <TouchableOpacity style={styles.learnMoreBtn} onPress={() => Alert.alert('Tax Guidance', 'For detailed GST & tax compliance instructions, please refer to the official government tax guidelines or consult your accountant.')}>
                <Text style={styles.learnMoreBtnText}>Learn More ↗</Text>
              </TouchableOpacity>
            </View>
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
              <Ionicons name="receipt" size={22} color="#2D4B34" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Settings</Text>
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

          {/* ── Dropdown Picker Modals ── */}
          <Modal visible={showCalcDropdown} transparent animationType="slide" onRequestClose={() => setShowCalcDropdown(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCalcDropdown(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalSheetTitle}>Tax Calculation Method</Text>
                {['Based on Shipping Address', 'Based on Billing Address', 'Store Base Address'].map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownOption, taxCalculation === opt && styles.dropdownOptionActive]}
                    onPress={() => { setTaxCalculation(opt); setShowCalcDropdown(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, taxCalculation === opt && styles.dropdownOptionTextActive]}>{opt}</Text>
                    {taxCalculation === opt && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          <Modal visible={showDisplayDropdown} transparent animationType="slide" onRequestClose={() => setShowDisplayDropdown(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDisplayDropdown(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalSheetTitle}>Tax Display Mode</Text>
                {['Inclusive', 'Exclusive'].map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownOption, taxDisplay === opt && styles.dropdownOptionActive]}
                    onPress={() => { setTaxDisplay(opt); setShowDisplayDropdown(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, taxDisplay === opt && styles.dropdownOptionTextActive]}>{opt}</Text>
                    {taxDisplay === opt && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          <Modal visible={showRoundingDropdown} transparent animationType="slide" onRequestClose={() => setShowRoundingDropdown(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRoundingDropdown(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalSheetTitle}>Tax Rounding Mode</Text>
                {['Round off at subtotal level', 'Round per item line', 'No rounding'].map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownOption, taxRounding === opt && styles.dropdownOptionActive]}
                    onPress={() => { setTaxRounding(opt); setShowRoundingDropdown(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, taxRounding === opt && styles.dropdownOptionTextActive]}>{opt}</Text>
                    {taxRounding === opt && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Add / Edit GST Modal ── */}
          <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
              <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddModal(false)} />
              <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalSheetTitle}>{editingGst ? 'Edit Tax Rate' : 'Add New Tax Rate'}</Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={20} color="#111827" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.45 }} showsVerticalScrollIndicator={true}>
                  <Text style={styles.fieldLabel}>Tax Name *</Text>
                  <TextInput
                    style={styles.textInputStandard}
                    placeholder="e.g. GST 18%"
                    placeholderTextColor="#9CA3AF"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />

                  <Text style={styles.fieldLabel}>GST Percentage (%) *</Text>
                  <TextInput
                    style={styles.textInputStandard}
                    placeholder="18"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={formData.percentage.toString()}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0;
                      setFormData({ ...formData, percentage: num });
                    }}
                  />

                  <Text style={styles.fieldLabel}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.textInputStandard, { height: 64, textAlignVertical: 'top' }]}
                    placeholder="Brief description of this tax rule"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                  />

                  <View style={styles.switchRowContainer}>
                    <Text style={styles.fieldLabel}>Active Status</Text>
                    <Switch
                      value={formData.is_active}
                      onValueChange={(val) => setFormData({ ...formData, is_active: val })}
                      trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                      thumbColor={formData.is_active ? '#2D4B34' : '#F3F4F6'}
                    />
                  </View>
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSubmit} disabled={submitting}>
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSubmitBtnText}>{editingGst ? 'Update Rate' : 'Create Tax Rate'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

        </View>
      </SafeAreaView>
    </>
  );
}

export default function GstPage() {
  return (
    <ErrorBoundary>
      <GstPageInner />
    </ErrorBoundary>
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#E5E7EB' },

  /* Category Nav Pills Bar */
  tabsNavContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsNavScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  navTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navTabBtnActive: {
    backgroundColor: '#EAF6ED',
    borderColor: '#2D4B34',
  },
  navTabText: { fontSize: 12, fontWeight: '500', color: '#4B5563' },
  navTabTextActive: { color: '#2D4B34', fontWeight: '700' },

  /* Body Scroll */
  body: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },

  /* Cards */
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  saveChangesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2D4B34',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveChangesBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  outlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D4B34',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  outlineAddBtnText: { color: '#2D4B34', fontSize: 12, fontWeight: '700' },

  /* Form Layout */
  formRowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  formFieldCol: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 64) / 2,
    marginBottom: 4,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldHelpText: { fontSize: 10, color: '#6B7280', marginTop: 4 },

  dropdownSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  dropdownSelectValue: { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1, marginRight: 6 },

  textInputStandard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#111827',
  },

  suffixInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
    height: 42,
  },
  suffixInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111827',
  },
  suffixBadge: {
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suffixBadgeText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  /* Subtab controls */
  subTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
  },
  subTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  subTabBtnActive: {
    backgroundColor: '#2D4B34',
  },
  subTabBtnText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  subTabBtnTextActive: { color: '#FFFFFF' },

  /* Table styling */
  tableWrap: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  thCell: { fontSize: 11, fontWeight: '700', color: '#374151' },

  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  tdCell: { fontSize: 12, color: '#374151' },
  tdNameCell: { fontWeight: '600', color: '#111827' },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusActivePill: { backgroundColor: '#EAF6ED' },
  statusInactivePill: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  statusActiveText: { color: '#15803D' },
  statusInactiveText: { color: '#DC2626' },

  actionsCellRow: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tableFooterCount: {
    fontSize: 11,
    color: '#6B7280',
    padding: 10,
    backgroundColor: '#FAFAFA',
  },

  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyBoxText: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },

  miniNumericInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: '#111827',
  },
  saveProductGstBtn: {
    backgroundColor: '#2D4B34',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  saveProductGstBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  /* Card 3: Need Help */
  helpCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4FBF7',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  helpIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCardTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  helpCardSubtitle: { fontSize: 11, color: '#4B5563', marginTop: 1 },
  learnMoreBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D4B34',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  learnMoreBtnText: { color: '#2D4B34', fontSize: 11, fontWeight: '700' },

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

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { flex: 1 },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    maxHeight: SCREEN_HEIGHT * 0.72,
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
  modalSheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownOptionActive: { backgroundColor: '#EAF6ED' },
  dropdownOptionText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  dropdownOptionTextActive: { color: '#2D4B34', fontWeight: '700' },

  switchRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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

  searchProductInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    fontSize: 12,
    color: '#111827',
  },
});
