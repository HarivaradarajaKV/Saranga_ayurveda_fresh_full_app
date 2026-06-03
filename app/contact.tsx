import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ContactScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Contact Us',
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
        <View style={styles.headerCard}>
          <Ionicons name="chatbubbles-outline" size={28} color="#2b3a1a" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.heading}>We’d love to hear from you</Text>
            <Text style={styles.text}>Our team is here to help 7 days a week.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="mail-outline" size={22} color="#2b3a1a" />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Email</Text>
              <Text style={styles.cardValue} numberOfLines={1} adjustsFontSizeToFit>sarangaconsumershelp@gmail.com</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => Linking.openURL('mailto:sarangaconsumershelp@gmail.com')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Send Email</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="call-outline" size={22} color="#2b3a1a" />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Phone</Text>
              <Text style={styles.cardValue}>+91 9008145980</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Linking.openURL('tel:+919008145980')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Call Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={20} color="#2b3a1a" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.infoTitle}>Support Hours</Text>
            <Text style={styles.infoText}>Mon - Sun, 9:00 AM - 8:00 PM IST</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="location-outline" size={20} color="#2b3a1a" />
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
    backgroundColor: '#fbf7f4',
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 26, 0.08)',
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#556C3A',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 26, 0.08)',
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0ece8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
  },
  cardValue: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#556C3A',
  },
  primaryButton: {
    backgroundColor: '#40532A',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: 'CormorantGaramond-Bold',
    fontSize: 13,
  },
  secondaryButton: {
    backgroundColor: '#40532A',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#40532A',
  },
  secondaryButtonText: {
    color: '#fff',
    fontFamily: 'CormorantGaramond-Bold',
    fontSize: 13,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 26, 0.08)',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#556C3A',
    marginTop: 2,
  },
});


