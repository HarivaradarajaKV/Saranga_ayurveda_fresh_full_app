import React from 'react';
import { View, StyleSheet } from 'react-native';
import ProductCard from './ProductCard';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  image_url2?: string;
  image_url3?: string;
  usage_instructions?: string;
  size?: string;
  benefits?: string;
  ingredients?: string;
  product_details?: string;
  stock_quantity: number;
  created_at: string;
  offer_percentage: number;
}

interface ProductGridProps {
  products: Product[];
  numColumns?: number;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, numColumns = 2 }) => {
  return (
    <View style={styles.grid}>
      {products.map((product) => (
        <View 
          key={product.id} 
          style={[
            styles.gridItem
          ]}
        >
          <ProductCard product={product} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    padding: 8,
  }
});

export default ProductGrid; 