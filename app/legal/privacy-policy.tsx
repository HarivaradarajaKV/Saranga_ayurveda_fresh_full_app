import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last updated: February 24, 2024</Text>
          
          <Text style={styles.section}>1. Information We Collect</Text>
          <Text style={styles.text}>
            We collect information that you provide directly to us, including when you create an account,
            make a purchase, or contact us for support.
          </Text>

          <Text style={styles.section}>2. How We Use Your Information</Text>
          <Text style={styles.text}>
            We use the information we collect to provide, maintain, and improve our services,
            to process your transactions, and to communicate with you.
          </Text>

          <Text style={styles.section}>3. Information Sharing</Text>
          <Text style={styles.text}>
            We do not sell your personal information. We may share your information with
            third-party service providers who assist us in operating our business.
          </Text>

          <Text style={styles.section}>4. Data Security</Text>
          <Text style={styles.text}>
            We implement appropriate technical and organizational measures to protect
            your personal information against unauthorized access or disclosure.
          </Text>

          <Text style={styles.section}>5. Your Rights</Text>
          <Text style={styles.text}>
            You have the right to access, correct, or delete your personal information.
            You can also opt out of marketing communications at any time.
          </Text>

          <Text style={styles.section}>6. Contact Us</Text>
          <Text style={styles.text}>
            If you have any questions about this Privacy Policy, please contact us at:
            privacy@yourcompany.com
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