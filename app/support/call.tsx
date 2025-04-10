import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
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
    number: '+91 8762342917',
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
      <Stack.Screen 
        options={{
          title: 'Call Support',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="call" size={40} color="#007bff" />
          <Text style={styles.headerTitle}>Contact Support</Text>
          <Text style={styles.headerSubtitle}>
            Choose the appropriate department to get quick assistance
          </Text>
        </View>

        {supportContacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name={contact.icon} size={24} color="#007bff" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.contactTitle}>{contact.title}</Text>
                <Text style={styles.contactDescription}>{contact.description}</Text>
                <Text style={styles.availability}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  {' '}{contact.availability}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={() => handleCall(contact.number)}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.callButtonText}>Call Now</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#666" />
          <Text style={styles.infoText}>
            Our support team is here to help you with any questions or concerns you may have.
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
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  contactCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  availability: {
    fontSize: 12,
    color: '#666',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
  },
  callButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
}); 