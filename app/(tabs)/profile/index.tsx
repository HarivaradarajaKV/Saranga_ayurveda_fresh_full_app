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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';
import ImageViewer from 'react-native-image-zoom-viewer';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Chatbot from '../../components/Chatbot';
import { GenderAvatar } from '../../components/GenderAvatar';
import { useBottomTabBarHeight } from '../_layout';
import { useIsFocused, useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  badge?: number;
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
  const bottomTabHeight = useBottomTabBarHeight();
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialMount = useRef(true);
  const lastFocusedState = useRef(false);
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

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
    const unsubscribe = navigation.addListener('tabPress', (e) => {
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
    try {
      setLoading(true);
      const response = await apiService.logout();
      if (response.error) {
        throw new Error(response.error);
      }
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_role');
      setIsLoggedIn(false);
      router.replace('/auth/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'orders',
      title: 'My Orders',
      icon: 'receipt-outline',
      route: '/profile/orders',
      badge: userProfile?.stats.totalOrders || 0,
    },
    {
      id: 'addresses',
      title: 'My Addresses',
      icon: 'location-outline',
      route: '/addresses',
    },
    {
      id: 'support',
      title: 'Support',
      icon: 'help-circle-outline',
      route: '/support',
    },
  ];

  const handleNavigation = (route: string) => {
    try {
      if (route === '/support') {
        Alert.alert(
          'Contact Support',
          'How would you like to contact our support team?',
          [
            {
              text: 'Live Chat',
              onPress: () => router.push('../components/Chatbot'),
            },
            {
              text: 'Call Support',
              onPress: () => router.push('/support/call'),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      } else {
        router.push(route as any);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to navigate to the selected page.');
    }
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
      size={80} 
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#694d21" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#f8f9fa', '#ffffff', '#f1f3f4']}
          style={styles.backgroundGradient}
        />
        <View style={styles.floatingElements}>
          <View style={styles.floatingCircle1} />
          <View style={styles.floatingCircle2} />
          <View style={styles.floatingCircle3} />
        </View>
        <View style={styles.emptyContainer}>
          <Animated.View style={[styles.emptyIconContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient
              colors={['#694d21', '#5a3f1a']}
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
              colors={['#694d21', '#5a3f1a']}
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
        colors={['#f8f9fa', '#ffffff', '#f1f3f4']}
        style={styles.backgroundGradient}
      />
      <View style={styles.floatingElements}>
        <View style={styles.floatingCircle1} />
        <View style={styles.floatingCircle2} />
        <View style={styles.floatingCircle3} />
      </View>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={{
            paddingBottom: bottomTabHeight + 20
          }}
        >
          <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.headerCard}>
              <Animated.View style={[styles.headerContent, { transform: [{ scale: scaleAnim }] }]}>
                <TouchableOpacity onPress={handleAvatarPress}>
                  {userProfile?.photo_url ? (
                    <View style={styles.avatarContainer}>
                      <Image
                        source={{ uri: apiService.getFullImageUrl(userProfile.photo_url) }}
                        style={styles.avatar}
                      />
                      <View style={styles.avatarOverlay}>
                        <Ionicons name="camera" size={20} color="#fff" />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.avatarContainer}>
                      <DefaultAvatar />
                      <View style={styles.avatarOverlay}>
                        <Ionicons name="camera" size={20} color="#fff" />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{userProfile?.name}</Text>
                  <Text style={styles.userEmail}>{userProfile?.email}</Text>
                  <TouchableOpacity 
                    style={styles.editProfileButton}
                    onPress={handleEditProfile}
                  >
                    <LinearGradient
                      colors={['#694d21', '#5a3f1a']}
                      style={styles.editProfileGradient}
                    >
                      <Text style={styles.editProfileText}>Edit Profile</Text>
                      <Ionicons name="create-outline" size={16} color="#fff" style={styles.editProfileIcon} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: '#e3f2fd' }]}>
                  <Ionicons name="receipt-outline" size={20} color="#1976d2" />
                </View>
                <Text style={styles.statNumber}>{userProfile?.stats.totalOrders || 0}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: '#fce4ec' }]}>
                  <Ionicons name="heart-outline" size={20} color="#c2185b" />
                </View>
                <Text style={styles.statNumber}>{userProfile?.stats.wishlistCount || 0}</Text>
                <Text style={styles.statLabel}>Wishlist</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e8' }]}>
                  <Ionicons name="cart-outline" size={20} color="#388e3c" />
                </View>
                <Text style={styles.statNumber}>{userProfile?.stats.cartCount || 0}</Text>
                <Text style={styles.statLabel}>Cart</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.menuContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {menuItems.map((item, index) => (
              <Animated.View
                key={item.id}
                style={[
                  styles.menuItemContainer,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim },
                      { scale: scaleAnim }
                    ]
                  }
                ]}
              >
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => item.route && handleNavigation(item.route)}
                >
                  <View style={styles.menuItemCard}>
                    <View style={[
                      styles.menuIcon, 
                      { backgroundColor: item.id === 'orders' ? '#e3f2fd' : 
                                        item.id === 'addresses' ? '#e8f5e8' : 
                                        '#fff3e0' }
                    ]}>
                      <Ionicons 
                        name={item.icon} 
                        size={24} 
                        color={item.id === 'orders' ? '#1976d2' : 
                               item.id === 'addresses' ? '#388e3c' : 
                               '#f57c00'} 
                      />
                    </View>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    {item.badge ? (
                      <View style={[styles.menuBadge, { backgroundColor: '#ff4444' }]}>
                        <Text style={styles.menuBadgeText}>{item.badge}</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>

          <Animated.View style={[styles.logoutContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LinearGradient
                colors={['#ff4444', '#cc0000']}
                style={styles.logoutGradient}
              >
                <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.logoutIcon} />
                <Text style={styles.logoutText}>Logout</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.Text style={[styles.version, { opacity: fadeAnim }]}>Version 1.0.0</Animated.Text>
        </ScrollView>

        <Modal visible={isImageViewerVisible} transparent={true}>
          <ImageViewer
            imageUrls={images}
            enableSwipeDown
            onSwipeDown={() => setIsImageViewerVisible(false)}
          />
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingCircle1: {
    position: 'absolute',
    top: 100,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(105, 77, 33, 0.03)',
  },
  floatingCircle2: {
    position: 'absolute',
    top: 200,
    left: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(90, 63, 26, 0.03)',
  },
  floatingCircle3: {
    position: 'absolute',
    bottom: 200,
    right: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(105, 77, 33, 0.02)',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
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
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
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
  headerContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  headerContent: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  editProfileButton: {
    borderRadius: 16,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editProfileGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  editProfileIcon: {
    marginLeft: 4,
  },
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 20,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
  },
  menuContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  menuItemContainer: {
    marginBottom: 12,
  },
  menuItem: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemCard: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  logoutButton: {
    borderRadius: 12,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  logoutGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
}); 