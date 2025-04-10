import React from 'react';
import { TouchableOpacity, Alert, Platform, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
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

    const invoiceContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              padding: 100px;
              background: linear-gradient(to right, #f8f9fa, #e9ecef);
              border-radius: 20px;
            }
            .brand-name {
              color: #28a745;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .thank-you {
              color: #666;
              font-style: italic;
              margin: 10px 0;
            }
            .section { 
              margin: 25px 0;
              padding: 20px;
              background: #fff;
              border-radius: 10px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .section h3 {
              color: #28a745;
              border-bottom: 2px solid #e9ecef;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .item { 
              margin: 10px 0; 
              padding: 15px;
              background: #f8f9fa; 
              border-radius: 8px;
            }
            .total { 
              font-weight: bold; 
              font-size: 1.2em;
              color: #28a745;
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
              margin: 15px 0;
            }
            th, td { 
              padding: 12px 8px;
              text-align: left;
              border-bottom: 1px solid #dee2e6;
            }
            th { 
              background-color: #f8f9fa;
              color: #495057;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 10px;
              color: #666;
            }
            .contact-info {
              margin-top: 15px;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand-name">Saranga Ayurveda</div>
            <h1>Tax Invoice</h1>
            <h2>Order #${order.id}</h2>
            <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
            <p class="thank-you">Thank you for shopping with Saranga Ayurveda!</p>
          </div>
          
          <div class="section">
            <h3>Shipping Address</h3>
            <p><strong>${order.shipping_address.full_name}</strong></p>
            <p>${order.shipping_address.address_line1}</p>
            ${order.shipping_address.address_line2 ? `<p>${order.shipping_address.address_line2}</p>` : ''}
            <p>${order.shipping_address.city}, ${order.shipping_address.state} - ${order.shipping_address.pincode || ''}</p>
            <p>📱 ${order.shipping_address.phone}</p>
          </div>

          <div class="section">
            <h3>Order Details</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td><strong>${item.product_name}</strong></td>
                    <td>${item.quantity}</td>
                    <td>${formatPrice(Number(item.price_at_time))}</td>
                    <td>${formatPrice(Number(item.price_at_time) * Number(item.quantity))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>Price Details</h3>
            <table>
              <tr>
                <td>Subtotal:</td>
                <td>${formatPrice(totalAmount)}</td>
              </tr>
              ${discountAmount > 0 ? `
                <tr>
                  <td>Discount:</td>
                  <td style="color: #28a745">-${formatPrice(discountAmount)}</td>
                </tr>
              ` : ''}
              <tr>
                <td>Delivery Charges:</td>
                <td>${formatPrice(deliveryCharge)}</td>
              </tr>
              <tr class="total">
                <td>Total Amount:</td>
                <td>${formatPrice(totalAmount - discountAmount + deliveryCharge)}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h3>Payment Information</h3>
            <p><strong>Payment Method:</strong> ${order.payment_method_display}</p>
            <p><strong>Order Status:</strong> <span style="color: #28a745">${order.status.toUpperCase()}</span></p>
          </div>

          <div class="footer">
            <p><strong>Thank you for choosing Saranga Ayurveda!</strong></p>
            <p>We hope you enjoy your Ayurvedic products.</p>
            <div class="contact-info">
              <p>For any queries, please contact us:</p>
              <p>📧 support@sarangaayurveda.com | 📱 +91-XXXXXXXXXX</p>
              <p>www.sarangaayurveda.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('[generateInvoice] Generating PDF...');
    
    // Generate PDF file
    const { uri } = await Print.printToFileAsync({
      html: invoiceContent,
      base64: false
    });

    console.log('[generateInvoice] PDF generated at:', uri);

    // Create a new file with .pdf extension
    const pdfPath = `${FileSystem.documentDirectory}invoice_${order.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    await FileSystem.copyAsync({
      from: uri,
      to: pdfPath
    });

    // Share the PDF file
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Download Invoice'
      });

      // Clean up temporary files
      await FileSystem.deleteAsync(uri).catch(console.error);
      await FileSystem.deleteAsync(pdfPath).catch(console.error);
    } else {
      Alert.alert('Error', 'Sharing is not available on this device');
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