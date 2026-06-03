import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ShippingPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#2b3a1a" />
          </TouchableOpacity>
        </View>
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
            Standard shipping is free for orders over INR 500. Express shipping and international
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbf7f4',
  },
  backButton: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  contentContainer: {
    padding: 16,
  },
  content: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 26, 0.08)',
  },
  title: {
    fontSize: 24,
    fontFamily: 'CormorantGaramond-Bold',
    marginBottom: 8,
    color: '#2b3a1a',
  },
  lastUpdated: {
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#556C3A',
    marginBottom: 24,
  },
  section: {
    fontSize: 18,
    fontFamily: 'CormorantGaramond-Bold',
    marginTop: 24,
    marginBottom: 12,
    color: '#2b3a1a',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#556C3A',
    marginBottom: 16,
  },
}); 