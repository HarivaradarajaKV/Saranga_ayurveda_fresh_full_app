import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Modal, 
    TextInput, 
    ScrollView, 
    ActivityIndicator, 
    Image,
    SafeAreaView,
    Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../services/api';
import { ErrorBoundary } from '../ErrorBoundary';
import Constants from 'expo-constants';

const CACHE_TTL = 15000; // Reduced to 15 seconds to free memory faster
const PAGE_SIZE = 5; // Reduced from 10 to minimize initial memory footprint
const MAX_PRODUCTS_IN_MEMORY = 50; // Limit products to prevent memory exhaustion
let combosCache: { data: Combo[]; ts: number } | null = null;
let productsCache: { data: any[]; ts: number } | null = null;

const ENABLE_ADMIN_DEBUG =
  __DEV__ &&
  String(
    ((Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.EXPO_PUBLIC_DEBUG_ADMIN ||
      (process.env as Record<string, unknown> | undefined)?.EXPO_PUBLIC_DEBUG_ADMIN ||
      '')
  )
    .trim()
    .toLowerCase() === '1';

interface ComboItem {
    product_id: number;
    name?: string;
    price?: number;
    image_url?: string;
    quantity: number;
}

interface Combo {
    id: number;
    title: string;
    description?: string;
    image_url?: string;
    image_url2?: string;
    image_url3?: string;
    image_url4?: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    is_active: boolean;
    start_date?: string;
    end_date?: string;
    items: ComboItem[];
}

interface ComboSummary {
    id: number;
    title: string;
    description?: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    is_active: boolean;
    start_date?: string;
    end_date?: string;
    totalPrice: number;
    discountedPrice: number;
    status: 'active' | 'upcoming' | 'expired';
    itemsSummary: string;
}

function AdminCombosInner() {
    const [combos, setCombos] = useState<ComboSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const isMountedRef = React.useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            fetchInProgressRef.current = false;
            productsFetchInProgressRef.current = false;
            
            // Cancel all pending API requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            if (productsAbortControllerRef.current) {
                productsAbortControllerRef.current.abort();
                productsAbortControllerRef.current = null;
            }
            
            // Aggressive cleanup: clear all state to free memory
            try {
                setCombos([]);
                setProducts([]);
                setVisibleCount(PAGE_SIZE);
                setSelectedCombo(null);
                setModalVisible(false);
                setDetailModalVisible(false);
                setDetailLoading(false);
                setDetailError(null);
                comboDetailsRef.current.clear();
            } catch {}
        };
    }, []);
    const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
    const [form, setForm] = useState<any>({
        title: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        is_active: true,
        start_date: null as Date | null,
        end_date: null as Date | null,
        items: [] as ComboItem[]
    });
    const [products, setProducts] = useState<any[]>([]);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const fetchInProgressRef = React.useRef(false);
    const productsFetchInProgressRef = React.useRef(false);
    const abortControllerRef = React.useRef<AbortController | null>(null);
    const productsAbortControllerRef = React.useRef<AbortController | null>(null);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const comboDetailsRef = React.useRef<Map<number, Combo>>(new Map());

    const adjustVisibleCount = React.useCallback((length: number) => {
        setVisibleCount(prev => {
            if (length === 0) return 0;
            const base = prev === 0 ? PAGE_SIZE : prev;
            return Math.min(base, length);
        });
    }, []);

    const buildComboSummaries = React.useCallback((comboList: Combo[]): ComboSummary[] => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return comboList.map((combo) => {
            const items = Array.isArray(combo.items) ? combo.items : [];
            const totalPrice = items.reduce((sum: number, item: ComboItem) => {
                const price = Number(item.price ?? 0);
                const quantity = Number(item.quantity ?? 0);
                return sum + price * (quantity || 0);
            }, 0);

            const discountValue = Number(combo.discount_value ?? 0);
            const discountedPrice = combo.discount_type === 'percentage'
                ? totalPrice - (totalPrice * (discountValue / 100))
                : Math.max(0, totalPrice - discountValue);

            const status = (() => {
                if (!combo.is_active) {
                    return 'expired' as const;
                }

                if (!combo.start_date && !combo.end_date) {
                    return combo.is_active ? 'active' as const : 'expired' as const;
                }

                let startDate: Date | null = null;
                let endDate: Date | null = null;

                if (combo.start_date) {
                    startDate = new Date(combo.start_date);
                    startDate.setHours(0, 0, 0, 0);
                }

                if (combo.end_date) {
                    endDate = new Date(combo.end_date);
                    endDate.setHours(23, 59, 59, 999);
                }

                if (startDate && endDate) {
                    if (now < startDate) {
                        return 'upcoming' as const;
                    } else if (now > endDate) {
                        return 'expired' as const;
                    }
                    return 'active' as const;
                } else if (startDate) {
                    if (now < startDate) {
                        return 'upcoming' as const;
                    }
                    return 'active' as const;
                } else if (endDate) {
                    if (now > endDate) {
                        return 'expired' as const;
                    }
                    return 'active' as const;
                }

                return combo.is_active ? 'active' as const : 'expired' as const;
            })();

            const itemsSummary = items.length
                ? items.map(it => `${Number(it.quantity || 1)} x ${it.name || `Product ${it.product_id}`}`).join(', ')
                : 'No items added';

            return {
                id: combo.id,
                title: combo.title,
                description: combo.description,
                discount_type: combo.discount_type,
                discount_value: combo.discount_value,
                is_active: combo.is_active,
                start_date: combo.start_date,
                end_date: combo.end_date,
                totalPrice,
                discountedPrice,
                status,
                itemsSummary,
            };
        });
    }, []);

    const fetchCombos = React.useCallback(async (force = false) => {
        if (!isMountedRef.current) return;
        const now = Date.now();
        if (!force && combosCache && now - combosCache.ts < CACHE_TTL) {
            if (isMountedRef.current) {
                comboDetailsRef.current = new Map(combosCache.data.map(combo => [combo.id, combo]));
                const summaries = buildComboSummaries(combosCache.data);
                setCombos(summaries);
                adjustVisibleCount(summaries.length);
                setLoading(false);
            }
            return;
        }

        if (fetchInProgressRef.current) return;
        
        // Cancel any previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        
        fetchInProgressRef.current = true;
        if (isMountedRef.current) setLoading(true);
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 30000)
            );
            
            const res = await Promise.race([
                apiService.getAllCombosAdmin(),
                timeoutPromise
            ]) as any;
            
            if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) return;
            
            if (res && res.data) {
                const combosData = Array.isArray(res.data) ? res.data : [];
                combosCache = { data: combosData, ts: Date.now() };
                if (isMountedRef.current) {
                    comboDetailsRef.current = new Map(combosData.map(combo => [combo.id, combo]));
                    const summaries = buildComboSummaries(combosData);
                    setCombos(summaries);
                    adjustVisibleCount(summaries.length);
                }
            } else {
                combosCache = { data: [], ts: Date.now() };
                if (isMountedRef.current) {
                    setCombos([]);
                    adjustVisibleCount(0);
                }
            }
        } catch (error: any) {
            if (error?.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
                return; // Request was cancelled, ignore
            }
            console.error('Error fetching combos:', error);
            combosCache = null;
            if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
                comboDetailsRef.current.clear();
                setCombos([]);
                adjustVisibleCount(0);
            }
        } finally {
            fetchInProgressRef.current = false;
            if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
                setLoading(false);
            }
        }
    }, [adjustVisibleCount, buildComboSummaries]);

    const fetchProducts = React.useCallback(async (force = false) => {
        if (!isMountedRef.current) return;
        const now = Date.now();
        if (!force && productsCache && now - productsCache.ts < CACHE_TTL) {
            if (isMountedRef.current) {
                // Limit products to prevent memory issues
                const limited = Array.isArray(productsCache.data) ? productsCache.data.slice(0, MAX_PRODUCTS_IN_MEMORY) : [];
                setProducts(limited);
            }
            return;
        }
        if (productsFetchInProgressRef.current) return;

        // Cancel any previous request
        if (productsAbortControllerRef.current) {
            productsAbortControllerRef.current.abort();
        }
        productsAbortControllerRef.current = new AbortController();

        productsFetchInProgressRef.current = true;
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 30000)
            );
            
            const res = await Promise.race([
                apiService.getAdminProducts(),
                timeoutPromise
            ]) as any;
            
            if (!isMountedRef.current || productsAbortControllerRef.current?.signal.aborted) return;
            
            const list = Array.isArray(res?.data) ? res.data : (res?.data as any)?.products || [];
            const normalized = Array.isArray(list) ? list : [];
            // Limit to prevent memory exhaustion
            const limited = normalized.slice(0, MAX_PRODUCTS_IN_MEMORY);
            productsCache = { data: limited, ts: Date.now() };
            if (isMountedRef.current && !productsAbortControllerRef.current?.signal.aborted) {
                setProducts(limited);
            }
        } catch (error: any) {
            if (error?.name === 'AbortError' || productsAbortControllerRef.current?.signal.aborted) {
                return; // Request was cancelled, ignore
            }
            console.error('Error fetching products:', error);
            productsCache = null;
            if (isMountedRef.current && !productsAbortControllerRef.current?.signal.aborted) {
                setProducts([]);
            }
        } finally {
            productsFetchInProgressRef.current = false;
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            if (!isMountedRef.current) return;

            const now = Date.now();

            if (combosCache && now - combosCache.ts < CACHE_TTL) {
                comboDetailsRef.current = new Map(combosCache.data.map(combo => [combo.id, combo]));
                const summaries = buildComboSummaries(combosCache.data);
                setCombos(summaries);
                adjustVisibleCount(summaries.length);
                setLoading(false);
            } else {
                fetchCombos();
            }

        if (productsCache && now - productsCache.ts < CACHE_TTL) {
            // Limit products to prevent memory issues
            const limited = Array.isArray(productsCache.data) ? productsCache.data.slice(0, MAX_PRODUCTS_IN_MEMORY) : [];
            setProducts(limited);
        } else {
            fetchProducts();
        }

            return () => {
                if (!isMountedRef.current) return;
                try { setModalVisible(false); } catch {}
                try { setDetailModalVisible(false); } catch {}
                comboDetailsRef.current.clear();
                setCombos([]);
                setProducts([]);
                setVisibleCount(PAGE_SIZE);
                setSelectedCombo(null);
                setLoading(false);
                comboDetailsRef.current.clear();
            };
        }, [adjustVisibleCount, buildComboSummaries, fetchCombos, fetchProducts])
    );

    const toggleProduct = (product: any) => {
        const exists = form.items.find((it: ComboItem) => it.product_id === product.id);
        if (exists) {
            setForm({ ...form, items: form.items.filter((it: ComboItem) => it.product_id !== product.id) });
        } else {
            setForm({ 
                ...form, 
                items: [...form.items, { 
                    product_id: product.id, 
                    quantity: 1,
                    name: product.name,
                    price: product.price,
                    image_url: product.image_url
                }] 
            });
        }
    };

    const renderComboItem = React.useCallback(({ item }: { item: any }) => {
        if (!item || !item.id) return null;
        try {
            // Prefer precomputed summary prices when items are not available (e.g., from admin/all endpoint)
            const hasItems = Array.isArray(item.items) && item.items.length > 0;
            const totalPriceValue: number = typeof item.totalPrice === 'number'
                ? item.totalPrice
                : (hasItems ? calculateComboTotalPrice(item as Combo) : 0);
            const discountedPriceValue: number = typeof item.discountedPrice === 'number'
                ? item.discountedPrice
                : (hasItems ? calculateComboDiscountedPrice(item as Combo) : 0);
            // DISABLED: Images removed from list view to prevent memory crashes in Expo Go
            // Images will only show in detail modal when explicitly opened
            return (
                <TouchableOpacity 
                    style={styles.card}
                    onPress={() => openDetailView(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.cardContent}>
                        {/* Image placeholder removed to save memory */}
                        <View style={[styles.cardImagesContainer, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', minHeight: 80 }]}>
                            <Ionicons name="image-outline" size={32} color="#ccc" />
                        </View>
                        <View style={styles.cardDetails}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    {(() => {
                                        const status = getComboStatus(item);
                                        const statusText = status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Expired';
                                        const statusColor = getStatusColor(status);
                                        const statusIcon = getStatusIcon(status);
                                        return (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                                                <Ionicons name={statusIcon} size={14} color={statusColor} />
                                                <Text style={{ color: statusColor, marginLeft: 4, fontSize: 12, fontWeight: '600' }}>
                                                    {statusText}
                                                </Text>
                                            </View>
                                        );
                                    })()}
                                    <TouchableOpacity 
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            deleteCombo(item.id);
                                        }}
                                    >
                                        <Ionicons name="trash" size={18} color="#d33" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.cardSub}>{item.discount_type === 'percentage' ? `${Number(item.discount_value || 0)}% off` : `₹${Number(item.discount_value || 0)} off`}</Text>
                            {item.description && (
                                <Text numberOfLines={2} style={styles.cardDesc}>{item.description}</Text>
                            )}
                            <Text style={styles.itemsTitle}>Items:</Text>
                            <Text style={styles.itemsLine}>{(item.items || []).map((it: ComboItem) => `${Number(it.quantity || 1)} x ${it.name || `Product ${it.product_id}`}`).join(', ')}</Text>
                            <View style={styles.cardPriceContainer}>
                                <View style={styles.cardPriceRow}>
                                    <Text style={styles.cardPriceLabel}>Total Price:</Text>
                                    <Text style={styles.cardTotalPrice}>₹{(totalPriceValue || 0).toFixed(2)}</Text>
                                </View>
                                <View style={styles.cardPriceRow}>
                                    <Text style={styles.cardPriceLabel}>Offer Price:</Text>
                                    <Text style={styles.cardOfferPrice}>₹{(discountedPriceValue || 0).toFixed(2)}</Text>
                                </View>
                                {(totalPriceValue || 0) > (discountedPriceValue || 0) && (
                                    <Text style={styles.cardSavings}>
                                        You save ₹{((totalPriceValue || 0) - (discountedPriceValue || 0)).toFixed(2)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        } catch (error) {
            console.error('Error rendering combo item:', error);
            return null;
        }
    }, [calculateComboDiscountedPrice, calculateComboTotalPrice, getComboStatus, getStatusColor, getStatusIcon, deleteCombo, openDetailView]);

    const visibleCombos = React.useMemo(() => {
        return Array.isArray(combos) ? combos.slice(0, visibleCount) : [];
    }, [combos, visibleCount]);

    const hasMoreCombos = React.useMemo(() => {
        return Array.isArray(combos) && visibleCount < combos.length;
    }, [combos, visibleCount]);

    const loadMoreCombos = React.useCallback(() => {
        if (!Array.isArray(combos)) return;
        if (visibleCount >= combos.length) return;
        setVisibleCount(prev => Math.min(prev + PAGE_SIZE, combos.length));
    }, [combos, visibleCount]);

    const listFooter = React.useMemo(() => {
        if (!hasMoreCombos) return null;
        return (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreCombos}>
                <Text style={styles.loadMoreText}>Load more</Text>
            </TouchableOpacity>
        );
    }, [hasMoreCombos, loadMoreCombos]);

    const calculateTotalPrice = () => {
        return form.items.reduce((sum: number, item: ComboItem) => {
            const product = products.find(p => p.id === item.product_id);
            const price = Number(item.price ?? product?.price ?? 0);
            const quantity = Number(item.quantity || 1);
            return sum + (price * quantity);
        }, 0);
    };

    const calculateDiscountedPrice = () => {
        const total = calculateTotalPrice();
        const discountValue = Number(form.discount_value || 0);
        if (form.discount_type === 'percentage') {
            return total - (total * (discountValue / 100));
        } else {
            return Math.max(0, total - discountValue);
        }
    };

    const updateQuantity = (productId: number, qty: number) => {
        setForm({
            ...form,
            items: form.items.map((it: ComboItem) => it.product_id === productId ? { ...it, quantity: Math.max(1, qty) } : it)
        });
    };

    const createCombo = async () => {
        if (!isMountedRef.current) return;
        if (!form.title || form.items.length === 0) {
            alert('Please fill title and select at least one product');
            return;
        }
        
        try {
            // Get up to 4 product images (one from each of the first 4 products)
            // Try multiple sources: products array, form.items, or fetch from product details
            const getProductImage = (item: ComboItem) => {
                // First try from products array
                const product = products.find(p => p.id === item.product_id);
                if (product?.image_url) return product.image_url;
                
                // Fallback to item's stored image_url
                if (item.image_url) return item.image_url;
                
                return null;
            };
            
            const imageUrls: (string | null)[] = [];
            for (let i = 0; i < Math.min(4, form.items.length); i++) {
                const img = getProductImage(form.items[i]);
                if (img) {
                    imageUrls.push(img);
                } else {
                    imageUrls.push(null);
                }
            }
            
            // Ensure we have exactly 4 values (or nulls)
            while (imageUrls.length < 4) {
                imageUrls.push(null);
            }
            
            if (ENABLE_ADMIN_DEBUG) {
                console.log('[Combo Creation] Product images:', imageUrls);
                console.log('[Combo Creation] Selected products:', form.items);
                console.log('[Combo Creation] Available products:', products.length);
            }
            
            const payload = {
                title: form.title,
                description: form.description,
                image_url: imageUrls[0] || null,
                image_url2: imageUrls[1] || null,
                image_url3: imageUrls[2] || null,
                image_url4: imageUrls[3] || null,
                discount_type: form.discount_type,
                discount_value: Number(form.discount_value) || 0,
                is_active: !!form.is_active,
                start_date: form.start_date ? form.start_date.toISOString() : null,
                end_date: form.end_date ? form.end_date.toISOString() : null,
                items: form.items.map((it: ComboItem) => ({ product_id: it.product_id, quantity: it.quantity }))
            };
            
            if (ENABLE_ADMIN_DEBUG) {
                console.log('[Combo Creation] Payload:', JSON.stringify(payload, null, 2));
            }
            
            const res = await apiService.createCombo(payload);
            if (!isMountedRef.current) return;
            if (!res.error) {
                if (isMountedRef.current) {
                    setModalVisible(false);
                    setForm({ title: '', description: '', discount_type: 'percentage', discount_value: 10, is_active: true, start_date: null, end_date: null, items: [] });
                    combosCache = null;
                    fetchCombos(true);
                }
            } else {
                console.error('[Combo Creation] Error:', res.error);
                if (isMountedRef.current) {
                    alert(res.error || 'Failed to create combo');
                }
            }
        } catch (error) {
            console.error('[Combo Creation] Unexpected error:', error);
            if (isMountedRef.current) {
                alert('An unexpected error occurred while creating the combo');
            }
        }
    };

    const deleteCombo = React.useCallback(async (id: number) => {
        if (!isMountedRef.current) return;
        try {
            await apiService.deleteCombo(id);
            if (isMountedRef.current) {
                combosCache = null;
                fetchCombos(true);
            }
        } catch (error) {
            console.error('Error deleting combo:', error);
        }
    }, []);

    const openDetailView = React.useCallback((combo: Combo | ComboSummary) => {
        if (!isMountedRef.current) return;

        setDetailError(null);
        setDetailModalVisible(true);

        const cachedCombo = comboDetailsRef.current.get(combo.id);

        if (cachedCombo && Array.isArray(cachedCombo.items) && cachedCombo.items.length > 0) {
            setSelectedCombo(cachedCombo);
            return;
        }

        const baseCombo: Combo & Partial<ComboSummary> = cachedCombo ?? ({
            ...combo,
            items: Array.isArray((combo as Combo).items) ? (combo as Combo).items : [],
            image_url: (combo as Combo).image_url,
            image_url2: (combo as Combo).image_url2,
            image_url3: (combo as Combo).image_url3,
            image_url4: (combo as Combo).image_url4,
        } as Combo & Partial<ComboSummary>);

        if (typeof (combo as ComboSummary).totalPrice === 'number') {
            (baseCombo as any).totalPrice = (combo as ComboSummary).totalPrice;
        }
        if (typeof (combo as ComboSummary).discountedPrice === 'number') {
            (baseCombo as any).discountedPrice = (combo as ComboSummary).discountedPrice;
        }

        setSelectedCombo(baseCombo);

        setDetailLoading(true);
        apiService.getComboDetails(combo.id)
            .then((res) => {
                if (!isMountedRef.current) return;
                if (res?.data) {
                    const data = res.data;
                    const normalized: Combo = {
                        ...baseCombo,
                        ...data,
                        items: Array.isArray(data.items) ? data.items : [],
                    };
                    if (combosCache) {
                        combosCache = {
                            data: combosCache.data.map((c) => (c.id === normalized.id ? normalized : c)),
                            ts: combosCache.ts,
                        };
                    }
                    comboDetailsRef.current.set(combo.id, normalized);
                    setSelectedCombo(normalized);
                } else {
                    setDetailError('Unable to load combo details.');
                }
            })
            .catch((error) => {
                console.error('Error fetching combo details:', error);
                if (isMountedRef.current) {
                    setDetailError('Unable to load combo details.');
                }
            })
            .finally(() => {
                if (isMountedRef.current) {
                    setDetailLoading(false);
                }
            });
    }, []);

    const closeDetailModal = React.useCallback(() => {
        if (!isMountedRef.current) return;
        setDetailModalVisible(false);
        setSelectedCombo(null);
        setDetailLoading(false);
        setDetailError(null);
    }, []);

    const calculateComboTotalPrice = React.useCallback((combo: Combo) => {
        return (combo.items || []).reduce((sum: number, item: ComboItem) => {
            const product = products.find(p => p.id === item.product_id);
            const price = Number(item.price ?? product?.price ?? 0);
            const quantity = Number(item.quantity || 1);
            return sum + (price * quantity);
        }, 0);
    }, [products]);

    const calculateComboDiscountedPrice = React.useCallback((combo: Combo) => {
        const total = calculateComboTotalPrice(combo);
        const discountValue = Number(combo.discount_value || 0);
        if (combo.discount_type === 'percentage') {
            return total - (total * (discountValue / 100));
        } else {
            return Math.max(0, total - discountValue);
        }
    }, [calculateComboTotalPrice]);

    const getComboStatus = React.useCallback((combo: Combo): 'active' | 'upcoming' | 'expired' => {
        // If combo is marked inactive, return expired
        if (!combo.is_active) {
            return 'expired';
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset time to midnight for date comparison

        // If no dates are set, consider it active if is_active is true
        if (!combo.start_date && !combo.end_date) {
            return combo.is_active ? 'active' : 'expired';
        }

        // Parse dates
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (combo.start_date) {
            startDate = new Date(combo.start_date);
            startDate.setHours(0, 0, 0, 0);
        }

        if (combo.end_date) {
            endDate = new Date(combo.end_date);
            endDate.setHours(23, 59, 59, 999); // End of day
        }

        // Check status based on dates
        if (startDate && endDate) {
            // Both dates set
            if (now < startDate) {
                return 'upcoming';
            } else if (now > endDate) {
                return 'expired';
            } else {
                return 'active';
            }
        } else if (startDate) {
            // Only start date set
            if (now < startDate) {
                return 'upcoming';
            } else {
                return 'active';
            }
        } else if (endDate) {
            // Only end date set
            if (now > endDate) {
                return 'expired';
            } else {
                return 'active';
            }
        }

        // Default to active if is_active is true
        return combo.is_active ? 'active' : 'expired';
    }, []);

    const getStatusColor = React.useCallback((status: 'active' | 'upcoming' | 'expired'): string => {
        switch (status) {
            case 'active':
                return '#4CAF50';
            case 'upcoming':
                return '#FF9800';
            case 'expired':
                return '#999';
            default:
                return '#999';
        }
    }, []);

    const getStatusIcon = React.useCallback((status: 'active' | 'upcoming' | 'expired'): keyof typeof Ionicons.glyphMap => {
        switch (status) {
            case 'active':
                return 'checkmark-circle';
            case 'upcoming':
                return 'time';
            case 'expired':
                return 'close-circle';
            default:
                return 'close-circle';
        }
    }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: 'Manage Combo Offers' }} />
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Combo Offers</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.addText}>New Combo</Text>
                    </TouchableOpacity>
                </View>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FF69B4" />
                    </View>
                ) : (
                    <FlatList
                        data={visibleCombos}
                        keyExtractor={(item) => {
                            if (!item || !item.id) return `combo-${Math.random()}`;
                            return String(item.id);
                        }}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={true}
                        removeClippedSubviews={false}
                        initialNumToRender={2}
                        maxToRenderPerBatch={2}
                        windowSize={2}
                        updateCellsBatchingPeriod={200}
                        disableVirtualization={false}
                        onEndReached={loadMoreCombos}
                        onEndReachedThreshold={0.4}
                        renderItem={renderComboItem}
                        ListFooterComponent={listFooter}
                    />
                )}

                <Modal visible={modalVisible} animationType="slide">
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Combo</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView 
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={true}
                        >
                            <Text style={styles.label}>Title</Text>
                            <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} />
                            <Text style={styles.label}>Description</Text>
                            <TextInput style={[styles.input, { height: 80 }]} value={form.description} multiline onChangeText={(t) => setForm({ ...form, description: t })} />
                            <Text style={styles.label}>Discount Type</Text>
                            <View style={styles.row}>
                                {['percentage', 'fixed'].map((t) => (
                                    <TouchableOpacity key={t} style={[styles.typeChip, form.discount_type === t && styles.typeChipActive]} onPress={() => setForm({ ...form, discount_type: t })}>
                                        <Text style={[styles.typeChipText, form.discount_type === t && styles.typeChipTextActive]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.label}>Discount Value</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={String(form.discount_value)} onChangeText={(t) => setForm({ ...form, discount_value: t })} />

                            <Text style={[styles.label, { marginTop: 12 }]}>Start Date</Text>
                            <TouchableOpacity 
                                style={styles.dateInput} 
                                onPress={() => setShowStartDatePicker(true)}
                            >
                                <Text style={styles.dateText}>
                                    {form.start_date ? form.start_date.toLocaleDateString() : 'Select start date'}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color="#666" />
                            </TouchableOpacity>
                            {showStartDatePicker && (
                                <DateTimePicker
                                    value={form.start_date || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowStartDatePicker(false);
                                        if (selectedDate) {
                                            setForm({ ...form, start_date: selectedDate });
                                        }
                                    }}
                                />
                            )}

                            <Text style={styles.label}>End Date</Text>
                            <TouchableOpacity 
                                style={styles.dateInput} 
                                onPress={() => setShowEndDatePicker(true)}
                            >
                                <Text style={styles.dateText}>
                                    {form.end_date ? form.end_date.toLocaleDateString() : 'Select end date'}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color="#666" />
                            </TouchableOpacity>
                            {showEndDatePicker && (
                                <DateTimePicker
                                    value={form.end_date || new Date()}
                                    mode="date"
                                    display="default"
                                    minimumDate={form.start_date || undefined}
                                    onChange={(event, selectedDate) => {
                                        setShowEndDatePicker(false);
                                        if (selectedDate) {
                                            setForm({ ...form, end_date: selectedDate });
                                        }
                                    }}
                                />
                            )}

                            <Text style={[styles.label, { marginTop: 12 }]}>Select Products</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll}>
                                {(Array.isArray(products) ? products.slice(0, MAX_PRODUCTS_IN_MEMORY) : []).map((p) => {
                                    if (!p || !p.id) return null;
                                    const selected = form.items.some((it: ComboItem) => it.product_id === p.id);
                                    const item = form.items.find((it: ComboItem) => it.product_id === p.id);
                                    const qty = item?.quantity || 1;
                                    // DISABLED: Product images removed to prevent memory crashes
                                    return (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[styles.productCard, selected && styles.productCardSelected]}
                                            onPress={() => toggleProduct(p)}
                                        >
                                            <View style={[styles.productImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                                                <Ionicons name="cube-outline" size={24} color="#ccc" />
                                            </View>
                                            <View style={styles.productCardContent}>
                                                <Text style={styles.productCardName} numberOfLines={2}>{p.name}</Text>
                                                <Text style={styles.productCardPrice}>
                                                    ₹{Number(p?.price ?? 0).toFixed(2)}
                                                </Text>
                                                {selected ? (
                                                    <View style={styles.selectedIndicator}>
                                                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                                        <View style={styles.qtyControls}>
                                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); updateQuantity(p.id, qty - 1); }} style={styles.qtyBtnSmall}>
                                                                <Text style={styles.qtyBtnTextSmall}>-</Text>
                                                            </TouchableOpacity>
                                                            <Text style={styles.qtyTextSmall}>{qty}</Text>
                                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); updateQuantity(p.id, qty + 1); }} style={styles.qtyBtnSmall}>
                                                                <Text style={styles.qtyBtnTextSmall}>+</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <View style={styles.addIconContainer}>
                                                        <Ionicons name="add-circle" size={24} color="#FF69B4" />
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {form.items.length > 0 && (
                                <View style={styles.priceSummary}>
                                    <Text style={styles.priceSummaryTitle}>Price Summary</Text>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.priceLabel}>Total Price:</Text>
                                        <Text style={styles.priceValue}>₹{calculateTotalPrice().toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.priceLabel}>
                                            Discount ({form.discount_type === 'percentage' ? `${form.discount_value}%` : `₹${form.discount_value}`}):
                                        </Text>
                                        <Text style={[styles.priceValue, styles.discountValue]}>
                                            -₹{(calculateTotalPrice() - calculateDiscountedPrice()).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={[styles.priceRow, styles.finalPriceRow]}>
                                        <Text style={styles.finalPriceLabel}>Final Price:</Text>
                                        <Text style={styles.finalPriceValue}>₹{calculateDiscountedPrice().toFixed(2)}</Text>
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity style={styles.saveBtn} onPress={createCombo}>
                                <Text style={styles.saveText}>Create Combo</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </SafeAreaView>
                </Modal>

                {/* Combo Detail View Modal */}
                <Modal 
                    visible={detailModalVisible} 
                    animationType="slide"
                    presentationStyle="pageSheet"
                >
                    {selectedCombo ? (() => {
                        const computedTotalPrice = calculateComboTotalPrice(selectedCombo);
                        const computedDiscountedPrice = calculateComboDiscountedPrice(selectedCombo);
                        const totalPrice = selectedCombo.items && selectedCombo.items.length
                            ? computedTotalPrice
                            : Number(((selectedCombo as any).totalPrice ?? computedTotalPrice) || 0);
                        const discountedPrice = selectedCombo.items && selectedCombo.items.length
                            ? computedDiscountedPrice
                            : Number(((selectedCombo as any).discountedPrice ?? computedDiscountedPrice) || 0);
                        const comboStatus = getComboStatus(selectedCombo);
                        const comboImages = [
                            selectedCombo.image_url,
                            selectedCombo.image_url2,
                            selectedCombo.image_url3,
                            selectedCombo.image_url4
                        ].filter(img => img && typeof img === 'string');
                        
                        const formatDate = (dateString?: string) => {
                            if (!dateString) return 'Not set';
                            try {
                                const date = new Date(dateString);
                                if (isNaN(date.getTime())) return 'Invalid date';
                                return date.toLocaleDateString('en-IN', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                });
                            } catch {
                                return 'Invalid date';
                            }
                        };

                        return (
                            <View style={styles.detailModalContainer}>
                                <View style={styles.detailModalHeader}>
                                    <Text style={styles.detailModalTitle}>Combo Offer Details</Text>
                                    <TouchableOpacity 
                                        onPress={closeDetailModal}
                                        style={styles.closeButton}
                                    >
                                        <Ionicons name="close" size={28} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                {detailLoading && (
                                    <View style={styles.detailLoadingOverlay}>
                                        <ActivityIndicator size="large" color="#FF69B4" />
                                    </View>
                                )}

                                <ScrollView 
                                    style={styles.detailScrollView}
                                    contentContainerStyle={styles.detailContent}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {detailError && (
                                        <View style={styles.detailErrorBanner}>
                                            <Ionicons name="warning" size={18} color="#B3261E" style={{ marginRight: 8 }} />
                                            <Text style={styles.detailErrorText}>{detailError}</Text>
                                        </View>
                                    )}

                                    {/* Images Section - Limited to 1 image max to prevent memory issues */}
                                    {comboImages.length > 0 && (
                                        <View style={styles.detailImagesSection}>
                                            <Text style={styles.detailSectionTitle}>Image</Text>
                                            <View style={styles.detailImagesContainer}>
                                                <Image
                                                    source={{ uri: apiService.getFullImageUrl(comboImages[0]) }}
                                                    style={styles.detailImage}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        </View>
                                    )}

                                    {/* Title and Status */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailTitle}>{selectedCombo.title}</Text>
                                        <View style={styles.detailStatusRow}>
                                            {(() => {
                                                const statusText = comboStatus === 'active' ? 'Active' : comboStatus === 'upcoming' ? 'Upcoming' : 'Expired';
                                                const statusColor = getStatusColor(comboStatus);
                                                const statusIcon = getStatusIcon(comboStatus);
                                                const backgroundColor = comboStatus === 'active' ? '#E8F5E9' : comboStatus === 'upcoming' ? '#FFF3E0' : '#F5F5F5';
                                                return (
                                                    <View style={[
                                                        styles.detailStatusBadge,
                                                        { backgroundColor }
                                                    ]}>
                                                        <Ionicons 
                                                            name={statusIcon} 
                                                            size={16} 
                                                            color={statusColor} 
                                                        />
                                                        <Text style={[
                                                            styles.detailStatusText,
                                                            { color: statusColor, marginLeft: 6 }
                                                        ]}>
                                                            {statusText}
                                                        </Text>
                                                    </View>
                                                );
                                            })()}
                                        </View>
                                    </View>

                                    {/* Description */}
                                    {selectedCombo.description && (
                                        <View style={styles.detailSection}>
                                            <Text style={styles.detailSectionTitle}>Description</Text>
                                            <Text style={styles.detailDescription}>{selectedCombo.description}</Text>
                                        </View>
                                    )}

                                    {/* Date Range */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionTitle}>Validity Period</Text>
                                        <View style={styles.detailDateRow}>
                                            <View style={styles.detailDateItem}>
                                                <Ionicons name="calendar-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                                                <View style={styles.detailDateContent}>
                                                    <Text style={styles.detailDateLabel}>From Date</Text>
                                                    <Text style={styles.detailDateValue}>
                                                        {formatDate(selectedCombo.start_date)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={[styles.detailDateItem, { marginRight: 0 }]}>
                                                <Ionicons name="calendar" size={20} color="#666" style={{ marginRight: 10 }} />
                                                <View style={styles.detailDateContent}>
                                                    <Text style={styles.detailDateLabel}>Expiry Date</Text>
                                                    <Text style={styles.detailDateValue}>
                                                        {formatDate(selectedCombo.end_date)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Discount Info */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionTitle}>Discount</Text>
                                        <View style={styles.detailDiscountBadge}>
                                            <Ionicons name="pricetag" size={20} color="#FF69B4" />
                                            <Text style={[styles.detailDiscountText, { marginLeft: 8 }]}>
                                                {selectedCombo.discount_type === 'percentage' 
                                                    ? `${selectedCombo.discount_value}% OFF` 
                                                    : `₹${selectedCombo.discount_value} OFF`}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Products List */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionTitle}>Products in Combo</Text>
                                        {(selectedCombo.items || []).map((item, idx) => {
                                            if (!item || !item.product_id) return null;
                                            try {
                                                const product = Array.isArray(products) ? products.find(p => p && p.id === item.product_id) : null;
                                                const productPrice = Number(item.price ?? product?.price ?? 0);
                                                const itemQuantity = Number(item.quantity || 1);
                                                const itemTotal = productPrice * itemQuantity;
                                                const imageUrl = product?.image_url || item.image_url;
                                                
                                                return (
                                                    <View key={idx} style={styles.detailProductItem}>
                                                        {imageUrl && (
                                                            <Image
                                                                source={{ uri: apiService.getFullImageUrl(imageUrl) }}
                                                                style={[styles.detailProductImage, { marginRight: 12 }]}
                                                                resizeMode="cover"
                                                            />
                                                        )}
                                                        <View style={styles.detailProductInfo}>
                                                            <Text style={styles.detailProductName}>
                                                                {item.name || product?.name || `Product ${item.product_id}`}
                                                            </Text>
                                                            <Text style={styles.detailProductDetails}>
                                                                Quantity: {itemQuantity} × ₹{productPrice.toFixed(2)} = ₹{itemTotal.toFixed(2)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                );
                                            } catch (error) {
                                                console.error('Error rendering combo item:', error);
                                                return null;
                                            }
                                        })}
                                    </View>

                                    {/* Price Details */}
                                    <View style={styles.detailPriceSection}>
                                        <Text style={styles.detailSectionTitle}>Price Details</Text>
                                        <View style={styles.detailPriceRow}>
                                            <Text style={styles.detailPriceLabel}>Total Products Price:</Text>
                                            <Text style={styles.detailPriceValue}>₹{(totalPrice || 0).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.detailPriceRow}>
                                            <Text style={styles.detailPriceLabel}>
                                                Discount ({selectedCombo.discount_type === 'percentage' 
                                                    ? `${Number(selectedCombo.discount_value || 0)}%` 
                                                    : `₹${Number(selectedCombo.discount_value || 0)}`}):
                                            </Text>
                                            <Text style={[styles.detailPriceValue, styles.detailDiscountAmount]}>
                                                -₹{((totalPrice || 0) - (discountedPrice || 0)).toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={[styles.detailPriceRow, styles.detailFinalPriceRow]}>
                                            <Text style={styles.detailFinalPriceLabel}>Final Combo Price:</Text>
                                            <Text style={styles.detailFinalPriceValue}>₹{(discountedPrice || 0).toFixed(2)}</Text>
                                        </View>
                                        {(totalPrice || 0) > (discountedPrice || 0) && (
                                            <View style={styles.detailSavingsBadge}>
                                                <Ionicons name="trophy" size={18} color="#4CAF50" />
                                                <Text style={[styles.detailSavingsText, { marginLeft: 8 }]}>
                                                    You Save ₹{((totalPrice || 0) - (discountedPrice || 0)).toFixed(2)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {!selectedCombo.items || selectedCombo.items.length === 0 ? (
                                        <View style={styles.detailEmptyItemsContainer}>
                                            <Ionicons name="cube-outline" size={32} color="#999" style={{ marginBottom: 8 }} />
                                            <Text style={styles.detailEmptyItemsText}>No products found for this combo.</Text>
                                        </View>
                                    ) : null}

                                </ScrollView>
                            </View>
                        );
                    })() : (
                        <View style={styles.detailModalContainer}>
                            <View style={styles.detailModalHeader}>
                                <Text style={styles.detailModalTitle}>Combo Offer Details</Text>
                                <TouchableOpacity 
                                    onPress={closeDetailModal}
                                    style={styles.closeButton}
                                >
                                    <Ionicons name="close" size={28} color="#000" />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                                <Text style={{ fontSize: 16, color: '#666' }}>No combo selected</Text>
                            </View>
                        </View>
                    )}
                </Modal>
            </View>
        </SafeAreaView>
    );
}

export default function AdminCombos() {
    try {
        return (
            <ErrorBoundary>
                <AdminCombosInner />
            </ErrorBoundary>
        );
    } catch (error) {
        console.error('Fatal error in AdminCombos:', error);
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#ff4444', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
                    An error occurred. Please restart the app.
                </Text>
            </SafeAreaView>
        );
    }
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    container: { 
        flex: 1, 
        backgroundColor: '#f8f9fa' 
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    listContent: {
        paddingBottom: Platform.OS === 'ios' ? 100 : 120, // Extra padding to ensure content is accessible above navigation buttons
        paddingHorizontal: 0,
    },
    headerRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        padding: 16, 
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
    addBtn: { flexDirection: 'row', backgroundColor: '#FF69B4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    addText: { color: '#fff', marginLeft: 6, fontWeight: '600' },
    card: { 
        backgroundColor: '#fff', 
        marginHorizontal: 16, 
        marginBottom: 12, 
        borderRadius: 12, 
        padding: 12, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 4, 
        elevation: 3 
    },
    cardContent: { 
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cardImagesContainer: { 
        marginRight: 12,
        marginBottom: 8,
    },
    cardImage: { 
        width: 100, 
        height: 100, 
        borderRadius: 8, 
        backgroundColor: '#f0f0f0' 
    },
    cardImagesGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        width: 100,
        justifyContent: 'space-between'
    },
    cardImageSmall: { 
        width: 48, 
        height: 48, 
        borderRadius: 6, 
        backgroundColor: '#f0f0f0',
        marginBottom: 2
    },
    cardDetails: { 
        flex: 1,
        minWidth: 0, // Allows text to wrap properly on small screens
    },
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    cardTitle: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#000', 
        flex: 1,
        minWidth: 0, // Allows text to wrap properly
    },
    cardSub: { color: '#444', marginTop: 4, fontSize: 13 },
    cardDesc: { color: '#666', marginTop: 6, fontSize: 12 },
    itemsTitle: { marginTop: 8, fontWeight: '600', color: '#1a1a1a', fontSize: 13 },
    itemsLine: { color: '#333', marginTop: 2, fontSize: 12 },
    cardPriceContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
    cardPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    cardPriceLabel: { fontSize: 13, color: '#666' },
    cardTotalPrice: { fontSize: 14, fontWeight: '600', color: '#666', textDecorationLine: 'line-through' },
    cardOfferPrice: { fontSize: 16, fontWeight: 'bold', color: '#FF69B4' },
    cardSavings: { fontSize: 12, color: '#4CAF50', fontWeight: '600', marginTop: 4 },
    modalContainer: { 
        flex: 1, 
        backgroundColor: '#fff' 
    },
    modalScrollContent: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 100 : 120,
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    modalTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#000' 
    },
    label: { marginTop: 8, marginBottom: 6, color: '#444', fontWeight: '600' },
    input: { backgroundColor: '#f2f2f2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
    row: { 
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    typeChip: { 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        backgroundColor: '#eee', 
        borderRadius: 16, 
        marginRight: 8,
        marginBottom: 4,
    },
    typeChipActive: { backgroundColor: '#FF69B4' },
    typeChipText: { color: '#333' },
    typeChipTextActive: { color: '#fff' },
    productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    checkboxChecked: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    productName: { flex: 1, color: '#000' },
    qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', borderRadius: 8 },
    qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
    qtyBtnText: { fontSize: 16, color: '#000' },
    qtyText: { minWidth: 24, textAlign: 'center', color: '#000' },
    dateInput: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#f2f2f2', 
        borderRadius: 8, 
        paddingHorizontal: 12, 
        paddingVertical: 12,
        marginBottom: 8
    },
    dateText: { color: '#000', fontSize: 14 },
    productScroll: { marginVertical: 8 },
    productCard: {
        width: 140,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    productCardSelected: {
        borderColor: '#4CAF50',
        borderWidth: 2
    },
    productImage: {
        width: '100%',
        height: 120,
        backgroundColor: '#f0f0f0'
    },
    productCardContent: {
        padding: 10
    },
    productCardName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
        minHeight: 32
    },
    productCardPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF69B4',
        marginBottom: 8
    },
    selectedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    addIconContainer: {
        alignItems: 'center',
        paddingVertical: 4
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f2f2f2',
        borderRadius: 6,
        paddingHorizontal: 4,
        paddingVertical: 2
    },
    qtyBtnSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4
    },
    qtyBtnTextSmall: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000'
    },
    qtyTextSmall: {
        minWidth: 20,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '600',
        color: '#000'
    },
    priceSummary: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        marginBottom: 8
    },
    priceSummaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 12
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    priceLabel: {
        fontSize: 14,
        color: '#666'
    },
    priceValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000'
    },
    discountValue: {
        color: '#4CAF50'
    },
    finalPriceRow: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0'
    },
    finalPriceLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000'
    },
    finalPriceValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF69B4'
    },
    saveBtn: { backgroundColor: '#4CAF50', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
    saveText: { color: '#fff', fontWeight: 'bold' },
    // Detail Modal Styles
    detailModalContainer: { flex: 1, backgroundColor: '#fff' },
    detailModalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#fff'
    },
    detailModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
    closeButton: { padding: 4 },
    detailScrollView: { flex: 1 },
    detailContent: { 
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 100 : 120,
    },
    detailLoadingOverlay: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        zIndex: 10,
    },
    detailErrorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FCE8E6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    detailErrorText: {
        color: '#B3261E',
        fontSize: 13,
        flex: 1,
    },
    detailImagesSection: { marginBottom: 24 },
    detailImagesScroll: { marginTop: 8 },
    detailImagesContainer: { paddingRight: 16 },
    detailImage: { 
        width: 280, 
        maxWidth: '90%',
        height: 280, 
        borderRadius: 12, 
        marginRight: 12, 
        backgroundColor: '#f0f0f0' 
    },
    detailSection: { marginBottom: 24 },
    detailSectionTitle: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#1a1a1a', 
        marginBottom: 12 
    },
    detailTitle: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: '#000', 
        marginBottom: 12 
    },
    detailStatusRow: { marginTop: 8 },
    detailStatusBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 16, 
        alignSelf: 'flex-start'
    },
    detailStatusText: { 
        fontSize: 14, 
        fontWeight: '600' 
    },
    detailDescription: { 
        fontSize: 15, 
        color: '#666', 
        lineHeight: 22 
    },
    detailDateRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: 8
    },
    detailDateItem: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#f8f9fa', 
        padding: 12, 
        borderRadius: 8,
        marginRight: 12
    },
    detailDateContent: { flex: 1 },
    detailDateLabel: { 
        fontSize: 12, 
        color: '#666', 
        marginBottom: 4 
    },
    detailDateValue: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: '#000' 
    },
    detailDiscountBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#FFF0F5', 
        padding: 12, 
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    detailDiscountText: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#FF69B4' 
    },
    detailProductItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#f8f9fa', 
        padding: 12, 
        borderRadius: 8, 
        marginBottom: 8
    },
    detailProductImage: { 
        width: 60, 
        height: 60, 
        borderRadius: 8, 
        backgroundColor: '#e0e0e0' 
    },
    detailProductInfo: { flex: 1 },
    detailProductName: { 
        fontSize: 15, 
        fontWeight: '600', 
        color: '#000', 
        marginBottom: 4 
    },
    detailProductDetails: { 
        fontSize: 13, 
        color: '#666' 
    },
    detailPriceSection: { 
        backgroundColor: '#f8f9fa', 
        padding: 16, 
        borderRadius: 12, 
        marginBottom: 24 
    },
    detailPriceRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 12 
    },
    detailPriceLabel: { 
        fontSize: 15, 
        color: '#666' 
    },
    detailPriceValue: { 
        fontSize: 15, 
        fontWeight: '600', 
        color: '#000' 
    },
    detailDiscountAmount: { 
        color: '#4CAF50' 
    },
    detailFinalPriceRow: { 
        marginTop: 8, 
        paddingTop: 12, 
        borderTopWidth: 1, 
        borderTopColor: '#e0e0e0' 
    },
    detailFinalPriceLabel: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#000' 
    },
    detailFinalPriceValue: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: '#FF69B4' 
    },
    detailSavingsBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#E8F5E9', 
        padding: 12, 
        borderRadius: 8, 
        marginTop: 12,
        justifyContent: 'center'
    },
    detailSavingsText: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#4CAF50' 
    },
    detailEmptyItemsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    detailEmptyItemsText: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
    },
    loadMoreButton: {
        marginVertical: 16,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: '#FF69B4',
    },
    loadMoreText: {
        color: '#fff',
        fontWeight: '600',
    }
});



