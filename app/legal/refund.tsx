import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function RefundPolicyScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Refund Policy',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Refund Policy</Text>
          <Text style={styles.lastUpdated}>Last updated: February 24, 2024</Text>
          
          <Text style={styles.section}>1. Return Period</Text>
          <Text style={styles.text}>
            We accept returns within 30 days of delivery for unused items in their
            original packaging with all tags attached.
          </Text>

          <Text style={styles.section}>2. Return Process</Text>
          <Text style={styles.text}>
            To initiate a return, please contact our customer service team through the app
            or email. You will receive a return shipping label and instructions.
          </Text>

          <Text style={styles.section}>3. Refund Timeline</Text>
          <Text style={styles.text}>
            Once we receive and inspect your return, we will process your refund within
            5-7 business days. The refund will be issued to your original payment method.
          </Text>

          <Text style={styles.section}>4. Non-Returnable Items</Text>
          <Text style={styles.text}>
            For hygiene reasons, certain items such as opened cosmetics, personal care products,
            and intimate items cannot be returned unless defective.
          </Text>

          <Text style={styles.section}>5. Damaged or Defective Items</Text>
          <Text style={styles.text}>
            If you receive a damaged or defective item, please contact us within 48 hours
            of delivery. We will arrange a replacement or full refund.
          </Text>

          <Text style={styles.section}>6. Return Shipping</Text>
          <Text style={styles.text}>
            Return shipping is free for defective items. For other returns, shipping costs
            may be deducted from your refund unless otherwise specified.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
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