import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { apiService } from '../services/api';

const { width, height } = Dimensions.get('window');

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
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Start animations on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
          headerShown: false,
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient
          colors={['#E3F2FD', '#F8F9FA', '#FFFFFF']}
          style={styles.backgroundGradient}
        />
        
        {/* Floating Elements */}
        <View style={styles.floatingElements}>
          <Animated.View style={[styles.floatingCircle1, { opacity: fadeAnim }]} />
          <Animated.View style={[styles.floatingCircle2, { opacity: fadeAnim }]} />
          <Animated.View style={[styles.floatingCircle3, { opacity: fadeAnim }]} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim }
                  ]
                }
              ]}
            >
              {/* Header Section */}
              <View style={styles.headerSection}>
                <View style={styles.logoContainer}>
                  <LinearGradient
                    colors={['#007AFF', '#0056CC']}
                    style={styles.logoGradient}
                  >
                    <Ionicons name="leaf" size={32} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.welcomeTitle}>Join Saranga Ayurveda</Text>
                <Text style={styles.welcomeSubtitle}>
                  Create an account to discover the best in beauty and wellness
                </Text>
              </View>

              {/* Form Section */}
              <BlurView intensity={20} style={styles.formContainer}>
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={[styles.inputContainer, errors.fullName && styles.inputError]}>
                      <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.fullName}
                        onChangeText={(text) => {
                          setFormData({ ...formData, fullName: text });
                          if (errors.fullName) {
                            setErrors({ ...errors, fullName: '' });
                          }
                        }}
                        placeholder="Enter your full name"
                        placeholderTextColor="#999"
                        editable={!loading && !showOtpInput}
                      />
                    </View>
                    {errors.fullName && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#ff4444" />
                        <Text style={styles.errorText}>{errors.fullName}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                      <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.email}
                        onChangeText={(text) => {
                          setFormData({ ...formData, email: text });
                          if (errors.email) {
                            setErrors({ ...errors, email: '' });
                          }
                        }}
                        placeholder="Enter your email address"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading && !showOtpInput}
                      />
                    </View>
                    {errors.email && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#ff4444" />
                        <Text style={styles.errorText}>{errors.email}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                      <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.phone}
                        onChangeText={(text) => {
                          setFormData({ ...formData, phone: text });
                          if (errors.phone) {
                            setErrors({ ...errors, phone: '' });
                          }
                        }}
                        placeholder="Enter your phone number"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        maxLength={10}
                        editable={!loading && !showOtpInput}
                      />
                    </View>
                    {errors.phone && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#ff4444" />
                        <Text style={styles.errorText}>{errors.phone}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                      <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.password}
                        onChangeText={(text) => {
                          setFormData({ ...formData, password: text });
                          if (errors.password) {
                            setErrors({ ...errors, password: '' });
                          }
                        }}
                        placeholder="Create a password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showPassword}
                        editable={!loading && !showOtpInput}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.password && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#ff4444" />
                        <Text style={styles.errorText}>{errors.password}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                      <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.confirmPassword}
                        onChangeText={(text) => {
                          setFormData({ ...formData, confirmPassword: text });
                          if (errors.confirmPassword) {
                            setErrors({ ...errors, confirmPassword: '' });
                          }
                        }}
                        placeholder="Confirm your password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showConfirmPassword}
                        editable={!loading && !showOtpInput}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#ff4444" />
                        <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                      </View>
                    )}
                  </View>

                  {showOtpInput && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Verification Code</Text>
                      <View style={[styles.inputContainer, errors.otp && styles.inputError]}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.otp}
                          onChangeText={(text) => {
                            setFormData({ ...formData, otp: text });
                            if (errors.otp) {
                              setErrors({ ...errors, otp: '' });
                            }
                          }}
                          placeholder="Enter verification code"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={6}
                          editable={!loading}
                        />
                      </View>
                      {errors.otp && (
                        <View style={styles.errorContainer}>
                          <Ionicons name="alert-circle" size={16} color="#ff4444" />
                          <Text style={styles.errorText}>{errors.otp}</Text>
                        </View>
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
                        color={formData.acceptTerms ? '#007AFF' : '#666'}
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
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={16} color="#ff4444" />
                      <Text style={styles.errorText}>{errors.acceptTerms}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.signupButton}
                    onPress={showOtpInput ? handleVerifyOTP : handleRequestOTP}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={loading ? ['#ccc', '#999'] : ['#007AFF', '#0056CC']}
                      style={styles.signupButtonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.signupButtonText}>
                            {showOtpInput ? 'Verify & Create Account' : 'Request Verification Code'}
                          </Text>
                          <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.loginPrompt}>
                    <Text style={styles.loginText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/auth/login')}>
                      <Text style={styles.loginLink}>Log In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
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
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  floatingCircle2: {
    position: 'absolute',
    top: 200,
    left: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 86, 204, 0.1)',
  },
  floatingCircle3: {
    position: 'absolute',
    bottom: 200,
    right: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  contentContainer: {
    flex: 1,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formContainer: {
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
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
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 16,
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: '#ffebee',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
  eyeIcon: {
    padding: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
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
    color: '#007AFF',
    fontWeight: '600',
  },
  signupButton: {
    borderRadius: 16,
    marginVertical: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  signupButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 