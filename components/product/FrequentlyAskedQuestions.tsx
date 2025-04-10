import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const faqs = [
  {
    question: 'Is this suitable for sensitive skin?',
    answer: 'Yes, this product has been dermatologically tested and is suitable for sensitive skin. However, we recommend doing a patch test before first use.',
  },
  {
    question: 'How long does one jar last?',
    answer: 'With regular daily use, one jar typically lasts 2-3 months depending on the size you choose.',
  },
  {
    question: 'Is this product non-comedogenic?',
    answer: 'Yes, this product is non-comedogenic and will not clog your pores.',
  },
];

export const FrequentlyAskedQuestions: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Frequently Asked Questions</Text>
      {faqs.map((faq, index) => (
        <TouchableOpacity
          key={index}
          style={styles.faqItem}
          onPress={() => toggleExpand(index)}
        >
          <View style={styles.questionContainer}>
            <Text style={styles.question}>{faq.question}</Text>
            <Ionicons
              name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#666"
            />
          </View>
          {expandedIndex === index && (
            <Text style={styles.answer}>{faq.answer}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  answer: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
}); 