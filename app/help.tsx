import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HelpAndSupport() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Help & Support',
          headerShown: true,
          headerStyle: { backgroundColor: '#fbf7f4' },
          headerTintColor: '#2b3a1a',
          headerTitleStyle: {
            fontFamily: 'CormorantGaramond-Bold',
            fontSize: 20,
          },
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Ionicons name="help-circle-outline" size={28} color="#2b3a1a" />
          <View style={styles.cardTextWrap}>
            <Text style={styles.title}>How can we help?</Text>
            <Text style={styles.subtitle}>Quick links to common support topics</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/contact')} activeOpacity={0.8}>
          <Ionicons name="call-outline" size={20} color="#2b3a1a" />
          <Text style={styles.linkText}>Contact Us</Text>
          <Ionicons name="chevron-forward" size={18} color="#2b3a1a" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/faqs')} activeOpacity={0.8}>
          <Ionicons name="help-buoy-outline" size={20} color="#2b3a1a" />
          <Text style={styles.linkText}>FAQs</Text>
          <Ionicons name="chevron-forward" size={18} color="#2b3a1a" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/legal/shipping')} activeOpacity={0.8}>
          <Ionicons name="car-outline" size={20} color="#2b3a1a" />
          <Text style={styles.linkText}>Shipping Information</Text>
          <Ionicons name="chevron-forward" size={18} color="#2b3a1a" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/legal/refund')} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={20} color="#2b3a1a" />
          <Text style={styles.linkText}>Return/Refund Policy</Text>
          <Ionicons name="chevron-forward" size={18} color="#2b3a1a" />
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fbf7f4',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 26, 0.08)',
    marginBottom: 16,
  },
  cardTextWrap: {
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#556C3A',
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
    borderColor: 'rgba(43, 58, 26, 0.08)',
    marginBottom: 12,
  },
  linkText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#2b3a1a',
    fontFamily: 'CormorantGaramond-Bold',
  },
});





