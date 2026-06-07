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
          <Text style={styles.title}>RETURN, CANCELLATION & REFUND POLICY</Text>

          <Text style={styles.text}>
            All orders placed on the Saranga Ayurveda LLP application are prepaid orders only. Cash on Delivery (COD) is not available. As products are manufactured specifically against confirmed orders, processing, manufacturing, quality checks, packaging, and dispatch may require approximately 10–20 working days. Delivery timelines are estimates only and may vary depending on operational, logistical, seasonal, or unforeseen circumstances. The Company shall not be liable for delays caused by courier partners, transportation disruptions, weather conditions, governmental restrictions, force majeure events, or circumstances beyond its reasonable control. Customers are responsible for providing accurate shipping information. The Company shall not be responsible for delivery failures resulting from incorrect or incomplete customer details. Due to the nature of products being manufactured against confirmed orders, requests for cancellation, modification, return, exchange, or replacement may not be accepted once production has commenced. All sales are generally considered final. Refunds are not ordinarily provided for completed or dispatched orders. However, Saranga Ayurveda LLP reserves the sole right to review exceptional cases and determine whether any refund, replacement, store credit, or other resolution may be offered. Shipping charges, payment gateway fees, processing fees, handling charges, and similar costs are non-refundable. Any approved refund shall be processed through the original payment method within a reasonable period, subject to banking and payment partner timelines. Saranga Ayurveda LLP reserves the right to amend this policy at any time without prior notice.
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
  },
  title: {
    fontSize: 24,
    fontFamily: 'CormorantGaramond-Bold',
    marginBottom: 20,
    color: '#2b3a1a',
    textAlign: 'center',
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    color: '#333',
    marginBottom: 16,
    fontFamily: 'CormorantGaramond-Medium',
  },
});