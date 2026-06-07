export interface Product {
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
  final_price: number;
  average_rating?: number;
  review_count?: number;
  is_new_arrival?: boolean;
}

export interface ProductWithQuantity extends Product {
  quantity: number;
} 