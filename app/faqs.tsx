import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const FAQS = [
  {
    q: 'Are your products suitable for daily use?',
    a: 'Most Saranga Ayurveda products are designed for regular use as directed on the product label. However, individual preferences and sensitivities may vary. We recommend reviewing the ingredient list and usage instructions before use.'
  },
  {
    q: 'Do you provide personalized consultations?',
    a: 'Yes. If you contact us via email with your concerns, questions, or wellness goals, our team will first review the information you provide. Depending on the nature of your query, we may recommend a personalized one-to-one consultation through a video call (such as Zoom or similar platforms) or an in-person meeting, wherever available.\n\nThis approach helps us better understand your individual requirements and provide more accurate guidance and recommendations. Please note that consultation appointments may be subject to availability and may require prior scheduling.'
  },
  {
    q: 'How long does it take to see results from Saranga Ayurveda products?',
    a: 'The time required to experience results may vary from person to person depending on factors such as age, lifestyle, diet, consistency of use, and individual body responses.\n\nAyurveda focuses on supporting the body’s natural balance and well-being through a gradual and holistic approach. Unlike some products that may offer temporary or immediate effects, Ayurvedic formulations are generally designed to deliver their benefits through regular and consistent use over time.\n\nFor best results, we recommend using the product as directed and maintaining consistency in your wellness routine. Individual experiences may vary, and some users may notice benefits sooner than others.'
  },
  {
    q: 'Are all Saranga Ayurveda products 100% herbal?',
    a: 'At Saranga Ayurveda, we strive to harness the goodness of nature in every formulation. Many of our ingredients are derived from herbs, plants, and other naturally sourced materials. However, not all products are 100% herbal.\n\nIn certain products, a small number of carefully selected ingredients, including approved cosmetic or functional ingredients, may be used where necessary to ensure product safety, stability, effectiveness, texture, shelf life, and overall quality. These ingredients are chosen responsibly and only when they serve an important purpose in the formulation.\n\nOur commitment is to combine the wisdom of Ayurveda with modern scientific standards, using high-quality ingredients from natural and other trusted sources to create products that are safe, effective, and reliable for our customers.'
  },
  {
    q: 'Can I partner with Saranga Ayurveda and open an outlet in my city?',
    a: 'Yes. We welcome partnership opportunities from individuals, entrepreneurs, distributors, healthcare professionals, and businesses who share our vision of promoting Ayurveda and natural wellness.\n\nIf you are interested in establishing a Saranga Ayurveda outlet, distribution center, experience store, or other business partnership in your city, please contact us with details about your location, business background, and proposal. Our team will review your application and discuss available partnership models, eligibility requirements, investment considerations, and support options.\n\nPlease note that all partnership requests are subject to Saranga Ayurveda’s evaluation process, market feasibility assessments, and approval criteria.'
  }
];

export default function FAQsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>FREQUENTLY ASKED QUESTIONS</Text>
        <Text style={styles.subtitle}>Everything you need to know about Saranga Ayurveda</Text>
        
        {FAQS.map((faq, index) => (
          <FAQItem key={index} q={faq.q} a={faq.a} />
        ))}
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
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'CormorantGaramond-Bold',
    marginBottom: 20,
    color: '#2b3a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: -14,
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
