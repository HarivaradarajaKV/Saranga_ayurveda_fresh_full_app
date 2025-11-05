import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../../services/api';
import { useCart } from '../../CartContext';

export default function ComboDetailPage() {
  const router = useRouter();
  const { id, comboData } = useLocalSearchParams();
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [combo, setCombo] = useState<any>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Button animation values
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonTranslateYAnim = useRef(new Animated.Value(20)).current;
  const buttonShadowAnim = useRef(new Animated.Value(0.2)).current;
  const buttonPulseAnim = useRef(new Animated.Value(1)).current;
  const buttonBounceAnim = useRef(new Animated.Value(0)).current;
  const iconRotateAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;

  // Calculate bottom padding for tab bar (60 base height + safe area insets)
  const bottomTabBarHeight = 60 + Math.max(insets.bottom, 4);
  const bottomPadding = bottomTabBarHeight + 8; // Extra 8px for spacing

  useEffect(() => {
    loadComboData();
  }, [id]);

  useEffect(() => {
    if (!loading && combo) {
      // Start animations when content is loaded
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate button entrance with delay - crazy dynamic entrance
      setTimeout(() => {
        // Entrance animation
        Animated.parallel([
          Animated.timing(buttonOpacityAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(buttonTranslateYAnim, {
            toValue: 0,
            tension: 60,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.spring(buttonBounceAnim, {
              toValue: -10,
              tension: 100,
              friction: 3,
              useNativeDriver: true,
            }),
            Animated.spring(buttonBounceAnim, {
              toValue: 0,
              tension: 100,
              friction: 3,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(buttonShadowAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: false,
          }),
        ]).start();

        // Start continuous animations after entrance
        setTimeout(() => {
          // Continuous pulse animation
          Animated.loop(
            Animated.sequence([
              Animated.parallel([
                Animated.timing(buttonPulseAnim, {
                  toValue: 1.03,
                  duration: 1200,
                  useNativeDriver: true,
                }),
                Animated.timing(buttonShadowAnim, {
                  toValue: 0.35,
                  duration: 1200,
                  useNativeDriver: false,
                }),
              ]),
              Animated.parallel([
                Animated.timing(buttonPulseAnim, {
                  toValue: 1,
                  duration: 1200,
                  useNativeDriver: true,
                }),
                Animated.timing(buttonShadowAnim, {
                  toValue: 0.3,
                  duration: 1200,
                  useNativeDriver: false,
                }),
              ]),
            ])
          ).start();

          // Continuous icon rotation animation
          Animated.loop(
            Animated.timing(iconRotateAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            })
          ).start();

          // Continuous icon scale animation
          Animated.loop(
            Animated.sequence([
              Animated.timing(iconScaleAnim, {
                toValue: 1.15,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(iconScaleAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
            ])
          ).start();
        }, 500);
      }, 400);
    }
  }, [loading, combo]);

  const loadComboData = async () => {
    try {
      setLoading(true);
      let comboDataToUse = null;

      // Try to use passed combo data first
      if (comboData) {
        try {
          comboDataToUse = JSON.parse(comboData as string);
        } catch (e) {
          // If parsing fails, fetch from API
        }
      }

      // If no combo data, fetch from API
      if (!comboDataToUse) {
        const response = await apiService.getComboDetails(Number(id));
        if (response.data) {
          comboDataToUse = response.data;
        }
      }

      setCombo(comboDataToUse);
    } catch (error) {
      console.error('Error loading combo:', error);
      Alert.alert('Error', 'Failed to load combo details');
    } finally {
      setLoading(false);
    }
  };

  const getComboStatus = (combo: any): 'active' | 'upcoming' | 'expired' => {
    if (!combo?.is_active) {
      return 'expired';
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (!combo.start_date && !combo.end_date) {
      return combo.is_active ? 'active' : 'expired';
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

    if (startDate && endDate) {
      if (now < startDate) {
        return 'upcoming';
      } else if (now > endDate) {
        return 'expired';
      } else {
        return 'active';
      }
    } else if (startDate) {
      if (now < startDate) {
        return 'upcoming';
      } else {
        return 'active';
      }
    } else if (endDate) {
      if (now > endDate) {
        return 'expired';
      } else {
        return 'active';
      }
    }

    return combo.is_active ? 'active' : 'expired';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const calculateTotalPrice = () => {
    if (!combo?.items) return 0;
    return (combo.items || []).reduce((sum: number, item: any) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 1);
      return sum + price * quantity;
    }, 0);
  };

  const calculateDiscountedPrice = () => {
    const total = calculateTotalPrice();
    const discountValue = Number(combo?.discount_value || 0);
    if (combo?.discount_type === 'percentage') {
      return total - total * (discountValue / 100);
    } else {
      return Math.max(0, total - discountValue);
    }
  };

  const handleAddToCart = async () => {
    if (!combo) return;

    const status = getComboStatus(combo);
    if (status !== 'active') {
      Alert.alert('Not Available', 'This combo is not currently available');
      return;
    }

    // Press animation - crazy bounce effect
    Animated.parallel([
      Animated.sequence([
        Animated.parallel([
          Animated.timing(buttonScaleAnim, {
            toValue: 0.92,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(buttonBounceAnim, {
            toValue: 5,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(buttonShadowAnim, {
            toValue: 0.15,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(iconScaleAnim, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(buttonScaleAnim, {
            toValue: 1,
            tension: 200,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(buttonBounceAnim, {
            toValue: 0,
            tension: 200,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(buttonShadowAnim, {
            toValue: 0.4,
            duration: 250,
            useNativeDriver: false,
          }),
          Animated.spring(iconScaleAnim, {
            toValue: 1.2,
            tension: 150,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Quick icon spin on press
      Animated.sequence([
        Animated.timing(iconRotateAnim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    try {
      setIsAddingToCart(true);
      
      // Calculate combo prices
      const calculateTotalPrice = () => {
        if (!combo?.items) return 0;
        return (combo.items || []).reduce((sum: number, item: any) => {
          const price = Number(item.price || 0);
          const quantity = Number(item.quantity || 1);
          return sum + price * quantity;
        }, 0);
      };

      const calculateDiscountedPrice = () => {
        const total = calculateTotalPrice();
        const discountValue = Number(combo?.discount_value || 0);
        if (combo?.discount_type === 'percentage') {
          return total - total * (discountValue / 100);
        } else {
          return Math.max(0, total - discountValue);
        }
      };

      const comboTotalPrice = calculateTotalPrice();
      const comboDiscountedPrice = calculateDiscountedPrice();
      
      // Add each item in the combo to cart with its quantity
      for (const item of combo.items || []) {
        const itemPrice = Number(item.price || 0);
        const itemQuantity = Number(item.quantity || 1);
        const itemTotalPrice = itemPrice * itemQuantity; // Total price for this item (with quantity)
        const offerPercentage = Number(item.offer_percentage || 0);
        
        const product = {
          id: item.product_id,
          name: item.name || `Product ${item.product_id}`,
          description: item.description || item.name || `Product ${item.product_id}`,
          price: itemPrice,
          category: item.category || '',
          image_url: item.image_url || '',
          stock_quantity: Number(item.stock_quantity || 999),
          created_at: item.created_at || new Date().toISOString(),
          offer_percentage: offerPercentage,
          usage_instructions: item.usage_instructions,
          benefits: item.benefits,
          ingredients: item.ingredients,
          shades: item.shades,
        };

        // Combo info to pass to addItem
        const comboInfo = {
          comboId: combo.id,
          comboDiscountType: combo.discount_type || 'percentage',
          comboDiscountValue: Number(combo.discount_value || 0),
          comboTotalPrice: comboTotalPrice,
          comboDiscountedPrice: comboDiscountedPrice,
          itemOriginalPrice: itemTotalPrice, // Total original price for this item (price * quantity)
        };

        // Add item quantity times
        for (let i = 0; i < itemQuantity; i++) {
          await addItem(product, '', comboInfo);
        }
      }

      // Success animation - crazy celebration
      Animated.parallel([
        Animated.sequence([
          Animated.parallel([
            Animated.timing(buttonScaleAnim, {
              toValue: 1.15,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(buttonBounceAnim, {
              toValue: -15,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(buttonShadowAnim, {
              toValue: 0.5,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(iconScaleAnim, {
              toValue: 1.4,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(buttonScaleAnim, {
              toValue: 1,
              tension: 150,
              friction: 5,
              useNativeDriver: true,
            }),
            Animated.spring(buttonBounceAnim, {
              toValue: 0,
              tension: 150,
              friction: 5,
              useNativeDriver: true,
            }),
            Animated.timing(buttonShadowAnim, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.spring(iconScaleAnim, {
              toValue: 1,
              tension: 150,
              friction: 5,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Icon celebration spin
        Animated.sequence([
          Animated.timing(iconRotateAnim, {
            toValue: 0.25,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotateAnim, {
            toValue: 0.5,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotateAnim, {
            toValue: 0.75,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotateAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      Alert.alert('Success', 'Combo added to cart!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error adding combo to cart:', error);
      Alert.alert('Error', 'Failed to add combo to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading combo details...</Text>
      </View>
    );
  }

  if (!combo) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#999" />
        <Text style={styles.errorText}>Combo not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getComboStatus(combo);
  const statusColor =
    status === 'active'
      ? '#4CAF50'
      : status === 'upcoming'
      ? '#FF9800'
      : '#999';
  const statusText =
    status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Expired';

  const totalPrice = calculateTotalPrice();
  const discountedPrice = calculateDiscountedPrice();
  const savings = totalPrice - discountedPrice;

  const comboImages = [
    combo.image_url,
    combo.image_url2,
    combo.image_url3,
    combo.image_url4,
  ].filter((img) => img && typeof img === 'string');

  return (
    <>
      <Stack.Screen
        options={{
          title: combo.title || 'Combo Details',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#694d21',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
            color: '#fff',
          },
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          }}
        >
          {/* Images Section */}
          {comboImages.length > 0 && (
            <Animated.View style={styles.imagesSection}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.imagesScroll}
              >
                {comboImages.map((img, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: apiService.getFullImageUrl(img) }}
                    style={styles.comboImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Title and Status */}
          <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
            <View style={styles.titleContainer}>
              <Ionicons name="gift" size={24} color="#694d21" style={styles.titleIcon} />
              <Text style={styles.title}>{combo.title || 'Combo Offer'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Ionicons
                name={status === 'active' ? 'checkmark-circle' : status === 'upcoming' ? 'time' : 'close-circle'}
                size={14}
                color="#fff"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          </Animated.View>

          {/* Description */}
          {combo.description && (
            <Animated.View style={[styles.descriptionSection, { opacity: fadeAnim }]}>
              <View style={styles.descriptionCard}>
                <Ionicons name="information-circle-outline" size={20} color="#694d21" style={styles.descriptionIcon} />
                <Text style={styles.description}>{combo.description}</Text>
              </View>
            </Animated.View>
          )}

          {/* Date Range */}
          <Animated.View style={[styles.dateSection, { opacity: fadeAnim }]}>
            <View style={styles.dateHeader}>
              <Ionicons name="calendar" size={20} color="#694d21" />
              <Text style={styles.dateSectionTitle}>Validity Period</Text>
            </View>
            <View style={styles.dateRow}>
              <View style={[styles.dateIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="play" size={16} color="#4CAF50" />
              </View>
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <Text style={styles.dateValue}>{formatDate(combo.start_date)}</Text>
              </View>
            </View>
            <View style={styles.dateRow}>
              <View style={[styles.dateIconContainer, { backgroundColor: '#FFE4E1' }]}>
                <Ionicons name="stop" size={16} color="#FF6B6B" />
              </View>
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>End Date</Text>
                <Text style={styles.dateValue}>{formatDate(combo.end_date)}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Products in Combo */}
          <Animated.View style={[styles.productsSection, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={22} color="#694d21" />
              <Text style={styles.sectionTitle}>Products in Combo</Text>
            </View>
            {(combo.items || []).map((item: any, idx: number) => {
              const itemPrice = Number(item.price || 0);
              const itemQuantity = Number(item.quantity || 1);
              const itemTotal = itemPrice * itemQuantity;

              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.productItem,
                    {
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateX: slideAnim.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, -20],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.productImageContainer}>
                    <Image
                      source={{
                        uri: apiService.getFullImageUrl(item.image_url || ''),
                      }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    <View style={styles.quantityBadge}>
                      <Text style={styles.quantityText}>{itemQuantity}</Text>
                    </View>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>
                      {item.name || `Product ${item.product_id}`}
                    </Text>
                    <View style={styles.productPriceRow}>
                      <Text style={styles.productPrice}>
                        ₹{itemPrice.toFixed(2)} × {itemQuantity}
                      </Text>
                      <Text style={styles.productTotal}>
                        = ₹{itemTotal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>

          {/* Price Details */}
          <Animated.View style={[styles.priceSection, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt" size={22} color="#694d21" />
              <Text style={styles.sectionTitle}>Price Details</Text>
            </View>
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Total Products Price:</Text>
                <Text style={styles.priceValue}>₹{totalPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Discount (
                  {combo.discount_type === 'percentage'
                    ? `${Number(combo.discount_value || 0)}%`
                    : `₹${Number(combo.discount_value || 0)}`}
                  ):
                </Text>
                <Text style={[styles.priceValue, styles.discountAmount]}>
                  -₹{savings.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.priceRow, styles.finalPriceRow]}>
                <Text style={styles.finalPriceLabel}>Final Combo Price:</Text>
                <Text style={styles.finalPriceValue}>₹{discountedPrice.toFixed(2)}</Text>
              </View>
              {savings > 0 && (
                <Animated.View
                  style={[
                    styles.savingsBadge,
                    {
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  <Ionicons name="trophy" size={18} color="#4CAF50" />
                  <Text style={styles.savingsText}>
                    You Save ₹{savings.toFixed(2)}
                  </Text>
                </Animated.View>
              )}
            </View>
          </Animated.View>

          {/* Add to Cart Button */}
          {status === 'active' && (
            <Animated.View
              style={{
                opacity: buttonOpacityAnim,
                transform: [
                  { translateY: Animated.add(buttonTranslateYAnim, buttonBounceAnim) },
                  { scale: Animated.multiply(buttonScaleAnim, buttonPulseAnim) },
                ],
              }}
            >
              <Animated.View
                style={[
                  styles.addToCartButton,
                  {
                    shadowOpacity: buttonShadowAnim,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.addToCartButtonInner}
                  onPress={handleAddToCart}
                  disabled={isAddingToCart}
                  activeOpacity={0.95}
                >
                {isAddingToCart ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Animated.View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Animated.View
                      style={{
                        transform: [
                          {
                            rotate: iconRotateAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }),
                          },
                          { scale: iconScaleAnim },
                        ],
                        marginRight: 8,
                      }}
                    >
                      <Ionicons name="cart" size={20} color="#fff" />
                    </Animated.View>
                    <Text style={styles.addToCartText}>Add Combo to Cart</Text>
                  </Animated.View>
                )}
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}

          {status === 'upcoming' && (
            <Animated.View
              style={{
                opacity: buttonOpacityAnim,
                transform: [{ translateY: buttonTranslateYAnim }],
              }}
            >
              <View style={[styles.addToCartButton, styles.disabledButton]}>
                <Ionicons name="time" size={20} color="#fff" />
                <Text style={styles.addToCartText}>Coming Soon</Text>
              </View>
            </Animated.View>
          )}

          {status === 'expired' && (
            <Animated.View
              style={{
                opacity: buttonOpacityAnim,
                transform: [{ translateY: buttonTranslateYAnim }],
              }}
            >
              <View style={[styles.addToCartButton, styles.disabledButton]}>
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.addToCartText}>Expired</Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagesSection: {
    height: Dimensions.get('window').height * 0.35,
    maxHeight: 350,
    minHeight: 250,
    backgroundColor: '#f5f5f5',
  },
  imagesScroll: {
    flex: 1,
  },
  comboImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.35,
    maxHeight: 350,
    minHeight: 250,
  },
  headerSection: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    fontWeight: '600',
    color: '#694d21',
    flex: 1,
    lineHeight: 26,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 75,
    justifyContent: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionSection: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  descriptionCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  descriptionIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    flex: 1,
    fontWeight: '400',
  },
  dateSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#694d21',
    marginLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  dateIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  productsSection: {
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '600',
    color: '#694d21',
    marginLeft: 8,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  productImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  quantityBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#694d21',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  quantityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: Platform.OS === 'ios' ? 16 : 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
    flexShrink: 1,
    lineHeight: 20,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  productPrice: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
    fontWeight: '400',
  },
  productTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#694d21',
  },
  priceSection: {
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  priceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 15,
    color: '#555',
    fontWeight: '400',
  },
  priceValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  discountAmount: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  finalPriceRow: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#694d21',
  },
  finalPriceLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#694d21',
  },
  finalPriceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#694d21',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  savingsText: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  addToCartButton: {
    backgroundColor: '#694d21',
    marginHorizontal: 12,
    marginBottom: 8,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    minHeight: 52,
  },
  addToCartButtonInner: {
    flex: 1,
    padding: Platform.OS === 'ios' ? 14 : 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.7,
    elevation: 0,
  },
  addToCartText: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 16 : 17,
    fontWeight: '600',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
});

