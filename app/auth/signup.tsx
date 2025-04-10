import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  otp: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    otp: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the Terms & Conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestOTP = async () => {
    if (validateForm()) {
      try {
        setLoading(true);
        const response = await apiService.requestSignupOTP(formData.email);
        
        if (response.error) {
          Alert.alert('Error', response.error);
          return;
        }

        setShowOtpInput(true);
        setOtpSent(true);
        Alert.alert('Success', 'Verification code sent to your email');
      } catch (error) {
        Alert.alert('Error', 'Failed to send verification code. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOTP = async () => {
    if (!formData.otp) {
      setErrors({ ...errors, otp: 'Please enter verification code' });
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.verifySignupOTP(
        formData.email,
        formData.otp,
        formData.fullName,
        formData.password
      );
      
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      Alert.alert(
        'Success',
        'Account created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Verification error:', error);
      }
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create Account',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Join Saranga Ayurveda</Text>
            <Text style={styles.welcomeSubtitle}>
              Create an account to discover the best in beauty
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                value={formData.fullName}
                onChangeText={(text) => {
                  setFormData({ ...formData, fullName: text });
                  if (errors.fullName) {
                    setErrors({ ...errors, fullName: '' });
                  }
                }}
                placeholder="Enter your full name"
                editable={!loading && !showOtpInput}
              />
              {errors.fullName && (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({ ...formData, email: text });
                  if (errors.email) {
                    setErrors({ ...errors, email: '' });
                  }
                }}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading && !showOtpInput}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={formData.phone}
                onChangeText={(text) => {
                  setFormData({ ...formData, phone: text });
                  if (errors.phone) {
                    setErrors({ ...errors, phone: '' });
                  }
                }}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                maxLength={10}
                editable={!loading && !showOtpInput}
              />
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password && styles.inputError,
                  ]}
                  value={formData.password}
                  onChangeText={(text) => {
                    setFormData({ ...formData, password: text });
                    if (errors.password) {
                      setErrors({ ...errors, password: '' });
                    }
                  }}
                  placeholder="Create a password"
                  secureTextEntry={!showPassword}
                  editable={!loading && !showOtpInput}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.confirmPassword && styles.inputError,
                  ]}
                  value={formData.confirmPassword}
                  onChangeText={(text) => {
                    setFormData({ ...formData, confirmPassword: text });
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: '' });
                    }
                  }}
                  placeholder="Confirm your password"
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading && !showOtpInput}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {showOtpInput && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={[styles.input, errors.otp && styles.inputError]}
                  value={formData.otp}
                  onChangeText={(text) => {
                    setFormData({ ...formData, otp: text });
                    if (errors.otp) {
                      setErrors({ ...errors, otp: '' });
                    }
                  }}
                  placeholder="Enter verification code"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
                {errors.otp && (
                  <Text style={styles.errorText}>{errors.otp}</Text>
                )}
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleRequestOTP}
                  disabled={loading}
                >
                  <Text style={styles.resendButtonText}>Resend Code</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() =>
                  setFormData({ ...formData, acceptTerms: !formData.acceptTerms })
                }
                disabled={loading || showOtpInput}
              >
                <Ionicons
                  name={formData.acceptTerms ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={formData.acceptTerms ? '#FF69B4' : '#666'}
                />
              </TouchableOpacity>
              <View style={styles.termsText}>
                <Text style={styles.termsLabel}>
                  <Text>By signing up, you agree to our </Text>
                  <Text style={styles.termsLink}>Terms & Conditions</Text>
                  <Text> and </Text>
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>
            </View>
            {errors.acceptTerms && (
              <Text style={styles.errorText}>{errors.acceptTerms}</Text>
            )}

            <TouchableOpacity
              style={styles.signupButton}
              onPress={showOtpInput ? handleVerifyOTP : handleRequestOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signupButtonText}>
                  {showOtpInput ? 'Verify & Create Account' : 'Request Verification Code'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    marginRight: 8,
  },
  termsText: {
    flex: 1,
  },
  termsLabel: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsLink: {
    color: '#FF69B4',
    fontWeight: '500',
  },
  signupButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  resendButtonText: {
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: '500',
  },
}); 