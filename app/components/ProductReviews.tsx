import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review, ProductReview } from '../types/reviews';

interface ProductReviewsProps {
  productId: number;
  reviews: ProductReview[];
  averageRating: number;
  reviewCount: number;
  onReviewAdded: () => void;
  isAuthenticated: boolean;
  currentUserId?: number;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  reviews = [],
  averageRating = 0,
  reviewCount = 0,
  onReviewAdded,
  isAuthenticated,
  currentUserId,
}) => {
  const calculateAverageRating = (reviews: Review[]): number => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return Number((sum / reviews.length).toFixed(1));
  };

  const formatRating = (rating: number | undefined | null): string => {
    if (typeof rating !== 'number' || isNaN(rating)) {
      const calculatedRating = calculateAverageRating(reviews || []);
      return calculatedRating.toFixed(1);
    }
    return rating.toFixed(1);
  };

  const renderStars = (rating: number) => (
    <View style={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <View key={star}>
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color="#ffd700"
            style={{ marginHorizontal: 2 }}
          />
        </View>
      ))}
    </View>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customer Reviews</Text>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.averageRating}>
          {averageRating ? formatRating(averageRating) : formatRating(calculateAverageRating(reviews || []))}
        </Text>
        {renderStars(averageRating || calculateAverageRating(reviews || []))}
        <Text style={styles.reviewCount}>Based on {reviewCount || (reviews ? reviews.length : 0)} reviews</Text>
      </View>

      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.reviewsList}
        contentContainerStyle={styles.reviewsContentContainer}
      >
        {(reviews || []).map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Image
                source={{ uri: review.avatar_url || 'https://via.placeholder.com/40' }}
                style={styles.avatar}
              />
              <View style={styles.reviewHeaderText}>
                <Text style={styles.userName}>{review.user_name}</Text>
                <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
              </View>
            </View>
            {renderStars(review.rating)}
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  summaryContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  averageRating: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewCount: {
    color: '#666',
    fontSize: 14,
  },
  reviewsList: {
    paddingHorizontal: 16,
  },
  reviewsContentContainer: {
    paddingRight: 32,
    gap: 16,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: 300,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewHeaderText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default ProductReviews;