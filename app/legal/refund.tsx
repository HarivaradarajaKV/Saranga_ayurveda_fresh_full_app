import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RefundPolicyScreen() {
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