import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProductDescriptionProps {
  description: string;
}

export const ProductDescription: React.FC<ProductDescriptionProps> = ({
  description,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Description</Text>
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionText}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#212529',
  },
  descriptionContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#495057',
  },
}); 