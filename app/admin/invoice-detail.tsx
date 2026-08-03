import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
  Share,
  Image,
  Linking,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { apiService } from '../services/api';
import { getBaseUrl } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceItem {
  id: number;
  product_name: string;
  product_mfr: string;
  product_size: string;
  product_sku: string;
  product_hsn: string;
  product_unit: string;
  quantity: number;
  free_quantity: number;
  rate: string;
  discount_percentage: string;
  discount_amount: string;
  gst_percentage: string;
  gst_amount: string;
  taxable_amount: string;
  total_amount: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  transport: string;
  po_number: string;
  sales_person: string;
  status: string;
  subtotal: string;
  discount: string;
  cgst: string;
  sgst: string;
  igst: string;
  grand_total: string;
  round_off: string;
  amount_in_words: string;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  company_name: string;
  company_address1: string;
  company_address2: string | null;
  company_city: string;
  company_state: string;
  company_pincode: string;
  company_gst: string;
  company_dl: string | null;
  company_phone: string;
  company_email: string;
  customer_name: string;
  customer_owner: string | null;
  customer_address1: string;
  customer_address2: string | null;
  customer_city: string;
  customer_state: string;
  customer_pincode: string;
  customer_gst: string | null;
  customer_dl: string | null;
  customer_phone: string;
  customer_email: string | null;
  items: InvoiceItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const f2 = (v: any) => parseFloat(v || '0').toFixed(2);
const fDate = (d: string | null) => {
  if (!d) return 'Immediate';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft:      { bg: '#FEF9C3', text: '#CA8A04', border: '#FDE047' },
  finalized:  { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' },
  cancelled:  { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
};

// ─── GST Slab Summary ────────────────────────────────────────────────────────

const getGstSlabs = (invoice: Invoice) => {
  const slabs: Record<number, { taxable: number; cgst: number; sgst: number; igst: number; total: number }> = {};
  invoice.items.forEach(item => {
    const rate = parseFloat(item.gst_percentage);
    if (!slabs[rate]) slabs[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
    const taxable = parseFloat(item.taxable_amount);
    const gstAmt = parseFloat(item.gst_amount);
    slabs[rate].taxable += taxable;
    if (parseFloat(invoice.igst) > 0) {
      slabs[rate].igst += gstAmt;
    } else {
      slabs[rate].cgst += gstAmt / 2;
      slabs[rate].sgst += gstAmt / 2;
    }
    slabs[rate].total += gstAmt;
  });
  return slabs;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminInvoiceDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'view' | 'pdf'>('view');
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState('');

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    fetchInvoice();
    buildPdfUrl();
    return () => { isMounted.current = false; };
  }, [invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await apiService.get<Invoice>(`/admin/invoices/${invoiceId}`);
      if (isMounted.current) setInvoice(res.data || null);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch invoice details');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const buildPdfUrl = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    const base = getBaseUrl();
    // The backend PDF endpoint: GET /admin/invoices/:id/pdf
    setPdfUrl(`${base}/admin/invoices/${invoiceId}/pdf?Authorization=Bearer%20${encodeURIComponent(token || '')}`);
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/admin/invoices' as any);
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    const token = await AsyncStorage.getItem('auth_token');
    const base = getBaseUrl();
    const url = `${base}/admin/invoices/${invoiceId}/pdf?Authorization=Bearer%20${encodeURIComponent(token || '')}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Info', 'PDF download available in the web admin panel.');
    }
  };

  const handleEmailPDF = async () => {
    if (!invoice) return;
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Send Invoice PDF',
        'Enter customer email:',
        async (email) => {
          if (!email?.trim()) return;
          try {
            await apiService.post(`/admin/invoices/${invoiceId}/email`, { email });
            Alert.alert('Success', `Invoice emailed to ${email}`);
          } catch {
            Alert.alert('Error', 'Failed to send email');
          }
        },
        'plain-text',
        invoice.customer_email || ''
      );
    } else {
      Alert.alert('Email Invoice', 'Enter customer email to send invoice:', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Email App', onPress: () => Linking.openURL(`mailto:${invoice.customer_email || ''}?subject=Invoice ${invoice.invoice_number}&body=Please find attached the invoice.`) },
      ]);
    }
  };

  const handleShare = async () => {
    if (!invoice) return;
    try {
      await Share.share({
        title: `Invoice ${invoice.invoice_number}`,
        message: `Invoice ${invoice.invoice_number} | Customer: ${invoice.customer_name} | Amount: ₹${f2(invoice.grand_total)} | Status: ${invoice.status.toUpperCase()}`,
      });
    } catch {}
  };

  const handleEdit = () => {
    router.push(`/admin/invoice-form?id=${invoiceId}` as any);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

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

  if (!invoice) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="document-text-outline" size={50} color="#D1D5DB" />
          <Text style={{ color: '#374151', fontWeight: '700', marginTop: 12 }}>Invoice Not Found</Text>
          <TouchableOpacity onPress={handleBack} style={{ marginTop: 16, backgroundColor: '#2D4B34', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColors = STATUS_COLORS[invoice.status] || STATUS_COLORS.draft;
  const slabs = getGstSlabs(invoice);

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
                <Text style={styles.headerTitle}>{invoice.invoice_number}</Text>
                <Text style={styles.headerSubtitle}>{invoice.customer_name}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={17} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleEdit}>
                <Ionicons name="pencil-outline" size={17} color="#111827" />
              </TouchableOpacity>
              <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            </View>
          </View>

          {/* ── Action Buttons Row ── */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.actionBarBtn} onPress={handleDownloadPDF}>
              <Ionicons name="download-outline" size={15} color="#374151" />
              <Text style={styles.actionBarBtnText}>Download PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBarBtn} onPress={handleEmailPDF}>
              <Ionicons name="mail-outline" size={15} color="#374151" />
              <Text style={styles.actionBarBtnText}>Email PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBarBtn, { backgroundColor: '#2D4B34' }]} onPress={() => setActiveTab(activeTab === 'view' ? 'pdf' : 'view')}>
              <Ionicons name={activeTab === 'pdf' ? 'eye-outline' : 'document-outline'} size={15} color="#FFFFFF" />
              <Text style={[styles.actionBarBtnText, { color: '#FFFFFF' }]}>{activeTab === 'pdf' ? 'View Details' : 'View PDF'}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Tab Content ── */}
          {activeTab === 'pdf' ? (
            /* PDF WebView */
            <View style={{ flex: 1 }}>
              {pdfLoading && (
                <View style={styles.pdfLoadingOverlay}>
                  <ActivityIndicator size="large" color="#2D4B34" />
                  <Text style={{ color: '#6B7280', marginTop: 10 }}>Loading PDF...</Text>
                </View>
              )}
              {pdfUrl ? (
                <WebView
                  source={{ uri: pdfUrl }}
                  style={{ flex: 1 }}
                  onLoad={() => setPdfLoading(false)}
                  onError={() => {
                    setPdfLoading(false);
                    Alert.alert('PDF Error', 'Unable to load PDF in-app. Use the Download button to open it.');
                  }}
                  scalesPageToFit={true}
                  bounces={false}
                  startInLoadingState={false}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#2D4B34" />
                </View>
              )}
            </View>
          ) : (
            /* ── Invoice Detail View (mirrors AdminInvoicePrint.jsx HTML layout) ── */
            <ScrollView
              style={styles.body}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40, paddingTop: 10 }}
              showsVerticalScrollIndicator={false}
            >

              {/* Status Badge */}
              <View style={{ alignItems: 'flex-end', marginBottom: 6 }}>
                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                    {invoice.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* ── TAX INVOICE Header ── */}
              <View style={styles.invoiceHeader}>
                <Text style={styles.taxInvoiceTitle}>TAX INVOICE</Text>

                {/* Company ↔ Customer */}
                <View style={styles.addressGrid}>
                  <View style={styles.addressCol}>
                    <Text style={styles.addressCompanyName}>{invoice.company_name.toUpperCase()}</Text>
                    <Text style={styles.addressLine}>{invoice.company_address1}</Text>
                    {invoice.company_address2 ? <Text style={styles.addressLine}>{invoice.company_address2}</Text> : null}
                    <Text style={styles.addressLine}>{invoice.company_city}, {invoice.company_state} - {invoice.company_pincode}</Text>
                    <Text style={styles.addressLine}>Phone: {invoice.company_phone}</Text>
                    <Text style={styles.addressLine}>Email: {invoice.company_email}</Text>
                    <Text style={[styles.addressLine, { fontWeight: '700', marginTop: 4 }]}>GSTIN: {invoice.company_gst}</Text>
                    <Text style={styles.addressLine}>DL #: {invoice.company_dl || 'N/A'}</Text>
                  </View>

                  <View style={styles.addressDivider} />

                  <View style={styles.addressCol}>
                    <Text style={styles.addressBilledTo}>BILLED TO:</Text>
                    <Text style={styles.addressCompanyName}>{invoice.customer_name.toUpperCase()}</Text>
                    {invoice.customer_owner ? <Text style={styles.addressLine}>Owner: {invoice.customer_owner}</Text> : null}
                    <Text style={styles.addressLine}>{invoice.customer_address1}</Text>
                    {invoice.customer_address2 ? <Text style={styles.addressLine}>{invoice.customer_address2}</Text> : null}
                    <Text style={styles.addressLine}>{invoice.customer_city}, {invoice.customer_state} - {invoice.customer_pincode}</Text>
                    <Text style={styles.addressLine}>Phone: {invoice.customer_phone} | Email: {invoice.customer_email || 'N/A'}</Text>
                    <Text style={[styles.addressLine, { fontWeight: '700', marginTop: 4 }]}>GSTIN: {invoice.customer_gst || 'N/A'}</Text>
                    <Text style={styles.addressLine}>DL #: {invoice.customer_dl || 'N/A'}</Text>
                  </View>
                </View>

                {/* Invoice Meta */}
                <View style={styles.metaGrid}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaText}><Text style={styles.metaBold}>Inv. No: </Text>{invoice.invoice_number}</Text>
                    <Text style={styles.metaText}><Text style={styles.metaBold}>Inv. Date: </Text>{fDate(invoice.invoice_date)}</Text>
                    <Text style={styles.metaText}><Text style={styles.metaBold}>Due Date: </Text>{fDate(invoice.due_date)}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaText}><Text style={styles.metaBold}>Transport: </Text>{invoice.transport || 'Direct'}</Text>
                    <Text style={styles.metaText}><Text style={styles.metaBold}>PO No: </Text>{invoice.po_number || 'N/A'}</Text>
                    <Text style={styles.metaText}><Text style={styles.metaBold}>Sales Rep: </Text>{invoice.sales_person || 'Direct'}</Text>
                  </View>
                </View>
              </View>

              {/* ── Items Table ── */}
              <View style={styles.tableWrap}>
                {/* Header */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.thCell, { width: 28 }]}>SR</Text>
                  <Text style={[styles.thCell, { flex: 1 }]}>DESCRIPTION</Text>
                  <Text style={[styles.thCell, { width: 36 }]}>QTY</Text>
                  <Text style={[styles.thCell, { width: 36 }]}>FREE</Text>
                  <Text style={[styles.thCell, { width: 52, textAlign: 'right' }]}>MRP</Text>
                  <Text style={[styles.thCell, { width: 52, textAlign: 'right' }]}>RATE</Text>
                  <Text style={[styles.thCell, { width: 44, textAlign: 'center' }]}>DIS%</Text>
                  <Text style={[styles.thCell, { width: 36, textAlign: 'center' }]}>GST</Text>
                  <Text style={[styles.thCell, { width: 60, textAlign: 'right' }]}>NET AMT</Text>
                </View>

                {/* Rows */}
                {invoice.items.map((item, idx) => (
                  <View key={item.id} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
                    <Text style={[styles.tdCell, { width: 28, textAlign: 'center' }]}>{idx + 1}</Text>
                    <View style={{ flex: 1, paddingRight: 4 }}>
                      <Text style={[styles.tdCell, { fontWeight: '700' }]}>{item.product_name}</Text>
                      {item.product_hsn ? <Text style={styles.tdSubCell}>HSN: {item.product_hsn}</Text> : null}
                    </View>
                    <Text style={[styles.tdCell, { width: 36, textAlign: 'center', fontWeight: '700' }]}>{item.quantity}</Text>
                    <Text style={[styles.tdCell, { width: 36, textAlign: 'center' }]}>{item.free_quantity || 0}</Text>
                    <Text style={[styles.tdCell, { width: 52, textAlign: 'right' }]}>{f2(item.rate)}</Text>
                    <Text style={[styles.tdCell, { width: 52, textAlign: 'right' }]}>
                      {(parseFloat(item.rate) / (1 + parseFloat(item.gst_percentage) / 100)).toFixed(2)}
                    </Text>
                    <Text style={[styles.tdCell, { width: 44, textAlign: 'center' }]}>
                      {parseFloat(item.discount_percentage) > 0 ? `${parseFloat(item.discount_percentage).toFixed(0)}%` : '0'}
                    </Text>
                    <Text style={[styles.tdCell, { width: 36, textAlign: 'center' }]}>{parseFloat(item.gst_percentage).toFixed(0)}%</Text>
                    <Text style={[styles.tdCell, { width: 60, textAlign: 'right', fontWeight: '700', color: '#2D4B34' }]}>{f2(item.total_amount)}</Text>
                  </View>
                ))}

                {/* Totals Row */}
                <View style={[styles.tableRow, styles.tableTotalRow]}>
                  <Text style={[styles.thCell, { width: 28 }]} />
                  <Text style={[styles.thCell, { flex: 1 }]}>TOTALS:</Text>
                  <Text style={[styles.thCell, { width: 36, textAlign: 'center' }]}>
                    {invoice.items.reduce((s, i) => s + parseInt(String(i.quantity)), 0)}
                  </Text>
                  <Text style={[styles.thCell, { width: 36, textAlign: 'center' }]}>
                    {invoice.items.reduce((s, i) => s + parseInt(String(i.free_quantity || 0)), 0)}
                  </Text>
                  <Text style={[styles.thCell, { width: 52 }]} />
                  <Text style={[styles.thCell, { width: 52, textAlign: 'right' }]}>₹{f2(invoice.subtotal)}</Text>
                  <Text style={[styles.thCell, { width: 44 }]} />
                  <Text style={[styles.thCell, { width: 36 }]} />
                  <Text style={[styles.thCell, { width: 60, textAlign: 'right' }]}>
                    ₹{f2(parseFloat(invoice.grand_total) - parseFloat(invoice.round_off))}
                  </Text>
                </View>
              </View>

              {/* ── GST Slab Summary + Financial Totals ── */}
              <View style={styles.bottomGrid}>
                {/* GST Slabs */}
                <View style={styles.slabWrap}>
                  <Text style={styles.slabTitle}>GST TAX SLAB DETAILED SUMMARY:</Text>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    {['GST Rate', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total Tax'].map(h => (
                      <Text key={h} style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>{h}</Text>
                    ))}
                  </View>
                  {Object.entries(slabs).map(([rate, slab]) => (
                    <View key={rate} style={styles.tableRow}>
                      <Text style={[styles.tdCell, { flex: 1, fontWeight: '700' }]}>{parseFloat(rate).toFixed(0)}%</Text>
                      <Text style={[styles.tdCell, { flex: 1, textAlign: 'right' }]}>₹{slab.taxable.toFixed(2)}</Text>
                      <Text style={[styles.tdCell, { flex: 1, textAlign: 'right' }]}>₹{slab.cgst.toFixed(2)}</Text>
                      <Text style={[styles.tdCell, { flex: 1, textAlign: 'right' }]}>₹{slab.sgst.toFixed(2)}</Text>
                      <Text style={[styles.tdCell, { flex: 1, textAlign: 'right' }]}>₹{slab.igst.toFixed(2)}</Text>
                      <Text style={[styles.tdCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>₹{slab.total.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                {/* Financial Totals */}
                <View style={styles.totalsWrap}>
                  {[
                    { label: 'Gross Value Subtotal:', val: `₹${f2(invoice.subtotal)}` },
                    { label: 'Scheme Discount Deducted:', val: `-₹${f2(invoice.discount)}` },
                    { label: 'Taxable Amount:', val: `₹${(parseFloat(invoice.subtotal) - parseFloat(invoice.discount)).toFixed(2)}`, bold: true },
                    ...(parseFloat(invoice.igst) > 0
                      ? [{ label: 'IGST Total:', val: `₹${f2(invoice.igst)}` }]
                      : [
                          { label: 'CGST Total:', val: `₹${f2(invoice.cgst)}` },
                          { label: 'SGST Total:', val: `₹${f2(invoice.sgst)}` },
                        ]),
                    { label: 'Round Off:', val: `₹${f2(invoice.round_off)}` },
                  ].map((row, i) => (
                    <View key={i} style={styles.totalRow}>
                      <Text style={[styles.totalLabel, row.bold && { fontWeight: '700' }]}>{row.label}</Text>
                      <Text style={[styles.totalVal, row.bold && { fontWeight: '700' }]}>{row.val}</Text>
                    </View>
                  ))}
                  <View style={styles.totalRowFinal}>
                    <Text style={styles.totalLabelFinal}>NET PAYABLE:</Text>
                    <Text style={styles.totalValFinal}>₹{f2(invoice.grand_total)}</Text>
                  </View>
                </View>
              </View>

              {/* Amount in Words */}
              <View style={styles.amountWordsBox}>
                <Text style={styles.amountWordsText}>
                  <Text style={{ fontWeight: '700' }}>Amount in Words: </Text>
                  <Text style={{ fontStyle: 'italic' }}>{invoice.amount_in_words}</Text>
                </Text>
              </View>

              {/* Bank + Terms Grid */}
              <View style={styles.bankTermsGrid}>
                <View style={styles.bankCol}>
                  <Text style={{ fontWeight: '700', fontSize: 11, marginBottom: 4, color: '#111827' }}>Bank Billing Details:</Text>
                  {invoice.bank_name ? (
                    <>
                      <Text style={styles.bankText}>Bank: {invoice.bank_name}</Text>
                      <Text style={styles.bankText}>A/C: {invoice.bank_account_no}</Text>
                      <Text style={styles.bankText}>IFSC: {invoice.bank_ifsc}</Text>
                      <Text style={styles.bankText}>Branch: {invoice.bank_branch}</Text>
                    </>
                  ) : (
                    <Text style={{ color: '#9CA3AF', fontSize: 10, fontStyle: 'italic' }}>No bank details provided.</Text>
                  )}
                </View>
                <View style={styles.addressDivider} />
                <View style={styles.bankCol}>
                  <Text style={{ fontWeight: '700', fontSize: 11, marginBottom: 4, color: '#111827' }}>Terms & Conditions:</Text>
                  {[
                    '1. Goods once sold cannot be taken back or exchanged.',
                    '2. Interest of 24% will be charged for bills unpaid after due date.',
                    '3. Discrepancies must be brought to notice within 3 days.',
                    '4. Items are registered under GST Act 2017.',
                  ].map((t, i) => <Text key={i} style={styles.bankText}>{t}</Text>)}
                </View>
              </View>

              {/* Signatures */}
              <View style={styles.signaturesGrid}>
                <View style={styles.signatureBox}>
                  <Text style={{ fontWeight: '700', fontSize: 11, color: '#111827' }}>CUSTOMER'S SIGNATURE</Text>
                  <Text style={{ fontSize: 9, color: '#6B7280', fontStyle: 'italic' }}>(Receiver's Signature & Stamp)</Text>
                </View>
                <View style={styles.addressDivider} />
                <View style={[styles.signatureBox, { alignItems: 'flex-end' }]}>
                  <Text style={{ fontWeight: '700', fontSize: 11, color: '#111827' }}>For {invoice.company_name.toUpperCase()}</Text>
                  <Text style={{ fontWeight: '700', fontSize: 11, color: '#111827' }}>Authorized Signatory</Text>
                </View>
              </View>

            </ScrollView>
          )}

        </View>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  body: { flex: 1 },

  /* Header */
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 10, color: '#6B7280' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },

  /* Action Bar */
  actionBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  actionBarBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 7, borderWidth: 1, borderColor: '#E5E7EB' },
  actionBarBtnText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  /* PDF Loading */
  pdfLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA', zIndex: 10 },

  /* Status */
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  /* Invoice Header */
  invoiceHeader: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, marginBottom: 8 },
  taxInvoiceTitle: { fontSize: 16, fontWeight: '900', color: '#111827', textAlign: 'center', letterSpacing: 2, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 8 },

  /* Address Grid */
  addressGrid: { flexDirection: 'row', marginBottom: 10 },
  addressCol: { flex: 1 },
  addressDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  addressCompanyName: { fontSize: 11, fontWeight: '800', color: '#111827', marginBottom: 3 },
  addressBilledTo: { fontSize: 10, fontWeight: '700', color: '#6B7280', marginBottom: 2 },
  addressLine: { fontSize: 10, color: '#374151', lineHeight: 16 },

  /* Meta Grid */
  metaGrid: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, gap: 8 },
  metaCol: { flex: 1 },
  metaText: { fontSize: 10, color: '#374151', marginBottom: 3, lineHeight: 16 },
  metaBold: { fontWeight: '700' },

  /* Table */
  tableWrap: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableHeader: { backgroundColor: '#1F2937' },
  tableTotalRow: { backgroundColor: '#F3F4F6', borderTopWidth: 2, borderTopColor: '#E5E7EB' },
  thCell: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  tdCell: { fontSize: 10, color: '#374151' },
  tdSubCell: { fontSize: 9, color: '#9CA3AF' },

  /* Bottom Grid (GST Slabs + Totals) */
  bottomGrid: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 10, marginBottom: 8 },
  slabWrap: { marginBottom: 12 },
  slabTitle: { fontSize: 10, fontWeight: '700', color: '#111827', marginBottom: 6 },

  /* Totals */
  totalsWrap: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 11, color: '#6B7280' },
  totalVal: { fontSize: 11, color: '#374151' },
  totalRowFinal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 6, marginTop: 4 },
  totalLabelFinal: { fontSize: 13, fontWeight: '800', color: '#111827' },
  totalValFinal: { fontSize: 15, fontWeight: '900', color: '#2D4B34' },

  /* Amount Words */
  amountWordsBox: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 10, marginBottom: 8 },
  amountWordsText: { fontSize: 10, color: '#374151', lineHeight: 16 },

  /* Bank + Terms */
  bankTermsGrid: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 10, marginBottom: 8 },
  bankCol: { flex: 1 },
  bankText: { fontSize: 10, color: '#374151', lineHeight: 16 },

  /* Signatures */
  signaturesGrid: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 10 },
  signatureBox: { flex: 1, height: 60, justifyContent: 'flex-end' },
});
