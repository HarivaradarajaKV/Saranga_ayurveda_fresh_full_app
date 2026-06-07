import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HowToUseProps {
  steps: {
    step: number;
    instruction: string;
  }[];
}

export const HowToUse: React.FC<HowToUseProps> = ({ steps }) => {
  const paragraphText = steps
    .map((s) => s.instruction.replace(/^\s*(?:step\s*\d+\s*[:.-]?\s*|\d+\s*[:.-]\s*)/i, '').trim())
    .filter(Boolean)
    .join(' ');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How to Use</Text>
      <Text style={styles.paragraph}>{paragraphText}</Text>
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
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});