export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  category: string;
  image: string;
  description?: string;
}

export const products: Product[] = [
  {
    id: 1,
    name: "Rose Glow Facial Cream",
    price: 3499,
    originalPrice: 3999,
    rating: 4.7,
    reviewCount: 256,
    category: "Skincare",
    image: "https://picsum.photos/200?random=1",
    description: "A luxurious facial cream enriched with rose extracts for glowing skin."
  },
  {
    id: 2,
    name: "Vitamin C Serum",
    price: 2999,
    originalPrice: 3499,
    rating: 4.8,
    reviewCount: 189,
    category: "Skincare",
    image: "https://picsum.photos/200?random=2",
    description: "Powerful antioxidant serum for bright and even-toned skin."
  },
  {
    id: 3,
    name: "Matte Lipstick",
    price: 1499,
    originalPrice: 1999,
    rating: 4.6,
    reviewCount: 145,
    category: "Makeup",
    image: "https://picsum.photos/200?random=3",
    description: "Long-lasting matte lipstick in stunning shades."
  },
  {
    id: 4,
    name: "Hair Growth Oil",
    price: 1299,
    originalPrice: 1599,
    rating: 4.5,
    reviewCount: 167,
    category: "Haircare",
    image: "https://picsum.photos/200?random=4",
    description: "Natural oil blend for healthy hair growth."
  },
  {
    id: 5,
    name: "Rose Perfume",
    price: 4499,
    originalPrice: 4999,
    rating: 4.9,
    reviewCount: 234,
    category: "Fragrances",
    image: "https://picsum.photos/200?random=5",
    description: "Elegant rose fragrance for a lasting impression."
  },
  {
    id: 6,
    name: "Organic Face Wash",
    price: 899,
    originalPrice: 1199,
    rating: 4.7,
    reviewCount: 178,
    category: "Organic",
    image: "https://picsum.photos/200?random=6",
    description: "Gentle organic face wash for all skin types."
  }
]; 