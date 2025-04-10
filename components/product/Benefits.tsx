import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BenefitsProps {
  benefits: string[];
}

export const Benefits: React.FC<BenefitsProps> = ({ benefits }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Benefits</Text>
      {benefits.map((benefit, index) => (
        <View key={index} style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={styles.benefitText}>{benefit}</Text>
        </View>
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
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
}); 