import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { AdminMoreModal } from './components/AdminMoreModal';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompanyAddress {
  id: number;
  company_name: string;
  gst_number: string;
  state: string;
  address_line1: string;
  address_line2: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
}

interface Customer {
  id: number;
  shop_name: string;
  owner_name: string;
  gst_number: string;
  state: string;
  phone: string;
  drug_license: string;
}

interface ProductResult {
  product_id: number;
  product_name: string;
  sku: string;
  hsn_code: string;
  unit: string;
  default_selling_price: number;
  available_stock: number;
  gst_percentage: number;
  manufacturer: string;
  package_size: string;
}

interface LineItem {
  _key: number;
  product_id: number | null;
  product_name: string;
  sku: string;
  hsn_code: string;
  unit: string;
  batch_number: string;
  quantity: number;
  free_quantity: number;
  rate: number;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  gst_percentage: number;
  available_stock: number;
  mfr: string;
  // Calculated
  discount_percentage: number;
  discount_amount: number;
  taxable_amount: number;
  gst_amount: number;
  total_amount: number;
}

// ─── Default Line ─────────────────────────────────────────────────────────────

const newLine = (): LineItem => ({
  _key: Date.now() + Math.random(),
  product_id: null,
  product_name: '',
  sku: '',
  hsn_code: '',
  unit: 'PCS',
  batch_number: '',
  quantity: 0,
  free_quantity: 0,
  rate: 0,
  discount_type: 'percent',
  discount_value: 0,
  gst_percentage: 0,
  available_stock: 0,
  mfr: '',
  discount_percentage: 0,
  discount_amount: 0,
  taxable_amount: 0,
  gst_amount: 0,
  total_amount: 0,
});

// ─── Calculation Helper ───────────────────────────────────────────────────────

const recalcLine = (item: LineItem): LineItem => {
  const qty = parseInt(String(item.quantity)) || 0;
  const rate = parseFloat(String(item.rate)) || 0;
  const gstPct = parseFloat(String(item.gst_percentage)) || 0;
  const gross = qty * rate;

  let dAmt = 0;
  let dPct = 0;
  if (item.discount_type === 'percent') {
    dPct = parseFloat(String(item.discount_value)) || 0;
    dAmt = (gross * dPct) / 100;
  } else {
    dAmt = parseFloat(String(item.discount_value)) || 0;
    dPct = gross > 0 ? (dAmt / gross) * 100 : 0;
  }

  const netInclusive = gross - dAmt;
  const taxable = netInclusive / (1 + gstPct / 100);
  const gstAmt = netInclusive - taxable;

  return {
    ...item,
    discount_percentage: dPct,
    discount_amount: dAmt,
    taxable_amount: taxable,
    gst_amount: gstAmt,
    total_amount: netInclusive,
  };
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminInvoiceForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const invoiceId = params.id;
  const isEditMode = !!invoiceId;

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── Header Fields ────────────────────────────────────────────────────────────
  const [companyAddresses, setCompanyAddresses] = useState<CompanyAddress[]>([]);
  const [companyAddressId, setCompanyAddressId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [transport, setTransport] = useState('Direct');
  const [poNumber, setPoNumber] = useState('');
  const [salesPerson, setSalesPerson] = useState('Direct Sales');

  // Bank Fields
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankBranch, setBankBranch] = useState('');

  // ── Date Pickers ─────────────────────────────────────────────────────────────
  const [showInvDatePicker, setShowInvDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // ── Line Items ───────────────────────────────────────────────────────────────
  const [items, setItems] = useState<LineItem[]>([newLine()]);

  // ── Product Search ───────────────────────────────────────────────────────────
  const [productSearchIdx, setProductSearchIdx] = useState<number | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);

  // ── Totals ───────────────────────────────────────────────────────────────────
  const [subtotal, setSubtotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [igst, setIgst] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [netPayable, setNetPayable] = useState(0);

  // ── Misc ─────────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // ── Init ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCompanyAddresses();
    if (isEditMode) fetchInvoiceForEdit();
  }, [invoiceId]);

  const fetchCompanyAddresses = async () => {
    try {
      const res = await apiService.get<CompanyAddress[]>('/admin/invoices/company-addresses');
      const list = res.data || [];
      if (isMounted.current) {
        setCompanyAddresses(list);
        const def = list.find(a => (a as any).is_default);
        if (def) setCompanyAddressId(String(def.id));
        else if (list.length > 0) setCompanyAddressId(String(list[0].id));
      }
    } catch (err) {
      console.error('fetchCompanyAddresses error:', err);
    }
  };

  const fetchInvoiceForEdit = async () => {
    setLoading(true);
    try {
      const res = await apiService.get<any>(`/admin/invoices/${invoiceId}`);
      const inv = res.data;
      if (!inv) return;
      if (isMounted.current) {
        setCompanyAddressId(String(inv.company_address_id));
        setSelectedCustomer({
          id: inv.customer_address_id,
          shop_name: inv.customer_name,
          owner_name: inv.customer_owner || '',
          gst_number: inv.customer_gst || '',
          state: inv.customer_state || '',
          phone: inv.customer_phone || '',
          drug_license: inv.customer_dl || '',
        });
        setCustomerSearch(inv.customer_name);
        setInvoiceDate(inv.invoice_date ? inv.invoice_date.split('T')[0] : '');
        setDueDate(inv.due_date ? inv.due_date.split('T')[0] : '');
        setTransport(inv.transport || 'Direct');
        setPoNumber(inv.po_number || '');
        setSalesPerson(inv.sales_person || 'Direct Sales');
        setBankName(inv.bank_name || '');
        setBankAccountNo(inv.bank_account_no || '');
        setBankIfsc(inv.bank_ifsc || '');
        setBankBranch(inv.bank_branch || '');

        const mappedItems: LineItem[] = inv.items.map((item: any) => {
          const isFlat = parseFloat(item.discount_percentage) === 0 && parseFloat(item.discount_amount) > 0;
          return recalcLine({
            _key: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            sku: item.product_sku || '',
            hsn_code: item.product_hsn || '',
            unit: item.product_unit || 'PCS',
            batch_number: item.batch_number || '',
            quantity: item.quantity,
            free_quantity: item.free_quantity,
            rate: parseFloat(item.rate),
            discount_type: isFlat ? 'flat' : 'percent',
            discount_value: isFlat ? parseFloat(item.discount_amount) : parseFloat(item.discount_percentage),
            gst_percentage: parseFloat(item.gst_percentage),
            available_stock: 9999,
            mfr: item.product_mfr || '',
            discount_percentage: 0, discount_amount: 0,
            taxable_amount: 0, gst_amount: 0, total_amount: 0,
          });
        });
        setItems(mappedItems);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch invoice for editing');
      router.back();
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // ── Customer Search ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedCustomer && selectedCustomer.shop_name === customerSearch) {
      setCustomersList([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiService.get<Customer[]>(`/admin/invoices/customers?q=${encodeURIComponent(customerSearch)}`);
        if (isMounted.current) setCustomersList(res.data || []);
      } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // ── Product Search ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (productSearchIdx === null) return;
    const timer = setTimeout(async () => {
      try {
        const res = await apiService.get<ProductResult[]>(`/admin/invoices/products-search?q=${encodeURIComponent(productQuery)}`);
        if (isMounted.current) setProductResults(res.data || []);
      } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [productQuery, productSearchIdx]);

  // ── Totals Calculation ───────────────────────────────────────────────────────

  useEffect(() => {
    let sub = 0, disc = 0, tax = 0;
    items.forEach(item => {
      sub += item.taxable_amount;
      disc += item.discount_amount;
      tax += item.gst_amount;
    });

    const selectedCompany = companyAddresses.find(a => String(a.id) === companyAddressId);
    const isSameState = selectedCustomer && selectedCompany &&
      (selectedCustomer.state || '').trim().toLowerCase() === (selectedCompany.state || '').trim().toLowerCase();

    if (isSameState) { setCgst(tax / 2); setSgst(tax / 2); setIgst(0); }
    else { setCgst(0); setSgst(0); setIgst(tax); }

    const unrounded = sub + tax;
    const rounded = Math.round(unrounded);
    const ro = rounded - unrounded;

    setSubtotal(sub);
    setTotalDiscount(disc);
    setGrandTotal(unrounded);
    setRoundOff(ro);
    setNetPayable(rounded);

    // Warnings
    const ws: string[] = [];
    items.forEach((item, i) => {
      if (item.product_id) {
        const total = (parseInt(String(item.quantity)) || 0) + (parseInt(String(item.free_quantity)) || 0);
        if (total > item.available_stock) {
          ws.push(`Line ${i + 1}: ${item.product_name} — qty ${total} > stock ${item.available_stock}`);
        }
      }
    });
    setWarnings(ws);
  }, [items, selectedCustomer, companyAddressId, companyAddresses]);

  // ── Line Helpers ─────────────────────────────────────────────────────────────

  const updateLine = (idx: number, field: Partial<LineItem>) => {
    setItems(prev => {
      const list = [...prev];
      list[idx] = recalcLine({ ...list[idx], ...field });
      return list;
    });
  };

  const removeLine = (idx: number) => {
    setItems(prev => prev.length <= 1 ? [newLine()] : prev.filter((_, i) => i !== idx));
  };

  const selectProduct = (idx: number, product: ProductResult) => {
    const base: Partial<LineItem> = {
      product_id: product.product_id,
      product_name: product.product_name,
      sku: product.sku || '',
      hsn_code: product.hsn_code || '',
      unit: product.unit || 'PCS',
      rate: parseFloat(String(product.default_selling_price)) || 0,
      gst_percentage: parseFloat(String(product.gst_percentage)) || 0,
      available_stock: product.available_stock || 0,
      mfr: product.manufacturer || '',
      quantity: items[idx].quantity || 1,
    };
    updateLine(idx, base);
    setShowProductSearch(false);
    setProductSearchIdx(null);
    setProductQuery('');
    setProductResults([]);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async (status: 'draft' | 'finalized') => {
    if (!selectedCustomer) { Alert.alert('Validation', 'Please select a customer.'); return; }
    if (!companyAddressId) { Alert.alert('Validation', 'Please select a company profile.'); return; }
    const validItems = items.filter(i => i.product_id);
    if (validItems.length === 0) { Alert.alert('Validation', 'Add at least one product line.'); return; }

    if (status === 'finalized') {
      const stockErrors = validItems.filter(i => {
        const need = (parseInt(String(i.quantity)) || 0) + (parseInt(String(i.free_quantity)) || 0);
        return need > i.available_stock;
      });
      if (stockErrors.length > 0) {
        Alert.alert('Stock Error', 'Cannot finalize: some line items exceed available stock.');
        return;
      }
    }

    setSaving(true);
    const payload = {
      company_address_id: parseInt(companyAddressId),
      customer_address_id: selectedCustomer.id,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      transport,
      po_number: poNumber,
      sales_person: salesPerson,
      subtotal,
      discount: totalDiscount,
      cgst, sgst, igst,
      grand_total: netPayable,
      round_off: roundOff,
      status,
      bank_name: bankName || null,
      bank_account_no: bankAccountNo || null,
      bank_ifsc: bankIfsc || null,
      bank_branch: bankBranch || null,
      items: validItems.map(i => ({
        product_id: i.product_id,
        batch_id: null,
        quantity: parseInt(String(i.quantity)) || 0,
        free_quantity: parseInt(String(i.free_quantity)) || 0,
        rate: parseFloat(String(i.rate)) || 0,
        discount_percentage: i.discount_type === 'percent' ? parseFloat(String(i.discount_value)) || 0 : 0,
        discount_amount: i.discount_type === 'flat' ? parseFloat(String(i.discount_value)) || 0 : 0,
        gst_percentage: parseFloat(String(i.gst_percentage)) || 0,
        gst_amount: parseFloat(String(i.gst_amount)) || 0,
        taxable_amount: parseFloat(String(i.taxable_amount)) || 0,
        total_amount: parseFloat(String(i.total_amount)) || 0,
        expiry_date: null,
        batch_number: null,
      })),
    };

    try {
      if (isEditMode) {
        await apiService.put(`/admin/invoices/${invoiceId}`, payload);
        Alert.alert('Success', 'Invoice updated successfully');
      } else {
        const res = await apiService.post('/admin/invoices', payload);
        Alert.alert('Success', `Invoice created: ${(res.data as any)?.invoice_number || ''}`);
      }
      router.replace('/admin/invoices' as any);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to save invoice');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/admin/invoices' as any);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#2D4B34" />
          <Text style={{ color: '#6B7280', marginTop: 10 }}>Loading invoice...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* ── Header ── */}
          <View style={styles.topHeader}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#111827" />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle}>{isEditMode ? 'Edit Invoice' : 'New Tax Invoice'}</Text>
                <Text style={styles.headerSubtitle}>{isEditMode ? 'Modify invoice draft' : 'Generate tax invoice'}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => setSaving(false) /* refresh noop */} style={styles.iconBtn}>
                <Ionicons name="refresh-outline" size={18} color="#111827" />
              </TouchableOpacity>
              <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            </View>
          </View>

          {/* ── Body ── */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

            {/* Stock Warnings */}
            {warnings.length > 0 && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={16} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Stock Warnings:</Text>
                  {warnings.map((w, i) => <Text key={i} style={styles.warningText}>• {w}</Text>)}
                </View>
              </View>
            )}

            {/* ── Card 1: Invoice Header ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Invoice Header Details</Text>

              {/* Company Profile */}
              <Text style={styles.fieldLabel}>From Company Profile *</Text>
              <View style={styles.pickerWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {companyAddresses.map(addr => (
                    <TouchableOpacity
                      key={addr.id}
                      style={[styles.companyChip, companyAddressId === String(addr.id) && styles.companyChipActive]}
                      onPress={() => setCompanyAddressId(String(addr.id))}
                    >
                      <Text style={[styles.companyChipText, companyAddressId === String(addr.id) && styles.companyChipTextActive]}>
                        {addr.company_name}
                      </Text>
                      <Text style={[styles.companyChipSub, companyAddressId === String(addr.id) && { color: '#4ADE80' }]}>
                        GST: {addr.gst_number}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Customer Search */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Search & Select Customer *</Text>
              <TouchableOpacity style={styles.customerSearchBtn} onPress={() => setShowCustomerSearch(true)}>
                <Ionicons name="search-outline" size={15} color="#9CA3AF" />
                <Text style={[styles.customerSearchText, selectedCustomer && { color: '#111827' }]}>
                  {selectedCustomer ? selectedCustomer.shop_name : 'Type shop name, owner or phone...'}
                </Text>
                {selectedCustomer && (
                  <TouchableOpacity onPress={() => { setSelectedCustomer(null); setCustomerSearch(''); }}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Selected Customer Snapshot */}
              {selectedCustomer && (
                <View style={styles.customerSnap}>
                  <Text style={styles.customerSnapText}>
                    <Text style={{ fontWeight: '700' }}>Shop:</Text> {selectedCustomer.shop_name} {'  '}
                    <Text style={{ fontWeight: '700' }}>State:</Text> {selectedCustomer.state} {'  '}
                    <Text style={{ fontWeight: '700' }}>GST:</Text> {selectedCustomer.gst_number || 'N/A'}
                  </Text>
                </View>
              )}

              {/* 5-col meta */}
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.fieldLabel}>Invoice Date *</Text>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowInvDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.dateBtnText}>{invoiceDate}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.fieldLabel}>Due Date</Text>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDueDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.dateBtnText}>{dueDate || 'Immediate'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.fieldLabel}>Transport</Text>
                  <TextInput style={styles.smallInput} value={transport} onChangeText={setTransport} placeholder="Direct / VRL" />
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.fieldLabel}>PO Number</Text>
                  <TextInput style={styles.smallInput} value={poNumber} onChangeText={setPoNumber} placeholder="PO-12345" />
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.fieldLabel}>Salesperson</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['Direct Sales', 'Field Agent 1', 'Field Agent 2'].map(sp => (
                      <TouchableOpacity
                        key={sp}
                        style={[styles.spChip, salesPerson === sp && styles.spChipActive]}
                        onPress={() => setSalesPerson(sp)}
                      >
                        <Text style={[styles.spChipText, salesPerson === sp && { color: '#2D4B34' }]}>{sp}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Bank Details (optional) */}
              <Text style={[styles.cardTitle, { fontSize: 13, marginTop: 14 }]}>Bank Details (Optional)</Text>
              <View style={styles.bankGrid}>
                <View style={styles.bankItem}>
                  <Text style={styles.fieldLabel}>Bank Name</Text>
                  <TextInput style={styles.smallInput} value={bankName} onChangeText={setBankName} placeholder="State Bank of India" />
                </View>
                <View style={styles.bankItem}>
                  <Text style={styles.fieldLabel}>Account Number</Text>
                  <TextInput style={styles.smallInput} value={bankAccountNo} onChangeText={setBankAccountNo} placeholder="123456789012" keyboardType="numeric" />
                </View>
                <View style={styles.bankItem}>
                  <Text style={styles.fieldLabel}>IFSC Code</Text>
                  <TextInput style={styles.smallInput} value={bankIfsc} onChangeText={setBankIfsc} placeholder="SBIN0001234" autoCapitalize="characters" />
                </View>
                <View style={styles.bankItem}>
                  <Text style={styles.fieldLabel}>Branch Name</Text>
                  <TextInput style={styles.smallInput} value={bankBranch} onChangeText={setBankBranch} placeholder="MG Road, Bangalore" />
                </View>
              </View>
            </View>

            {/* ── Card 2: Line Items ── */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.cardTitle}>Line Items</Text>
                <TouchableOpacity style={styles.addLineBtn} onPress={() => setItems(prev => [...prev, newLine()])}>
                  <Ionicons name="add" size={14} color="#2D4B34" />
                  <Text style={styles.addLineBtnText}>Add Row</Text>
                </TouchableOpacity>
              </View>

              {items.map((item, idx) => (
                <View key={String(item._key)} style={styles.lineCard}>
                  {/* Row Number & Remove */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontWeight: '700', color: '#374151', fontSize: 12 }}>Item #{idx + 1}</Text>
                    <TouchableOpacity onPress={() => removeLine(idx)} style={styles.removeLineBtn}>
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  {/* Product Search Input */}
                  <Text style={styles.fieldLabel}>Product *</Text>
                  <TouchableOpacity
                    style={[styles.productSearchRow, !!item.product_id && { borderColor: '#2D4B34', backgroundColor: '#F0FDF4' }]}
                    onPress={() => {
                      setProductSearchIdx(idx);
                      setProductQuery(item.product_id ? item.product_name : '');
                      setProductResults([]);
                      setShowProductSearch(true);
                    }}
                  >
                    <Ionicons name={item.product_id ? 'checkmark-circle' : 'search-outline'} size={14} color={item.product_id ? '#2D4B34' : '#9CA3AF'} />
                    <Text style={[{ flex: 1, fontSize: 12, color: item.product_id ? '#111827' : '#9CA3AF' }]} numberOfLines={1}>
                      {item.product_id ? `${item.product_name} (SKU: ${item.sku || 'N/A'})` : 'Search product name or SKU...'}
                    </Text>
                    {item.product_id && (
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>Stock: {item.available_stock}</Text>
                    )}
                  </TouchableOpacity>

                  {/* Grid: Qty, Free, Rate */}
                  <View style={styles.lineRowGrid}>
                    <View style={styles.lineRowItem}>
                      <Text style={styles.fieldLabel}>Qty</Text>
                      <TextInput
                        style={styles.smallInput}
                        keyboardType="numeric"
                        value={String(item.quantity || '')}
                        onChangeText={v => updateLine(idx, { quantity: parseInt(v) || 0 })}
                      />
                    </View>
                    <View style={styles.lineRowItem}>
                      <Text style={styles.fieldLabel}>Free</Text>
                      <TextInput
                        style={styles.smallInput}
                        keyboardType="numeric"
                        value={String(item.free_quantity || '')}
                        onChangeText={v => updateLine(idx, { free_quantity: parseInt(v) || 0 })}
                      />
                    </View>
                    <View style={styles.lineRowItem}>
                      <Text style={styles.fieldLabel}>Rate (₹)</Text>
                      <TextInput
                        style={styles.smallInput}
                        keyboardType="decimal-pad"
                        value={String(item.rate || '')}
                        onChangeText={v => updateLine(idx, { rate: parseFloat(v) || 0 })}
                      />
                    </View>
                    <View style={styles.lineRowItem}>
                      <Text style={styles.fieldLabel}>GST%</Text>
                      <TextInput
                        style={[styles.smallInput, { backgroundColor: '#F9FAFB' }]}
                        keyboardType="decimal-pad"
                        value={String(item.gst_percentage || 0)}
                        editable={false}
                      />
                    </View>
                  </View>

                  {/* Discount + HSN */}
                  <View style={styles.lineRowGrid}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.fieldLabel}>Discount</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TextInput
                          style={[styles.smallInput, { flex: 1 }]}
                          keyboardType="decimal-pad"
                          value={String(item.discount_value || '')}
                          onChangeText={v => updateLine(idx, { discount_value: parseFloat(v) || 0 })}
                        />
                        <TouchableOpacity
                          style={styles.discTypeBtn}
                          onPress={() => updateLine(idx, { discount_type: item.discount_type === 'percent' ? 'flat' : 'percent' })}
                        >
                          <Text style={styles.discTypeBtnText}>{item.discount_type === 'percent' ? '%' : '₹'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>HSN</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={item.hsn_code}
                        onChangeText={v => updateLine(idx, { hsn_code: v })}
                      />
                    </View>
                  </View>

                  {/* Net Amount */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginRight: 8 }}>Net Amt:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#2D4B34' }}>₹{(item.total_amount || 0).toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* ── Card 3: Totals ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Invoice Totals</Text>

              {/* T&C Notes */}
              <View style={styles.tncBox}>
                <Text style={styles.tncText}>1. Goods once sold cannot be taken back or exchanged.</Text>
                <Text style={styles.tncText}>2. Bills not paid within due date will attract 24% interest charge.</Text>
                <Text style={styles.tncText}>3. We certify that items are registered under GST Act 2017.</Text>
                <Text style={styles.tncText}>4. All disputes subject to local jurisdiction.</Text>
              </View>

              {/* Totals Table */}
              <View style={styles.totalsTable}>
                {[
                  { label: 'Gross Subtotal:', val: `₹${subtotal.toFixed(2)}` },
                  { label: 'Scheme Discount:', val: `-₹${totalDiscount.toFixed(2)}` },
                  { label: 'Taxable Value:', val: `₹${(subtotal - totalDiscount).toFixed(2)}` },
                  ...(igst > 0
                    ? [{ label: 'IGST (Out of State):', val: `₹${igst.toFixed(2)}` }]
                    : [
                        { label: 'CGST (Central Tax):', val: `₹${cgst.toFixed(2)}` },
                        { label: 'SGST (State Tax):', val: `₹${sgst.toFixed(2)}` },
                      ]),
                  { label: 'Rounding Off:', val: `₹${roundOff.toFixed(2)}` },
                ].map((row, i) => (
                  <View key={i} style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{row.label}</Text>
                    <Text style={styles.totalVal}>{row.val}</Text>
                  </View>
                ))}
                <View style={[styles.totalRow, styles.totalRowFinal]}>
                  <Text style={styles.totalLabelFinal}>NET PAYABLE:</Text>
                  <Text style={styles.totalValFinal}>₹{netPayable.toFixed(2)}</Text>
                </View>
              </View>
            </View>

          </ScrollView>

          {/* ── Bottom Action Buttons ── */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.draftBtn, saving && { opacity: 0.6 }]}
              onPress={() => handleSave('draft')}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="#374151" /> : (
                <>
                  <Ionicons name="save-outline" size={15} color="#374151" />
                  <Text style={styles.draftBtnText}>Save Draft</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.finalizeBtn, saving && { opacity: 0.6 }]}
              onPress={() => handleSave('finalized')}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.finalizeBtnText}>Finalize & Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Customer Search Modal ── */}
          <Modal visible={showCustomerSearch} animationType="slide" transparent onRequestClose={() => setShowCustomerSearch(false)}>
            <View style={styles.searchModalOverlay}>
              <View style={styles.searchModalBox}>
                <View style={styles.searchModalHeader}>
                  <Text style={styles.searchModalTitle}>Select Customer</Text>
                  <TouchableOpacity onPress={() => setShowCustomerSearch(false)}>
                    <Ionicons name="close" size={22} color="#111827" />
                  </TouchableOpacity>
                </View>
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={15} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    autoFocus
                    placeholder="Shop name, owner or phone..."
                    placeholderTextColor="#9CA3AF"
                    value={customerSearch}
                    onChangeText={t => { setCustomerSearch(t); setSelectedCustomer(null); }}
                  />
                </View>
                <FlatList
                  data={customersList}
                  keyExtractor={c => String(c.id)}
                  renderItem={({ item: c }) => (
                    <TouchableOpacity
                      style={styles.customerItem}
                      onPress={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch(c.shop_name);
                        setShowCustomerSearch(false);
                        setCustomersList([]);
                      }}
                    >
                      <Text style={styles.customerItemTitle}>{c.shop_name}</Text>
                      <Text style={styles.customerItemSub}>Owner: {c.owner_name} | GST: {c.gst_number || 'N/A'} | State: {c.state}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                        {customerSearch.trim() ? 'No customers found' : 'Start typing to search...'}
                      </Text>
                    </View>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* ── Product Search Modal ── */}
          <Modal visible={showProductSearch} animationType="slide" transparent onRequestClose={() => setShowProductSearch(false)}>
            <View style={styles.searchModalOverlay}>
              <View style={styles.searchModalBox}>
                <View style={styles.searchModalHeader}>
                  <Text style={styles.searchModalTitle}>Select Product</Text>
                  <TouchableOpacity onPress={() => { setShowProductSearch(false); setProductSearchIdx(null); }}>
                    <Ionicons name="close" size={22} color="#111827" />
                  </TouchableOpacity>
                </View>
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={15} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    autoFocus
                    placeholder="Product name or SKU..."
                    placeholderTextColor="#9CA3AF"
                    value={productQuery}
                    onChangeText={setProductQuery}
                  />
                </View>
                <FlatList
                  data={productResults}
                  keyExtractor={p => String(p.product_id)}
                  renderItem={({ item: p }) => (
                    <TouchableOpacity
                      style={styles.customerItem}
                      onPress={() => productSearchIdx !== null && selectProduct(productSearchIdx, p)}
                    >
                      <Text style={styles.customerItemTitle}>{p.product_name}</Text>
                      <Text style={styles.customerItemSub}>
                        SKU: {p.sku || 'N/A'} | Stock: {p.available_stock} | Price: ₹{p.default_selling_price} | Unit: {p.unit || 'PCS'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                        {productQuery.trim() ? 'No products found' : 'Start typing to search...'}
                      </Text>
                    </View>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* ── Date Pickers ── */}
          {showInvDatePicker && (
            <DateTimePicker
              value={new Date(invoiceDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowInvDatePicker(false);
                if (date) setInvoiceDate(date.toISOString().split('T')[0]);
              }}
            />
          )}
          {showDueDatePicker && (
            <DateTimePicker
              value={dueDate ? new Date(dueDate) : new Date()}
              mode="date"
              minimumDate={new Date(invoiceDate)}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowDueDatePicker(false);
                if (date) setDueDate(date.toISOString().split('T')[0]);
              }}
            />
          )}

          <AdminMoreModal visible={showMoreModal} onClose={() => setShowMoreModal(false)} />
        </View>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  /* Header */
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 10, color: '#6B7280' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },

  body: { flex: 1, paddingHorizontal: 12, paddingTop: 10 },

  /* Warning */
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A' },
  warningTitle: { fontWeight: '700', color: '#92400E', fontSize: 12, marginBottom: 2 },
  warningText: { fontSize: 11, color: '#92400E' },

  /* Cards */
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },

  /* Company profile chips */
  pickerWrap: { marginBottom: 4 },
  companyChip: { borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', padding: 8, marginRight: 8, minWidth: 140 },
  companyChipActive: { backgroundColor: '#EAF6ED', borderColor: '#2D4B34' },
  companyChipText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  companyChipTextActive: { color: '#2D4B34' },
  companyChipSub: { fontSize: 10, color: '#6B7280', marginTop: 2 },

  /* Customer search */
  customerSearchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 9 },
  customerSearchText: { flex: 1, fontSize: 12, color: '#9CA3AF' },
  customerSnap: { backgroundColor: '#EAF6ED', borderRadius: 8, padding: 8, marginTop: 6 },
  customerSnapText: { fontSize: 11, color: '#374151' },

  /* Meta grid */
  metaGrid: { gap: 10, marginTop: 10 },
  metaItem: {},
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 7 },
  dateBtnText: { fontSize: 12, color: '#374151' },

  /* Salesperson chips */
  spChip: { borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  spChipActive: { backgroundColor: '#EAF6ED', borderColor: '#2D4B34' },
  spChipText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  /* Bank grid */
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bankItem: { width: '47%' },

  /* Small inputs */
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 3 },
  smallInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12, color: '#111827' },

  /* Add line */
  addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EAF6ED', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#D1FAE5' },
  addLineBtnText: { fontSize: 12, color: '#2D4B34', fontWeight: '600' },

  /* Line item cards */
  lineCard: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  removeLineBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  productSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 7, marginBottom: 8 },
  lineRowGrid: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  lineRowItem: { flex: 1 },
  discTypeBtn: { width: 36, height: 34, borderRadius: 8, backgroundColor: '#EAF6ED', borderWidth: 1, borderColor: '#2D4B34', alignItems: 'center', justifyContent: 'center' },
  discTypeBtnText: { fontSize: 14, fontWeight: '800', color: '#2D4B34' },

  /* Totals */
  tncBox: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginBottom: 12 },
  tncText: { fontSize: 10, color: '#6B7280', marginBottom: 3 },
  totalsTable: { gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRowFinal: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, marginTop: 4 },
  totalLabel: { fontSize: 12, color: '#6B7280' },
  totalVal: { fontSize: 12, color: '#374151', fontWeight: '600' },
  totalLabelFinal: { fontSize: 14, fontWeight: '800', color: '#111827' },
  totalValFinal: { fontSize: 16, fontWeight: '900', color: '#2D4B34' },

  /* Bottom Buttons */
  bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  draftBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 12 },
  draftBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  finalizeBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2D4B34', borderRadius: 10, paddingVertical: 12 },
  finalizeBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  /* Modals */
  searchModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  searchModalBox: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 20 },
  searchModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchModalTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, margin: 12 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827' },
  customerItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  customerItemTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  customerItemSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
});
