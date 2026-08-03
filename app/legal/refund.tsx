import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RefundPolicyScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Refund Policy</Text>
          <Text style={styles.effectiveDate}>Effective Date: 1 August 2027</Text>

          <Text style={styles.text}>
            At Saranga Ayurveda LLP, every order is processed with utmost care. This Refund Policy outlines the terms, conditions, and procedures for refund requests and eligibility.
          </Text>

          <Text style={styles.sectionTitle}>1. General Refund Policy</Text>
          <Text style={styles.text}>
            Saranga Ayurveda LLP follows a strict No Refund Policy on prepaid orders except where mandated by applicable law or determined under exceptional circumstances at the sole discretion of Saranga Ayurveda LLP.
          </Text>

          <Text style={styles.sectionTitle}>2. Refund Eligibility</Text>
          <Text style={styles.text}>
            Refunds will only be considered in the following circumstances:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• where required by applicable statutory law;</Text>
            <Text style={styles.bulletItem}>• where an order cancellation is approved prior to production or dispatch;</Text>
            <Text style={styles.bulletItem}>• where a delivered item was verified as damaged or defective on arrival and an equivalent replacement is unavailable.</Text>
          </View>

          <Text style={styles.sectionTitle}>3. Approved Refunds & Deductions</Text>
          <Text style={styles.text}>
            If a refund is approved by the Company or required by law, Saranga Ayurveda LLP reserves the right, to the extent permitted by applicable law, to deduct reasonable amounts representing actual expenses already incurred, including:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• manufacturing & raw material costs;</Text>
            <Text style={styles.bulletItem}>• packaging and quality testing expenses;</Text>
            <Text style={styles.bulletItem}>• payment gateway transaction fees;</Text>
            <Text style={styles.bulletItem}>• logistics and handling expenses;</Text>
            <Text style={styles.bulletItem}>• shipping charges;</Text>
            <Text style={styles.bulletItem}>• administrative processing expenses;</Text>
            <Text style={styles.bulletItem}>• applicable statutory taxes or deductions.</Text>
          </View>

          <Text style={styles.sectionTitle}>4. Payment Method & Processing Timeline</Text>
          <Text style={styles.text}>
            The remaining eligible balance, if any, shall be refunded through the original payment method used during checkout. Approved refunds are typically processed within 5 to 10 business days, depending on bank and gateway processing times.
          </Text>

          <Text style={styles.sectionTitle}>5. Fraudulent Claims</Text>
          <Text style={styles.text}>
            The Company reserves the right to reject refund requests that are fraudulent, abusive, misleading, or supported by false information.
          </Text>

          <Text style={styles.sectionTitle}>6. Final Decision</Text>
          <Text style={styles.text}>
            The decision of Saranga Ayurveda LLP regarding refunds shall be final, subject always to the customer’s rights under applicable law.
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