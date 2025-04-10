import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAddress } from './AddressContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AddressesScreen() {
  const router = useRouter();
  const { addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, fetchAddresses } = useAddress();
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newAddress, setNewAddress] = useState({
    id: null as number | null,
    full_name: '',
    phone_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    address_type: 'Home',
    is_default: false,
  });

  const onRefresh = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert('Error', 'Please login to view addresses');
        return;
      }
      setRefreshing(true);
      await fetchAddresses();
    } catch (error) {
      console.error('Error refreshing addresses:', error);
      Alert.alert('Error', 'Failed to refresh addresses. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        setIsLoading(true);
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
          router.replace('/auth/login');
          return;
        }
        await fetchAddresses();
      } catch (error) {
        console.error('Error loading addresses:', error);
        Alert.alert('Error', 'Failed to load addresses. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAddresses();
  }, []);

  const handleAddAddress = async () => {
    try {
        // Log initial state
        console.log('Initial address data:', newAddress);

        // Map the fields to match the API's expected format
        const mappedAddress = {
            full_name: newAddress.full_name,
            phone_number: newAddress.phone_number,
            address_line1: newAddress.address_line1,
            address_line2: newAddress.address_line2,
            city: newAddress.city,
            state: newAddress.state,
            postal_code: newAddress.postal_code,
            country: newAddress.country || 'India',
            address_type: newAddress.address_type || 'Home',
            is_default: Boolean(newAddress.is_default)
        };

        // Trim all text fields to remove whitespace
        const trimmedAddress = Object.entries(mappedAddress).reduce((acc, [key, value]) => ({
            ...acc,
            [key]: typeof value === 'string' ? value.trim() : value
        }), {} as typeof mappedAddress);

        console.log('Trimmed address data:', trimmedAddress);

        // Validate required fields with detailed logging
        const requiredFields = {
            full_name: trimmedAddress.full_name,
            phone_number: trimmedAddress.phone_number,
            address_line1: trimmedAddress.address_line1,
            city: trimmedAddress.city,
            state: trimmedAddress.state,
            postal_code: trimmedAddress.postal_code
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        console.log('Validation results:', {
            requiredFields,
            missingFields,
            fieldLengths: Object.entries(requiredFields).reduce((acc, [key, value]) => ({
                ...acc,
                [key]: value?.length || 0
            }), {})
        });

        if (missingFields.length > 0) {
            console.log('Missing required fields:', missingFields);
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        // Validate phone number format
        const cleanPhoneNumber = trimmedAddress.phone_number.replace(/[-\s]/g, '');
        console.log('Phone number validation:', {
            original: trimmedAddress.phone_number,
            cleaned: cleanPhoneNumber,
            isValid: /^\d{10}$/.test(cleanPhoneNumber)
        });

        if (!/^\d{10}$/.test(cleanPhoneNumber)) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number');
            return;
        }

        // Validate postal code
        const cleanPostalCode = trimmedAddress.postal_code.replace(/\s/g, '');
        console.log('Postal code validation:', {
            original: trimmedAddress.postal_code,
            cleaned: cleanPostalCode,
            isValid: /^\d{6}$/.test(cleanPostalCode)
        });

        if (!/^\d{6}$/.test(cleanPostalCode)) {
            Alert.alert('Error', 'Please enter a valid 6-digit postal code');
            return;
        }

        console.log('All validations passed, sending to API:', trimmedAddress);

        setIsLoading(true);
        const result = await addAddress(trimmedAddress);
        console.log('API response:', result);
        
        setIsAdding(false);
        
        // Reset form
        setNewAddress({
            id: null,
            full_name: '',
            phone_number: '',
            address_line1: '',
            address_line2: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'India',
            address_type: 'Home',
            is_default: false,
        });
        
        Alert.alert('Success', 'Address added successfully');
    } catch (error) {
        console.error('Error in handleAddAddress:', error);
        Alert.alert(
            'Error',
            error instanceof Error ? error.message : 'Failed to add address. Please try again.'
        );
    } finally {
        setIsLoading(false);
    }
};

  const handleDeleteAddress = (id: number) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteAddress(id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (id: number) => {
    try {
      setIsLoading(true);
      await setDefaultAddress(id);
    } catch (error) {
      Alert.alert('Error', 'Failed to set default address. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Delivery Addresses',
          headerRight: () => <View />,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerShadowVisible: false,
        }}
      />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF69B4']}
            tintColor="#FF69B4"
          />
        }
      >
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF69B4" />
          </View>
        )}

        {!isAdding && (
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={() => {
              setNewAddress({
                id: null,
                full_name: '',
                phone_number: '',
                address_line1: '',
                address_line2: '',
                city: '',
                state: '',
                postal_code: '',
                country: 'India',
                address_type: 'Home',
                is_default: false,
              });
              setIsAdding(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FF69B4" />
            <Text style={styles.addNewButtonText}>Add New Address</Text>
          </TouchableOpacity>
        )}

        {isAdding ? (
          <View style={styles.addForm}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {newAddress.id ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setNewAddress({
                    id: null,
                    full_name: '',
                    phone_number: '',
                    address_line1: '',
                    address_line2: '',
                    city: '',
                    state: '',
                    postal_code: '',
                    country: 'India',
                    address_type: 'Home',
                    is_default: false,
                  });
                  setIsAdding(false);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              value={newAddress.full_name}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, full_name: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              value={newAddress.phone_number}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, phone_number: text }))}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Street Address *"
              value={newAddress.address_line1}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, address_line1: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Apartment, Suite, etc. (optional)"
              value={newAddress.address_line2}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, address_line2: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="City *"
              value={newAddress.city}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, city: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="State/Province *"
              value={newAddress.state}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, state: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Postal Code *"
              value={newAddress.postal_code}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, postal_code: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Country"
              value={newAddress.country}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, country: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Label (e.g., Home, Work)"
              value={newAddress.address_type}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, address_type: text }))}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsAdding(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleAddAddress}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressTypeContainer}>
                    {address.address_type && (
                      <Text style={styles.addressLabel}>{address.address_type}</Text>
                    )}
                    {address.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setNewAddress({
                          id: address.id,
                          full_name: address.full_name,
                          phone_number: address.phone_number,
                          address_line1: address.address_line1,
                          address_line2: address.address_line2 || '',
                          city: address.city,
                          state: address.state,
                          postal_code: address.postal_code,
                          country: address.country,
                          address_type: address.address_type,
                          is_default: address.is_default,
                        });
                        setIsAdding(true);
                      }}
                      style={styles.actionButton}
                    >
                      <Ionicons name="create-outline" size={20} color="#FF69B4" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteAddress(address.id)}
                      style={[styles.actionButton, styles.deleteButton]}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.addressContent}>
                  <Text style={styles.nameText}>{address.full_name}</Text>
                  <Text style={styles.phoneText}>{address.phone_number}</Text>
                  <Text style={styles.addressText}>
                    {address.address_line1}
                    {address.address_line2 ? `, ${address.address_line2}` : ''}
                  </Text>
                  <Text style={styles.addressText}>
                    {address.city}, {address.state} {address.postal_code}
                  </Text>
                  <Text style={styles.addressText}>{address.country}</Text>
                </View>
                {!address.is_default && (
                  <TouchableOpacity
                    onPress={() => handleSetDefault(address.id)}
                    style={styles.setDefaultButton}
                  >
                    <Text style={styles.setDefaultText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: 20,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF69B4',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addNewButtonText: {
    color: '#FF69B4',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  addForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#FF69B4',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  addressList: {
    padding: 16,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressLabel: {
    fontSize: 14,
    color: '#FF69B4',
    fontWeight: '600',
    backgroundColor: '#fff5f7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  addressContent: {
    marginBottom: 12,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
    lineHeight: 20,
  },
  defaultBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: '600',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
  },
  setDefaultButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignSelf: 'flex-start',
  },
  setDefaultText: {
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: '600',
  },
}); 