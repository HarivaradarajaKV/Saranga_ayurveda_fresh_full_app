import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAddress } from '../../AddressContext';

type AddressType = 'Home' | 'Work' | 'Other';

interface FormData {
  fullName: string;
  phoneNumber: string;
  pincode: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  addressType: AddressType;
}

const isValidAddressType = (type: string): type is AddressType => {
  return ['Home', 'Work', 'Other'].includes(type);
};

export default function EditAddressPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addresses, updateAddress, deleteAddress } = useAddress();

  const currentAddress = addresses.find(addr => addr.id === Number(id));

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phoneNumber: '',
    pincode: '',
    address: '',
    locality: '',
    city: '',
    state: '',
    addressType: 'Home',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (currentAddress) {
      const addressType = isValidAddressType(currentAddress.address_type) 
        ? currentAddress.address_type 
        : 'Home';

      setFormData({
        fullName: currentAddress.full_name || '',
        phoneNumber: currentAddress.phone_number || '',
        pincode: currentAddress.postal_code || '',
        address: currentAddress.address_line1 || '',
        locality: currentAddress.address_line2 || '',
        city: currentAddress.city || '',
        state: currentAddress.state || '',
        addressType
      });
    }
  }, [currentAddress]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Enter a valid 10-digit phone number';
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Enter a valid 6-digit pincode';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.locality.trim()) {
      newErrors.locality = 'Locality/Area is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm() && id) {
      updateAddress(Number(id), {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        postal_code: formData.pincode,
        address_line1: formData.address,
        address_line2: formData.locality,
        city: formData.city,
        state: formData.state,
        address_type: formData.addressType
      });
      
      Alert.alert(
        'Success',
        'Address updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }
  };

  const handleDelete = () => {
    if (!id) return;
    
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAddress(Number(id));
            Alert.alert('Success', 'Address deleted successfully!');
            router.back();
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Address',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              placeholder="Enter your full name"
            />
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.phoneNumber && styles.inputError]}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              placeholder="Enter 10-digit mobile number"
              keyboardType="numeric"
              maxLength={10}
            />
            {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pincode *</Text>
            <TextInput
              style={[styles.input, errors.pincode && styles.inputError]}
              value={formData.pincode}
              onChangeText={(text) => setFormData({ ...formData, pincode: text })}
              placeholder="Enter 6-digit pincode"
              keyboardType="numeric"
              maxLength={6}
            />
            {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address (House No, Building, Street) *</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.address && styles.inputError]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Enter your address"
              multiline
              numberOfLines={3}
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Locality / Area *</Text>
            <TextInput
              style={[styles.input, errors.locality && styles.inputError]}
              value={formData.locality}
              onChangeText={(text) => setFormData({ ...formData, locality: text })}
              placeholder="Enter locality or area"
            />
            {errors.locality && <Text style={styles.errorText}>{errors.locality}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              placeholder="Enter city"
            />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={[styles.input, errors.state && styles.inputError]}
              value={formData.state}
              onChangeText={(text) => setFormData({ ...formData, state: text })}
              placeholder="Enter state"
            />
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Type</Text>
            <View style={styles.addressTypeContainer}>
              {['Home', 'Work', 'Other'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.addressTypeButton,
                    formData.addressType === type && styles.addressTypeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, addressType: type })}
                >
                  <Ionicons
                    name={
                      type === 'Home'
                        ? 'home'
                        : type === 'Work'
                        ? 'business'
                        : 'location'
                    }
                    size={20}
                    color={formData.addressType === type ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.addressTypeText,
                      formData.addressType === type && styles.addressTypeTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Update Address</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Address</Text>
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
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  addressTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  addressTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 4,
  },
  addressTypeButtonActive: {
    backgroundColor: '#007bff',
  },
  addressTypeText: {
    marginLeft: 8,
    color: '#666',
    fontWeight: '500',
  },
  addressTypeTextActive: {
    color: '#fff',
  },
  buttonContainer: {
    padding: 16,
  },
  submitButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  deleteButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 