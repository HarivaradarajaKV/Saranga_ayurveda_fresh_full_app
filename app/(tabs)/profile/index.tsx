import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Alert,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Modal,
  StatusBar,
  KeyboardAvoidingView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';
import { authEvents } from '../../services/authEvents';
import ImageViewer from 'react-native-image-zoom-viewer';
import { LinearGradient } from 'expo-linear-gradient';
import { GenderAvatar } from '../../components/GenderAvatar';
import { useBottomTabBarHeight } from '../_layout';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useAddress } from '../../AddressContext';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  action?: () => void;
}

interface UserProfile {
  name: string;
  email: string;
  photo_url: string;
  gender?: 'male' | 'female' | 'other';
  stats: {
    totalOrders: number;
    totalSpent: number;
    wishlistCount: number;
    cartCount: number;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<{id: number; text: string; isBot: boolean}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<ScrollView>(null);
  const bottomTabHeight = useBottomTabBarHeight();
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  // Address Context integration
  const { addresses, fetchAddresses } = useAddress();

  // Get screen dimensions dynamically for responsive design
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isTablet = screenWidth >= 600;
  const isSmallDevice = screenWidth < 360;

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now(), text: chatInput.trim(), isBot: false };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    // First bot reply — acknowledgement
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Thank you for contacting us! We have received your message. 🙏',
        isBot: true,
      }]);
    }, 1000);
    // Second bot reply — follow-up
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Date.now() + 2,
        text: 'We are reviewing your query and will make sure to assist you as quickly as possible.',
        isBot: true,
      }]);
    }, 2200);
    // Third bot reply — handoff
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Date.now() + 3,
        text: 'Our support team will reach out to you shortly. Have a great day! 😊',
        isBot: true,
      }]);
    }, 3600);
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialMount = useRef(true);
  const lastFocusedState = useRef(false);

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  useEffect(() => {
    if (isFocused) {
      checkAuthAndLoadProfile();
      if (isLoggedIn) {
        fetchAddresses();
      }
    }
  }, [isFocused, isLoggedIn]);

  useEffect(() => {
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    if (scrollViewRef.current) {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });
    }
  };

  // Handle tab press for scroll to top
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
      if (isFocused) {
        e.preventDefault();
        scrollToTop();
      }
    });
    return unsubscribe;
  }, [navigation, isFocused]);

  useEffect(() => {
    // Track focus changes to prevent unwanted scrolling
    if (isFocused && !lastFocusedState.current) {
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }
    lastFocusedState.current = isFocused;
  }, [isFocused]);

  const checkAuthAndLoadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      const response = await apiService.getUserDashboard();
      if (response.error) {
        throw new Error(response.error);
      }

      setUserProfile({
        name: response.data.profile.name,
        email: response.data.profile.email,
        photo_url: response.data.profile.photo_url,
        gender: response.data.profile.gender || 'other',
        stats: response.data.stats
      });
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error loading profile:', error);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await apiService.logout();
              if (response.error) {
                throw new Error(response.error);
              }
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_role');
              await AsyncStorage.removeItem('user_id');
              await AsyncStorage.removeItem('name');
              await AsyncStorage.removeItem('user_name');
              setIsLoggedIn(false);
              router.replace('/auth/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone, and all your orders, wishlist, address, and profile data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await apiService.deleteAccount();
              if (response.error) {
                throw new Error(response.error);
              }
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_role');
              await AsyncStorage.removeItem('user_id');
              await AsyncStorage.removeItem('name');
              await AsyncStorage.removeItem('user_name');
              authEvents.notify();
              setIsLoggedIn(false);
              Alert.alert('Success', 'Your account has been deleted successfully.');
              router.replace('/auth/login');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleAvatarPress = () => {
    if (userProfile?.photo_url) {
      setIsImageViewerVisible(true);
    }
  };

  const DefaultAvatar = () => (
    <GenderAvatar 
      name={userProfile?.name || 'User'} 
      gender={userProfile?.gender || 'other'} 
      size={isTablet ? 72 : 60} 
    />
  );

  const menuItems: MenuItem[] = [
    {
      id: 'personal',
      title: 'Personal Information',
      subtitle: 'View and edit your profile details',
      icon: 'person-outline',
      route: '/profile/edit',
    },
    {
      id: 'address',
      title: 'Address',
      subtitle: 'Manage your saved address',
      icon: 'location-outline',
      route: '/profile/addresses',
    },
    {
      id: 'orders',
      title: 'Orders',
      subtitle: 'View your order history',
      icon: 'bag-outline',
      route: '/profile/orders',
    },
    {
      id: 'wishlist',
      title: 'Wishlist',
      subtitle: 'View your saved products',
      icon: 'heart-outline',
      route: '/(tabs)/wishlist',
    },
    {
      id: 'cart',
      title: 'Cart',
      subtitle: 'View items in your shopping cart',
      icon: 'cart-outline',
      route: '/(tabs)/cart',
    },
    {
      id: 'support',
      title: 'Support & Live Chat',
      subtitle: 'Contact our customer support team',
      icon: 'chatbubble-ellipses-outline',
      action: () => setShowSupportModal(true),
    },
    {
      id: 'delete_account',
      title: 'Delete Account',
      subtitle: 'Permanently delete your account',
      icon: 'trash-outline',
      action: handleDeleteAccount,
    },
    {
      id: 'logout',
      title: 'Logout',
      subtitle: 'Sign out from your account',
      icon: 'log-out-outline',
      action: handleLogout,
    },
  ];

  const handleItemPress = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b3a1a" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#fbf7f4', '#fbf7f4', '#fbf7f4']}
          style={styles.backgroundGradient}
        />
        <View style={[styles.emptyContainer, { maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
          <Animated.View style={[styles.emptyIconContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient
              colors={['#2b3a1a', '#3a5f3a']}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="person-outline" size={40} color="#fff" />
            </LinearGradient>
          </Animated.View>
          <Animated.Text style={[styles.emptyTitle, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            Welcome to Your Profile
          </Animated.Text>
          <Animated.Text style={[styles.emptySubtitle, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            Please log in to view your profile and manage your account
          </Animated.Text>
          <Animated.View style={[styles.loginButtonContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient
              colors={['#2b3a1a', '#3a5f3a']}
              style={styles.loginButtonGradient}
            >
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.loginButtonText}>Log In</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.loginButtonIcon} />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    );
  }

  const images = userProfile?.photo_url
    ? [
        {
          url: apiService.getFullImageUrl(userProfile.photo_url),
        },
      ]
    : [];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fcf9f6', '#fbf7f4', '#fcf9f6']}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={{ width: '100%', maxWidth: isTablet ? 720 : 650, alignSelf: 'center', flex: 1, position: 'relative' }}>
          
          {/* Responsive Leaf Background Graphic at Top-Right */}
          <Image 
            source={require('../../../assets/images/profile_leaf_bg.png')} 
            style={[styles.topLeafBg, { 
              width: isTablet ? 250 : 180, 
              height: isTablet ? 210 : 150 
            }]} 
            resizeMode="contain"
          />

          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: bottomTabHeight + (isTablet ? 40 : 20),
              paddingHorizontal: isTablet ? 24 : 0
            }}
          >
            {/* Responsive Header Text */}
            <View style={[styles.headerTextContainer, { marginTop: Platform.OS === 'ios' ? 10 : 25 }]}>
              <Text style={[styles.headerTitle, { fontSize: isTablet ? 40 : 34 }]}>My Account</Text>
              <Text style={[styles.headerSubtitle, { fontSize: isTablet ? 16 : 14 }]}>Welcome back, {userProfile?.name}!</Text>
            </View>

            {/* Combined User Info and Stats Card */}
            <Animated.View style={[styles.profileCardContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              <View style={[styles.profileCard, { padding: isTablet ? 24 : 20 }]}>
                
                {/* Profile Row */}
                <View style={styles.profileRow}>
                  <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
                    {userProfile?.photo_url ? (
                      <View style={styles.avatarContainer}>
                        <Image
                          source={{ uri: apiService.getFullImageUrl(userProfile.photo_url) }}
                          style={[styles.avatar, { 
                            width: isTablet ? 72 : 64, 
                            height: isTablet ? 72 : 64,
                            borderRadius: isTablet ? 36 : 32 
                          }]}
                        />
                        <View style={styles.avatarOverlay}>
                          <Ionicons name="camera" size={12} color="#fff" />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.avatarContainer}>
                        <DefaultAvatar />
                        <View style={styles.avatarOverlay}>
                          <Ionicons name="camera" size={12} color="#fff" />
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.profileInfoContainer}
                    onPress={handleEditProfile}
                    activeOpacity={0.7}
                  >
                    <View style={styles.profileInfo}>
                      <Text style={[styles.profileName, { fontSize: isTablet ? 21 : 19 }]}>{userProfile?.name}</Text>
                      <Text style={[styles.profileEmail, { fontSize: isTablet ? 14 : 13 }]}>{userProfile?.email}</Text>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={20} color="#888" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </View>

                {/* Stats Inner Card Box */}
                <View style={styles.statsInnerContainer}>
                  <View style={styles.statsRow}>
                    {/* Orders */}
                    <TouchableOpacity 
                      style={styles.statItem} 
                      onPress={() => router.push('/profile/orders')}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.statIconContainer, { 
                        width: isTablet ? 44 : 38, 
                        height: isTablet ? 44 : 38,
                        borderRadius: isTablet ? 22 : 19 
                      }]}>
                        <Ionicons name="bag-outline" size={isTablet ? 22 : 20} color="#2b3a1a" />
                      </View>
                      <Text style={[styles.statLabel, { fontSize: isTablet ? 13 : 11 }]} numberOfLines={1}>Orders</Text>
                      <Text style={[styles.statNumber, { fontSize: isTablet ? 20 : 17 }]}>{userProfile?.stats.totalOrders || 0}</Text>
                    </TouchableOpacity>

                    <View style={styles.statDivider} />

                    {/* Wishlist */}
                    <TouchableOpacity 
                      style={styles.statItem} 
                      onPress={() => router.push('/(tabs)/wishlist')}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.statIconContainer, { 
                        width: isTablet ? 44 : 38, 
                        height: isTablet ? 44 : 38,
                        borderRadius: isTablet ? 22 : 19 
                      }]}>
                        <Ionicons name="heart-outline" size={isTablet ? 22 : 20} color="#2b3a1a" />
                      </View>
                      <Text style={[styles.statLabel, { fontSize: isTablet ? 13 : 11 }]} numberOfLines={1}>Wishlist</Text>
                      <Text style={[styles.statNumber, { fontSize: isTablet ? 20 : 17 }]}>{userProfile?.stats.wishlistCount || 0}</Text>
                    </TouchableOpacity>

                    <View style={styles.statDivider} />

                    {/* Addresses */}
                    <TouchableOpacity 
                      style={styles.statItem} 
                      onPress={() => router.push('/profile/addresses')}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.statIconContainer, { 
                        width: isTablet ? 44 : 38, 
                        height: isTablet ? 44 : 38,
                        borderRadius: isTablet ? 22 : 19 
                      }]}>
                        <Ionicons name="location-outline" size={isTablet ? 22 : 20} color="#2b3a1a" />
                      </View>
                      <Text style={[styles.statLabel, { fontSize: isTablet ? 13 : 11 }]} numberOfLines={1}>Addresses</Text>
                      <Text style={[styles.statNumber, { fontSize: isTablet ? 20 : 17 }]}>{addresses.length}</Text>
                    </TouchableOpacity>

                    <View style={styles.statDivider} />

                    {/* Cart */}
                    <TouchableOpacity 
                      style={styles.statItem} 
                      onPress={() => router.push('/(tabs)/cart')}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.statIconContainer, { 
                        width: isTablet ? 44 : 38, 
                        height: isTablet ? 44 : 38,
                        borderRadius: isTablet ? 22 : 19 
                      }]}>
                        <Ionicons name="cart-outline" size={isTablet ? 22 : 20} color="#2b3a1a" />
                      </View>
                      <Text style={[styles.statLabel, { fontSize: isTablet ? 13 : 11 }]} numberOfLines={1}>Cart</Text>
                      <Text style={[styles.statNumber, { fontSize: isTablet ? 20 : 17 }]}>{userProfile?.stats.cartCount || 0}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Account Overview List Section */}
            <Text style={[styles.sectionTitle, { fontSize: isTablet ? 22 : 20 }]}>Account Overview</Text>

            <Animated.View style={[styles.menuCardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.menuCard}>
                {menuItems.map((item, index) => (
                  <View key={item.id}>
                    <TouchableOpacity
                      style={[styles.menuItem, { paddingVertical: isTablet ? 16 : 14 }]}
                      onPress={() => handleItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemLeft}>
                        <View style={[styles.menuItemIconContainer, { 
                          width: isTablet ? 40 : 36, 
                          height: isTablet ? 40 : 36,
                          borderRadius: isTablet ? 20 : 18,
                          backgroundColor: item.id === 'delete_account' ? '#fdeced' : '#f3f6f1'
                        }]}>
                          <Ionicons 
                            name={item.icon} 
                            size={isTablet ? 22 : 20} 
                            color={item.id === 'delete_account' ? '#d9534f' : '#2b3a1a'} 
                          />
                        </View>
                        <View style={styles.menuItemTextContainer}>
                          <Text style={[
                            styles.menuItemTitle, 
                            { fontSize: isTablet ? 16 : 15 },
                            item.id === 'delete_account' && { color: '#d9534f' }
                          ]}>{item.title}</Text>
                          <Text style={[styles.menuItemSubtitle, { fontSize: isTablet ? 13 : 12 }]} numberOfLines={1}>{item.subtitle}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#aaa" />
                    </TouchableOpacity>
                    {index < menuItems.length - 1 && <View style={styles.menuDivider} />}
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Bottom Promo / Support Banner */}
            <Animated.View style={[styles.bannerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={[styles.bannerCard, { padding: isTablet ? 20 : 16 }]}>
                <Image 
                  source={require('../../../assets/images/profile_wellness_banner.png')} 
                  style={[styles.bannerImage, { 
                    width: isTablet ? 120 : 90, 
                    height: isTablet ? 120 : 90 
                  }]}
                  resizeMode="cover"
                />
                <View style={styles.bannerContent}>
                  <Text style={[styles.bannerTitle, { 
                    fontSize: isTablet ? 18 : 16, 
                    lineHeight: isTablet ? 22 : 20 
                  }]}>Your wellness journey matters to us.</Text>
                  <Text style={[styles.bannerSubtitle, { 
                    fontSize: isTablet ? 13 : 12,
                    lineHeight: isTablet ? 17 : 15,
                    marginBottom: isTablet ? 14 : 10
                  }]}>We're here to support you every step of the way.</Text>
                  <TouchableOpacity 
                    style={[styles.bannerButton, { 
                      paddingHorizontal: isTablet ? 16 : 12,
                      paddingVertical: isTablet ? 10 : 8 
                    }]}
                    onPress={() => router.push('/(tabs)/explore')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.bannerButtonText, { fontSize: isTablet ? 13 : 12 }]}>Explore Our Products</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </ScrollView>

          {/* User Profile Zoom View Modal */}
          {images.length > 0 && (
            <Modal visible={isImageViewerVisible} transparent={true}>
              <ImageViewer
                imageUrls={images}
                enableSwipeDown
                onSwipeDown={() => setIsImageViewerVisible(false)}
              />
            </Modal>
          )}

          {/* Support Modal */}
          <Modal
            visible={showSupportModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowSupportModal(false)}
          >
            <View style={styles.supportOverlay}>
              <View style={styles.supportModal}>
                <View style={styles.supportModalHeader}>
                  <Text style={styles.supportModalTitle}>Contact Support</Text>
                  <TouchableOpacity
                    style={styles.supportCloseButton}
                    onPress={() => setShowSupportModal(false)}
                  >
                    <Ionicons name="close" size={22} color="#2b3a1a" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.supportModalSubtitle}>
                  How would you like to contact our support team?
                </Text>
                <TouchableOpacity
                  style={styles.supportOptionButton}
                  onPress={() => {
                    setShowSupportModal(false);
                    setTimeout(() => {
                      setChatMessages([{ id: 1, text: 'Hi! 👋 How can I help you today?', isBot: true }]);
                      setShowChatModal(true);
                    }, 200);
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color="#2b3a1a" />
                  <Text style={styles.supportOptionText}>Live Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.supportOptionButton}
                  onPress={() => {
                    setShowSupportModal(false);
                    router.push('/support/call');
                  }}
                >
                  <Ionicons name="call-outline" size={22} color="#2b3a1a" />
                  <Text style={styles.supportOptionText}>Call Support</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Live Chat Modal */}
          <Modal
            visible={showChatModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowChatModal(false)}
          >
            <View style={styles.chatOverlay}>
              <View style={styles.chatModalContainer}>
                {/* Chat Header */}
                <View style={styles.chatHeader}>
                  <View style={styles.chatHeaderLeft}>
                    <View style={styles.chatAvatarDot} />
                    <View>
                      <Text style={styles.chatHeaderTitle}>Customer Support</Text>
                      <Text style={styles.chatHeaderStatus}>Online</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.chatCloseButton}
                    onPress={() => setShowChatModal(false)}
                  >
                    <Ionicons name="close" size={22} color="#2b3a1a" />
                  </TouchableOpacity>
                </View>

                {/* Messages */}
                <ScrollView
                  ref={chatScrollRef}
                  style={styles.chatMessages}
                  contentContainerStyle={{ padding: 16 }}
                  onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                >
                  {chatMessages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.chatBubbleWrapper,
                        msg.isBot ? styles.chatBubbleWrapperBot : styles.chatBubbleWrapperUser,
                      ]}
                    >
                      {msg.isBot && (
                        <View style={styles.chatBotAvatar}>
                          <Ionicons name="leaf" size={12} color="#fff" />
                        </View>
                      )}
                      <View
                        style={[
                          styles.chatBubble,
                          msg.isBot ? styles.chatBubbleBot : styles.chatBubbleUser,
                        ]}
                      >
                        <Text style={[styles.chatBubbleText, msg.isBot ? styles.chatBubbleTextBot : styles.chatBubbleTextUser]}>
                          {msg.text}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Input Bar */}
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                  <View style={styles.chatInputRow}>
                    <TextInput
                      style={styles.chatInput}
                      value={chatInput}
                      onChangeText={setChatInput}
                      placeholder="Type your message..."
                      placeholderTextColor="#aaa"
                      multiline
                      returnKeyType="send"
                      onSubmitEditing={handleChatSend}
                    />
                    <TouchableOpacity
                      style={styles.chatSendButton}
                      onPress={handleChatSend}
                    >
                      <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              </View>
            </View>
          </Modal>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  topLeafBg: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 0,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  headerTextContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#2b3a1a',
    fontFamily: 'CormorantGaramond-Bold',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  profileCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0ece6',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 1,
    borderColor: '#e8eee4',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileInfo: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  profileName: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    fontFamily: 'CormorantGaramond-Bold',
  },
  profileEmail: {
    color: '#666',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f5f0eb',
    marginVertical: 18,
  },
  statsInnerContainer: {
    borderWidth: 1,
    borderColor: '#efe9df',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#faf8f5',
    marginTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    backgroundColor: '#f3f6f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#f5f0eb',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    fontFamily: 'CormorantGaramond-Bold',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  menuCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0ece6',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIconContainer: {
    backgroundColor: '#f3f6f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTextContainer: {
    paddingLeft: 12,
    flex: 1,
  },
  menuItemTitle: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuItemSubtitle: {
    color: '#777',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f5f0eb',
    marginLeft: 64,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bannerCard: {
    backgroundColor: '#edeae2',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2ded5',
  },
  bannerImage: {
    borderRadius: 12,
  },
  bannerContent: {
    flex: 1,
    paddingLeft: 16,
  },
  bannerTitle: {
    fontWeight: 'bold',
    color: '#2b3a1a',
    fontFamily: 'CormorantGaramond-Bold',
  },
  bannerSubtitle: {
    color: '#555',
    marginTop: 4,
  },
  bannerButton: {
    backgroundColor: '#2b3a1a',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fbf7f4',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    minHeight: Dimensions.get('window').height - (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) - 100,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  loginButtonContainer: {
    alignItems: 'center',
  },
  loginButtonGradient: {
    borderRadius: 16,
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  loginButtonIcon: {
    marginLeft: 4,
  },
  supportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  supportModal: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  supportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  supportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b3a1a',
  },
  supportCloseButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f3f5f0',
  },
  supportModalSubtitle: {
    fontSize: 13,
    color: '#7a7a7a',
    marginBottom: 20,
  },
  supportOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f5f0',
    marginBottom: 10,
  },
  supportOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2b3a1a',
  },
  chatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  chatModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fbf7f4',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatAvatarDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2b3a1a',
  },
  chatHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2b3a1a',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#5a9a4a',
    marginTop: 1,
  },
  chatCloseButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f3f5f0',
  },
  chatMessages: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  chatBubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
    gap: 8,
  },
  chatBubbleWrapperBot: {
    justifyContent: 'flex-start',
  },
  chatBubbleWrapperUser: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  chatBotAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2b3a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  chatBubbleBot: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  chatBubbleUser: {
    backgroundColor: '#2b3a1a',
    borderBottomRightRadius: 4,
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatBubbleTextBot: {
    color: '#222',
  },
  chatBubbleTextUser: {
    color: '#fff',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f3f5f0',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    maxHeight: 100,
  },
  chatSendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2b3a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});