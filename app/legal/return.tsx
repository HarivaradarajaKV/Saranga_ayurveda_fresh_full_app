import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReturnPolicyScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Return & Cancellation Policy</Text>
          <Text style={styles.effectiveDate}>Effective Date: 1 August 2027</Text>

          <Text style={styles.text}>
            At Saranga Ayurveda LLP, we strive to ensure a smooth shopping experience. Please review our policy regarding order cancellations and product returns.
          </Text>

          <Text style={styles.sectionTitle}>1. General Overview</Text>
          <Text style={styles.text}>
            All orders placed on our website and mobile application are processed on a prepaid basis. Manufacturing, procurement, quality testing, packaging, and dispatch preparation may begin immediately upon order confirmation.
          </Text>

          <Text style={styles.sectionTitle}>2. Order Cancellation Policy</Text>
          <Text style={styles.text}>
            Orders cannot be cancelled once payment has been confirmed and production or processing has commenced. If a cancellation request is submitted prior to processing, Saranga Ayurveda LLP will evaluate the request in accordance with our processing status.
          </Text>

          <Text style={styles.sectionTitle}>3. Product Return Policy</Text>
          <Text style={styles.text}>
            For reasons of hygiene, quality assurance, personal care safety, and customer health, Saranga Ayurveda LLP maintains a strict No Return Policy once products are delivered. Products cannot be returned or exchanged unless required under applicable law or in cases of damaged/defective deliveries.
          </Text>

          <Text style={styles.sectionTitle}>4. Damaged or Defective Items Received</Text>
          <Text style={styles.text}>
            If you receive a package that is damaged, defective, tampered with, or contains incorrect items:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Contact our support team within 24 to 48 hours of delivery.</Text>
            <Text style={styles.bulletItem}>• Provide clear unboxing video proof and photos of the outer box, shipping label, and product condition.</Text>
            <Text style={styles.bulletItem}>• Upon verification, an appropriate replacement or resolution will be provided.</Text>
          </View>

          <Text style={styles.sectionTitle}>5. Conditions for Approved Returns / Replacements</Text>
          <Text style={styles.text}>
            Where a return or replacement is approved by the Company:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Products must remain unopened, unused, and in their original packaging.</Text>
            <Text style={styles.bulletItem}>• All seals, tags, and original labels must be intact.</Text>
            <Text style={styles.bulletItem}>• Items showing signs of use or alteration after delivery will not be accepted.</Text>
          </View>

          <Text style={styles.sectionTitle}>6. Contact Us</Text>
          <Text style={styles.text}>
            If you have questions regarding order returns or cancellations, please contact our support team through the Help & Support section of our application.
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
