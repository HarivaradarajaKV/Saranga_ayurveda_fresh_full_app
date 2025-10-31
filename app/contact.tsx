import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ContactScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Contact Us' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Ionicons name="chatbubbles-outline" size={28} color="#b0761b" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.heading}>We’d love to hear from you</Text>
            <Text style={styles.text}>Our team is here to help 7 days a week.</Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Ionicons name="mail-outline" size={22} color="#694d21" />
            <Text style={styles.cardTitle}>Email</Text>
            <Text style={styles.cardValue}>paysarangaayurveda@gmail.com</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => Linking.openURL('mailto:paysarangaayurveda@gmail.com')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Send Email</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <Ionicons name="call-outline" size={22} color="#694d21" />
            <Text style={styles.cardTitle}>Phone</Text>
            <Text style={styles.cardValue}>+91 8762342917</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => Linking.openURL('tel:+918762342917')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Call Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={20} color="#694d21" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.infoTitle}>Support Hours</Text>
            <Text style={styles.infoText}>Mon - Sun, 9:00 AM - 8:00 PM IST</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="location-outline" size={20} color="#694d21" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.infoTitle}>Address</Text>
            <Text style={styles.infoText}>Saranga Ayurveda, Bengaluru, India</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fffbe9',
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#efd8bb',
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  text: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#efd8bb',
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#694d21',
  },
  cardValue: {
    marginTop: 6,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fffbe9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#efd8bb',
  },
  secondaryButtonText: {
    color: '#694d21',
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#efd8bb',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#694d21',
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
  },
});


