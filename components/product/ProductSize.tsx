import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ProductSizeProps {
  sizes: string[];
  selectedSize: string;
  onSelectSize: (size: string) => void;
}

export const ProductSize: React.FC<ProductSizeProps> = ({
  sizes,
  selectedSize,
  onSelectSize,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Size</Text>
        <Text style={styles.required}>*</Text>
      </View>
      <Text style={styles.subtitle}>Please select your size</Text>
      <View style={styles.sizeContainer}>
        {sizes.map((size) => (
          <TouchableOpacity
            key={size}
            style={[
              styles.sizeButton,
              selectedSize === size && styles.selectedSize,
              !selectedSize && styles.unselectedSize,
            ]}
            onPress={() => onSelectSize(size)}
          >
            <Text
              style={[
                styles.sizeText,
                selectedSize === size && styles.selectedSizeText,
              ]}
            >
              {size}
            </Text>
          </TouchableOpacity>
        ))}
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  required: {
    color: '#dc3545',
    fontSize: 18,
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
  },
  sizeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sizeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    minWidth: 80,
    alignItems: 'center',
  },
  unselectedSize: {
    borderColor: '#dee2e6',
    backgroundColor: '#fff',
  },
  selectedSize: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  sizeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  selectedSizeText: {
    color: '#fff',
  },
}); 