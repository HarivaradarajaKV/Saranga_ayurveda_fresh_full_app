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
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.effectiveDate}>Effective Date: 1 August 2027</Text>

          <Text style={styles.text}>
            Saranga Ayurveda LLP respects your privacy and is committed to protecting your personal information.
          </Text>

          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.text}>We may collect:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• name;</Text>
            <Text style={styles.bulletItem}>• billing address;</Text>
            <Text style={styles.bulletItem}>• shipping address;</Text>
            <Text style={styles.bulletItem}>• mobile number;</Text>
            <Text style={styles.bulletItem}>• email address;</Text>
            <Text style={styles.bulletItem}>• payment information (processed securely through payment partners);</Text>
            <Text style={styles.bulletItem}>• order history;</Text>
            <Text style={styles.bulletItem}>• device information;</Text>
            <Text style={styles.bulletItem}>• browser information;</Text>
            <Text style={styles.bulletItem}>• IP address;</Text>
            <Text style={styles.bulletItem}>• cookies and website usage data.</Text>
          </View>

          <Text style={styles.sectionTitle}>Purpose of Collection</Text>
          <Text style={styles.text}>Your information is collected to:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• process orders;</Text>
            <Text style={styles.bulletItem}>• manufacture and deliver products;</Text>
            <Text style={styles.bulletItem}>• provide customer support;</Text>
            <Text style={styles.bulletItem}>• comply with legal obligations;</Text>
            <Text style={styles.bulletItem}>• improve website functionality;</Text>
            <Text style={styles.bulletItem}>• prevent fraud;</Text>
            <Text style={styles.bulletItem}>• communicate important updates.</Text>
          </View>

          <Text style={styles.sectionTitle}>Payment Security</Text>
          <Text style={styles.text}>
            Saranga Ayurveda LLP does not store complete debit card, credit card, or banking credentials on its own servers unless specifically required by an authorised payment provider. Payments are processed through secure third-party payment gateways.
          </Text>

          <Text style={styles.sectionTitle}>Sharing Information</Text>
          <Text style={styles.text}>We may share information only with:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• courier partners;</Text>
            <Text style={styles.bulletItem}>• logistics providers;</Text>
            <Text style={styles.bulletItem}>• payment processors;</Text>
            <Text style={styles.bulletItem}>• technology providers;</Text>
            <Text style={styles.bulletItem}>• auditors;</Text>
            <Text style={styles.bulletItem}>• legal authorities where required by law.</Text>
          </View>
          <Text style={styles.text}>
            We do not sell customers’ personal information to third parties.
          </Text>

          <Text style={styles.sectionTitle}>Cookies</Text>
          <Text style={styles.text}>
            Our website uses cookies and similar technologies to improve user experience and analyse website performance.
          </Text>

          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.text}>
            Reasonable administrative, technical, and organisational safeguards are implemented to protect customer information. However, no internet transmission or electronic storage system can be guaranteed to be completely secure.
          </Text>

          <Text style={styles.sectionTitle}>Marketing Communication</Text>
          <Text style={styles.text}>
            Customers may receive order-related communications. Promotional communications may be sent where permitted by applicable law, and customers may opt out where such an option is provided.
          </Text>

          <Text style={styles.sectionTitle}>Policy Updates</Text>
          <Text style={styles.text}>
            Saranga Ayurveda LLP reserves the right to amend this Privacy Policy at any time. Continued use of the website constitutes acceptance of the updated policy.
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