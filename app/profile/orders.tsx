import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Mock orders data with ISO date strings
const orders = [
  {
    id: 'OD123456789',
    date: '2024-03-15T14:30:00Z',
    totalAmount: 4999,
    status: 'Delivered',
    items: [
      {
        id: 1,
        name: 'Rose Glow Facial Cream',
        image: 'https://picsum.photos/200?random=1',
        quantity: 1,
      },
      {
        id: 2,
        name: 'Vitamin C Serum',
        image: 'https://picsum.photos/200?random=2',
        quantity: 1,
      },
    ],
  },
  {
    id: 'OD123456788',
    date: '2024-03-10T09:15:00Z',
    totalAmount: 2999,
    status: 'Delivered',
    items: [
      {
        id: 3,
        name: 'Hydrating Toner',
        image: 'https://picsum.photos/200?random=3',
        quantity: 1,
      },
    ],
  },
];

export default function OrdersPage() {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return '#4CAF50';
      case 'shipped':
        return '#2196F3';
      case 'processing':
        return '#FF9800';
      case 'cancelled':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    // Format the actual date and time
    const formattedDate = date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Return relative time for recent orders
    if (diffMinutes < 60) {
      return {
        relative: `${diffMinutes} minutes ago`,
        full: `${formattedDate} at ${formattedTime}`,
      };
    } else if (diffHours < 24) {
      return {
        relative: `${diffHours} hours ago`,
        full: `${formattedDate} at ${formattedTime}`,
      };
    } else if (diffDays < 7) {
      return {
        relative: `${diffDays} days ago`,
        full: `${formattedDate} at ${formattedTime}`,
      };
    } else {
      return {
        relative: formattedDate,
        full: `${formattedDate} at ${formattedTime}`,
      };
    }
  };

  const handleDownloadInvoice = async (order: any) => {
    try {
      // In a real app, this would make an API call to generate and get the invoice URL
      // For demo, we'll simulate a download
      Alert.alert(
        'Download Invoice',
        'Your invoice will be downloaded shortly.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Download',
            onPress: async () => {
              try {
                // In a real app, replace this with your actual invoice PDF URL
                const invoiceUrl = `https://example.com/invoices/${order.id}.pdf`;
                
                if (Platform.OS === 'android') {
                  const downloadPath = `${FileSystem.documentDirectory}invoice_${order.id}.pdf`;
                  const { uri } = await FileSystem.downloadAsync(invoiceUrl, downloadPath);
                  await Sharing.shareAsync(uri);
                } else {
                  // For iOS, directly open the URL
                  await Linking.openURL(invoiceUrl);
                }

                Alert.alert(
                  'Success',
                  'Invoice downloaded successfully!',
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Alert.alert(
                  'Error',
                  'Failed to download invoice. Please try again later.',
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to process your request. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Orders',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container}>
        <Text style={styles.sectionTitle}>Saranga Ayurveda My Orders</Text>
        {orders.map((order) => {
          const orderDate = formatDate(order.date);
          return (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push({
                pathname: '/orders/[id]',
                params: { id: order.id }
              })}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  <Text style={styles.orderDate}>{orderDate.relative}</Text>
                  <Text style={styles.orderFullDate}>{orderDate.full}</Text>
                </View>
                <View style={styles.orderStatus}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(order.status) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(order.status) },
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
              </View>

              <View style={styles.itemsContainer}>
                {order.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.orderFooter}>
                <View style={styles.footerLeft}>
                  <Text style={styles.totalAmount}>₹{order.totalAmount}</Text>
                  <TouchableOpacity
                    style={styles.invoiceButton}
                    onPress={() => handleDownloadInvoice(order)}
                  >
                    <Ionicons name="document-text-outline" size={16} color="#666" />
                    <Text style={styles.invoiceButtonText}>Invoice</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push('/support/live-chat')}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="#007bff" />
                    <Text style={styles.actionButtonText}>Help</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => router.push({
                      pathname: '/orders/[id]',
                      params: { id: order.id }
                    })}
                  >
                    <Text style={[styles.actionButtonText, styles.viewButtonText]}>
                      View Details
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {orders.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bag-handle-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No orders yet</Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  orderFullDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    padding: 4,
  },
  invoiceButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007bff',
    marginLeft: 4,
  },
  viewButton: {
    backgroundColor: '#007bff',
  },
  viewButtonText: {
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
}); 