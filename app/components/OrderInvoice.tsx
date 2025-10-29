import React from 'react';
import { TouchableOpacity, Alert, Platform, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { Order } from '../OrderContext';

interface OrderInvoiceProps {
  order: Order;
  style?: any;
}

export const generateInvoice = async (order: Order) => {
  try {
    // Ensure all numeric values are properly converted and defaulted
    const discountAmount = Number(order.discount_amount || 0);
    const deliveryCharge = Number(order.delivery_charge || 0);
    const totalAmount = Number(order.total_amount || 0);

    const formatPrice = (price: number) => `₹${price.toFixed(2)}`;

    // Calculate items subtotal and inferred other charges
    const itemsSubtotal = (order.items || []).reduce((sum, item) => sum + Number(item.price_at_time || 0) * Number(item.quantity || 0), 0);
    const inferredOtherChargesRaw = totalAmount - (itemsSubtotal - discountAmount + deliveryCharge);
    const otherCharges = Math.max(0, Number(isFinite(inferredOtherChargesRaw) ? inferredOtherChargesRaw : 0));

    // Format date in IST
    const orderDateIST = (() => {
      try {
        return new Date(order.created_at).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
        });
      } catch {
        return new Date(order.created_at).toLocaleDateString('en-IN');
      }
    })();

    const paymentDisplay = order.payment_method_display || (order.payment_method?.toLowerCase() === 'cod' ? 'Cash on Delivery' : 'Online Payment');

    const invoiceContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            :root {
              --primary: #2f5d62;
              --accent: #28a745;
              --muted: #6c757d;
              --bg: #f6f8fb;
              --card: #ffffff;
              --border: #e9ecef;
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
              padding: 24px;
              line-height: 1.6;
              color: #333;
              background: var(--bg);
            }
            .header-wrap {
              background: linear-gradient(135deg, #f0f4ff, #e6f7f0);
              border: 1px solid var(--border);
              border-radius: 16px;
              padding: 20px;
              margin-bottom: 20px;
            }
            .brand-row {
              display: flex; align-items: center; justify-content: space-between;
            }
            .brand-name {
              color: var(--primary);
              font-size: 22px;
              font-weight: 800;
              letter-spacing: 0.3px;
            }
            .invoice-title { margin: 6px 0 0; font-size: 18px; color: #111; }
            .order-meta { color: var(--muted); font-size: 13px; margin: 4px 0 0; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
            .section { 
              margin: 16px 0;
              padding: 16px;
              background: var(--card);
              border-radius: 12px;
              border: 1px solid var(--border);
            }
            .section h3 {
              color: var(--primary);
              font-size: 16px;
              margin: 0 0 10px;
              padding-bottom: 8px;
              border-bottom: 1px dashed var(--border);
            }
            .addr p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid var(--border); font-size: 13px; }
            th { background: #fafbff; color: #374151; font-weight: 700; }
            .right { text-align: right; }
            .muted { color: var(--muted); }
            .total-row td { font-weight: 800; color: var(--primary); border-top: 2px solid var(--border); }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #eefbf1; color: var(--accent); font-weight: 700; font-size: 11px; }
            .footer { text-align: center; margin-top: 18px; color: var(--muted); font-size: 12px; }
            .contact-info { margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header-wrap">
            <div class="brand-row">
              <div class="brand-name">Saranga Ayurveda</div>
              <div class="badge">${paymentDisplay}</div>
            </div>
            <div class="invoice-title">Tax Invoice • Order #${order.id}</div>
            <div class="order-meta">Date: ${orderDateIST}</div>
          </div>
          
          <div class="grid">
            <div class="section addr">
              <h3>Billing & Shipping</h3>
              <p><strong>${order.shipping_address.full_name}</strong></p>
              <p>${order.shipping_address.address_line1}</p>
              ${order.shipping_address.address_line2 ? `<p>${order.shipping_address.address_line2}</p>` : ''}
              <p>${order.shipping_address.city}, ${order.shipping_address.state} - ${order.shipping_address.pincode || ''}</p>
              <p>📱 ${order.shipping_address.phone || (order.shipping_address as any)?.phone_number || (order as any)?.shipping_phone_number || ''}</p>
            </div>
            <div class="section">
              <h3>Order Summary</h3>
              <table>
                <tr>
                  <td class="muted">Items Subtotal</td>
                  <td class="right">${formatPrice(itemsSubtotal)}</td>
                </tr>
                ${discountAmount > 0 ? `
                <tr>
                  <td class="muted">Discount</td>
                  <td class="right" style="color:#28a745">- ${formatPrice(discountAmount)}</td>
                </tr>` : ''}
                <tr>
                  <td class="muted">Delivery Charges</td>
                  <td class="right">${formatPrice(deliveryCharge)}</td>
                </tr>
                ${otherCharges > 0 ? `
                <tr>
                  <td class="muted">Other Charges</td>
                  <td class="right">${formatPrice(otherCharges)}</td>
                </tr>` : ''}
                <tr class="total-row">
                  <td>Total Amount</td>
                  <td class="right">${formatPrice(totalAmount)}</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="section">
            <h3>Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="right">Qty</th>
                  <th class="right">Price</th>
                  <th class="right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || []).map(item => `
                  <tr>
                    <td><strong>${item.product_name}</strong>${item.variant ? ` <span class="muted">(${item.variant})</span>` : ''}</td>
                    <td class="right">${Number(item.quantity || 0)}</td>
                    <td class="right">${formatPrice(Number(item.price_at_time || 0))}</td>
                    <td class="right">${formatPrice(Number(item.price_at_time || 0) * Number(item.quantity || 0))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p><strong>Thank you for choosing Saranga Ayurveda!</strong></p>
            <p>We hope you enjoy your Ayurvedic products.</p>
            <div class="contact-info">
              <p>For any queries, please contact us:</p>
              <p>📧 paysarangaayurveda@gmail.com | 📱 +91-XXXXXXXXXX</p>
              <p>www.sarangaayurveda.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('[generateInvoice] Generating PDF...');

    let pdfUri: string | null = null;

    // Try using expo-print first
    try {
      const printResult = await Print.printToFileAsync({ html: invoiceContent, base64: false });
      pdfUri = printResult.uri;
    } catch (err) {
      console.warn('[generateInvoice] expo-print failed, falling back to RNHTMLtoPDF:', err);
    }

    // Fallback to RNHTMLtoPDF if expo-print failed or is unavailable
    if (!pdfUri) {
      const file = await RNHTMLtoPDF.convert({
        html: invoiceContent,
        fileName: `invoice_${order.id}`,
        directory: 'Documents',
      });
      pdfUri = file.filePath || null;
    }

    if (!pdfUri) {
      throw new Error('Failed to generate invoice PDF');
    }

    console.log('[generateInvoice] PDF generated at:', pdfUri);

    // Use the generated path directly for sharing
    const sharePath = pdfUri;

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(sharePath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Download Invoice'
      });
    } else {
      Alert.alert('Invoice Ready', `Invoice saved at: ${sharePath}`);
    }
  } catch (error) {
    console.error('Error generating invoice:', error);
    Alert.alert('Error', 'Failed to generate invoice. Please try again.');
  }
};

const styles = StyleSheet.create({
  invoiceTitle: {
    fontSize: 20,
    margin: 10,
    textAlign: 'center',
    color: '#007bff',
  },
});

export const OrderInvoice: React.FC<OrderInvoiceProps> = ({ order, style }) => {
  return (
    <TouchableOpacity
      onPress={() => generateInvoice(order)}
      style={style}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.7}
    >
      <Ionicons name="document-text-outline" size={24} color="#007bff" />
      <Text style={styles.invoiceTitle}>Saranga Ayurveda Invoice</Text>
    </TouchableOpacity>
  );
}; 