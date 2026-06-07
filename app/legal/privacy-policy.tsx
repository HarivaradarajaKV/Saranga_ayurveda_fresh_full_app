import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>PRIVACY POLICY</Text>
          
          <Text style={styles.text}>
            Saranga Ayurveda LLP respects customer privacy and is committed to protecting personal information. We may collect information including name, contact details, billing and shipping addresses, payment information, device information, IP address, and order history. The information collected may be used for order processing, manufacturing, delivery, customer support, fraud prevention, marketing communications, analytics, business operations, and legal compliance. By providing your contact information, you consent to receive communications from Saranga Ayurveda LLP through phone calls, SMS, WhatsApp, email, or other lawful communication channels. We may share information with payment processors, logistics partners, technology providers, marketing service providers, legal advisors, government authorities, or other parties where necessary for legitimate business purposes or legal compliance. While reasonable security measures are implemented, no method of data transmission or storage can be guaranteed to be completely secure. The Company shall not be liable for unauthorized access, data breaches, or losses occurring beyond its reasonable control. Saranga Ayurveda LLP reserves the right to modify this Privacy Policy at any time. Continued use of our services constitutes acceptance of the revised policy.
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