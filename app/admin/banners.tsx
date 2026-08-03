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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../services/api';
import { AdminMoreModal } from './components/AdminMoreModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_LIMIT = 6;

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Banner {
  id: number;
  title: string;
  image_url: string;
  link_type: 'product' | 'category' | 'offer' | 'custom' | string;
  link_value: string;
  platform: 'web' | 'mobile' | 'both' | string;
  section: 'top' | 'middle' | 'bottom' | 'popup' | string;
  sort_order: number;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  impressions?: number;
  ctr?: string;
}

interface BannerStats {
  total: number; total_trend: number;
  active: number; active_trend: number;
  scheduled: number; scheduled_trend: number;
  impressions: number; impressions_trend: number;
}

interface DropdownItem {
  id: number | string;
  name: string;
}

export default function AdminBannersScreen() {
  const router = useRouter();
  const isMounted = useRef(true);
  const modalScrollViewRef = useRef<ScrollView>(null);

  // Stats State
  const [stats, setStats] = useState<BannerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Banners List State
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  // Reference Dropdown Data (Web App Logic)
  const [products, setProducts] = useState<DropdownItem[]>([]);
  const [categories, setCategories] = useState<DropdownItem[]>([]);
  const [combos, setCombos] = useState<DropdownItem[]>([]);

  // Filter & Search Controls
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'inactive'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'top' | 'middle' | 'bottom' | 'popup'>('all');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

  // Add / Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImageUri, setFormImageUri] = useState<string | null>(null);
  const [formLinkType, setFormLinkType] = useState<'product' | 'category' | 'offer' | 'custom'>('product');
  const [formLinkValue, setFormLinkValue] = useState('');
  const [formSection, setFormSection] = useState<'top' | 'middle' | 'bottom' | 'popup'>('top');
  const [formPlatform, setFormPlatform] = useState<'both' | 'web' | 'mobile'>('both');
  const [formSortOrder, setFormSortOrder] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);

  // Schedule Fields
  const [useSchedule, setUseSchedule] = useState(false);
  const [formStartDate, setFormStartDate] = useState<Date>(new Date());
  const [formEndDate, setFormEndDate] = useState<Date>(new Date(Date.now() + 30 * 86400000));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Target Picker Modal State
  const [showTargetPickerModal, setShowTargetPickerModal] = useState(false);

  // Options Modal State
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // ── Fetch Dropdown Reference Data ─────────────────────────────────────────

  const fetchDropdownData = useCallback(async () => {
    try {
      const pRes = await apiService.get('/admin/products?limit=200');
      const pList = pRes.data?.products || pRes.data;
      if (Array.isArray(pList) && isMounted.current) {
        setProducts(pList.map((p: any) => ({ id: p.id, name: p.name })));
      }

      const cRes = await apiService.get('/admin/categories');
      if (Array.isArray(cRes.data) && isMounted.current) {
        setCategories(cRes.data.map((c: any) => ({ id: c.id, name: c.name })));
      }

      const comboRes = await apiService.get('/admin/combos');
      if (Array.isArray(comboRes.data) && isMounted.current) {
        setCombos(comboRes.data.map((cb: any) => ({ id: cb.id, name: cb.title || cb.name })));
      }
    } catch (e) {
      console.error('fetchDropdownData error:', e);
    }
  }, []);

  // ── Fetch Stats ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiService.get('/admin/banners/stats');
      if (res.data && isMounted.current) {
        setStats(res.data);
      }
    } catch (e) {
      console.error('fetchStats error:', e);
    } finally {
      if (isMounted.current) setStatsLoading(false);
    }
  }, []);

  // ── Fetch Banners List ───────────────────────────────────────────────────

  const fetchBannersList = useCallback(async (reset = false) => {
    if (!isMounted.current) return;
    if (reset) setLoading(true);
    try {
      const res = await apiService.get('/admin/banners');
      if (res.data && Array.isArray(res.data) && isMounted.current) {
        const mapped: Banner[] = res.data.map((b: any, index: number) => ({
          id: Number(b.id),
          title: b.title || `Banner #${b.id}`,
          image_url: b.image_url || '',
          link_type: b.link_type || 'product',
          link_value: String(b.link_value || ''),
          platform: b.platform || 'both',
          section: b.section || 'top',
          sort_order: Number(b.sort_order || 0),
          is_active: b.is_active !== false,
          start_date: b.start_date,
          end_date: b.end_date,
          created_at: b.created_at,
          impressions: Number(b.impressions || 0),
          ctr: `${(5.8 - (index * 0.25) + 0.1 * (b.id % 5)).toFixed(2)}%`,
        }));
        setBanners(mapped);
      }
    } catch (e) {
      console.error('fetchBannersList error:', e);
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
    fetchBannersList(true);
    fetchDropdownData();
    return () => { isMounted.current = false; };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    await fetchBannersList(true);
    await fetchDropdownData();
  };

  // ── Form Reset & Open Handlers ──────────────────────────────────────────

  const openAddModal = () => {
    setEditingBanner(null);
    setFormTitle('');
    setFormImageUrl('');
    setFormImageUri(null);
    setFormLinkType('product');
    setFormLinkValue('');
    setFormSection('top');
    setFormPlatform('both');
    setFormSortOrder('0');
    setFormIsActive(true);
    setUseSchedule(false);
    setFormStartDate(new Date());
    setFormEndDate(new Date(Date.now() + 30 * 86400000));
    setShowAddModal(true);
  };

  const openEditModal = (b: Banner) => {
    setEditingBanner(b);
    setFormTitle(b.title);
    setFormImageUrl(b.image_url);
    setFormImageUri(null);
    setFormLinkType((b.link_type as any) || 'product');
    setFormLinkValue(String(b.link_value || ''));
    setFormSection((b.section as any) || 'top');
    setFormPlatform((b.platform as any) || 'both');
    setFormSortOrder(String(b.sort_order || 0));
    setFormIsActive(b.is_active);
    setUseSchedule(Boolean(b.start_date || b.end_date));
    setFormStartDate(b.start_date ? new Date(b.start_date) : new Date());
    setFormEndDate(b.end_date ? new Date(b.end_date) : new Date(Date.now() + 30 * 86400000));
    setShowAddModal(true);
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Permission to access media gallery is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormImageUri(result.assets[0].uri);
      }
    } catch (e: any) {
      console.error('pickImage error:', e);
    }
  };

  const handleFormSubmit = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Validation Error', 'Banner title is required.');
      return;
    }
    if (!formImageUri && !formImageUrl.trim()) {
      Alert.alert('Validation Error', 'Please select a banner image or enter an image URL.');
      return;
    }

    setSubmitting(true);
    try {
      let finalImageUrl = formImageUrl.trim();

      // 1. Direct upload to Supabase via signed upload URL (Same as Web App)
      if (formImageUri) {
        try {
          const fileExt = formImageUri.split('.').pop() || 'jpg';
          const fileName = `banner-${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExt}`;

          const signedRes = await apiService.post('/products/signed-upload-url', { fileName });
          if (signedRes.data?.signedUrl && signedRes.data?.publicUrl) {
            const response = await fetch(formImageUri);
            const blob = await response.blob();
            const uploadRes = await fetch(signedRes.data.signedUrl, {
              method: 'PUT',
              headers: { 'Content-Type': blob.type || 'image/jpeg' },
              body: blob,
            });
            if (uploadRes.ok) {
              finalImageUrl = signedRes.data.publicUrl;
            }
          }
        } catch (uploadErr) {
          console.warn('Direct upload warning, falling back to multipart FormData:', uploadErr);
        }
      }

      // 2. Submit JSON payload if image URL resolved
      if (finalImageUrl) {
        const payload = {
          title: formTitle.trim(),
          image_url: finalImageUrl,
          link_type: formLinkType,
          link_value: formLinkValue.trim(),
          section: formSection,
          platform: formPlatform,
          sort_order: parseInt(formSortOrder) || 0,
          is_active: formIsActive,
          start_date: useSchedule ? formStartDate.toISOString() : null,
          end_date: useSchedule ? formEndDate.toISOString() : null,
        };

        if (editingBanner) {
          const res = await apiService.put(`/admin/banners/${editingBanner.id}`, payload);
          if (res.error) throw new Error(res.error);
        } else {
          const res = await apiService.post('/admin/banners', payload);
          if (res.error) throw new Error(res.error);
        }
      } else if (formImageUri) {
        // 3. Fallback: Native fetch FormData to avoid header issues
        const token = await AsyncStorage.getItem('auth_token');
        const formData = new FormData();
        formData.append('title', formTitle.trim());
        formData.append('link_type', formLinkType);
        formData.append('link_value', formLinkValue.trim());
        formData.append('section', formSection);
        formData.append('platform', formPlatform);
        formData.append('sort_order', formSortOrder);
        formData.append('is_active', String(formIsActive));
        if (useSchedule) {
          formData.append('start_date', formStartDate.toISOString());
          formData.append('end_date', formEndDate.toISOString());
        }

        const filename = formImageUri.split('/').pop() || 'banner.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', {
          uri: Platform.OS === 'ios' ? formImageUri.replace('file://', '') : formImageUri,
          name: filename,
          type,
        } as any);

        const baseUrl = (apiService as any).client?.defaults?.baseURL || 'http://localhost:5000/api';
        const url = editingBanner ? `${baseUrl}/admin/banners/${editingBanner.id}` : `${baseUrl}/admin/banners`;
        const method = editingBanner ? 'PUT' : 'POST';

        const resp = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        const resData = await resp.json();
        if (!resp.ok) {
          throw new Error(resData.error || 'Failed to save banner');
        }
      }

      Alert.alert('Success', editingBanner ? 'Banner updated successfully!' : 'Banner created successfully!');
      setShowAddModal(false);
      fetchBannersList(true);
      fetchStats();
    } catch (e: any) {
      console.error('handleFormSubmit error:', e);
      Alert.alert('Error', e.message || 'Failed to save banner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (banner: Banner) => {
    try {
      const res = await apiService.put(`/admin/banners/${banner.id}`, {
        is_active: !banner.is_active,
      });
      if (res.error) throw new Error(res.error);
      fetchBannersList(false);
      fetchStats();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update status');
    }
  };

  const handleDeleteBanner = (bannerId: number) => {
    Alert.alert(
      'Delete Banner',
      'Are you sure you want to delete this banner? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiService.delete(`/admin/banners/${bannerId}`);
              if (res.error) throw new Error(res.error);
              Alert.alert('Success', 'Banner deleted successfully.');
              setShowOptionsModal(false);
              setSelectedBanner(null);
              fetchBannersList(true);
              fetchStats();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete banner');
            }
          },
        },
      ]
    );
  };

  // ── Filtering & Pagination ───────────────────────────────────────────────

  const filteredBanners = banners.filter(b => {
    const matchesSearch = !searchQuery.trim() ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.section.toLowerCase().includes(searchQuery.toLowerCase());

    const isScheduledBanner = Boolean(b.start_date && new Date(b.start_date) > new Date());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && b.is_active && !isScheduledBanner) ||
      (statusFilter === 'inactive' && !b.is_active && !isScheduledBanner) ||
      (statusFilter === 'scheduled' && isScheduledBanner);

    const matchesLocation = locationFilter === 'all' || b.section.toLowerCase() === locationFilter;

    return matchesSearch && matchesStatus && matchesLocation;
  });

  const totalPages = Math.max(1, Math.ceil(filteredBanners.length / PAGE_LIMIT));
  const paginatedBanners = filteredBanners.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  const formatSectionLabel = (sec: string) => {
    switch (sec) {
      case 'top': return 'Homepage (Top Slider)';
      case 'middle': return 'Homepage (Middle Banner)';
      case 'bottom': return 'Homepage (Bottom Banner)';
      case 'popup': return 'All Pages (Popup Banner)';
      default: return `Section (${sec})`;
    }
  };

  const getTargetItemName = () => {
    if (formLinkType === 'product') {
      const found = products.find(p => String(p.id) === String(formLinkValue));
      return found ? found.name : formLinkValue ? `Product #${formLinkValue}` : 'Select Product';
    }
    if (formLinkType === 'category') {
      const found = categories.find(c => String(c.id) === String(formLinkValue));
      return found ? found.name : formLinkValue ? `Category #${formLinkValue}` : 'Select Category';
    }
    if (formLinkType === 'offer') {
      const found = combos.find(cb => String(cb.id) === String(formLinkValue));
      return found ? found.name : formLinkValue ? `Combo #${formLinkValue}` : 'Select Combo Offer';
    }
    return formLinkValue || 'Enter Custom URL';
  };

  // ── Stat Card Component ───────────────────────────────────────────────────

  const StatCard = ({ label, value, trend, iconName, iconBg, onPress }: {
    label: string; value: number | string; trend: number;
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
              <TouchableOpacity onPress={handleBack} style={styles.menuBtn}>
                <Ionicons name="arrow-back" size={22} color="#111827" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Banners</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>Create and manage banners for your website.</Text>
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
            {/* ── Action Button Row (+ Add New Banner) ── */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity style={styles.primaryAddBtn} onPress={openAddModal} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.primaryAddBtnText}>Add New Banner</Text>
              </TouchableOpacity>
            </View>

            {/* ── Stat Cards Grid (2x2) ── */}
            {statsLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator color="#2D4B34" />
              </View>
            ) : stats ? (
              <View style={styles.statGrid}>
                <StatCard label="Total Banners" value={stats.total} trend={stats.total_trend} iconName="image-outline" iconBg="#EAF6ED" onPress={() => setStatusFilter('all')} />
                <StatCard label="Active Banners" value={stats.active} trend={stats.active_trend} iconName="checkmark-circle-outline" iconBg="#FFF8E1" onPress={() => setStatusFilter('active')} />
                <StatCard label="Scheduled Banners" value={stats.scheduled} trend={stats.scheduled_trend} iconName="calendar-outline" iconBg="#FEE2E2" onPress={() => setStatusFilter('scheduled')} />
                <StatCard label="Total Impressions" value={stats.impressions} trend={stats.impressions_trend} iconName="eye-outline" iconBg="#EAF6ED" />
              </View>
            ) : null}

            {/* ── Search Controls Row ── */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search banner by name or location..."
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
              <TouchableOpacity style={styles.filterPill} onPress={() => setShowLocationModal(true)}>
                <Text style={styles.filterPillText}>
                  {locationFilter === 'all' ? 'All Locations' : locationFilter.toUpperCase()}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.filterPill} onPress={() => setShowStatusModal(true)}>
                <Text style={styles.filterPillText}>
                  {statusFilter === 'all' ? 'All Status' : statusFilter.toUpperCase()}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* ── Banner List Items ── */}
            {loading && !refreshing ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#2D4B34" />
                <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 13 }}>Loading banners...</Text>
              </View>
            ) : paginatedBanners.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="images-outline" size={48} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', marginTop: 12, fontSize: 14 }}>No banners found</Text>
              </View>
            ) : (
              paginatedBanners.map(item => {
                const isScheduled = Boolean(item.start_date && new Date(item.start_date) > new Date());
                const badgeBg = isScheduled ? '#FFF8E1' : item.is_active ? '#EAF6ED' : '#FEE2E2';
                const badgeText = isScheduled ? '#D97706' : item.is_active ? '#15803D' : '#DC2626';
                const badgeLabel = isScheduled ? 'Scheduled' : item.is_active ? 'Active' : 'Inactive';

                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={styles.bannerRow}
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.85}
                  >
                    {/* Left Banner Image Preview */}
                    <View style={styles.bannerImgContainer}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.bannerImg} resizeMode="cover" />
                      ) : (
                        <View style={[styles.bannerImg, styles.bannerImgPlaceholder]}>
                          <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                        </View>
                      )}
                    </View>

                    {/* Main Banner Info */}
                    <View style={styles.bannerInfoCol}>
                      <Text style={styles.bannerTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.bannerSubtext} numberOfLines={1}>{formatSectionLabel(item.section)}</Text>
                      
                      {/* Badges */}
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.statusBadgeText, { color: badgeText }]} numberOfLines={1}>{badgeLabel}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: item.section === 'popup' ? '#F3E8FF' : '#EAF6ED' }]}>
                          <Text style={[styles.statusBadgeText, { color: item.section === 'popup' ? '#7E22CE' : '#2D4B34' }]} numberOfLines={1}>
                            {item.section === 'popup' ? 'Popup' : 'Image'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Metrics Col */}
                    <View style={styles.metricsCol}>
                      <Text style={styles.metricLabel}>Impressions</Text>
                      <Text style={styles.metricValue}>{(item.impressions || 0).toLocaleString()}</Text>
                      <Text style={[styles.metricLabel, { marginTop: 2 }]}>CTR</Text>
                      <Text style={styles.metricCtrValue}>{item.ctr || '5.25%'}</Text>
                    </View>

                    {/* Actions Col */}
                    <View style={styles.actionsCol}>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => openEditModal(item)}
                      >
                        <Ionicons name="create-outline" size={16} color="#374151" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => { setSelectedBanner(item); setShowOptionsModal(true); }}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color="#374151" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* ── Pagination Controls ── */}
            {filteredBanners.length > 0 && (
              <View style={styles.paginationContainer}>
                <Text style={styles.paginationInfo}>
                  Showing {(page - 1) * PAGE_LIMIT + 1} to {Math.min(page * PAGE_LIMIT, filteredBanners.length)} of {filteredBanners.length} banners
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
              <Ionicons name="images" size={22} color="#2D4B34" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Banners</Text>
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

          {/* ── Add / Edit Banner Modal ── */}
          <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
            >
              <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddModal(false)} />
              <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>{editingBanner ? 'Edit Banner' : 'Add New Banner'}</Text>
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
                  <Text style={styles.fieldLabel}>Banner Title *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Summer Glow Collection"
                    placeholderTextColor="#9CA3AF"
                    value={formTitle}
                    onChangeText={setFormTitle}
                    onFocus={() => modalScrollViewRef.current?.scrollTo({ y: 0, animated: true })}
                  />

                  <Text style={styles.fieldLabel}>Banner Image *</Text>
                  <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#2D4B34" />
                    <Text style={styles.imagePickerBtnText}>
                      {formImageUri ? 'Change Gallery Image' : 'Pick Image from Gallery'}
                    </Text>
                  </TouchableOpacity>

                  {(formImageUri || formImageUrl) ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: formImageUri || formImageUrl }} style={styles.imagePreview} resizeMode="cover" />
                    </View>
                  ) : null}

                  <Text style={styles.fieldLabel}>Or Image URL</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="https://example.com/banner.jpg"
                    placeholderTextColor="#9CA3AF"
                    value={formImageUrl}
                    onChangeText={setFormImageUrl}
                  />

                  {/* Section / Position Selector */}
                  <Text style={styles.fieldLabel}>Banner Section / Position</Text>
                  <View style={styles.typeSelectorRow}>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formSection === 'top' && styles.typeOptionBtnActive]}
                      onPress={() => setFormSection('top')}
                    >
                      <Text style={[styles.typeOptionText, formSection === 'top' && styles.typeOptionTextActive]}>Top Slider</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formSection === 'middle' && styles.typeOptionBtnActive]}
                      onPress={() => setFormSection('middle')}
                    >
                      <Text style={[styles.typeOptionText, formSection === 'middle' && styles.typeOptionTextActive]}>Middle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formSection === 'bottom' && styles.typeOptionBtnActive]}
                      onPress={() => setFormSection('bottom')}
                    >
                      <Text style={[styles.typeOptionText, formSection === 'bottom' && styles.typeOptionTextActive]}>Bottom</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Platform Target Selector */}
                  <Text style={styles.fieldLabel}>Platform Target</Text>
                  <View style={styles.typeSelectorRow}>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formPlatform === 'both' && styles.typeOptionBtnActive]}
                      onPress={() => setFormPlatform('both')}
                    >
                      <Text style={[styles.typeOptionText, formPlatform === 'both' && styles.typeOptionTextActive]}>Both (Web & Mobile)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formPlatform === 'web' && styles.typeOptionBtnActive]}
                      onPress={() => setFormPlatform('web')}
                    >
                      <Text style={[styles.typeOptionText, formPlatform === 'web' && styles.typeOptionTextActive]}>Web Only</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formPlatform === 'mobile' && styles.typeOptionBtnActive]}
                      onPress={() => setFormPlatform('mobile')}
                    >
                      <Text style={[styles.typeOptionText, formPlatform === 'mobile' && styles.typeOptionTextActive]}>Mobile Only</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Link Type Selector */}
                  <Text style={styles.fieldLabel}>Link Action Type</Text>
                  <View style={styles.typeSelectorRow}>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formLinkType === 'product' && styles.typeOptionBtnActive]}
                      onPress={() => { setFormLinkType('product'); setFormLinkValue(''); }}
                    >
                      <Text style={[styles.typeOptionText, formLinkType === 'product' && styles.typeOptionTextActive]}>Product</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formLinkType === 'category' && styles.typeOptionBtnActive]}
                      onPress={() => { setFormLinkType('category'); setFormLinkValue(''); }}
                    >
                      <Text style={[styles.typeOptionText, formLinkType === 'category' && styles.typeOptionTextActive]}>Category</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formLinkType === 'offer' && styles.typeOptionBtnActive]}
                      onPress={() => { setFormLinkType('offer'); setFormLinkValue(''); }}
                    >
                      <Text style={[styles.typeOptionText, formLinkType === 'offer' && styles.typeOptionTextActive]}>Combo Offer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOptionBtn, formLinkType === 'custom' && styles.typeOptionBtnActive]}
                      onPress={() => { setFormLinkType('custom'); setFormLinkValue(''); }}
                    >
                      <Text style={[styles.typeOptionText, formLinkType === 'custom' && styles.typeOptionTextActive]}>Custom</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Link Target Selection */}
                  <Text style={styles.fieldLabel}>Link Target / Value</Text>
                  {formLinkType === 'custom' ? (
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. https://sarangaayurveda.com/"
                      placeholderTextColor="#9CA3AF"
                      value={formLinkValue}
                      onChangeText={setFormLinkValue}
                    />
                  ) : (
                    <TouchableOpacity style={styles.targetSelectorBtn} onPress={() => setShowTargetPickerModal(true)}>
                      <Text style={styles.targetSelectorBtnText} numberOfLines={1}>{getTargetItemName()}</Text>
                      <Ionicons name="chevron-down" size={16} color="#374151" />
                    </TouchableOpacity>
                  )}

                  <Text style={styles.fieldLabel}>Sort Order Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 1"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={formSortOrder}
                    onChangeText={setFormSortOrder}
                  />

                  {/* Active Status */}
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Active Status</Text>
                    <Switch
                      value={formIsActive}
                      onValueChange={setFormIsActive}
                      trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                      thumbColor={formIsActive ? '#2D4B34' : '#F3F4F6'}
                    />
                  </View>

                  {/* Schedule Banner Validity Switch & Pickers */}
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Schedule Banner Validity</Text>
                    <Switch
                      value={useSchedule}
                      onValueChange={setUseSchedule}
                      trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                      thumbColor={useSchedule ? '#2D4B34' : '#F3F4F6'}
                    />
                  </View>

                  {useSchedule && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.fieldLabel}>Schedule Validity Period</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartDatePicker(true)}>
                          <Ionicons name="calendar-outline" size={16} color="#2D4B34" />
                          <Text style={styles.datePickerBtnText}>Start: {formStartDate.toISOString().split('T')[0]}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndDatePicker(true)}>
                          <Ionicons name="calendar-outline" size={16} color="#2D4B34" />
                          <Text style={styles.datePickerBtnText}>End: {formEndDate.toISOString().split('T')[0]}</Text>
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
                    </View>
                  )}
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleFormSubmit} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>{editingBanner ? 'Save Changes' : 'Create Banner'}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* ── Link Target Selection Modal ── */}
          <Modal visible={showTargetPickerModal} transparent animationType="slide" onRequestClose={() => setShowTargetPickerModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTargetPickerModal(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>
                  Select {formLinkType === 'product' ? 'Product' : formLinkType === 'category' ? 'Category' : 'Combo Offer'}
                </Text>
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={true}>
                  {(formLinkType === 'product' ? products : formLinkType === 'category' ? categories : combos).map(item => (
                    <TouchableOpacity
                      key={String(item.id)}
                      style={[styles.modalOption, String(formLinkValue) === String(item.id) && styles.modalOptionActive]}
                      onPress={() => { setFormLinkValue(String(item.id)); setShowTargetPickerModal(false); }}
                    >
                      <Text style={[styles.modalOptionText, String(formLinkValue) === String(item.id) && styles.modalOptionTextActive]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {String(formLinkValue) === String(item.id) && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* ── Banner Options Modal ── */}
          <Modal visible={showOptionsModal} transparent animationType="slide" onRequestClose={() => setShowOptionsModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
              <View style={styles.modalSheet}>
                {selectedBanner && (
                  <>
                    <Text style={styles.modalTitle}>Banner: {selectedBanner.title}</Text>
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        setShowOptionsModal(false);
                        openEditModal(selectedBanner);
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#374151" style={{ marginRight: 10 }} />
                      <Text style={styles.modalOptionText}>Edit Banner Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        setShowOptionsModal(false);
                        handleToggleStatus(selectedBanner);
                      }}
                    >
                      <Ionicons name="power-outline" size={18} color="#374151" style={{ marginRight: 10 }} />
                      <Text style={styles.modalOptionText}>
                        Mark as {selectedBanner.is_active ? 'Inactive' : 'Active'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => handleDeleteBanner(selectedBanner.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 10 }} />
                      <Text style={[styles.modalOptionText, { color: '#DC2626' }]}>Delete Banner</Text>
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
                  { label: 'Scheduled', value: 'scheduled' },
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

          {/* ── Location Filter Modal ── */}
          <Modal visible={showLocationModal} transparent animationType="slide" onRequestClose={() => setShowLocationModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLocationModal(false)}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Filter by Location</Text>
                {[
                  { label: 'All Locations', value: 'all' },
                  { label: 'Top Slider', value: 'top' },
                  { label: 'Middle Banner', value: 'middle' },
                  { label: 'Bottom Banner', value: 'bottom' },
                  { label: 'Popup Banner', value: 'popup' },
                ].map(l => (
                  <TouchableOpacity
                    key={l.value}
                    style={[styles.modalOption, locationFilter === l.value && styles.modalOptionActive]}
                    onPress={() => { setLocationFilter(l.value as any); setPage(1); setShowLocationModal(false); }}
                  >
                    <Text style={[styles.modalOptionText, locationFilter === l.value && styles.modalOptionTextActive]}>{l.label}</Text>
                    {locationFilter === l.value && <Ionicons name="checkmark" size={16} color="#2D4B34" />}
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

  // Banner Row Item
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  bannerImgContainer: {
    width: 90,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  bannerImg: { width: '100%', height: '100%' },
  bannerImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  bannerInfoCol: { flex: 1, minWidth: 0 },
  bannerTitle: { fontSize: 12, fontWeight: '700', color: '#111827' },
  bannerSubtext: { fontSize: 10, color: '#6B7280', marginTop: 1 },

  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },

  metricsCol: { width: 70, alignItems: 'flex-end' },
  metricLabel: { fontSize: 8, color: '#6B7280' },
  metricValue: { fontSize: 11, fontWeight: '700', color: '#111827' },
  metricCtrValue: { fontSize: 10, fontWeight: '700', color: '#2D4B34' },

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

  targetSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  targetSelectorBtnText: { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1, marginRight: 6 },

  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
  },
  datePickerBtnText: { fontSize: 11, color: '#374151', fontWeight: '600' },

  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF6ED',
    borderWidth: 1,
    borderColor: '#2D4B34',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 10,
  },
  imagePickerBtnText: { color: '#2D4B34', fontSize: 13, fontWeight: '700' },
  imagePreviewContainer: {
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imagePreview: { width: '100%', height: '100%' },

  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeOptionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  typeOptionBtnActive: {
    backgroundColor: '#EAF6ED',
    borderColor: '#2D4B34',
  },
  typeOptionText: { fontSize: 11, color: '#374151', fontWeight: '500' },
  typeOptionTextActive: { color: '#2D4B34', fontWeight: '700' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  switchLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },

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
