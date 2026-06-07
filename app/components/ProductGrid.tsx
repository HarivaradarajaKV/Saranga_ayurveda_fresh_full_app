import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import ProductCard from './ProductCard';
import { imagePreloader } from '../utils/imagePreloader';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  category_name?: string;
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

const ProductGrid: React.FC<ProductGridProps> = ({ products, numColumns }) => {
  const { width } = useWindowDimensions();
  
  // Calculate dynamic columns based on screen width
  const cols = numColumns || (width > 768 ? 4 : width > 480 ? 3 : 2);
  const itemWidth = `${100 / cols}%`;

  // Prefetch all product images as soon as the grid receives its data
  useEffect(() => {
    if (products && products.length > 0) {
      imagePreloader.preloadProductImages(products);
    }
  }, [products]);

  return (
    <View style={styles.grid}>
      {products.map((product) => (
        <View
          key={product.id}
          style={[styles.gridItem, { width: itemWidth as any }]}
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
    padding: 8,
  }
});

export default ProductGrid;