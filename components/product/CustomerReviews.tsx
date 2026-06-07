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
import { LinearGradient } from 'expo-linear-gradient';

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
    console.log('CustomerReviews props loaded:', {
      rating,
      reviewsCount: reviews?.length,
      reviews,
      currentUserId,
      isAuthenticated
    });
  }, [rating, reviews, currentUserId, isAuthenticated]);

  const renderStars = (rating: number, onPress?: (index: number) => void) => {
    return [...Array(5)].map((_, index) => (
      <TouchableOpacity
        key={index}
        onPress={() => onPress?.(index + 1)}
        disabled={!onPress}
        style={styles.starTouch}
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
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) return 'yesterday';
      if (diffDays <= 7) return `${diffDays} days ago`;
      if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays <= 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch (e) {
      return '';
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) {
      Alert.alert('Error', 'Please write a review comment');
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
      Alert.alert('Error', 'Failed to submit review. Please try again.');
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
    setEditingReview(null);
    setReviewText('');
    setReviewRating(5);
    setIsModalVisible(true);
  };

  const reviewsList = reviews || [];

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Customer Reviews</Text>
        <TouchableOpacity 
          style={styles.writeReviewButton} 
          onPress={handleWriteReview}
          activeOpacity={0.8}
        >
          <Text style={styles.writeReviewText}>Write a Review</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.ratingContainer}>
        <Text style={styles.rating}>
          {rating > 0 ? rating.toFixed(1) : '0.0'}
        </Text>
        <View style={styles.starsContainer}>
          {renderStars(Math.round(rating || 0))}
          <Text style={styles.reviewCount}>({reviewsList.length} reviews)</Text>
        </View>
      </View>

      {reviewsList.length === 0 ? (
        <View style={styles.emptyReviews}>
          <Ionicons name="chatbubbles-outline" size={32} color="#694d21" style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>No reviews yet. Be the first to share your experience!</Text>
        </View>
      ) : (
        reviewsList.map((review) => {
          const isCurrentUserReview = Number(review.user_id) === Number(currentUserId);
          return (
            <View key={review.id || `${review.user_id}-${review.created_at}`} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                  <Text style={styles.reviewerName}>
                    {review.user_name || 'Anonymous'}
                  </Text>
                  <View style={styles.starsRow}>
                    {renderStars(review.rating)}
                  </View>
                </View>
                <View style={styles.reviewActions}>
                  <Text style={styles.reviewDate}>
                    {formatDate(review.created_at)}
                  </Text>
                  {isCurrentUserReview && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        onPress={() => handleEditReview(review)}
                        style={[styles.actionButton, styles.editButton]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil" size={14} color="#2b3a1a" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDeleteReview(review.id)}
                        style={[styles.actionButton, styles.deleteButton]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash" size={14} color="#c62828" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
              {review.image_url && (
                <Image 
                  source={{ uri: review.image_url }} 
                  style={styles.reviewImage}
                  resizeMode="cover"
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
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={20} color="#2b3a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingInput}>
              <Text style={styles.ratingLabel}>Select Rating:</Text>
              <View style={styles.modalStars}>
                {renderStars(reviewRating, setReviewRating)}
              </View>
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Tell us what you think of this product..."
              placeholderTextColor="#9ca3af"
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmitReview}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#2b3a1a', '#2b3a1a']}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>
                  {editingReview ? 'Update Review' : 'Submit Review'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CustomerReviews;

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
    backgroundColor: '#fbf7f4',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b3a1a',
  },
  writeReviewButton: {
    backgroundColor: '#2b3a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  writeReviewText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#efede4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  rating: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2b3a1a',
    marginRight: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouch: {
    paddingHorizontal: 1,
  },
  reviewCount: {
    fontSize: 13,
    color: '#694d21',
    fontWeight: '600',
    marginLeft: 6,
  },
  reviewItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#efede4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ebe8da',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2b3a1a',
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: '#694d21',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 10,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#ebe8da',
  },
  deleteButton: {
    backgroundColor: '#fcdede',
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '400',
  },
  reviewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fbf7f4',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#ebe8da',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2b3a1a',
  },
  modalCloseButton: {
    padding: 4,
    backgroundColor: '#efede4',
    borderRadius: 16,
  },
  ratingInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2b3a1a',
    marginRight: 12,
  },
  modalStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ebe8da',
    borderRadius: 16,
    padding: 16,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: '#fff',
    color: '#333',
    fontSize: 15,
  },
  submitButton: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyReviews: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#efede4',
    borderRadius: 16,
    borderStyle: 'solid',
    borderWidth: 1.5,
    borderColor: '#694d21',
  },
  emptyText: {
    fontSize: 14,
    color: '#694d21',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});