import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

interface SupportContact {
  id: number;
  title: string;
  description: string;
  number: string;
  icon: keyof typeof Ionicons.glyphMap;
  availability: string;
}

const supportContacts: SupportContact[] = [
  {
    id: 1,
    title: 'Customer Support',
    description: 'For general inquiries and product information',
    number: '+91 9008145980',
    icon: 'headset',
    availability: '24/7',
  },
  {
    id: 2,
    title: 'Order Support',
    description: 'For order tracking and delivery issues',
    number: '+91 7619342604',
    icon: 'cube',
    availability: 'Mon-Sat, 9 AM - 6 PM',
  },
  {
    id: 3,
    title: 'Technical Support',
    description: 'For website and app related issues',
    number: '+91 8296060269',
    icon: 'construct',
    availability: 'Mon-Fri, 10 AM - 5 PM',
  },
];

export default function CallSupportPage() {
  const router = useRouter();

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        {/* Page Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="call" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Call Support</Text>
          <Text style={styles.headerSubtitle}>
            Choose the appropriate department to get quick assistance
          </Text>
        </View>

        {/* Contact Cards */}
        {supportContacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name={contact.icon} size={22} color="#fff" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.contactTitle}>{contact.title}</Text>
                <Text style={styles.contactDescription}>{contact.description}</Text>
                <View style={styles.availabilityRow}>
                  <Ionicons name="time-outline" size={13} color="#7a7a7a" />
                  <Text style={styles.availability}> {contact.availability}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(contact.number)}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.callButtonText}>Call Now</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Info box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={22} color="#2b3a1a" />
          <Text style={styles.infoText}>
            Our support team is here to help you with any questions or concerns.
            Standard calling rates may apply.
          </Text>
        </View>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: '#fbf7f4',
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2b3a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 36,
    color: '#2b3a1a',
    fontFamily: 'CormorantGaramond-Bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#7a7a7a',
    textAlign: 'center',
    lineHeight: 19,
  },
  contactCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ede8e0',
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  contactInfo: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2b3a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2b3a1a',
    marginBottom: 3,
  },
  contactDescription: {
    fontSize: 13,
    color: '#7a7a7a',
    marginBottom: 4,
    lineHeight: 18,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availability: {
    fontSize: 12,
    color: '#7a7a7a',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b3a1a',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  callButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 6,
    padding: 16,
    backgroundColor: '#f3f0ea',
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#5a5a5a',
    lineHeight: 19,
  },
});