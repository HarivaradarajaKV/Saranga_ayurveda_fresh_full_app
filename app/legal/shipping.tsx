import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function ShippingPolicyScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Shipping Policy',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Shipping Policy</Text>
          <Text style={styles.lastUpdated}>Last updated: February 24, 2024</Text>
          
          <Text style={styles.section}>1. Processing Time</Text>
          <Text style={styles.text}>
            Orders are typically processed within 1-2 business days. During peak seasons
            or promotional periods, processing time may be extended.
          </Text>

          <Text style={styles.section}>2. Shipping Methods</Text>
          <Text style={styles.text}>
            We offer standard shipping (5-7 business days) and express shipping (2-3 business days).
            International shipping is available for select countries.
          </Text>

          <Text style={styles.section}>3. Shipping Costs</Text>
          <Text style={styles.text}>
            Standard shipping is free for orders over $50. Express shipping and international
            shipping rates are calculated at checkout based on location and weight.
          </Text>

          <Text style={styles.section}>4. Order Tracking</Text>
          <Text style={styles.text}>
            Once your order ships, you will receive a tracking number via email. You can
            track your order status through our app or website.
          </Text>

          <Text style={styles.section}>5. Delivery Issues</Text>
          <Text style={styles.text}>
            If you experience any issues with delivery, please contact our customer service
            team within 48 hours of the expected delivery date.
          </Text>

          <Text style={styles.section}>6. International Orders</Text>
          <Text style={styles.text}>
            International customers are responsible for any customs duties, taxes, and
            import fees that may apply to their order.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffbe9',
  },
  contentContainer: {
    padding: 16,
  },
  content: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efd8bb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    color: '#000',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
}); 