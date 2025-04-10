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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  photo_url: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    photo_url: '',
  });
  const [photoChanged, setPhotoChanged] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/users/profile');
      if (response.data) {
        setProfile(response.data);
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
    <>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.photoContainer}>
          <TouchableOpacity onPress={handlePhotoUpload} style={styles.photoWrapper}>
            {profile.photo_url ? (
              <Image
                source={{ uri: profile.photo_url }}
                style={styles.photo}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={40} color="#666" />
              </View>
            )}
            <View style={styles.editIconContainer}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={profile.name}
              onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
              placeholder="Enter your name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, { color: '#666' }]}
              value={profile.email}
              editable={false}
              placeholder="Your email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={profile.phone}
              onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  photoContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF69B4',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  form: {
    padding: 16,
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
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#FF69B4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 