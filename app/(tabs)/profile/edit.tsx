import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  photo_url: string;
}

const { width } = Dimensions.get('window');

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    photo_url: '',
  });
  const [photoChanged, setPhotoChanged] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadProfile();
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

    // Add subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/users/profile');
      if (response.data) {
        setProfile({
          name: response.data.name || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          photo_url: response.data.photo_url || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        
        // Create FormData
        const formData = new FormData();
        const photoUri = result.assets[0].uri;
        const photoName = photoUri.split('/').pop() || 'profile_photo.jpg';
        
        formData.append('photo', {
          uri: photoUri,
          name: photoName,
          type: 'image/jpeg'
        } as any);

        try {
          console.log('Uploading photo with FormData:', formData);
          const response = await apiService.uploadProfilePhoto(formData);
          
          if (response.error) {
            throw new Error(response.error);
          }
          
          if (response.data?.photo_url) {
            setProfile(prev => ({ ...prev, photo_url: response.data!.photo_url }));
            setPhotoChanged(true);
            Alert.alert('Success', 'Profile photo updated successfully');
          } else {
            throw new Error('No photo URL received from server');
          }
        } catch (error) {
          console.error('Error uploading photo:', error);
          Alert.alert('Error', 'Failed to upload photo. Please try again.');
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select photo');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Validate phone number
      if (profile.phone && !/^\d{10}$/.test(profile.phone.replace(/[-\s]/g, ''))) {
        Alert.alert('Error', 'Please enter a valid 10-digit phone number');
        return;
      }

      const response = await apiService.put('/users/profile', {
        name: profile.name,
        phone: profile.phone,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      await AsyncStorage.setItem('name', profile.name);
      await AsyncStorage.setItem('user_name', profile.name);

      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <LinearGradient
        colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
        style={styles.backgroundGradient}
      />
      <View style={styles.floatingElements}>
        <View style={styles.floatingCircle1} />
        <View style={styles.floatingCircle2} />
        <View style={styles.floatingCircle3} />
      </View>
      
      <SafeAreaView style={styles.safeArea}>
        <View style={{ width: '100%', maxWidth: 650, alignSelf: 'center', flex: 1 }}>
          <View style={styles.headerSection}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
              <Ionicons name="arrow-back" size={24} color="#2b3a1a" />
            </TouchableOpacity>
            <Text style={styles.brandTitle}>Edit Profile</Text>
          </View>

        <ScrollView 
          style={styles.container}
          contentContainerStyle={{
            paddingBottom: 80 + Math.max(insets.bottom, 4) // Tab bar height (60) + extra padding (20) + safe area
          }}
        >
          <Animated.View style={[styles.photoContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: pulseAnim }] }]}>
            <View style={styles.photoWrapper}>
              <BlurView intensity={20} style={styles.photoBlur}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                  style={styles.photoGradient}
                >
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="person" size={50} color="#2b3a1a" />
                  </View>
                </LinearGradient>
              </BlurView>
            </View>
          </Animated.View>

          <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <BlurView intensity={15} style={styles.formBlur}>
              <Animated.View style={[styles.inputGroup, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <Text style={styles.label}>Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#2b3a1a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={profile.name}
                    onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
                    placeholder="Enter your name"
                    placeholderTextColor="#999"
                  />
                </View>
              </Animated.View>

              <Animated.View style={[styles.inputGroup, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputContainer, styles.disabledInputContainer]}>
                  <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={profile.email}
                    editable={false}
                    placeholder="Your email"
                    placeholderTextColor="#999"
                  />
                </View>
              </Animated.View>

              <Animated.View style={[styles.inputGroup, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#2b3a1a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={profile.phone}
                    onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                </View>
              </Animated.View>

              <Animated.View style={[styles.saveButtonContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#2b3a1a', '#1e2912']}
                    style={styles.saveButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.saveButtonIcon} />
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </BlurView>
          </Animated.View>
        </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  photoContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  photoWrapper: {
    position: 'relative',
    borderRadius: 70,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  photoBlur: {
    borderRadius: 70,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  photoGradient: {
    borderRadius: 70,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  editIconGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  formBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledInputContainer: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  disabledInput: {
    color: '#666',
  },
  saveButtonContainer: {
    marginTop: 32,
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2b3a1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  safeArea: {
    flex: 1,
  },
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 10 : (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 6,
    zIndex: 10,
    position: 'relative',
  },
  headerBackButton: {
    position: 'absolute',
    left: 16,
    bottom: 14,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(43,58,26,0.08)',
    zIndex: 20,
  },
  brandTitle: {
    fontSize: 42,
    color: '#2b3a1a',
    textAlign: 'center',
    fontFamily: 'CormorantGaramond-Bold',
    letterSpacing: 1,
    marginBottom: 16,
  },
}); 