import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function TermsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Terms of Service',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.lastUpdated}>Last updated: February 24, 2024</Text>
          
          <Text style={styles.section}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By accessing and using this application, you accept and agree to be bound by the terms
            and provision of this agreement.
          </Text>

          <Text style={styles.section}>2. Use License</Text>
          <Text style={styles.text}>
            Permission is granted to temporarily download one copy of the application for personal,
            non-commercial transitory viewing only.
          </Text>

          <Text style={styles.section}>3. Product Information</Text>
          <Text style={styles.text}>
            We strive to provide accurate product descriptions and pricing. However, we do not
            warrant that product descriptions or prices are accurate, complete, or current.
          </Text>

          <Text style={styles.section}>4. User Account</Text>
          <Text style={styles.text}>
            You are responsible for maintaining the confidentiality of your account and password.
            You agree to accept responsibility for all activities that occur under your account.
          </Text>

          <Text style={styles.section}>5. Limitation of Liability</Text>
          <Text style={styles.text}>
            We shall not be liable for any indirect, incidental, special, consequential, or
            punitive damages resulting from your use of our services.
          </Text>

          <Text style={styles.section}>6. Changes to Terms</Text>
          <Text style={styles.text}>
            We reserve the right to modify these terms at any time. We will notify users of any
            material changes by posting the new terms on the app.
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