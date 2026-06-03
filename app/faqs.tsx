import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#2b3a1a" />
      </TouchableOpacity>
      {open && <Text style={styles.answer}>{a}</Text>}
    </View>
  );
};

export default function FAQsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#2b3a1a" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Ionicons name="help-circle-outline" size={28} color="#2b3a1a" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
            <Text style={styles.headerSubtitle}>Tap a question to view the answer.</Text>
          </View>
        </View>
        <FAQItem q="How long is shipping?" a="Orders typically ship within 2-5 business days." />
        <FAQItem q="Can I return a product?" a="Yes, within 7 days of delivery in unused condition." />
        <FAQItem q="How do I contact support?" a="Email us at sarangaconsumershelp@gmail.com." />
      </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbf7f4',
  },
  backButton: {
    padding: 4,
  },
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
  headerTitle: {
    fontSize: 20,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#556C3A',
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 26, 0.08)',
    marginBottom: 12,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  question: {
    fontSize: 16,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    flex: 1,
    marginRight: 8,
  },
  answer: {
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#556C3A',
    lineHeight: 20,
    marginTop: 8,
  },
});


