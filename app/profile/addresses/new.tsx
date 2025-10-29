import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInputProps,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAddress } from '../../AddressContext';
import { LinearGradient } from 'expo-linear-gradient';

interface FormField {
  value: string;
  error: string;
  ref: React.RefObject<TextInput | null>;
}

interface AddressFormData {
  full_name: FormField;
  phone_number: FormField;
  postal_code: FormField;
  address_line1: FormField;
  address_line2: FormField;
  city: FormField;
  state: FormField;
}

const CustomInput = React.forwardRef<TextInput, TextInputProps & {
  label: string;
  error?: string;
  containerStyle?: any;
  required?: boolean;
}>((props, ref) => {
  const { label, error, containerStyle, required, ...inputProps } = props;
  
  return (
    <View style={[styles.inputGroup, containerStyle]}>
      <Text style={styles.label}>{label} {required && '*'}</Text>
      <TextInput
        ref={ref}
        style={[
          styles.input,
          error ? styles.inputError : null,
          inputProps.multiline ? styles.textArea : null,
        ]}
        placeholderTextColor="#999"
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

export default function AddNewAddressPage() {
  const router = useRouter();
  const { addAddress } = useAddress();

  const initialFormState = {
    full_name: { value: '', error: '', ref: useRef<TextInput>(null) },
    phone_number: { value: '', error: '', ref: useRef<TextInput>(null) },
    postal_code: { value: '', error: '', ref: useRef<TextInput>(null) },
    address_line1: { value: '', error: '', ref: useRef<TextInput>(null) },
    address_line2: { value: '', error: '', ref: useRef<TextInput>(null) },
    city: { value: '', error: '', ref: useRef<TextInput>(null) },
    state: { value: '', error: '', ref: useRef<TextInput>(null) },
  };

  const [formData, setFormData] = useState<AddressFormData>(initialFormState);
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
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
    ]).start();
  }, []);

  const updateField = (field: keyof AddressFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
        error: '', // Clear error when user types
      },
    }));
  };

  const validateForm = () => {
    let isValid = true;
    const newFormData = { ...formData };

    // Required field validation
    const requiredFields: (keyof AddressFormData)[] = ['full_name', 'phone_number', 'postal_code', 'address_line1', 'city', 'state'];
    requiredFields.forEach(field => {
      if (!formData[field].value.trim()) {
        newFormData[field].error = `${field.split('_').join(' ').toUpperCase()} is required`;
        isValid = false;
      }
    });

    // Phone number validation
    if (formData.phone_number.value && !/^\d{10}$/.test(formData.phone_number.value)) {
      newFormData.phone_number.error = 'Enter a valid 10-digit phone number';
      isValid = false;
    }

    // Postal code validation
    if (formData.postal_code.value && !/^\d{6}$/.test(formData.postal_code.value)) {
      newFormData.postal_code.error = 'Enter a valid 6-digit postal code';
      isValid = false;
    }

    setFormData(newFormData);
    return isValid;
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    
    if (validateForm()) {
      const addressData = {
        full_name: formData.full_name.value,
        phone_number: formData.phone_number.value,
        postal_code: formData.postal_code.value,
        address_line1: formData.address_line1.value,
        address_line2: formData.address_line2.value || '',
        city: formData.city.value,
        state: formData.state.value,
        is_default: false
      };

      addAddress(addressData);
      Alert.alert(
        'Success',
        'Address added successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const focusNextField = (nextField: keyof AddressFormData) => {
    formData[nextField].ref.current?.focus();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add New Address',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#f8f6f0',
          },
          headerTintColor: '#694d21',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 20,
          },
        }}
      />
      <LinearGradient
        colors={['#f8f6f0', '#faf8f3', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          <Animated.View 
            style={[
              styles.form,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <CustomInput
              ref={formData.full_name.ref}
              label="Full Name"
              required
              value={formData.full_name.value}
              onChangeText={(text) => updateField('full_name', text)}
              placeholder="Enter your full name"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => focusNextField('phone_number')}
              blurOnSubmit={false}
              error={formData.full_name.error}
            />

            <CustomInput
              ref={formData.phone_number.ref}
              label="Phone Number"
              required
              value={formData.phone_number.value}
              onChangeText={(text) => updateField('phone_number', text)}
              placeholder="Enter 10-digit mobile number"
              keyboardType="numeric"
              maxLength={10}
              returnKeyType="next"
              onSubmitEditing={() => focusNextField('postal_code')}
              blurOnSubmit={false}
              error={formData.phone_number.error}
            />

            <CustomInput
              ref={formData.postal_code.ref}
              label="Postal Code"
              required
              value={formData.postal_code.value}
              onChangeText={(text) => updateField('postal_code', text)}
              placeholder="Enter 6-digit postal code"
              keyboardType="numeric"
              maxLength={6}
              returnKeyType="next"
              onSubmitEditing={() => focusNextField('address_line1')}
              blurOnSubmit={false}
              error={formData.postal_code.error}
            />

            <CustomInput
              ref={formData.address_line1.ref}
              label="Address (House No, Building, Street)"
              required
              value={formData.address_line1.value}
              onChangeText={(text) => updateField('address_line1', text)}
              placeholder="Enter your address"
              multiline
              numberOfLines={3}
              returnKeyType="next"
              onSubmitEditing={() => focusNextField('address_line2')}
              blurOnSubmit={false}
              error={formData.address_line1.error}
            />

            <CustomInput
              ref={formData.address_line2.ref}
              label="Locality / Area"
              value={formData.address_line2.value}
              onChangeText={(text) => updateField('address_line2', text)}
              placeholder="Enter locality or area"
              returnKeyType="next"
              onSubmitEditing={() => focusNextField('city')}
              blurOnSubmit={false}
              error={formData.address_line2.error}
            />

            <CustomInput
              ref={formData.city.ref}
              label="City"
              required
              value={formData.city.value}
              onChangeText={(text) => updateField('city', text)}
              placeholder="Enter city"
              returnKeyType="next"
              onSubmitEditing={() => focusNextField('state')}
              blurOnSubmit={false}
              error={formData.city.error}
            />

            <CustomInput
              ref={formData.state.ref}
              label="State"
              required
              value={formData.state.value}
              onChangeText={(text) => updateField('state', text)}
              placeholder="Enter state"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              error={formData.state.error}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address Type</Text>
              <View style={styles.addressTypeContainer}>
                {(['Home', 'Work', 'Other'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.addressTypeButton,
                      addressType === type && styles.addressTypeButtonActive,
                    ]}
                    onPress={() => setAddressType(type)}
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
                      color={addressType === type ? '#fff' : '#666'}
                    />
                    <Text
                      style={[
                        styles.addressTypeText,
                        addressType === type && styles.addressTypeTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
              ))}
            </View>
          </View>
          </Animated.View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
          >
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#694d21', '#5a3f1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.submitButtonText}>Save Address</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  addressTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  addressTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f2eb',
    marginHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
  },
  addressTypeButtonActive: {
    backgroundColor: '#694d21',
    borderColor: '#5a3f1a',
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  addressTypeText: {
    marginLeft: 8,
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  addressTypeTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  submitButton: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
}); 