export interface Review {
  id: number;
  user_name: string;
  user_id: number;
  rating: number;
  comment: string;
  created_at: string;
  avatar_url?: string;
}

export interface ProductReview extends Review {
  product_id: number;
}

export interface BrandReview extends Review {
  // Add any brand-specific fields here if needed
} 