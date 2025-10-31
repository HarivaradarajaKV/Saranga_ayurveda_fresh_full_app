import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  };
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity style={styles.questionRow} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.question}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#694d21" />
      </TouchableOpacity>
      {open && <Text style={styles.answer}>{a}</Text>}
    </View>
  );
};

export default function FAQsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'FAQs' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Ionicons name="help-circle-outline" size={28} color="#b0761b" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
            <Text style={styles.headerSubtitle}>Tap a question to view the answer.</Text>
          </View>
        </View>
        <FAQItem q="How long is shipping?" a="Orders typically ship within 2-5 business days." />
        <FAQItem q="Can I return a product?" a="Yes, within 7 days of delivery in unused condition." />
        <FAQItem q="How do I contact support?" a="Email us at paysarangaayurveda@gmail.com." />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#694d21',
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#efd8bb',
    marginBottom: 12,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  answer: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});


