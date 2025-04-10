import React, { useState, useEffect } from 'react';
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
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

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
              onPress: () => router.push('/support/live-chat'),
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
    <View style={styles.defaultAvatar}>
      <Ionicons name="person" size={50} color="#ccc" />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text>Please log in to view your profile</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#FFF0F5', '#fff']}
          style={styles.header}
        >
          <Animated.View style={[{ opacity: fadeAnim, alignItems: 'center' }]}>
            <TouchableOpacity onPress={handleAvatarPress}>
              {userProfile?.photo_url ? (
                <Image
                  source={{ uri: apiService.getFullImageUrl(userProfile.photo_url) }}
                  style={styles.avatar}
                />
              ) : (
                <DefaultAvatar />
              )}
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userProfile?.name}</Text>
              <Text style={styles.userEmail}>{userProfile?.email}</Text>
              <TouchableOpacity 
                style={styles.editProfileButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userProfile?.stats.totalOrders || 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userProfile?.stats.wishlistCount || 0}</Text>
            <Text style={styles.statLabel}>Wishlist</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userProfile?.stats.cartCount || 0}</Text>
            <Text style={styles.statLabel}>Cart</Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => item.route && handleNavigation(item.route)}
            >
              <LinearGradient
                colors={['#FFF0F5', '#FFE4E1']}
                style={styles.menuIcon}
              >
                <Ionicons name={item.icon} size={24} color="#FF69B4" />
              </LinearGradient>
              <Text style={styles.menuTitle}>{item.title}</Text>
              {item.badge ? (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{item.badge}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      <Modal visible={isImageViewerVisible} transparent={true}>
        <ImageViewer
          imageUrls={images}
          enableSwipeDown
          onSwipeDown={() => setIsImageViewerVisible(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FF69B4',
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FF69B4',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  editProfileButton: {
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  editProfileText: {
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#f0f0f0',
    alignSelf: 'center',
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuBadge: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    margin: 16,
    marginTop: 24,
    backgroundColor: '#FFF0F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  logoutText: {
    color: '#FF69B4',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loginButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 24,
  },
}); 