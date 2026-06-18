import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>TERMS & CONDITIONS</Text>

          <Text style={styles.text}>
            By accessing this application, creating an account, placing an order, or using any service offered by Saranga Ayurveda LLP, you agree to be bound by these Terms & Conditions.
            All orders are subject to acceptance, verification, review, availability, operational feasibility, and compliance requirements.
            The Company reserves the right to refuse, limit, postpone, hold, cancel, or review any order at its sole discretion where necessary for operational, security, legal, compliance, quality control, inventory management, or business reasons.
            Order processing commences following successful payment confirmation. Saranga Ayurveda LLP operates exclusively on a prepaid basis and does not offer Cash on Delivery services.
            The Company reserves the right to determine processing schedules, dispatch priorities, inventory allocation procedures, packaging requirements, and fulfillment methods as deemed appropriate for business operations.
            Product images, descriptions, packaging, and representations displayed on the application are illustrative in nature. Minor variations in appearance, labeling, packaging design, or presentation shall not constitute defects.
            Saranga Ayurveda LLP shall not be liable for delays, interruptions, losses, or failures resulting from supplier issues, transportation disruptions, public emergencies, governmental actions, natural disasters, technical failures, labor shortages, logistics constraints, force majeure events, or other circumstances beyond its reasonable control.
            To the maximum extent permitted by applicable law, the Company’s total liability relating to any order shall not exceed the amount paid by the customer for that specific order.
            The Company reserves the right to amend, modify, suspend, replace, or update these Terms & Conditions, policies, procedures, and application content at any time without prior notice.

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