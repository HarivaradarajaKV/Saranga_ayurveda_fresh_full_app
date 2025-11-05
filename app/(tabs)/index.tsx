import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, Image, TouchableOpacity, TouchableHighlight, Dimensions, StyleSheet, Platform, ActivityIndicator, Modal, Animated, TouchableWithoutFeedback, Linking, Easing, Switch, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Stack, useRouter } from 'expo-router';
import { useWishlist } from '../WishlistContext';
import ProductCard from '../components/ProductCard';
// import { Image, TouchableOpacity, Scroll?View, View, Text } from 'react';
import Chatbot from '../components/Chatbot';
import { apiService } from '../services/api';
import ProductGrid from '../components/ProductGrid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCategories } from '../CategoryContext';
import BrandReviews from '../components/BrandReviews';
import Accordion from '../components/Accordion';
import { LinearGradient } from 'expo-linear-gradient';
import { Product } from '../types/product';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { getCategoryImage } from '../constants/categoryImages';
import { useBottomTabBarHeight } from './_layout';

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
    image?: string;
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

// Enhanced Section header component with animation
const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
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
  // Add safety check for categories
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return (
      <View style={styles.categoryScrollContainer}>
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  const categoryAnims = useRef(categories.map(() => new Animated.Value(0))).current;
  const scaleAnims = useRef(categories.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Staggered entrance animation for categories
    Animated.stagger(100, 
      categoryAnims.map(anim => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const handleCategoryPress = (categoryId: number, index: number) => {
    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const categoryIdStr = categoryId.toString();
    router.push({
      pathname: '/category/[id]' as const,
      params: {
        id: categoryIdStr,
        name: categories.find(c => c.id === categoryId)?.name
      }
    });
  };

  return (
    <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContainer}
      >
        {categories.map((category, index) => {
          const imageUrl = getCategoryImage(normalizeCategoryName(category.name), 'tile');
          const isSelected = selectedCategory === category.id;
          
          return (
            <Animated.View
              key={category.id}
              style={[
                {
                  opacity: categoryAnims[index],
                  transform: [
                    { scale: scaleAnims[index] },
                    { translateY: categoryAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0]
                    })}
                  ]
                }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.categoryCircle,
                  isSelected && styles.selectedCategoryCircle
                ]}
                onPress={() => handleCategoryPress(category.id, index)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.categoryIconContainer,
                  isSelected && styles.selectedCategoryCircle
                ]}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.categoryImage}
                    resizeMode="cover"
                  />
                  {isSelected && (
                    <View style={styles.selectedOverlay} />
                  )}
                </View>
                <Text style={[
                  styles.categoryText,
                  isSelected && styles.selectedCategoryText
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
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
    backgroundColor: '#ffffff',
  },
  fixedHeader: {
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 16,
    marginTop: 8,
    backgroundColor: '#ffffff',
  },
  titleContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#694d21',
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: 'center',
    paddingTop: 8,
    width: '100%',
    overflow: 'hidden',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: -2,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  notificationButton: {
    padding: 19,
    marginLeft: 100,
    backgroundColor: 'transparent',
    width: 45,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 0,
    marginBottom: 4,
    height: 42,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  menuIcon: {
    padding: 8,
    marginRight: 0,
    backgroundColor: 'transparent',
  },
  menuIconLoading: {
    opacity: 0.7,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawerContainer: {
    width: 300,
    height: '100%',
    backgroundColor: '#694d21',
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1.5,
    elevation: 2,
    flex: 1,
    width: 340,
    maxWidth: '75%',
    height: 34,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 9,
    color: '#333333',
  },
  searchInput: {
    flex: 1,
    color: '#333333',
    fontSize: 14,
    paddingVertical: 4,
    height: 34,
    textAlign: 'center',
    paddingLeft: 0,
    paddingRight: 0,
  },
  clearButton: {
    padding: 4,
  },
  categoryChip: {
    alignItems: 'center',
    marginRight: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 1,
    padding: 1,
    minWidth: 20,
    marginBottom: 0,
  },
  selectedCategoryChip: {
    backgroundColor: '#f2f0f2',
  },
  categoryIcon: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  selectedCategoryIcon: {
    backgroundColor: '#f2f5f7',
  },
  categoryName: {
    fontSize: 6,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedCategoryName: {
    color: '#694d21',
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
    color: '#694d21',
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
    paddingTop: 8,
    marginBottom: 16,
  },
  productsRow: {
    paddingLeft: 16,
    paddingRight: 16,
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
    marginTop: 1,
    marginBottom: 16,
  },
  recommendedProductCard: {
    width: screenWidth * 0.8,
    height: 200,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tipsContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  tipsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#694d21',
    marginLeft: 12,
  },
  tipsScrollView: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  tipCard: {
    width: screenWidth * 0.85,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    marginVertical: 10,
  },
  tipGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    padding: 20,
  },
  tipIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  tipDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
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
    fontSize: 10,
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
    backgroundColor: '#333',
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
    marginLeft: 5,
  },
  categorySection: {
    marginTop: 0,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#694d21',
    marginLeft: 8,
  },
  categoryArrow: {
    marginLeft: 4,
  },
  categoryScrollContainer: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    width: 80,
  },
  categoryIconContainer: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32.5,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(105, 77, 33, 0.3)',
    borderRadius: 32.5,
  },
  selectedCategoryCircle: {
    borderColor: '#694d21',
    borderWidth: 2,
  },
  categoryText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    maxWidth: 70,
    fontWeight: '400',
  },
  selectedCategoryText: {
    color: '#694d21',
    fontWeight: '500',
  },
  floatingNatureButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    backgroundColor: '#20541e',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 999,
  },
  floatingNatureButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    flexWrap: 'wrap',
    width: '100%',
    textTransform: 'uppercase',
    lineHeight: 12,
    paddingHorizontal: 5,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#694d21',
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
  menuContainer: {
    flex: 1,
    backgroundColor: '#694d21',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#f5f5f5',
    letterSpacing: 0.5,
  },
  menuContent: {
    flex: 1,
    paddingTop: 20,
  },
  menuScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  menuSpacer: {
    height: 20,
  },
  menuUserSection: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  menuUserIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B6B43',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuUserText: {
    fontSize: 18,
    color: '#f5f5f5',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginBottom: 5,
    backgroundColor: 'transparent',
    borderRadius: 8,
    marginHorizontal: 10,
  },
  menuItemText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#f5f5f5',
    fontWeight: '500',
  },
  logoutItem: {
    marginTop: 10,
    backgroundColor: '#8B6B43',
    borderRadius: 8,
    marginHorizontal: 10,
  },
  menuFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  menuFooterText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  videoCarousel: {
    width: '100%',
    height: 180,
    marginTop: 0,
  },
  videoContainer: {
    width: screenWidth,
    height: 180,
    backgroundColor: '#F8F8FF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  offersHeader: {
    height: 24,
    backgroundColor: '#bd9859',
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  offersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  offersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  offersTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    lineHeight: 16,
    flexShrink: 1,
  },
  viewAllText: {
    fontSize: 14,
    color: '#694d21',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  newDealsPopup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  newDealsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#694d21',
    marginBottom: 10,
    textAlign: 'center',
  },
  newDealsText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  newDealsButton: {
    backgroundColor: '#694d21',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
  },
  newDealsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  comboSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  comboCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  comboHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  comboTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#694d21',
    marginLeft: 8,
  },
  comboDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  comboProductsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  comboProductImage: {
    width: '48%',
    height: 120,
    borderRadius: 10,
  },
  comboPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  comboPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#694d21',
  },
  comboSaveText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  viewComboButton: {
    backgroundColor: '#694d21',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 12,
  },
  viewComboButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  productCardContainer: {
    width: screenWidth * 0.45,
    marginRight: 16,
    marginVertical: 8,
  },
  beautyConceptsSection: {
    marginTop: 24,
    paddingTop: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
  },
  beautyConceptHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  beautyConceptMainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#694d21',
    textAlign: 'center',
    marginBottom: 8,
  },
  beautyConceptDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  beautyConceptsContainer: {
    alignItems: 'center',
  },
  beautyConceptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  beautyConceptBottomRow: {
    alignItems: 'center',
    marginTop: 10,
  },
  beautyConceptCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  beautyConceptImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#694d21',
  },
  beautyConceptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#694d21',
    marginBottom: 4,
  },
  beautyConceptSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  searchHistoryContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
  },
  searchHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchHistoryText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  removeHistoryItem: {
    padding: 4,
  },
  concernSection: {
    marginBottom: 24,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
  },
  concernHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  concernTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#694d21',
    marginBottom: 4,
    textAlign: 'center',
  },
  concernSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  concernContainer: {
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  concernRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
  },
  concernCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: screenWidth * 0.28,
    marginHorizontal: 8,
  },
  concernIconContainer: {
    width: screenWidth * 0.22,
    height: screenWidth * 0.22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#694d21',
    overflow: 'hidden',
    borderRadius: 1000,
  },
  concernCircleImage: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
  },
  concernText: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    maxWidth: 90,
    fontWeight: '500',
    marginTop: 8,
  },
  chatbotContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  footerContainer: {
    backgroundColor: '#f8f9fa',
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#694d21',
    marginBottom: 16,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  footerSocialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  footerSocialButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  footerSocialText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
    marginHorizontal: 20,
  },
  footerBottom: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerBottomText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerColumnLink: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  footerColumnText: {
    fontSize: 13,
    color: '#666',
  },
  allProductsSection: {
    marginTop: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  allProductsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  allProductsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#694d21',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  productItem: {
    width: '48%',
    marginBottom: 16,
  },
  pillarsSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
  },
  pillarsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pillarsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#694d21',
    textAlign: 'center',
    marginBottom: 8,
  },
  pillarsSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  pillarCard: {
    width: '45%',
    alignItems: 'center',
    marginBottom: 24,
  },
  pillarIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#694d21',
  },
  pillarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#694d21',
    textAlign: 'center',
    marginBottom: 4,
  },
  pillarDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  iconButton: {
    padding: 8,
    marginHorizontal: -1,
    backgroundColor: 'transparent',
  },
  natureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 2,
    marginRight: 'auto',
    borderWidth: 1.5,
    borderColor: '#176e14',
    height: 34,
    width: 180,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 1,
  },
  natureButtonText: {
    fontSize: 12,
    color: '#176e14',
    marginLeft: 6,
    fontWeight: '600',
    textAlign: 'left',
  },
  searchIconButton: {
    padding: 8,
    marginHorizontal: 0,
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  expandedSearchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  expandedSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  expandedSearchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  expandedSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    height: '100%',
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#999',
    marginLeft: 8,
  },
  charitySection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 24,
  },
  charityHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  charityTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#694d21',
    marginBottom: 8,
  },
  charitySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  donationStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  donationCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    width: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  donationAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#694d21',
    marginTop: 8,
  },
  donationLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  donationChartContainer: {
    marginBottom: 24,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#694d21',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingVertical: 10,
  },
  barContainer: {
    alignItems: 'center',
    width: '15%',
  },
  bar: {
    width: '60%',
    backgroundColor: '#694d21',
    borderRadius: 4,
    opacity: 0.8,
  },
  barLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  impactCategories: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  impactCategory: {
    alignItems: 'center',
    width: '30%',
  },
  impactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  impactTitle: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  impactAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#694d21',
  },
  donateButton: {
    backgroundColor: '#694d21',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignSelf: 'center',
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modern skeleton loading styles
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  skeletonCard: {
    width: '48%',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skeletonImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonText: {
    width: '80%',
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonPrice: {
    width: '60%',
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});

const formatPrice = (price: number | undefined | null): string => {
  if (typeof price !== 'number') return '0.00';
  return Number(price).toFixed(2);
};

// Helper to normalize category names for image lookup
const normalizeCategoryName = (name: string) => {
  // Map common variations to their standard form
  const categoryMap: { [key: string]: string } = {
    'baby care': 'Baby Care',
    'bath & body': 'Bath & Body',
    'face care': 'Face Care',
    'fragrances': 'Fragrances',
    'haircare': 'Hair Care',
    'lip care': 'Lip Care',
    'makeup': 'Makeup',
    'saranga ayurveda': 'Saranga Ayurveda',
    'skincare': 'Skincare',
    'sunscreen lotion': 'Sunscreen Lotion'
  };

  // Convert to lowercase for lookup
  const lowerName = name.toLowerCase();
  const normalizedName = categoryMap[lowerName] || name;
  console.log('Category name normalization:', { original: name, normalized: normalizedName });
  return normalizedName;
};

const Page = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [showNewDealsPopup, setShowNewDealsPopup] = useState(true);
  const [activeCombos, setActiveCombos] = useState<any[]>([]);
  const [coreProductsOffset, setCoreProductsOffset] = useState(0);
  const coreProductsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const { mainCategories, loading: categoriesLoading } = useCategories();
  // Map mainCategories to add an image property using getCategoryImage with normalization
  const mainCategoriesWithImages = mainCategories && Array.isArray(mainCategories) 
    ? mainCategories.map(cat => ({
        ...cat,
        image: getCategoryImage(normalizeCategoryName(cat.name), 'tile'),
      }))
    : [];

  console.log('Category images:', mainCategoriesWithImages.length > 0 ? mainCategoriesWithImages.map(c => ({ name: c.name, image: c.image })) : 'No categories loaded');

  const [dropdownWidth] = useState(new Animated.Value(0));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSarangaAyurveda, setIsSarangaAyurveda] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const videoRefs = useRef<(Video | null)[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const advertisingImages = [
    { id: 1, uri: 'https://via.placeholder.com/150x150?text=Ad+1' },
    { id: 2, uri: 'https://via.placeholder.com/150x150?text=Ad+2' },
    { id: 3, uri: 'https://via.placeholder.com/150x150?text=Ad+3' },
    { id: 4, uri: 'https://via.placeholder.com/150x150?text=Ad+4' },
  ];
  
  const videos = [
    // Disable videos temporarily to prevent audio focus issues
    // 'https://videos.pexels.com/video-files/3181673/3181673-sd_640_360_25fps.mp4',
    // 'https://videos.pexels.com/video-files/3181893/3181893-sd_640_360_25fps.mp4',
    // 'https://videos.pexels.com/video-files/4154245/4154245-sd_960_506_25fps.mp4'
  ];
  const [status, setStatus] = useState({});
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const tipCardAnims = useRef(skincareTips.map(() => new Animated.Value(0))).current;
  const scrollViewRef = useRef<ScrollView | null>(null);
  const videoScrollViewRef = useRef<ScrollView | null>(null);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  
  // Enhanced animation refs for modern UI
  const headerSlideAnim = useRef(new Animated.Value(-100)).current;
  const searchSlideAnim = useRef(new Animated.Value(50)).current;
  const categorySlideAnim = useRef(new Animated.Value(30)).current;
  const productSlideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  // Combo card animations - different from existing animations
  const comboCard1Rotate = useRef(new Animated.Value(-15)).current;
  const comboCard1TranslateX = useRef(new Animated.Value(-150)).current;
  const comboCard1TranslateY = useRef(new Animated.Value(50)).current;
  const comboCard2Rotate = useRef(new Animated.Value(15)).current;
  const comboCard2TranslateX = useRef(new Animated.Value(150)).current;
  const comboCard2TranslateY = useRef(new Animated.Value(50)).current;
  const comboCard1Scale = useRef(new Animated.Value(0.5)).current;
  const comboCard2Scale = useRef(new Animated.Value(0.5)).current;
  const [textWidth, setTextWidth] = useState(0);
  const recommendedSectionRef = useRef<View>(null);
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const bottomTabHeight = useBottomTabBarHeight();
  const [shouldScrollToTop, setShouldScrollToTop] = useState(false);
  const isInitialMount = useRef(true);
  const lastFocusedState = useRef(false);

  const handleSearchFocus = () => {
    setIsSearchExpanded(true);
  };

  const handleSearchBlur = () => {
    if (!searchQuery) {
      setIsSearchExpanded(false);
    }
  };

  // Scroll to top function
  const scrollToTop = () => {
    if (scrollViewRef.current) {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });
    }
  };

  // Reset selected category when screen comes into focus
  useEffect(() => {
    // Only scroll to top if this is a genuine focus change (not during scroll operations)
    if (isFocused && !lastFocusedState.current) {
      setSelectedCategory(0);
      // Only scroll to top on initial mount or when returning from another tab
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }
    lastFocusedState.current = isFocused;
  }, [isFocused]);

  // Handle tab press for scroll to top
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      // Check if this is the home tab
      if (isFocused) {
        // Prevent default behavior
        e.preventDefault();
        // Scroll to top immediately only on explicit tab press
        scrollToTop();
      }
    });

    return unsubscribe;
  }, [navigation, isFocused]);

  // Check authentication status first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        setIsAuthenticated(!!token);
        const storedName = (await AsyncStorage.getItem('name')) || (await AsyncStorage.getItem('user_name'));
        setUserName(storedName || '');
        if (!!token && !storedName) {
          try {
            const profileRes = await apiService.getUserProfile();
            const fetchedName = (profileRes.data as any)?.name || (profileRes.data as any)?.full_name || '';
            if (fetchedName) {
              setUserName(fetchedName);
              await AsyncStorage.setItem('name', fetchedName);
            }
          } catch {}
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
        setUserName('');
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const loadUserName = async () => {
      try {
        let storedName = (await AsyncStorage.getItem('name')) || (await AsyncStorage.getItem('user_name'));
        if (!storedName) {
          const profileRes = await apiService.getUserProfile();
          const fetchedName = (profileRes.data as any)?.name || (profileRes.data as any)?.full_name || '';
          if (fetchedName) {
            storedName = fetchedName;
            await AsyncStorage.setItem('name', fetchedName);
          }
        }
        setUserName(storedName || '');
      } catch {}
    };
    if (isMenuOpen && isAuthenticated) {
      loadUserName();
    }
  }, [isMenuOpen, isAuthenticated]);

  // Function to check if a combo is active based on dates
  const isComboActive = (combo: any): boolean => {
    if (!combo.is_active) {
      return false;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // If no dates are set, consider it active if is_active is true
    if (!combo.start_date && !combo.end_date) {
      return combo.is_active;
    }

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (combo.start_date) {
      startDate = new Date(combo.start_date);
      startDate.setHours(0, 0, 0, 0);
    }

    if (combo.end_date) {
      endDate = new Date(combo.end_date);
      endDate.setHours(23, 59, 59, 999);
    }

    // Check if current date is between start and end dates
    if (startDate && endDate) {
      return now >= startDate && now <= endDate;
    } else if (startDate) {
      return now >= startDate;
    } else if (endDate) {
      return now <= endDate;
    }

    return combo.is_active;
  };

  // Function to check if a combo is upcoming based on dates
  const isComboUpcoming = (combo: any): boolean => {
    if (!combo.is_active) {
      return false;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // If no start date, it's not upcoming
    if (!combo.start_date) {
      return false;
    }

    const startDate = new Date(combo.start_date);
    startDate.setHours(0, 0, 0, 0);

    // Check if current date is before start date
    return now < startDate;
  };

  // Fetch active and upcoming combos
  useEffect(() => {
    const fetchHomeCombos = async () => {
      try {
        const response = await apiService.getCombos();
        if (response.data && Array.isArray(response.data)) {
          // Filter active combos based on dates
          const active = response.data.filter((combo: any) => isComboActive(combo));
          
          // Sort active by created_at (newest first)
          const sortedActive = active.sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || a.id || 0).getTime();
            const dateB = new Date(b.created_at || b.id || 0).getTime();
            return dateB - dateA;
          });

          // Get active combos (up to 2)
          let displayCombos = sortedActive.slice(0, 2);
          
          // If we have less than 2 active combos, add upcoming combos
          if (displayCombos.length < 2) {
            // Get active combo IDs to exclude from upcoming
            const activeIds = new Set(displayCombos.map((c: any) => c.id));
            
            // Filter upcoming combos (excluding those already in active list)
            const upcoming = response.data.filter((combo: any) => 
              isComboUpcoming(combo) && !activeIds.has(combo.id)
            );
            
            // Sort upcoming by created_at (newest first)
            const sortedUpcoming = upcoming.sort((a: any, b: any) => {
              const dateA = new Date(a.created_at || a.id || 0).getTime();
              const dateB = new Date(b.created_at || b.id || 0).getTime();
              return dateB - dateA;
            });
            
            // Add upcoming combos to fill up to 2
            const needed = 2 - displayCombos.length;
            displayCombos = [...displayCombos, ...sortedUpcoming.slice(0, needed)];
          }
          
          setActiveCombos(displayCombos);
        }
      } catch (error) {
        console.error('Error fetching combos:', error);
        setActiveCombos([]);
      }
    };

    fetchHomeCombos();
  }, []);

  // Animate combo cards when they are loaded
  useEffect(() => {
    if (activeCombos.length > 0) {
      // Reset animations
      comboCard1Rotate.setValue(-15);
      comboCard1TranslateX.setValue(-150);
      comboCard1TranslateY.setValue(50);
      comboCard1Scale.setValue(0.5);
      comboCard2Rotate.setValue(15);
      comboCard2TranslateX.setValue(150);
      comboCard2TranslateY.setValue(50);
      comboCard2Scale.setValue(0.5);

      // Animate first card - rotate with slide from left and bounce
      Animated.parallel([
        Animated.spring(comboCard1Rotate, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(comboCard1TranslateX, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(comboCard1TranslateY, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(comboCard1Scale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate second card - rotate with slide from right and bounce (staggered)
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(comboCard2Rotate, {
            toValue: 0,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(comboCard2TranslateX, {
            toValue: 0,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(comboCard2TranslateY, {
            toValue: 0,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(comboCard2Scale, {
            toValue: 1,
            tension: 40,
            friction: 6,
            useNativeDriver: true,
          }),
        ]).start();
      }, 200);
    }
  }, [activeCombos]);

  // Fetch products only when authenticated
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Fetch all products by using a high limit to get all products at once
        // This ensures the Core Collection can cycle through ALL products
        const response = await apiService.get(`${apiService.ENDPOINTS.PRODUCTS}?limit=1000`);
        
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

        console.log(`[Core Collection] Fetched ${productsData.length} products from backend`);
        console.log(`[Core Collection] Product IDs:`, productsData.map(p => p.id).slice(0, 20));

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

  // Update core products display to cycle through all products circularly
  useEffect(() => {
    // Clear any existing interval first
    if (coreProductsIntervalRef.current) {
      clearInterval(coreProductsIntervalRef.current);
      coreProductsIntervalRef.current = null;
    }

    if (allProducts.length > 0) {
      // Reset offset when products change
      setCoreProductsOffset(0);

      // Set up interval to update every 10 seconds
      coreProductsIntervalRef.current = setInterval(() => {
        setCoreProductsOffset((prevOffset) => {
          // Always increment by 4 and use modulo to wrap around
          // This ensures we cycle through ALL products regardless of total count
          const totalProducts = allProducts.length;
          const nextOffset = (prevOffset + 4) % totalProducts;
          
          // Log which products will be displayed
          const productsToShow = [];
          for (let i = 0; i < 4; i++) {
            const index = (nextOffset + i) % totalProducts;
            productsToShow.push({
              index,
              id: allProducts[index]?.id,
              name: allProducts[index]?.name || 'Unknown'
            });
          }
          console.log(`Core Collection: Cycling products. Offset: ${prevOffset} -> ${nextOffset}, Total products: ${totalProducts}`);
          console.log(`Core Collection: Displaying products:`, productsToShow);
          return nextOffset;
        });
      }, 10000); // 10 seconds

      // Cleanup interval on unmount or when allProducts changes
      return () => {
        if (coreProductsIntervalRef.current) {
          clearInterval(coreProductsIntervalRef.current);
          coreProductsIntervalRef.current = null;
        }
      };
    } else {
      // Reset offset if allProducts is empty
      setCoreProductsOffset(0);
    }
  }, [allProducts]);

  // Add search filter effect
  const normalize = (s: string) => s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const getProductDisplayName = (product: any) => {
    const preferred = [
      product?.name,
      product?.title,
      product?.product_name,
      product?.productName,
      product?.attributes?.name,
      product?.details?.name,
    ].find((v) => typeof v === 'string' && v.trim().length > 0);
    if (preferred) return preferred as string;

    // Fallback: search any string field whose key hints at a name/title
    try {
      const entries = Object.entries(product || {});
      for (const [key, value] of entries) {
        if (typeof value === 'string' && /name|title/i.test(key)) {
          return value;
        }
      }
    } catch {}

    return '';
  };

  const fetchProductsForSearch = async () => {
    try {
      const response = await apiService.get(apiService.ENDPOINTS.PRODUCTS);
      let productsData: any[] = [];
      if (response.data?.products) {
        productsData = response.data.products;
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      }
      setAllProducts(productsData);
      return productsData;
    } catch (e) {
      return [] as any[];
    }
  };

  const tryServerSearch = async (query: string): Promise<any[] | null> => {
    const keys = ['search', 'q', 'name'];
    for (const key of keys) {
      try {
        const endpoint = `${apiService.ENDPOINTS.PRODUCTS}?${key}=${encodeURIComponent(query)}`;
        const response = await apiService.get(endpoint);
        let productsData: any[] = [];
        if (response.data?.products) {
          productsData = response.data.products;
        } else if (Array.isArray(response.data)) {
          productsData = response.data;
        }
        if (productsData.length > 0) return productsData;
      } catch {}
    }
    return null;
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts([]);
      return;
    }

    const query = normalize(searchQuery);
    const runFilter = async (list: any[]) => {
      const filtered = list.filter((product: any) => {
        const name = normalize(getProductDisplayName(product));
        return name.includes(query);
      });
      if (filtered.length > 0) {
        setFilteredProducts(filtered);
        return;
      }
      // Fallback to server-side search if local list has no matches
      const server = await tryServerSearch(query);
      if (server && server.length > 0) {
        setFilteredProducts(server);
      } else {
        setFilteredProducts([]);
      }
    };

    if (allProducts.length === 0) {
      fetchProductsForSearch().then((list) => runFilter(list));
      return;
    }

    runFilter(allProducts);
  }, [searchQuery, allProducts]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProducts([]);
  };

  // Function to handle category selection
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategory(categoryId);
    const category = mainCategories.find(cat => cat.id === categoryId);
    if (category) {
      try {
        router.push({
          pathname: "/category/[id]",
          params: { 
            id: categoryId.toString(),
            name: category.name
          }
        });
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }
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

  // Enhanced animation effect when component mounts
  useEffect(() => {
    // Staggered entrance animations for modern feel
    Animated.sequence([
      // Header slides in first
      Animated.timing(headerSlideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      // Search bar slides in
      Animated.timing(searchSlideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      // Categories slide in
      Animated.timing(categorySlideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      // Products slide in
      Animated.timing(productSlideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade in main content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
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

    // Add pulsing animation for interactive elements
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Shimmer effect for loading states
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
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

  const handleNatureTouch = async () => {
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

  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <View style={styles.menuHeader}>
        <Text style={styles.menuTitle}>Saranga Ayurveda</Text>
        <TouchableOpacity onPress={handleDrawerClose}>
          <Ionicons name="close" size={24} color="#333333" />
        </TouchableOpacity>
      </View>
      <ScrollView 
        style={styles.menuContent}
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isAuthenticated ? (
          <>
            <View style={styles.menuUserSection}>
              <View style={styles.menuUserIcon}>
                <Ionicons name="person" size={32} color="#f5f5f5" />
              </View>
              <Text style={styles.menuUserText}>Welcome{userName ? ` ${userName}` : ''}</Text>
            </View>
            <View style={styles.menuDivider} />
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                console.log('Profile button pressed');
                handleDrawerClose();
                router.push('/profile');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                console.log('Cart button pressed');
                handleDrawerClose();
                router.push('/cart');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="cart-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>Shopping Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                console.log('Orders button pressed');
                handleDrawerClose();
                router.push('/profile/orders');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="bag-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>Track Order</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                console.log('Wishlist button pressed');
                handleDrawerClose();
                router.push('/wishlist');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="heart-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>Wishlist</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                console.log('Settings button pressed');
                handleDrawerClose();
                router.push('/settings');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                console.log('Help button pressed');
                handleDrawerClose();
                router.push('/help');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>Help & Support</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity 
              style={[styles.menuItem, styles.logoutItem]} 
              onPress={async () => {
                console.log('Logout button pressed');
                handleDrawerClose();
                await AsyncStorage.clear();
                setIsAuthenticated(false);
                router.replace('/auth/login');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>Logout</Text>
            </TouchableOpacity>
            <View style={styles.menuSpacer} />
          </>
        ) : (
          <>
            <View style={styles.menuUserSection}>
              <View style={styles.menuUserIcon}>
                <Ionicons name="person-outline" size={32} color="#f5f5f5" />
              </View>
              <Text style={styles.menuUserText}>Welcome Guest</Text>
            </View>
            <View style={styles.menuDivider} />
            <TouchableOpacity 
              style={[styles.menuItem, { backgroundColor: '#8B6B43' }]} 
              onPress={() => {
                console.log('Login button pressed');
                handleDrawerClose();
                router.push('/auth/login');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-in-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                console.log('Register button pressed');
                handleDrawerClose();
                router.push('/auth/signup');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>Register</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                console.log('Help button pressed');
                handleDrawerClose();
                router.push('/help');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>Help & Support</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                console.log('About button pressed');
                handleDrawerClose();
                router.push('/about');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={22} color="#f5f5f5" />
              <Text style={styles.menuItemText}>About Us</Text>
            </TouchableOpacity>
            <View style={styles.menuSpacer} />
          </>
        )}
      </ScrollView>
      <View style={styles.menuFooter}>
        <Text style={styles.menuFooterText}>Version 1.0.0</Text>
      </View>
    </View>
  );

  useEffect(() => {
    // Start playing all videos when component mounts
    videoRefs.current.forEach((ref, index) => {
      if (ref) {
        ref.playAsync();
      }
    });

    // Auto-scroll every 5 seconds
    const scrollInterval = setInterval(() => {
      const nextIndex = (currentVideoIndex + 1) % videos.length;
      setCurrentVideoIndex(nextIndex);
      videoScrollViewRef.current?.scrollTo({
        x: nextIndex * screenWidth,
        animated: true
      });
    }, 5000);

    return () => clearInterval(scrollInterval);
  }, [currentVideoIndex]);

  const handleVideoEnd = (index: number) => {
    const nextIndex = (index + 1) % videos.length;
    videoRefs.current[nextIndex]?.playAsync();
  };

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scrollAnim, {
            toValue: -textWidth,
            duration: 15000,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(scrollAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    if (textWidth > 0) {
      startAnimation();
    }
  }, [textWidth]);

  const scrollToRecommended = () => {
    setShowNewDealsPopup(false);
    if (scrollViewRef.current) {
      // Use a simpler scroll approach
      scrollViewRef.current.scrollTo({ y: 800, animated: true });
    }
  };

  const handleViewDeals = () => {
    setShowNewDealsPopup(false);
    router.push('/deals/combo-offers');
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      setSearchHistory(prev => {
        const newHistory = [searchQuery, ...prev.filter(item => item !== searchQuery)].slice(0, 5);
        AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
        return newHistory;
      });
    }
    setShowSearchHistory(false);
    Keyboard.dismiss();
  };

  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await AsyncStorage.getItem('searchHistory');
        if (history) {
          setSearchHistory(JSON.parse(history));
        }
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    };
    loadSearchHistory();
  }, []);

  // Add effect to reset drawer when screen comes into focus
  useEffect(() => {
    if (isFocused && isMenuOpen) {
      handleDrawerClose();
    }
  }, [isFocused]);

  // Add function to handle drawer open with improved error handling and loading state
  const handleDrawerOpen = () => {
    if (isMenuLoading) return; // Prevent multiple simultaneous calls
    
    setIsMenuLoading(true);
    
    try {
      setIsMenuOpen(true);
      Animated.timing(drawerAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsMenuLoading(false);
      });
    } catch (error) {
      console.error('Error opening drawer:', error);
      setIsMenuLoading(false);
    }
  };

  // Add function to handle drawer close with improved error handling
  const handleDrawerClose = () => {
    try {
      Animated.timing(drawerAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsMenuOpen(false);
      });
    } catch (error) {
      console.error('Error closing drawer:', error);
      setIsMenuOpen(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: bottomTabHeight + 20 // Add extra 20 for spacing
        }}
      >
        <Animated.View style={[styles.fixedHeader, {
          opacity: fadeAnim,
          transform: [
            { translateY: headerSlideAnim },
            { scale: pulseAnim }
          ]
        }]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Animated.Text style={[styles.title, {
              transform: [{ scale: pulseAnim }]
            }]}>Saranga Ayurveda</Animated.Text>
            <Animated.Text style={[styles.subtitle, {
              transform: [{ translateX: searchSlideAnim }]
            }]}>
              <Text style={{ color: '#176e14' }}>Natural</Text>
              <Text> Skin Care </Text>
              <Ionicons name="leaf" size={14} color="#176e14" />
            </Animated.Text>
          </View>
        </View>

        <Animated.View style={[styles.searchRow, {
          transform: [{ translateY: searchSlideAnim }]
        }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity 
              style={[styles.menuIcon, isMenuLoading && styles.menuIconLoading]}
              onPress={handleDrawerOpen}
              disabled={isMenuLoading}
              activeOpacity={0.7}
            >
              {isMenuLoading ? (
                <ActivityIndicator size="small" color="#694d21" />
              ) : (
                <Ionicons name="menu" size={28} color="#694d21" />
              )}
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity 
              style={styles.searchIconButton}
              onPress={() => router.push('/search')}
            >
              <Ionicons name="search" size={28} color="#694d21" />
            </TouchableOpacity>
          </Animated.View>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity 
                style={styles.natureButton}
                onPress={handleNatureTouch}
                activeOpacity={0.7}
                delayPressIn={0}
                pressRetentionOffset={{ top: 20, left: 20, right: 20, bottom: 20 }}
                hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="leaf-outline" size={20} color="#176e14" />
                  <Text style={styles.natureButtonText}>Nature's Touch</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.push('/profile/notifications')}
              >
                <Ionicons name="notifications-outline" size={24} color="#694d21" />
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.push('/cart')}
              >
                <Ionicons name="cart-outline" size={24} color="#694d21" />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <View style={styles.offersHeader}>
            <View style={styles.offersContainer}>
              <Animated.View 
                style={[
                  styles.offersContent,
                  { transform: [{ translateX: scrollAnim }] }
                ]}
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout;
                  setTextWidth(width);
                }}
              >
                <Text style={styles.offersTitle} numberOfLines={1}>Weekend Sale! Checkout for new products...</Text>
              </Animated.View>
              <Animated.View 
                style={[
                  styles.offersContent,
                  { transform: [{ translateX: scrollAnim }] }
                ]}
              >
                <Text style={styles.offersTitle} numberOfLines={1}>Weekend Sale! Checkout for new products...</Text>
              </Animated.View>
            </View>
          </View>
        </Animated.View>

          {loading ? (
            <Animated.View style={[styles.loadingContainer, {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }]}>
              <Animated.View style={{
                transform: [{ scale: pulseAnim }]
              }}>
                <ActivityIndicator size="large" color="#694d21" />
              </Animated.View>
              <Animated.Text style={[styles.loadingText, {
                opacity: shimmerAnim
              }]}>Loading amazing products...</Animated.Text>
              
              {/* Modern skeleton loading */}
              <View style={styles.skeletonContainer}>
                {[1, 2, 3, 4].map((item) => (
                  <Animated.View 
                    key={item}
                    style={[
                      styles.skeletonCard,
                      {
                        opacity: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0.7]
                        })
                      }
                    ]}
                  >
                    <View style={styles.skeletonImage} />
                    <View style={styles.skeletonText} />
                    <View style={styles.skeletonPrice} />
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          ) : searchQuery ? (
            <View style={styles.searchResultsContainer}>
              <Text style={[styles.sectionTitle, { marginLeft: 16 }]}>Search Results</Text>
              <Text style={{ marginLeft: 16, color: '#666', marginTop: 4 }}>
                {filteredProducts.length} result{filteredProducts.length === 1 ? '' : 's'} for "{searchQuery}"
              </Text>
              {filteredProducts.length > 0 ? (
                <Animated.View style={[styles.searchResultsGrid, {
                  transform: [{ translateY: productSlideAnim }]
                }]}>
                  {filteredProducts.map((product, index) => (
                    <Animated.View 
                      key={product.id} 
                      style={[
                        styles.searchProductWrapper,
                        {
                          opacity: fadeAnim,
                          transform: [
                            { translateY: productSlideAnim },
                            { scale: scaleAnim }
                          ]
                        }
                      ]}
                    >
                      <ProductCard product={product} />
                    </Animated.View>
                  ))}
                </Animated.View>
              ) : (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={48} color="#694d21" />
                  <Text style={styles.noResultsText}>No products found</Text>
                  <Text style={[styles.noResultsText, { fontSize: 14, marginTop: 8, color: '#999' }]}>
                    Try different search terms
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryHeaderLeft}>
                    <Ionicons name="water-outline" size={24} color="#694d21" />
                    <Text style={styles.categoryTitle}>Tap in, Into the Deep...</Text>
                  </View>
                </View>
                {categoriesLoading ? (
                  <View style={styles.categoryScrollContainer}>
                    <Text style={styles.loadingText}>Loading categories...</Text>
                  </View>
                ) : (
                  <CategoryNavigation
                    categories={mainCategoriesWithImages}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleCategorySelect}
                  />
                )}
              </View>

              {videos.length > 0 && (
                <ScrollView
                  ref={videoScrollViewRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={true}
                  style={styles.videoCarousel}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                    setCurrentVideoIndex(index);
                  }}
                >
                  {videos.map((videoUri, index) => (
                    <View key={index} style={styles.videoContainer}>
                      <Video
                        ref={(ref) => {
                          if (ref) {
                            videoRefs.current[index] = ref;
                          }
                        }}
                        style={styles.video}
                        source={{
                          uri: videoUri,
                        }}
                        useNativeControls={false}
                        resizeMode={ResizeMode.COVER}
                        isLooping={true}
                        shouldPlay={index === currentVideoIndex}
                        onPlaybackStatusUpdate={(status) => {
                          if (status.isLoaded && status.didJustFinish) {
                            handleVideoEnd(index);
                          }
                        }}
                      />
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* New Combo Offers Section */}
              <View style={styles.comboSection}>
                <TouchableWithoutFeedback 
                  onPress={() => router.push('/deals/combo-offers')}
                >
                  <Animated.View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Combo Offers</Text>
                    <Ionicons name="arrow-forward" size={20} color="#000" />
                  </Animated.View>
                </TouchableWithoutFeedback>
                
                {/* Dynamic Combo Cards - Show up to 2 latest active combos */}
                {activeCombos.length > 0 ? (
                  activeCombos.map((combo, index) => {
                    // Calculate prices
                    const calculateTotalPrice = () => {
                      return (combo.items || []).reduce((sum: number, item: any) => {
                        const price = Number(item.price || 0);
                        const quantity = Number(item.quantity || 1);
                        return sum + (price * quantity);
                      }, 0);
                    };

                    const calculateDiscountedPrice = () => {
                      const total = calculateTotalPrice();
                      const discountValue = Number(combo.discount_value || 0);
                      if (combo.discount_type === 'percentage') {
                        return total - (total * (discountValue / 100));
                      } else {
                        return Math.max(0, total - discountValue);
                      }
                    };

                    const totalPrice = calculateTotalPrice();
                    const discountedPrice = calculateDiscountedPrice();
                    const savings = totalPrice - discountedPrice;

                    // Get combo images (up to 2 for display)
                    const comboImages = [
                      combo.image_url,
                      combo.image_url2,
                      combo.image_url3,
                      combo.image_url4
                    ].filter(img => img && typeof img === 'string').slice(0, 2);

                    const handleComboPress = () => {
                      router.push({
                        pathname: '/deals/combo-detail/[id]',
                        params: {
                          id: combo.id.toString(),
                          comboData: JSON.stringify(combo),
                        },
                      });
                    };

                    // Apply different animations to each card
                    const isFirstCard = index === 0;
                    const rotate = isFirstCard ? comboCard1Rotate : comboCard2Rotate;
                    const translateX = isFirstCard ? comboCard1TranslateX : comboCard2TranslateX;
                    const translateY = isFirstCard ? comboCard1TranslateY : comboCard2TranslateY;
                    const scale = isFirstCard ? comboCard1Scale : comboCard2Scale;

                    return (
                      <Animated.View
                        key={combo.id}
                        style={{
                          transform: [
                            { rotate: rotate.interpolate({
                                inputRange: [-15, 0, 15],
                                outputRange: ['-15deg', '0deg', '15deg']
                              }) },
                            { translateX },
                            { translateY },
                            { scale }
                          ],
                        }}
                      >
                      <TouchableOpacity 
                        style={styles.comboCard}
                        onPress={handleComboPress}
                        activeOpacity={0.7}
                      >
                        <View style={styles.comboHeader}>
                          <Ionicons name="gift-outline" size={24} color="#694d21" />
                          <Text style={styles.comboTitle}>{combo.title || 'Combo Offer'}</Text>
                        </View>
                        {combo.description && (
                          <Text style={styles.comboDescription} numberOfLines={2}>
                            {combo.description}
                          </Text>
                        )}
                        <View style={styles.comboProductsRow}>
                          {comboImages.length > 0 ? (
                            comboImages.map((img, idx) => (
                              <Image 
                                key={idx}
                                source={{ uri: apiService.getFullImageUrl(img) }}
                                style={styles.comboProductImage}
                                resizeMode="cover"
                              />
                            ))
                          ) : (
                            <View style={[styles.comboProductImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                              <Ionicons name="image-outline" size={32} color="#999" />
                            </View>
                          )}
                        </View>
                        <View style={styles.comboPriceRow}>
                          <Text style={styles.comboPrice}>₹{discountedPrice.toFixed(2)}</Text>
                          <Text style={styles.comboSaveText}>
                            Save {combo.discount_type === 'percentage' 
                              ? `${Number(combo.discount_value || 0)}%` 
                              : `₹${Number(combo.discount_value || 0)}`}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.viewComboButton}
                          onPress={handleComboPress}
                        >
                          <Text style={styles.viewComboButtonText}>View Combo</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                      </Animated.View>
                    );
                  })
                ) : (
                  // Fallback: Show placeholder when no active combos
                  <TouchableOpacity 
                    style={styles.comboCard}
                    onPress={() => router.push('/deals/combo-offers')}
                  >
                    <View style={styles.comboHeader}>
                      <Ionicons name="gift-outline" size={24} color="#694d21" />
                      <Text style={styles.comboTitle}>Check Out Our Combo Offers</Text>
                    </View>
                    <Text style={styles.comboDescription}>
                      Discover amazing combo deals and save more on your favorite products
                    </Text>
                    <View style={styles.comboProductsRow}>
                      <View style={[styles.comboProductImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="gift" size={32} color="#999" />
                      </View>
                      <View style={[styles.comboProductImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="star" size={32} color="#999" />
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.viewComboButton}
                      onPress={() => router.push('/deals/combo-offers')}
                    >
                      <Text style={styles.viewComboButtonText}>View All Combo Offers</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              </View>

              {/* All Products Section */}
              <View style={styles.allProductsSection}>
                <View style={styles.allProductsHeader}>
                  <Text style={styles.allProductsTitle}>Core Collection</Text>
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => router.push('/all-products')}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                    <Ionicons name="arrow-forward" size={16} color="#694d21" />
                  </TouchableOpacity>
                </View>
                <View style={styles.productsGrid}>
                  {(() => {
                    // Get current 4 products circularly from all products in backend
                    // This works for ANY number of products - 5, 10, 50, 100, 1000, etc.
                    if (allProducts.length === 0) {
                      return null;
                    }
                    
                    const totalProducts = allProducts.length;
                    const currentProducts: Product[] = [];
                    
                    // Always show 4 products, using modulo to wrap around
                    // This ensures we cycle through ALL products regardless of total count
                    for (let i = 0; i < 4; i++) {
                      // Use modulo to wrap around when we reach the end of the array
                      // This works for any number of products in the backend
                      const index = (coreProductsOffset + i) % totalProducts;
                      currentProducts.push(allProducts[index]);
                    }
                    
                    // Log current display state for debugging (only when offset changes)
                    // Note: This may log on every render, but that's expected with React re-renders
                    
                    return currentProducts.map((product, index) => (
                      <Animated.View 
                        key={`${product.id}-${coreProductsOffset}-${index}`} 
                        style={[
                          styles.productItem,
                          {
                            opacity: fadeAnim,
                            transform: [
                              { translateY: productSlideAnim },
                              { scale: scaleAnim }
                            ]
                          }
                        ]}
                      >
                        <ProductCard product={product} />
                      </Animated.View>
                    ));
                  })()}
                </View>
              </View>

              {/* Pillars of Beauty Section */}
              <View style={styles.pillarsSection}>
                <View style={styles.pillarsHeader}>
                  <Text style={styles.pillarsTitle}>Pillars of Beauty in Ayurveda</Text>
                  <Text style={styles.pillarsSubtitle}>
                    Discover the ancient wisdom of Ayurvedic beauty rituals
                  </Text>
                </View>
                <View style={[styles.pillarsGrid, { 
                  alignItems: 'center', 
                  paddingVertical: 40,
                  backgroundColor: '#fff',
                  borderRadius: 20,
                  marginHorizontal: 16
                }]}>
                  {/* First row - 2 items */}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-around', 
                    width: '90%', 
                    marginBottom: 60
                  }}>
                    <View style={{ width: '42%', alignItems: 'center' }}>
                      <View style={{ 
                        width: 110, 
                        height: 110, 
                        borderRadius: 55,
                        marginBottom: 16,
                        borderWidth: 2,
                        borderColor: '#694d21',
                        backgroundColor: '#fff',
                        elevation: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        overflow: 'hidden'
                      }}>
                        <Image 
                          source={{ uri: 'https://images.pexels.com/photos/3762875/pexels-photo-3762875.jpeg?auto=compress&cs=tinysrgb&w=600' }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={{ 
                        fontSize: 18,
                        marginBottom: 8,
                        color: '#694d21',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>Roopam</Text>
                      <Text style={{ 
                        fontSize: 14,
                        color: '#666',
                        textAlign: 'center',
                        paddingHorizontal: 4
                      }}>Outer Beauty & Radiance</Text>
                    </View>
                    <View style={{ width: '42%', alignItems: 'center' }}>
                      <View style={{ 
                        width: 110, 
                        height: 110, 
                        borderRadius: 55,
                        marginBottom: 16,
                        borderWidth: 2,
                        borderColor: '#694d21',
                        backgroundColor: '#fff',
                        elevation: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        overflow: 'hidden'
                      }}>
                        <Image 
                          source={{ uri: 'https://images.pexels.com/photos/3762890/pexels-photo-3762890.jpeg?auto=compress&cs=tinysrgb&w=600' }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={{ 
                        fontSize: 18,
                        marginBottom: 8,
                        color: '#694d21',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>Gunam</Text>
                      <Text style={{ 
                        fontSize: 14,
                        color: '#666',
                        textAlign: 'center',
                        paddingHorizontal: 4
                      }}>Inner Beauty & Wellness</Text>
                    </View>
                  </View>
                  {/* Second row - 1 item centered */}
                  <View style={{ 
                    width: '42%', 
                    alignItems: 'center',
                    transform: [{ translateY: -20 }]
                  }}>
                    <View style={{ 
                      width: 110, 
                      height: 110, 
                      borderRadius: 55,
                      marginBottom: 16,
                      borderWidth: 2,
                      borderColor: '#694d21',
                      backgroundColor: '#fff',
                      elevation: 4,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <Image 
                        source={{ uri: 'https://images.pexels.com/photos/3762880/pexels-photo-3762880.jpeg?auto=compress&cs=tinysrgb&w=600' }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </View>
                    <Text style={{ 
                      fontSize: 18,
                      marginBottom: 8,
                      color: '#694d21',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>Vayastyag</Text>
                    <Text style={{ 
                      fontSize: 14,
                      color: '#666',
                      textAlign: 'center',
                      paddingHorizontal: 4
                    }}>Lasting Beauty & Grace</Text>
                  </View>
                </View>
              </View>

                <View style={styles.tipsContainer}>
                  <View style={styles.tipsHeader}>
                <Ionicons name="bulb" size={32} color="#694d21" />
                    <Text style={styles.tipsTitle}>Daily Skincare Tips:</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tipsScrollView}
                contentContainerStyle={{ paddingHorizontal: 8 }}
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
                                inputRange: [0, 9],
                                outputRange: [0.8, 2]
                              })}
                            ]
                          }
                        ]}
                      >
                        <LinearGradient
                          colors={[tip.backgroundColor, '#ffffff']}
                          style={styles.tipGradient}
                          start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                        >
                          <View style={[styles.tipIcon, { backgroundColor: tip.backgroundColor }]}>
                            <Ionicons name={tip.icon as any} size={36} color="#694d21" />
                          </View>
                          <Text style={styles.tipTitle}>{tip.title}</Text>
                          <Text style={styles.tipDescription}>{tip.description}</Text>
                        </LinearGradient>
                      </Animated.View>
                    ))}
                  </ScrollView>
              </View>

              {/* Your Concern, Our Collections Section */}
              <View style={styles.concernSection}>
                <View style={styles.concernHeader}>
                  <Text style={styles.concernTitle}>Your Concern, Our Collections</Text>
                  <Text style={styles.concernSubtitle}>Find solutions for your specific needs</Text>
                </View>
                <View style={styles.concernContainer}>
                  {/* First row - 2 items */}
                  <View style={styles.concernRow}>
                    {mainCategoriesWithImages.slice(0, 2).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.concernCircle}
                        onPress={() => router.push({
                          pathname: '/category/[id]',
                          params: { id: category.id, name: category.name }
                        })}
                      >
                        <View style={styles.concernIconContainer}>
                          <Image
                            source={{ uri: category.image }}
                            style={styles.concernCircleImage}
                            resizeMode="cover"
                          />
                        </View>
                        <Text style={styles.concernText}>{category.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Second row - 3 items */}
                  <View style={styles.concernRow}>
                    {mainCategoriesWithImages.slice(2, 5).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.concernCircle}
                        onPress={() => router.push({
                          pathname: '/category/[id]',
                          params: { id: category.id, name: category.name }
                        })}
                      >
                        <View style={styles.concernIconContainer}>
                          <Image
                            source={{ uri: category.image }}
                            style={styles.concernCircleImage}
                            resizeMode="cover"
                          />
                        </View>
                        <Text style={styles.concernText}>{category.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Third row - 3 items */}
                  <View style={styles.concernRow}>
                    {mainCategoriesWithImages.slice(5, 8).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.concernCircle}
                        onPress={() => router.push({
                          pathname: '/category/[id]',
                          params: { id: category.id, name: category.name }
                        })}
                      >
                        <View style={styles.concernIconContainer}>
                          <Image
                            source={{ uri: category.image }}
                            style={styles.concernCircleImage}
                            resizeMode="cover"
                          />
                        </View>
                        <Text style={styles.concernText}>{category.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Fourth row - 2 items */}
                  <View style={styles.concernRow}>
                    {mainCategoriesWithImages.slice(8, 10).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.concernCircle}
                        onPress={() => router.push({
                          pathname: '/category/[id]',
                          params: { id: category.id, name: category.name }
                        })}
                      >
                        <View style={styles.concernIconContainer}>
                          <Image
                            source={{ uri: category.image }}
                            style={styles.concernCircleImage}
                            resizeMode="cover"
                          />
                        </View>
                        <Text style={styles.concernText}>{category.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                {/* Add Charity and Donations Section */}
                <View style={styles.charitySection}>
                  <View style={styles.charityHeader}>
                    <Text style={styles.charityTitle}>With every tap, we give life.</Text>
                    <Text style={styles.charitySubtitle}>Making a difference together</Text>
                  </View>
                  
                  <View style={styles.donationStatsContainer}>
                    <View style={styles.donationCard}>
                      <Ionicons name="heart" size={32} color="#694d21" />
                      <Text style={styles.donationAmount}>₹1,25,000</Text>
                      <Text style={styles.donationLabel}>Total Donations</Text>
                    </View>
                    
                    <View style={styles.donationCard}>
                      <Ionicons name="people" size={32} color="#694d21" />
                      <Text style={styles.donationAmount}>250+</Text>
                      <Text style={styles.donationLabel}>Lives Impacted</Text>
                    </View>
                    
                    <View style={styles.donationCard}>
                      <Ionicons name="leaf" size={32} color="#694d21" />
                      <Text style={styles.donationAmount}>15</Text>
                      <Text style={styles.donationLabel}>Projects Funded</Text>
                    </View>
                  </View>

                  <View style={styles.donationChartContainer}>
                    <View style={styles.chartHeader}>
                      <Text style={styles.chartTitle}>We don't just collect—we deliver hope.</Text>
                      <Text style={styles.chartSubtitle}>Last 6 months</Text>
                    </View>
                    
                    <View style={styles.barChart}>
                      {[45, 60, 75, 55, 80, 65].map((height, index) => (
                        <View key={index} style={styles.barContainer}>
                          <View style={[styles.bar, { height: height }]} />
                          <Text style={styles.barLabel}>
                            {['Dec','Jan', 'Feb', 'Mar', 'Apr', 'May'][index]}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.impactCategories}>
                    <View style={styles.impactCategory}>
                      <View style={[styles.impactIcon, { backgroundColor: '#FFE4E1' }]}>
                        <Ionicons name="medkit" size={24} color="#694d21" />
                      </View>
                      <Text style={styles.impactTitle}>Healthcare</Text>
                      <Text style={styles.impactAmount}>₹45,000</Text>
                    </View>
                    
                    <View style={styles.impactCategory}>
                      <View style={[styles.impactIcon, { backgroundColor: '#E0FFFF' }]}>
                        <Ionicons name="book" size={24} color="#694d21" />
                      </View>
                      <Text style={styles.impactTitle}>Education</Text>
                      <Text style={styles.impactAmount}>₹35,000</Text>
                    </View>
                    
                    <View style={styles.impactCategory}>
                      <View style={[styles.impactIcon, { backgroundColor: '#F0FFF0' }]}>
                        <Ionicons name="nutrition" size={24} color="#694d21" />
                      </View>
                      <Text style={styles.impactTitle}>Food & Nutrition</Text>
                      <Text style={styles.impactAmount}>₹45,000</Text>
                    </View>
                  </View>

                  {/* Remove donation button */}
                </View>

                <BrandReviews />
              </View>

              <View style={styles.footerContainer}>
              {/* Quick Links Section */}
              <View style={styles.footerSection}>
                <Text style={styles.footerTitle}>Quick Links</Text>
                <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/profile')}>
                  <Ionicons name="person-outline" size={20} color="#694d21" />
                  <Text style={styles.footerLinkText}>My Account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/profile/orders')}>
                  <Ionicons name="bag-outline" size={20} color="#694d21" />
                  <Text style={styles.footerLinkText}>Track Order</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/wishlist')}>
                  <Ionicons name="heart-outline" size={20} color="#694d21" />
                  <Text style={styles.footerLinkText}>Wishlist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/explore')}>
                  <Ionicons name="pricetag-outline" size={20} color="#694d21" />
                  <Text style={styles.footerLinkText}>Offers & Deals</Text>
                </TouchableOpacity>
              </View>

              {/* Customer Service Section */}
              <View style={styles.footerSection}>
                <Text style={styles.footerTitle}>Customer Service</Text>
                <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/contact')}>
                  <Ionicons name="call-outline" size={20} color="#694d21" />
                  <Text style={styles.footerLinkText}>Contact Us</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/faq')}>
                  <Ionicons name="help-circle-outline" size={20} color="#694d21" />
                  <Text style={styles.footerLinkText}>FAQs</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/shipping-info')}>
                  <Ionicons name="car-outline" size={20} color="#694d21" />
                  <Text style={styles.footerLinkText}>Shipping Information</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/return-policy')}>
                  <Ionicons name="refresh-outline" size={20} color="#694d21" />
                  <Text style={styles.footerLinkText}>Return Policy</Text>
                </TouchableOpacity>
              </View>

              {/* Social Links */}
              <View style={styles.footerSocialContainer}>
                {[
                  { icon: 'logo-instagram', color: '#E1306C', url: 'https://instagram.com/curio_spry_official' },
                  { icon: 'logo-facebook', color: '#4267B2', url: 'https://facebook.com/yourcompany' },
                  { icon: 'logo-youtube', color: '#FF0000', url: 'https://youtube.com/yourcompany' },
                  { icon: 'logo-twitter', color: '#1DA1F2', url: 'https://twitter.com/yourcompany' }
                ].map((social, index) => (
                  <TouchableOpacity
                    key={social.icon}
                    style={styles.footerSocialButton}
                    onPress={() => Linking.openURL(social.url)}
                  >
                    <Ionicons name={social.icon as any} size={24} color={social.color} />
                    <Text style={styles.footerSocialText}>
                      {social.icon.replace('logo-', '').charAt(0).toUpperCase() + social.icon.slice(6)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.footerDivider} />

              {/* Bottom Section */}
              <View style={styles.footerBottom}>
                <Text style={styles.footerBottomText}>© 2025 Saranga Ayurveda. All rights reserved.</Text>
                <View style={styles.footerRow}>
                  {[
                    { title: 'Privacy Policy', route: '/legal/privacy-policy' },
                    { title: 'Terms of Service', route: '/legal/terms' },
                    { title: 'Shipping Policy', route: '/legal/shipping' },
                    { title: 'Refund Policy', route: '/legal/refund' }
                  ].map((item, index) => (
                    <TouchableOpacity
                      key={item.route}
                      style={styles.footerColumnLink}
                      onPress={() => {
                        if (item.route === '/legal/privacy-policy') {
                          router.push('/legal/privacy-policy');
                        } else if (item.route === '/legal/terms') {
                          router.push('/legal/terms');
                        } else if (item.route === '/legal/shipping') {
                          router.push('/legal/shipping');
                        } else if (item.route === '/legal/refund') {
                          router.push('/legal/refund');
                        }
                      }}
                    >
                      <Text style={styles.footerColumnText}>{item.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.footerBottomText, { marginTop: 16 }]}>
                  Made with ♥ in India
                  
                </Text>
                <Text style={styles.footerBottomText}>Crafted and powered with care by Curiospry Technologies

                </Text>
              </View>
            </View>
          </>
        )}
        </ScrollView>

        <View style={[styles.chatbotContainer, { bottom: bottomTabHeight + 20 }]}>
          <Chatbot />
        </View>

        {/* New Deals Popup Modal */}
        <Modal
          visible={showNewDealsPopup}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowNewDealsPopup(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.newDealsPopup}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowNewDealsPopup(false)}
              >
                <Ionicons name="close" size={24} color="#694d21" />
              </TouchableOpacity>
              <Text style={styles.newDealsTitle}>New Deals Alert! 🎉</Text>
              <Text style={styles.newDealsText}>
                Discover our latest Saranga Ayurveda products with exclusive offers and discounts. Limited time only!
              </Text>
              <TouchableOpacity 
                style={styles.newDealsButton}
                onPress={handleViewDeals}
              >
                <Text style={styles.newDealsButtonText}>View Deals</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Drawer Modal */}
        <Modal
          visible={isMenuOpen}
          transparent={true}
          animationType="none"
          onRequestClose={handleDrawerClose}
        >
          <View style={styles.drawerOverlay}>
            <Animated.View 
              style={[
                styles.drawerContainer,
                {
                  transform: [{
                    translateX: drawerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-300, 0],
                    })
                  }]
                }
              ]}
            >
              {renderMenu()}
            </Animated.View>
            <TouchableWithoutFeedback onPress={handleDrawerClose}>
              <Animated.View 
                style={[
                  styles.drawerBackdrop,
                  {
                    opacity: drawerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    })
                  }
                ]} 
              />
            </TouchableWithoutFeedback>
          </View>
        </Modal>
    </View>
  );
};

export default Page;
