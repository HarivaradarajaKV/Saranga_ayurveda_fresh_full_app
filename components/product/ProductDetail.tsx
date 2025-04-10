import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImageViewer from 'react-native-image-zoom-viewer';
import { ProductSize } from './ProductSize';
import { Benefits } from './Benefits';
import { Ingredients } from './Ingredients';
import { HowToUse } from './HowToUse';
import { FrequentlyAskedQuestions } from './FrequentlyAskedQuestions';
import { CustomerReviews } from './CustomerReviews';
import { FrequentlyBoughtTogether } from './FrequentlyBoughtTogether';

interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice: number;
    discount: number;
    rating: number;
    reviews: {
      id: number;
      user_id: number;
      user_name: string;
      rating: number;
      comment: string;
      created_at: string;
      image_url?: string;
    }[];
    image: string;
    sizes: string[];
    benefits: string[];
    ingredients: string[];
    howToUse: { step: number; instruction: string }[];
    category: string;
    stock_quantity: number;
  };
  isAuthenticated: boolean;
  currentUserId?: number;
  onAddReview: (review: { rating: number; comment: string }) => Promise<void>;
  onEditReview: (reviewId: number, review: { rating: number; comment: string }) => Promise<void>;
  onDeleteReview: (reviewId: number) => Promise<void>;
  onLogin: () => void;
  addItem: (product: {
    id: number;
    name: string;
    price: number;
    category: string;
    image_url: string;
    stock_quantity: number;
    originalPrice: number;
    discount: number;
    sizes: string[];
    benefits: string[];
    ingredients: string[];
    howToUse: { step: number; instruction: string }[];
  }, selectedSize: string) => Promise<void>;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ 
  product, 
  isAuthenticated, 
  currentUserId,
  onAddReview,
  onEditReview,
  onDeleteReview,
  onLogin,
  addItem,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [pincode, setPincode] = useState('');
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [showSizeError, setShowSizeError] = useState(false);

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      onLogin(); // Prompt user to log in
      return;
    }

    // Check if size is selected
    if (!selectedSize) {
      setShowSizeError(true);
      Alert.alert('Select Size', 'Please select a size before adding to cart');
      return;
    }

    // Reset size error if size is selected
    setShowSizeError(false);

    // Check if the product is in stock before adding to cart
    if (product.stock_quantity > 0) {
      await addItem({
        id: parseInt(product.id),
        name: product.name,
        price: product.price,
        category: product.category,
        image_url: product.image,
        stock_quantity: product.stock_quantity,
        originalPrice: product.originalPrice,
        discount: product.discount,
        sizes: product.sizes,
        benefits: product.benefits,
        ingredients: product.ingredients,
        howToUse: product.howToUse,
      }, selectedSize);
    } else {
      Alert.alert('Out of Stock', 'This product is currently unavailable');
    }
  };

  const checkDelivery = () => {
    // Implement pincode check functionality
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with back button and favorite */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{product.name}</Text>
        <TouchableOpacity onPress={toggleFavorite}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorite ? "red" : "black"} 
          />
        </TouchableOpacity>
      </View>

      {/* Product Image */}
      <TouchableOpacity onPress={() => setIsImageViewerVisible(true)}>
        <Image source={{ uri: product.image }} style={styles.productImage} />
      </TouchableOpacity>

      {/* Image Viewer Modal */}
      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        onRequestClose={() => setIsImageViewerVisible(false)}
      >
        <ImageViewer
          imageUrls={[{ url: product.image }]}
          enableSwipeDown={true}
          onSwipeDown={() => setIsImageViewerVisible(false)}
          renderHeader={() => (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsImageViewerVisible(false)}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          )}
        />
      </Modal>

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{product.price}</Text>
          <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
          <Text style={styles.discount}>{product.discount}% OFF</Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>{product.rating}</Text>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.reviews}>({product.reviews.length} reviews)</Text>
        </View>

        {/* Size Selection */}
        <View>
          <ProductSize 
            sizes={product.sizes} 
            selectedSize={selectedSize || ''} 
            onSelectSize={(size) => {
              setSelectedSize(size);
              setShowSizeError(false);
            }} 
          />
          {showSizeError && (
            <Text style={styles.errorText}>Please select a size</Text>
          )}
        </View>

        {/* Check Delivery */}
        <View style={styles.deliveryCheck}>
          <Text style={styles.sectionTitle}>Check Delivery</Text>
          <View style={styles.pincodeContainer}>
            <TextInput
              style={styles.pincodeInput}
              placeholder="Enter Pincode"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.checkButton} onPress={checkDelivery}>
              <Text style={styles.checkButtonText}>Check</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.button, styles.addToCartButton]} onPress={handleAddToCart}>
            <Ionicons name="cart-outline" size={20} color="#007AFF" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>

        {/* Frequently Bought Together */}
        <FrequentlyBoughtTogether 
          currentProductId={parseInt(product.id)}
          category={product.category}
        />

        {/* Benefits */}
        <Benefits benefits={product.benefits} />

        {/* Ingredients */}
        <Ingredients ingredients={product.ingredients} />

        {/* How to Use */}
        <HowToUse steps={product.howToUse} />

        {/* FAQ */}
        <FrequentlyAskedQuestions />

        {/* Customer Reviews */}
        <CustomerReviews 
          rating={product.rating}
          reviews={product.reviews}
          productId={parseInt(product.id)}
          isAuthenticated={isAuthenticated}
          currentUserId={currentUserId}
          onAddReview={onAddReview}
          onEditReview={onEditReview}
          onDeleteReview={onDeleteReview}
          onLogin={onLogin}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  productImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 18,
    textDecorationLine: 'line-through',
    color: '#666',
    marginRight: 8,
  },
  discount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  reviews: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  deliveryCheck: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pincodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pincodeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  checkButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  checkButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addToCartButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
  },
  addToCartText: {
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000,
    padding: 10,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
}); 