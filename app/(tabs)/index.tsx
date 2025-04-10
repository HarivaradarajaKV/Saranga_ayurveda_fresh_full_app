import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, Image, TouchableOpacity, Dimensions, StyleSheet, Platform, ActivityIndicator, Modal, Animated, TouchableWithoutFeedback, Linking, Easing, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Stack, useRouter } from 'expo-router';
import { useWishlist } from '../WishlistContext';
import ProductCard from '../components/ProductCard';
import Chatbot from '../components/Chatbot';
import { apiService } from '../services/api';
import ProductGrid from '../components/ProductGrid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCategories } from '../CategoryContext';
import BrandReviews from '../components/BrandReviews';
import Accordion from '../components/Accordion';
import { LinearGradient } from 'expo-linear-gradient';
import { Product } from '../types/product';

const screenWidth = Dimensions.get('window').width;

interface ProductCardProps {
  product: Product;
}

interface SectionHeaderProps {
  title: string;
}

interface ReviewCardProps {
  name: string;
  rating: number;
  comment: string;
  date: string;
  avatar: string;
}

// Add CategoryNavigationProps interface
interface CategoryNavigationProps {
  categories: Array<{
    id: number;
    name: string;
    icon: string;
  }>;
  selectedCategory: number;
  onSelectCategory: (category: number) => void;
}

interface SkincareTip {
  id: number;
  title: string;
  description: string;
  icon: string;
  backgroundColor: string;
}

// Static skincare tips
const skincareTips: SkincareTip[] = [
  {
    id: 1,
    title: "Double Cleansing Method",
    description: "Start with an oil-based cleanser to remove makeup and sunscreen, followed by a water-based cleanser for deep cleaning.",
    icon: "water",
    backgroundColor: "#FFE4E1"
  },
  {
    id: 2,
    title: "Proper Moisturizing",
    description: "Apply moisturizer to slightly damp skin to lock in hydration. Use gentle, upward strokes.",
    icon: "leaf",
    backgroundColor: "#E0FFFF"
  },
  {
    id: 3,
    title: "Sunscreen is Essential",
    description: "Apply broad-spectrum SPF 30+ daily, even on cloudy days. Reapply every 2-3 hours when outdoors.",
    icon: "sunny",
    backgroundColor: "#FFF0F5"
  },
  {
    id: 4,
    title: "Night Routine",
    description: "Use active ingredients like retinol and peptides at night when skin is in repair mode.",
    icon: "moon",
    backgroundColor: "#F0F8FF"
  }
];

const getCategoryIcon = (categoryName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    'All Products': 'grid',
    'Skincare': 'water',
    'Makeup': 'color-palette',
    'Haircare': 'cut',
    'Fragrances': 'flower',
    'Bath & Body': 'body',
    'Organic': 'leaf',
    'Tools': 'brush',
    'Sets': 'gift',
    'Face': 'happy',
    'Eyes': 'eye',
    'Lips': 'heart',
    'Nails': 'hand-left',
    'Sun Care': 'sunny',
    'Natural': 'leaf',
    'Korean': 'globe',
    'Luxury': 'diamond'
  };
  return iconMap[categoryName] || 'apps';
};

// Enhanced Section header component with animation
const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <TouchableWithoutFeedback 
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => router.push({
        pathname: '/all-products',
        params: { 
          type: title.toLowerCase().replace(/\s+/g, '-'),
          title: title 
        }
      })}
    >
      <Animated.View style={[
        styles.sectionHeader,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons name="arrow-forward" size={20} color="#000" />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

// Enhanced Review Card with animation
const ReviewCard: React.FC<ReviewCardProps> = ({ name, rating, comment, date, avatar }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.reviewCard,
      {
        opacity: fadeAnim,
        transform: [{ translateY }]
      }
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Image 
          source={{ uri: avatar }}
          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#000' }}>{name}</Text>
          <Text style={{ color: '#666', fontSize: 12 }}>{date}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {[...Array(5)].map((_, index) => (
            <Ionicons
              key={index}
              name={index < rating ? "star" : "star-outline"}
              size={16}
              color="#ffd700"
            />
          ))}
        </View>
      </View>
      <Text style={{ color: '#444', fontSize: 14, lineHeight: 20 }}>{comment}</Text>
    </Animated.View>
  );
};

// Enhanced Category Navigation with animations
const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  const scaleAnims = useRef(categories.map(() => new Animated.Value(1))).current;

  const onPressIn = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 8 }}
    >
      {categories.map((category, index) => (
        <TouchableWithoutFeedback
          key={category.id}
          onPressIn={() => onPressIn(index)}
          onPressOut={() => onPressOut(index)}
          onPress={() => onSelectCategory(category.id)}
        >
          <Animated.View style={[
            styles.categoryChip,
            selectedCategory === category.id && styles.selectedCategoryChip,
            { transform: [{ scale: scaleAnims[index] }] }
          ]}>
            <View style={[
              styles.categoryIcon,
              selectedCategory === category.id && styles.selectedCategoryIcon
            ]}>
              <Ionicons
                name={category.icon as any}
                size={24}
                color={selectedCategory === category.id ? '#fff' : '#666'}
              />
            </View>
            <Text style={[
              styles.categoryName,
              selectedCategory === category.id && styles.selectedCategoryName
            ]}>
              {category.name}
            </Text>
          </Animated.View>
        </TouchableWithoutFeedback>
      ))}
    </ScrollView>
  );
};

// Enhanced Contact Us section with animations
const ContactUs: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const socialButtonScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1)
  ]).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const onPressIn = (index: number) => {
    Animated.spring(socialButtonScales[index], {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = (index: number) => {
    Animated.spring(socialButtonScales[index], {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[
      styles.contactUsContainer,
      {
        opacity: fadeAnim,
        transform: [{ translateY }]
      }
    ]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
      </View>
      <View style={styles.socialLinksContainer}>
        {[
          { icon: 'logo-instagram', color: '#E1306C', url: 'https://instagram.com/curio_spry_official' },
          { icon: 'logo-youtube', color: '#FF0000', url: 'https://youtube.com/yourcompany' },
          { icon: 'logo-facebook', color: '#4267B2', url: 'https://facebook.com/yourcompany' }
        ].map((social, index) => (
          <TouchableWithoutFeedback
            key={social.icon}
            onPressIn={() => onPressIn(index)}
            onPressOut={() => onPressOut(index)}
            onPress={() => Linking.openURL(social.url)}
          >
            <Animated.View style={[
              styles.socialButton,
              { transform: [{ scale: socialButtonScales[index] }] }
            ]}>
              <Ionicons name={social.icon as any} size={24} color={social.color} />
              <Text style={styles.socialButtonText}>
                {social.icon.replace('logo-', '').charAt(0).toUpperCase() + social.icon.slice(6)}
              </Text>
            </Animated.View>
          </TouchableWithoutFeedback>
        ))}
      </View>
    </Animated.View>
  );
};

// Legal information component
const LegalInformation: React.FC = () => {
  const router = useRouter();
  
  return (
    <View style={styles.legalContainer}>
      <TouchableOpacity
        style={styles.legalLink}
        onPress={() => router.push('/legal/privacy-policy')}
      >
        <Text style={styles.legalText}>Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.legalLink}
        onPress={() => router.push('/legal/terms')}
      >
        <Text style={styles.legalText}>Terms of Service</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.legalLink}
        onPress={() => router.push('/legal/shipping')}
      >
        <Text style={styles.legalText}>Shipping Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.legalLink}
        onPress={() => router.push('/legal/refund')}
      >
        <Text style={styles.legalText}>Refund Policy</Text>
      </TouchableOpacity>
      <View style={styles.copyrightContainer}>
        <Text style={styles.copyrightText}>© 2024 Saranga Ayurveda</Text>
        <Text style={styles.copyrightText}>All Rights Reserved</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  fixedHeader: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF69B4',
    letterSpacing: 0.5,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF0F5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE4E1',
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#000',
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  categoryChip: {
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    minWidth: 100,
    marginBottom: 10,
  },
  selectedCategoryChip: {
    backgroundColor: '#e3f2fd',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedCategoryIcon: {
    backgroundColor: '#007bff',
  },
  categoryName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedCategoryName: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF69B4',
    fontWeight: '500',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  productGridItem: {
    width: '50%',
    padding: 8,
  },
  section: {
    marginTop: 15,
    paddingTop: 5,
  },
  productsRow: {
    paddingLeft: 16,
  },
  reviewsSection: {
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  loader: {
    marginTop: 20,
  },
  gridContainer: {
    padding: 8,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  recommendedSection: {
    marginTop: 10,
    paddingHorizontal: 15,
  },
  recommendedProductCard: {
    width: screenWidth * 0.4,
    marginRight: 15,
  },
  tipsContainer: {
    marginBottom: 15,
    paddingHorizontal: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
  },
  tipsScrollView: {
    marginBottom: 10,
  },
  tipCard: {
    width: screenWidth * 0.8,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    marginBottom: 15,
  },
  modalHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownContent: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  categorySection: {
    marginVertical: 4,
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  categoryChipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FF69B4',
    flex: 0.48,
    overflow: 'hidden',
  },
  activeChipButton: {
    backgroundColor: '#FF69B4',
  },
  chipButtonText: {
    fontSize: 14,
    color: '#FF69B4',
    fontWeight: '500',
  },
  activeChipText: {
    color: '#fff',
  },
  horizontalDropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScrollView: {
    paddingVertical: 8,
  },
  dropdownContentContainer: {
    paddingHorizontal: 8,
    gap: 8,
  },
  dropdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  dropdownChipText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    padding: 4,
    marginLeft: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  noDealsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDealsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  noDealsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  productCardContainer: {
    position: 'relative',
    marginRight: 12,
  },
  discountBadgeAbsolute: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    padding: 4,
    zIndex: 1,
  },
  discountTextLarge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 6,
  },
  contactUsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginTop: 16,
  },
  socialLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  socialButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  legalContainer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  legalLink: {
    paddingVertical: 8,
  },
  legalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  copyrightContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  reviewCard: {
    width: screenWidth - 64,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  toggleWrapper: {
    alignItems: 'center',
    flex: 0.48,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  toggleSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  tipGradient: {
    padding: 15,
  },
  chatbotContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    right: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  searchResultsContainer: {
    flex: 1,
    paddingTop: 16,
  },
  searchResultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  searchProductWrapper: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 16,
  },
});

const formatPrice = (price: number | undefined | null): string => {
  if (typeof price !== 'number') return '0.00';
  return Number(price).toFixed(2);
};

const Page = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const { mainCategories } = useCategories();
  const [dropdownWidth] = useState(new Animated.Value(0));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSarangaAyurveda, setIsSarangaAyurveda] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const tipCardAnims = useRef(skincareTips.map(() => new Animated.Value(0))).current;

  // Check authentication status first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };
    checkAuth();
  }, []);

  // Fetch products only when authenticated
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await apiService.get(apiService.ENDPOINTS.PRODUCTS);
        
        if (response.error) {
          console.error('API Error:', response.error);
          throw new Error(response.error);
        }

        // Handle the response data
        let productsData: Product[] = [];
        if (response.data?.products) {
          productsData = response.data.products;
        } else if (Array.isArray(response.data)) {
          productsData = response.data;
        }

        setAllProducts(productsData);
        setFilteredProducts(productsData);

        // Set recommended products (for now, we'll use the most recent products)
        const recommended = [...productsData]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        setRecommendedProducts(recommended);
      } catch (error) {
        console.error('Error fetching products:', error);
        setAllProducts([]);
        setFilteredProducts([]);
        setRecommendedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Add search filter effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
    setFilteredProducts(filtered);
  }, [searchQuery, allProducts]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProducts([]);
  };

  // Function to handle category selection
  const handleCategorySelect = (categoryId: number, categoryName: string) => {
    setSelectedCategory(categoryId);
    setShowCategoryModal(false);
    
    // Don't navigate if it's "All Products"
    if (categoryName === 'All Products') {
      setFilteredProducts(allProducts);
      return;
    }

    // Navigate to category page with the correct parameters
    router.push({
      pathname: '/category/[id]',
      params: { 
        id: categoryId,
        name: categoryName
      }
    });
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    Animated.spring(dropdownWidth, {
      toValue: isDropdownOpen ? 0 : 1,
      useNativeDriver: false,
      tension: 50,
      friction: 7
    }).start();
  };

  // Add animation effect when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(searchBarAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      ...tipCardAnims.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          delay: index * 100,
          useNativeDriver: true,
        })
      )
    ]).start();
  }, []);

  // Add effect to sync toggle state
  useEffect(() => {
    const syncToggleState = async () => {
      try {
        const toggleState = await AsyncStorage.getItem('sarangaAyurvedaToggle');
        setIsSarangaAyurveda(toggleState === 'true');
      } catch (error) {
        console.error('Error reading toggle state:', error);
      }
    };
    syncToggleState();

    // Set up interval to check for toggle state changes
    const interval = setInterval(syncToggleState, 500);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleToggle = async () => {
    const newState = !isSarangaAyurveda;
    setIsSarangaAyurveda(newState);
    try {
      await AsyncStorage.setItem('sarangaAyurvedaToggle', String(newState));
      if (newState) {
        router.push('/saranga-ayurveda');
      }
    } catch (error) {
      console.error('Error saving toggle state:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.fixedHeader,
        {
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-20, 0]
          })}]
        }
      ]}>
        <View style={styles.header}>
          <Text style={styles.title}>Saranga Ayurveda</Text>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/profile/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={24} color="#FF69B4" />
          </TouchableOpacity>
        </View>

        <Animated.View style={[
          styles.searchContainer,
          {
            transform: [
              { scale: searchBarAnim },
              { translateX: searchBarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0]
              })}
            ]
          }
        ]}>
          <Ionicons name="search" size={20} color="#FF69B4" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#FF69B4" />
            </TouchableOpacity>
          ) : null}
        </Animated.View>

        <View style={styles.categorySection}>
          <View style={styles.categoryButtons}>
            <TouchableOpacity 
              style={[
                styles.categoryChipButton,
                isDropdownOpen && styles.activeChipButton,
                { elevation: 3 }
              ]}
              onPress={toggleDropdown}
            >
              <LinearGradient
                colors={isDropdownOpen ? ['#FF69B4', '#FF1493'] : ['#fff', '#fff']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={[
                styles.chipButtonText,
                isDropdownOpen && styles.activeChipText
              ]}>
                All Categories
              </Text>
              <Ionicons 
                name={isDropdownOpen ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={isDropdownOpen ? "#fff" : "#FF69B4"}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            <View style={styles.toggleWrapper}>
              <Text style={styles.toggleLabel}>Saranga Ayurveda</Text>
              <Switch
                value={isSarangaAyurveda}
                onValueChange={handleToggle}
                trackColor={{ false: '#ffb6c1', true: '#FF69B4' }}
                thumbColor={isSarangaAyurveda ? '#fff' : '#f4f3f4'}
                ios_backgroundColor="#ffb6c1"
                style={styles.toggleSwitch}
              />
            </View>
          </View>

          <Animated.View style={[
            styles.horizontalDropdown,
            {
              maxHeight: dropdownWidth.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 200]
              }),
              opacity: dropdownWidth,
              overflow: 'hidden',
              marginTop: dropdownWidth.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 8]
              })
            }
          ]}>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dropdownScrollView}
              contentContainerStyle={styles.dropdownContentContainer}
            >
              {mainCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.dropdownChip, { elevation: 2 }]}
                  onPress={() => handleCategorySelect(category.id, category.name)}
                >
                  <LinearGradient
                    colors={['#FFF0F5', '#FFE4E1']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Ionicons 
                    name={getCategoryIcon(category.name)} 
                    size={20} 
                    color="#FF69B4"
                  />
                  <Text style={styles.dropdownChipText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'ios' ? 120 : 100,
          paddingTop: Platform.OS === 'ios' ? 90 : 70
        }}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF69B4" />
            <Text style={styles.loadingText}>Loading amazing products...</Text>
          </View>
        ) : searchQuery ? (
          <View style={styles.searchResultsContainer}>
            <Text style={[styles.sectionTitle, { marginLeft: 16 }]}>Search Results</Text>
            {filteredProducts.length > 0 ? (
              <View style={styles.searchResultsGrid}>
                {filteredProducts.map((product) => (
                  <View key={product.id} style={styles.searchProductWrapper}>
                    <ProductCard product={product} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="#FF69B4" />
                <Text style={styles.noResultsText}>No products found</Text>
                <Text style={[styles.noResultsText, { fontSize: 14, marginTop: 8, color: '#999' }]}>
                  Try different search terms
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={styles.tipsContainer}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb" size={24} color="#FF69B4" />
                <Text style={styles.tipsTitle}>Daily Skincare Tips</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tipsScrollView}
              >
                {skincareTips.map((tip, index) => (
                  <Animated.View 
                    key={tip.id} 
                    style={[
                      styles.tipCard,
                      {
                        opacity: tipCardAnims[index],
                        transform: [
                          { scale: tipCardAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1]
                          })}
                        ]
                      }
                    ]}
                  >
                    <LinearGradient
                      colors={[tip.backgroundColor, '#fff']}
                      style={styles.tipGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={[styles.tipIcon, { backgroundColor: tip.backgroundColor }]}>
                        <Ionicons name={tip.icon as any} size={24} color="#FF69B4" />
                      </View>
                      <Text style={styles.tipTitle}>{tip.title}</Text>
                      <Text style={styles.tipDescription}>{tip.description}</Text>
                    </LinearGradient>
                  </Animated.View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <SectionHeader title="All Products" />
              {loading ? (
                <ActivityIndicator size="large" color="#FF69B4" style={{ marginVertical: 20 }} />
              ) : allProducts.filter(product => product.offer_percentage > 0).length === 0 ? (
                <View style={styles.noDealsContainer}>
                  <Text style={styles.noDealsText}>No active deals at the moment</Text>
                  <Text style={styles.noDealsSubtext}>Check back later for exciting offers!</Text>
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.productsRow}
                  contentContainerStyle={{ paddingRight: 16 }}
                >
                  {allProducts
                    .filter(product => product.offer_percentage > 0)
                    .sort((a, b) => b.offer_percentage - a.offer_percentage)
                    .slice(0, 10)
                    .map((product) => (
                      <View key={product.id} style={[styles.productCardContainer, { width: screenWidth * 0.4 }]}>
                        <View style={styles.discountBadgeAbsolute}>
                          <Text style={styles.discountTextLarge}>-{Math.round(product.offer_percentage)}%</Text>
                        </View>
                        <ProductCard product={product} />
                      </View>
                    ))}
                </ScrollView>
              )}
            </View>

            <View>
              <SectionHeader title="Recommended for you" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendedSection}>
                    {recommendedProducts.map((product) => (
                  <View key={product.id} style={styles.recommendedProductCard}>
                        <ProductCard product={product} />
                      </View>
                    ))}
                  </ScrollView>
                </View>

            <View style={styles.section}>
              <BrandReviews />
            </View>
            <ContactUs />
            <LegalInformation />
          </>
        )}
      </ScrollView>

      <View style={styles.chatbotContainer}>
        <Chatbot />
      </View>
    </View>
  );
};

export default Page;
