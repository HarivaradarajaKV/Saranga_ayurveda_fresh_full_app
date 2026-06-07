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
            By accessing this application or placing an order with Saranga Ayurveda LLP, you agree to be bound by these Terms & Conditions. All orders placed through our application are subject to acceptance and availability. Saranga Ayurveda LLP reserves the right to refuse, cancel, or limit any order at its sole discretion. All products are manufactured specifically against confirmed customer orders. Production commences after successful receipt of payment. Once an order is confirmed, cancellation, modification, or reversal of the order may not be possible. The Company reserves the right to modify product specifications, packaging, pricing, promotional offers, and application content without prior notice. Product images displayed on the application are for illustrative purposes only. Actual products may vary slightly in appearance, packaging, color, or design. The Company shall not be liable for delays, interruptions, losses, or damages resulting from events beyond its reasonable control, including transportation issues, natural disasters, government actions, supplier delays, technical failures, or force majeure events. Saranga Ayurveda LLP’s total liability, if any, shall be limited to the amount paid by the customer for the specific order in question. The Company reserves the right to amend these Terms & Conditions at any time. Continued use of the application constitutes acceptance of any revised terms.
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