import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HelpAndSupport() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Help & Support' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Ionicons name="help-circle-outline" size={28} color="#b0761b" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.title}>How can we help?</Text>
            <Text style={styles.subtitle}>Quick links to common support topics</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/contact')} activeOpacity={0.8}>
          <Ionicons name="call-outline" size={20} color="#694d21" />
          <Text style={styles.linkText}>Contact Us</Text>
          <Ionicons name="chevron-forward" size={18} color="#694d21" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/faqs')} activeOpacity={0.8}>
          <Ionicons name="help-buoy-outline" size={20} color="#694d21" />
          <Text style={styles.linkText}>FAQs</Text>
          <Ionicons name="chevron-forward" size={18} color="#694d21" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/legal/shipping')} activeOpacity={0.8}>
          <Ionicons name="car-outline" size={20} color="#694d21" />
          <Text style={styles.linkText}>Shipping Information</Text>
          <Ionicons name="chevron-forward" size={18} color="#694d21" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/legal/refund')} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={20} color="#694d21" />
          <Text style={styles.linkText}>Return/Refund Policy</Text>
          <Ionicons name="chevron-forward" size={18} color="#694d21" />
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fffbe9',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#efd8bb',
    marginBottom: 16,
  },
  cardTextWrap: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#694d21',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#efd8bb',
    marginBottom: 12,
  },
  linkText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});




