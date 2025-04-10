import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrandReview } from '../types/reviews';

const screenWidth = Dimensions.get('window').width;

interface BrandReviewsProps {
  onReviewAdded?: () => void;
}

const BrandReviews: React.FC<BrandReviewsProps> = ({ onReviewAdded }) => {
  const [reviews, setReviews] = useState<BrandReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingReview, setEditingReview] = useState<BrandReview | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
    fetchReviews();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      setIsAuthenticated(!!token);
      if (token) {
        // Fetch user profile to get current user ID
        const userResponse = await apiService.get('/users/profile');
        if (userResponse.data && userResponse.data.id) {
          setCurrentUserId(userResponse.data.id);
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await apiService.get('/brand-reviews');
      if (response.data) {
        setReviews(response.data.reviews);
        setAverageRating(response.data.average_rating);
        setReviewCount(response.data.review_count);
      }
    } catch (error) {
      console.error('Error fetching brand reviews:', error);
    }
  };

  const isUserReview = (review: BrandReview) => {
    return currentUserId && review.user_id === currentUserId;
  };

  const handleEditReview = async (review: BrandReview) => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please log in to edit your review.');
      return;
    }

    setEditingReview(review);
    setRating(review.rating);
    setComment(review.comment);
    setModalVisible(true);
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please log in to delete your review.');
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
          onPress: async () => {
            try {
              await apiService.delete(`/brand-reviews/${reviewId}`);
              fetchReviews();
              Alert.alert('Success', 'Review deleted successfully');
            } catch (error: any) {
              console.error('Error deleting review:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete review');
            }
          },
        },
      ]
    );
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please log in to submit a review.');
      return;
    }

    try {
      if (editingReview) {
        // Update existing review
        await apiService.put(`/brand-reviews/${editingReview.id}`, {
          rating,
          comment,
        });
      } else {
        // Create new review
        await apiService.post('/brand-reviews', {
          rating,
          comment,
        });
      }

      setModalVisible(false);
      setRating(5);
      setComment('');
      setEditingReview(null);
      fetchReviews();
      if (onReviewAdded) {
        onReviewAdded();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit review');
    }
  };

  const renderStars = (rating: number, interactive = false) => (
    <View style={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => interactive && setRating(star)}
          disabled={!interactive}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={interactive ? 32 : 16}
            color="#ffd700"
            style={{ marginHorizontal: interactive ? 4 : 2 }}
          />
        </TouchableOpacity>
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
        <Text style={styles.title}>Brand Reviews</Text>
        <TouchableOpacity
          style={styles.writeReviewButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.writeReviewText}>Write a Review</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.averageRating}>{Number(averageRating || 0).toFixed(1)}</Text>
        {renderStars(Number(averageRating || 0))}
        <Text style={styles.reviewCount}>Based on {reviewCount} reviews</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.reviewsScrollView}
      >
        {reviews.map((review) => (
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
              {isUserReview(review) && (
                <View style={styles.reviewActions}>
                  <TouchableOpacity
                    onPress={() => handleEditReview(review)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="pencil" size={18} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteReview(review.id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {renderStars(review.rating)}
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        ))}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setEditingReview(null);
          setRating(5);
          setComment('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReview ? 'Edit Review' : 'Write a Review'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setModalVisible(false);
                  setEditingReview(null);
                  setRating(5);
                  setComment('');
                }}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              {renderStars(rating, true)}
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>Your Review</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
                placeholder="Share your experience with our brand..."
                placeholderTextColor="#999"
              />
            </View>

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
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF69B4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  writeReviewText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  summaryContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  reviewCount: {
    color: '#666',
    marginTop: 4,
  },
  reviewsScrollView: {
    marginLeft: -16,
  },
  reviewCard: {
    width: screenWidth - 80,
    marginLeft: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#444',
    marginTop: 8,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  commentSection: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    color: '#000',
  },
  submitButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default BrandReviews; 