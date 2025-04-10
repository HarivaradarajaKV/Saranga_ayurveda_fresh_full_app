import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface IngredientsProps {
  ingredients: string[];
}

export const Ingredients: React.FC<IngredientsProps> = ({ ingredients }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ingredients</Text>
      <View style={styles.ingredientsContainer}>
        {ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientItem}>
            <Text style={styles.ingredientText}>{ingredient}</Text>
          </View>
        ))}
      </View>
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
  ingredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientItem: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ingredientText: {
    fontSize: 14,
    color: '#333',
  },
}); 