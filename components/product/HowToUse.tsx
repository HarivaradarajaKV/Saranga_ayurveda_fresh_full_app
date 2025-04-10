import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HowToUseProps {
  steps: {
    step: number;
    instruction: string;
  }[];
}

export const HowToUse: React.FC<HowToUseProps> = ({ steps }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How to Use</Text>
      {steps.map((step) => (
        <View key={step.step} style={styles.stepContainer}>
          <View style={styles.stepNumberContainer}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step {step.step}</Text>
            <Text style={styles.stepInstruction}>{step.instruction}</Text>
          </View>
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
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumberContainer: {
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepInstruction: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
}); 