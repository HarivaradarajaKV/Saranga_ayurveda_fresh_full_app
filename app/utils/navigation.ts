import { Router } from 'expo-router';

export interface ProductNavigationData {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_quantity: number;
  offer_percentage?: number;
  image_url2?: string;
  image_url3?: string;
  usage_instructions?: string;
  size?: string;
  benefits?: string;
  ingredients?: string;
  product_details?: string;
}

export const navigateToProduct = (router: Router, product: ProductNavigationData) => {
  try {
    // Ensure numeric values are properly formatted
    const cleanProduct = {
      ...product,
      id: typeof product.id === 'string' ? parseInt(product.id) : product.id,
      price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
      stock_quantity: typeof product.stock_quantity === 'string' ? 
        parseInt(product.stock_quantity) : product.stock_quantity,
      offer_percentage: product.offer_percentage || 0
    };

    // Ensure all values are serializable
    const serializableProduct = JSON.parse(JSON.stringify(cleanProduct));

    // Navigate to product detail page
    router.push({
      pathname: "/(product)/[id]",
      params: { 
        id: serializableProduct.id.toString(),
        productData: JSON.stringify(serializableProduct)
      }
    });
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback navigation with minimal data if there's an error
    router.push({
      pathname: "/(product)/[id]",
      params: { 
        id: product.id.toString()
      }
    });
  }
}; 