import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ShippingPolicyScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Shipping & Delivery Policy</Text>
          <Text style={styles.effectiveDate}>Effective Date: 1 August 2027</Text>

          <Text style={styles.text}>
            Saranga Ayurveda LLP is committed to delivering products safely while maintaining the highest manufacturing standards.
          </Text>

          <Text style={styles.sectionTitle}>Manufacturing</Text>
          <Text style={styles.text}>
            Many products may be manufactured or packed after order confirmation to maintain freshness and quality. Customers acknowledge that manufacturing schedules may vary depending upon order volume and production capacity.
          </Text>

          <Text style={styles.sectionTitle}>Processing Time</Text>
          <Text style={styles.text}>
            Orders are processed according to production schedules. Processing time may vary significantly during promotional campaigns, festivals, product launches, or periods of unusually high demand.
          </Text>

          <Text style={styles.sectionTitle}>Dispatch</Text>
          <Text style={styles.text}>
            Orders will be dispatched only after completion of production, quality inspection, packaging, and verification. Estimated dispatch dates are indicative only and do not constitute guaranteed timelines.
          </Text>

          <Text style={styles.sectionTitle}>Delivery</Text>
          <Text style={styles.text}>Delivery timelines depend upon:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• courier partners;</Text>
            <Text style={styles.bulletItem}>• destination;</Text>
            <Text style={styles.bulletItem}>• weather;</Text>
            <Text style={styles.bulletItem}>• public holidays;</Text>
            <Text style={styles.bulletItem}>• transportation conditions;</Text>
            <Text style={styles.bulletItem}>• regulatory inspections;</Text>
            <Text style={styles.bulletItem}>• force majeure events; and</Text>
            <Text style={styles.bulletItem}>• other factors beyond the Company’s reasonable control.</Text>
          </View>
          <Text style={styles.text}>
            The Company shall not be liable for delays caused by such circumstances.
          </Text>

          <Text style={styles.sectionTitle}>Incorrect Address</Text>
          <Text style={styles.text}>
            Customers are responsible for providing complete and accurate delivery information. Any delay, additional charges, re-shipment costs, or failed deliveries resulting from incorrect information shall be the responsibility of the customer.
          </Text>

          <Text style={styles.sectionTitle}>Failed Delivery Attempts</Text>
          <Text style={styles.text}>
            If delivery cannot be completed due to customer unavailability, refusal, incorrect address, or failure to respond, the Company may cancel the shipment or require additional shipping charges before re-dispatch.
          </Text>

          <Text style={styles.sectionTitle}>Delivery Confirmation</Text>
          <Text style={styles.text}>
            Risk in the products passes to the customer upon successful delivery to the address provided during checkout.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: 'CormorantGaramond-Bold',
    marginBottom: 6,
    color: '#2b3a1a',
    textAlign: 'center',
  },
  effectiveDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2b3a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2b3a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333',
    marginBottom: 12,
  },
  bulletList: {
    paddingLeft: 8,
    marginBottom: 14,
  },
  bulletItem: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333',
    marginBottom: 4,
  },
});