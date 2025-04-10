import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  TextInput, 
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
  image_url?: string;
  user_id: number;
}

interface CustomerReviewsProps {
  rating: number;
  reviews: Review[];
  productId: number;
  currentUserId?: number;
  isAuthenticated: boolean;
  onAddReview: (review: { rating: number; comment: string }) => Promise<void>;
  onEditReview: (reviewId: number, review: { rating: number; comment: string }) => Promise<void>;
  onDeleteReview: (reviewId: number) => Promise<void>;
  onLogin: () => void;
}

export const CustomerReviews: React.FC<CustomerReviewsProps> = ({
  rating,
  reviews,
  productId,
  currentUserId,
  isAuthenticated,
  onAddReview,
  onEditReview,
  onDeleteReview,
  onLogin,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('CustomerReviews props:', {
      rating,
      reviewsCount: reviews?.length,
      reviews,
      currentUserId,
      isAuthenticated
    });

    if (reviews?.length > 0) {
      reviews.forEach(review => {
        console.log('Review user comparison:', {
          reviewId: review.id,
          reviewUserId: Number(review.user_id),
          currentUserId: Number(currentUserId),
          isMatch: Number(review.user_id) === Number(currentUserId)
        });
      });
    }
  }, [rating, reviews, currentUserId, isAuthenticated]);

  const renderStars = (rating: number, onPress?: (index: number) => void) => {
    return [...Array(5)].map((_, index) => (
      <TouchableOpacity
        key={index}
        onPress={() => onPress?.(index + 1)}
        disabled={!onPress}
      >
        <Ionicons
          name={index < rating ? 'star' : 'star-outline'}
          size={16}
          color="#FFD700"
        />
      </TouchableOpacity>
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) {
      Alert.alert('Error', 'Please write a review');
      return;
    }

    try {
      if (editingReview) {
        await onEditReview(editingReview.id, {
          rating: reviewRating,
          comment: reviewText.trim()
        });
      } else {
        await onAddReview({
          rating: reviewRating,
          comment: reviewText.trim()
        });
      }
      setIsModalVisible(false);
      setReviewText('');
      setReviewRating(5);
      setEditingReview(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const handleEditReview = (review: Review) => {
    if (!isAuthenticated) {
      onLogin();
      return;
    }
    setEditingReview(review);
    setReviewText(review.comment);
    setReviewRating(review.rating);
    setIsModalVisible(true);
  };

  const handleDeleteReview = (reviewId: number) => {
    if (!isAuthenticated) {
      onLogin();
      return;
    }
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            onDeleteReview(reviewId);
          }
        }
      ]
    );
  };

  const handleWriteReview = () => {
    if (!isAuthenticated) {
      onLogin();
      return;
    }
    setIsModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Customer Reviews</Text>
        <TouchableOpacity 
          style={styles.writeReviewButton} 
          onPress={handleWriteReview}
        >
          <Text style={styles.writeReviewText}>Write a Review</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.ratingContainer}>
        <Text style={styles.rating}>
          {rating > 0 ? rating.toFixed(1) : 'No ratings'}
        </Text>
        {rating > 0 && (
          <View style={styles.starsContainer}>
            {renderStars(Math.floor(rating))}
            <Text style={styles.reviewCount}>({reviews?.length || 0} reviews)</Text>
          </View>
        )}
      </View>

      {!reviews || reviews.length === 0 ? (
        <View style={styles.emptyReviews}>
          <Text style={styles.emptyText}>No reviews yet. Be the first to review!</Text>
        </View>
      ) : (
        reviews.map((review) => {
          return (
            <View key={review.id || `${review.user_id}-${review.created_at}`} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>
                  {review.user_name || 'Anonymous'}
                </Text>
                <View style={styles.reviewActions}>
                  <Text style={styles.reviewDate}>
                    {formatDate(review.created_at)}
                  </Text>
                  {Number(review.user_id) === Number(currentUserId) && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        onPress={() => handleEditReview(review)}
                        style={styles.actionButton}
                      >
                        <Ionicons name="pencil" size={16} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDeleteReview(review.id)}
                        style={styles.actionButton}
                      >
                        <Ionicons name="trash" size={16} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.starsContainer}>
                {renderStars(review.rating)}
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
              {review.image_url && (
                <Image 
                  source={{ uri: review.image_url }} 
                  style={styles.reviewImage}
                  onError={(e) => console.log('Error loading review image:', e.nativeEvent.error)}
                />
              )}
            </View>
          );
        })
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReview ? 'Edit Review' : 'Write a Review'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingInput}>
              <Text style={styles.ratingLabel}>Rating:</Text>
              <View style={styles.starsContainer}>
                {renderStars(reviewRating, setReviewRating)}
              </View>
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Write your review here..."
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmitReview}
            >
              <Text style={styles.submitButtonText}>
                {editingReview ? 'Update Review' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  writeReviewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  writeReviewText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rating: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
  },
  reviewItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    lineHeight: 20,
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  ratingInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyReviews: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
}); 