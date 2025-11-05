import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../services/api';

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

export default function AdminCombos() {
    const [combos, setCombos] = useState<Combo[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
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

    const fetchCombos = async () => {
        setLoading(true);
        const res = await apiService.getAllCombosAdmin();
        if (res.data) setCombos(res.data as any);
        setLoading(false);
    };

    const fetchProducts = async () => {
        const res = await apiService.getAdminProducts();
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.products || [];
        setProducts(list);
    };

    useEffect(() => {
        fetchCombos();
        fetchProducts();
    }, []);

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

    const calculateTotalPrice = () => {
        return form.items.reduce((sum: number, item: ComboItem) => {
            const product = products.find(p => p.id === item.product_id);
            const price = Number(product?.price || item.price || 0);
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
        if (!form.title || form.items.length === 0) {
            alert('Please fill title and select at least one product');
            return;
        }
        
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
        
        console.log('[Combo Creation] Product images:', imageUrls);
        console.log('[Combo Creation] Selected products:', form.items);
        console.log('[Combo Creation] Available products:', products.length);
        
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
        
        console.log('[Combo Creation] Payload:', JSON.stringify(payload, null, 2));
        
        const res = await apiService.createCombo(payload);
        if (!res.error) {
            setModalVisible(false);
            setForm({ title: '', description: '', discount_type: 'percentage', discount_value: 10, is_active: true, start_date: null, end_date: null, items: [] });
            fetchCombos();
        } else {
            console.error('[Combo Creation] Error:', res.error);
            alert(res.error || 'Failed to create combo');
        }
    };

    const deleteCombo = async (id: number) => {
        await apiService.deleteCombo(id);
        fetchCombos();
    };

    const openDetailView = (combo: Combo) => {
        setSelectedCombo(combo);
        setDetailModalVisible(true);
    };

    const calculateComboTotalPrice = (combo: Combo) => {
        return (combo.items || []).reduce((sum: number, item: ComboItem) => {
            const product = products.find(p => p.id === item.product_id);
            const price = Number(product?.price || item.price || 0);
            const quantity = Number(item.quantity || 1);
            return sum + (price * quantity);
        }, 0);
    };

    const calculateComboDiscountedPrice = (combo: Combo) => {
        const total = calculateComboTotalPrice(combo);
        const discountValue = Number(combo.discount_value || 0);
        if (combo.discount_type === 'percentage') {
            return total - (total * (discountValue / 100));
        } else {
            return Math.max(0, total - discountValue);
        }
    };

    const getComboStatus = (combo: Combo): 'active' | 'upcoming' | 'expired' => {
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
    };

    const getStatusColor = (status: 'active' | 'upcoming' | 'expired'): string => {
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
    };

    const getStatusIcon = (status: 'active' | 'upcoming' | 'expired'): keyof typeof Ionicons.glyphMap => {
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
    };

    return (
        <>
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
                    <ActivityIndicator size="large" />
                ) : (
                    <FlatList
                        data={combos}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item }) => {
                            const totalPrice = calculateComboTotalPrice(item);
                            const discountedPrice = calculateComboDiscountedPrice(item);
                            // Collect all available images (up to 4)
                            const comboImages = [
                                item.image_url,
                                item.image_url2,
                                item.image_url3,
                                item.image_url4
                            ].filter(img => img).slice(0, 4);
                            
                            return (
                                <TouchableOpacity 
                                    style={styles.card}
                                    onPress={() => openDetailView(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.cardContent}>
                                        {comboImages.length > 0 && (
                                            <View style={styles.cardImagesContainer}>
                                                {comboImages.length === 1 ? (
                                                    <Image 
                                                        source={{ uri: apiService.getFullImageUrl(comboImages[0]) }} 
                                                        style={styles.cardImage}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={styles.cardImagesGrid}>
                                                        {comboImages.map((img, idx) => (
                                                            <Image 
                                                                key={idx}
                                                                source={{ uri: apiService.getFullImageUrl(img) }} 
                                                                style={styles.cardImageSmall}
                                                                resizeMode="cover"
                                                            />
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        )}
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
                                            <Text style={styles.itemsLine}>{(item.items || []).map(it => `${Number(it.quantity || 1)} x ${it.name || `Product ${it.product_id}`}`).join(', ')}</Text>
                                            <View style={styles.cardPriceContainer}>
                                                <View style={styles.cardPriceRow}>
                                                    <Text style={styles.cardPriceLabel}>Total Price:</Text>
                                                    <Text style={styles.cardTotalPrice}>₹{(totalPrice || 0).toFixed(2)}</Text>
                                                </View>
                                                <View style={styles.cardPriceRow}>
                                                    <Text style={styles.cardPriceLabel}>Offer Price:</Text>
                                                    <Text style={styles.cardOfferPrice}>₹{(discountedPrice || 0).toFixed(2)}</Text>
                                                </View>
                                                {(totalPrice || 0) > (discountedPrice || 0) && (
                                                    <Text style={styles.cardSavings}>
                                                        You save ₹{((totalPrice || 0) - (discountedPrice || 0)).toFixed(2)}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}

                <Modal visible={modalVisible} animationType="slide">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Combo</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 16 }}>
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
                                {(products || []).map((p) => {
                                    const selected = form.items.some((it: ComboItem) => it.product_id === p.id);
                                    const item = form.items.find((it: ComboItem) => it.product_id === p.id);
                                    const qty = item?.quantity || 1;
                                    const imageUrl = apiService.getFullImageUrl(p.image_url);
                                    return (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[styles.productCard, selected && styles.productCardSelected]}
                                            onPress={() => toggleProduct(p)}
                                        >
                                            <Image 
                                                source={{ uri: imageUrl }} 
                                                style={styles.productImage}
                                                resizeMode="cover"
                                            />
                                            <View style={styles.productCardContent}>
                                                <Text style={styles.productCardName} numberOfLines={2}>{p.name}</Text>
                                                <Text style={styles.productCardPrice}>₹{p.price}</Text>
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
                    </View>
                </Modal>

                {/* Combo Detail View Modal */}
                <Modal 
                    visible={detailModalVisible} 
                    animationType="slide"
                    presentationStyle="pageSheet"
                >
                    {selectedCombo ? (() => {
                        const totalPrice = calculateComboTotalPrice(selectedCombo);
                        const discountedPrice = calculateComboDiscountedPrice(selectedCombo);
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
                                        onPress={() => setDetailModalVisible(false)}
                                        style={styles.closeButton}
                                    >
                                        <Ionicons name="close" size={28} color="#000" />
                                    </TouchableOpacity>
                                </View>
                                
                                <ScrollView 
                                    style={styles.detailScrollView}
                                    contentContainerStyle={styles.detailContent}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {/* Images Section */}
                                    {comboImages.length > 0 && (
                                        <View style={styles.detailImagesSection}>
                                            <Text style={styles.detailSectionTitle}>Images</Text>
                                            <ScrollView 
                                                horizontal 
                                                showsHorizontalScrollIndicator={false}
                                                style={styles.detailImagesScroll}
                                                contentContainerStyle={styles.detailImagesContainer}
                                            >
                                                {comboImages.map((img, idx) => (
                                                    <Image
                                                        key={idx}
                                                        source={{ uri: apiService.getFullImageUrl(img) }}
                                                        style={styles.detailImage}
                                                        resizeMode="cover"
                                                    />
                                                ))}
                                            </ScrollView>
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
                                            const product = products.find(p => p.id === item.product_id);
                                            const productPrice = Number(product?.price || item.price || 0);
                                            const itemQuantity = Number(item.quantity || 1);
                                            const itemTotal = productPrice * itemQuantity;
                                            
                                            return (
                                                <View key={idx} style={styles.detailProductItem}>
                                                    <Image
                                                        source={{ uri: apiService.getFullImageUrl(product?.image_url || item.image_url) }}
                                                        style={[styles.detailProductImage, { marginRight: 12 }]}
                                                        resizeMode="cover"
                                                    />
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
                                </ScrollView>
                            </View>
                        );
                    })() : (
                        <View style={styles.detailModalContainer}>
                            <View style={styles.detailModalHeader}>
                                <Text style={styles.detailModalTitle}>Combo Offer Details</Text>
                                <TouchableOpacity 
                                    onPress={() => setDetailModalVisible(false)}
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
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
    addBtn: { flexDirection: 'row', backgroundColor: '#FF69B4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    addText: { color: '#fff', marginLeft: 6, fontWeight: '600' },
    card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    cardContent: { flexDirection: 'row' },
    cardImagesContainer: { marginRight: 12 },
    cardImage: { width: 100, height: 100, borderRadius: 8, backgroundColor: '#f0f0f0' },
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
    cardDetails: { flex: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#000', flex: 1 },
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
    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
    label: { marginTop: 8, marginBottom: 6, color: '#444', fontWeight: '600' },
    input: { backgroundColor: '#f2f2f2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
    row: { flexDirection: 'row', gap: 8 },
    typeChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eee', borderRadius: 16, marginRight: 8 },
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
    detailContent: { padding: 16 },
    detailImagesSection: { marginBottom: 24 },
    detailImagesScroll: { marginTop: 8 },
    detailImagesContainer: { paddingRight: 16 },
    detailImage: { 
        width: 280, 
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
    }
});



