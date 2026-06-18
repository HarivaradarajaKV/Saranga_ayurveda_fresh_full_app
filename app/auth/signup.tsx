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
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { authEvents } from '../services/authEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';

WebBrowser.maybeCompleteAuthSession();

const BACKEND_URL = 'https://ayurveda-saranga-backend.vercel.app/api';
const SANS_SERIF = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const BRAND_GREEN = '#3d5236';

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
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Start animations on mount
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

  // ──────────────────────────────────────────────────────────────────────────
  // Google Sign-In — backend-handled OAuth flow
  // ──────────────────────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      const appCallback = Linking.createURL('auth/callback');
      const googleUrl = `${BACKEND_URL}/auth/google?app_callback=${encodeURIComponent(appCallback)}`;

      const result = await WebBrowser.openAuthSessionAsync(googleUrl, appCallback);

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token as string | undefined;
        const authError = parsed.queryParams?.error as string | undefined;

        if (authError) {
          Alert.alert('Error', 'Google Sign-In failed. Please try again.');
          return;
        }

        // iOS: ASWebAuthenticationSession captures the redirect internally —
        // the OS never fires a deep link, so we process the token here.
        // Android: the deep link fires and app/auth/callback.tsx handles it.
        if (Platform.OS === 'ios' && token) {
          await processAuthToken(decodeURIComponent(token));
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      Alert.alert('Error', 'Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processAuthToken = async (token: string) => {
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      console.log('Google signup role:', tokenData.role);

      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_role', tokenData.role);
      if (tokenData.id) await AsyncStorage.setItem('user_id', String(tokenData.id));
      if (tokenData.name) {
        await AsyncStorage.setItem('name', tokenData.name);
        await AsyncStorage.setItem('user_name', tokenData.name);
      }

      authEvents.notify();

      if (tokenData.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('Token processing error:', err);
      router.replace('/(tabs)');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        let fullNameStr = undefined;
        if (credential.fullName) {
          const { givenName, familyName } = credential.fullName;
          fullNameStr = [givenName, familyName].filter(Boolean).join(' ').trim() || undefined;
        }

        const response = await apiService.appleSignIn(
          credential.identityToken,
          credential.email || undefined,
          fullNameStr
        );

        if (response.error) {
          Alert.alert('Error', response.error);
          return;
        }

        if (response.data?.token) {
          await processAuthToken(response.data.token);
        } else {
          Alert.alert('Error', 'Apple Sign-In failed. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Apple Sign-In failed: No identity token returned.');
      }
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple Sign-In error:', err);
        Alert.alert('Error', 'Apple Sign-In failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

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

    // Phone number is optional in mockup, but if provided must be a valid 10-digit number
    if (formData.phone.trim()) {
      if (!/^\d{10}$/.test(formData.phone.trim())) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      }
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
        }}
      />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Header Section */}
              <View style={styles.headerSection}>
                <Text style={styles.welcomeTitle}>Create Account</Text>
                <Text style={styles.welcomeSubtitle}>Join Saranga Ayurveda</Text>
              </View>

              {/* Full Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={[styles.inputContainer, errors.fullName && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    value={formData.fullName}
                    onChangeText={(text) => {
                      setFormData({ ...formData, fullName: text });
                      if (errors.fullName) setErrors({ ...errors, fullName: '' });
                    }}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                    editable={!loading && !showOtpInput}
                  />
                  <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIconRight} />
                </View>
                {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
              </View>

              {/* Email Address Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => {
                      setFormData({ ...formData, email: text });
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    placeholder="Enter your email address"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading && !showOtpInput}
                  />
                  <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIconRight} />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              {/* Phone Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number (Optional)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Prefix Box */}
                  <View style={styles.prefixContainer}>
                    <Text style={styles.prefixText}>+91</Text>
                    <Ionicons name="chevron-down" size={12} color="#666" style={{ marginLeft: 6 }} />
                  </View>
                  {/* Phone Input */}
                  <View style={[styles.phoneInputContainer, errors.phone && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={formData.phone}
                      onChangeText={(text) => {
                        setFormData({ ...formData, phone: text });
                        if (errors.phone) setErrors({ ...errors, phone: '' });
                      }}
                      placeholder="Enter your phone number"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!loading && !showOtpInput}
                    />
                  </View>
                </View>
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={(text) => {
                      setFormData({ ...formData, password: text });
                      if (errors.password) setErrors({ ...errors, password: '' });
                    }}
                    placeholder="Create a password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    editable={!loading && !showOtpInput}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#999"
                      style={styles.inputIconRight}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    value={formData.confirmPassword}
                    onChangeText={(text) => {
                      setFormData({ ...formData, confirmPassword: text });
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                    }}
                    placeholder="Confirm your password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading && !showOtpInput}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#999"
                      style={styles.inputIconRight}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
              </View>

              {/* OTP Field (if needed) */}
              {showOtpInput && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <View style={[styles.inputContainer, errors.otp && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={formData.otp}
                      onChangeText={(text) => {
                        setFormData({ ...formData, otp: text });
                        if (errors.otp) setErrors({ ...errors, otp: '' });
                      }}
                      placeholder="Enter verification code"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                    />
                    <Ionicons name="shield-checkmark-outline" size={20} color="#999" style={styles.inputIconRight} />
                  </View>
                  {errors.otp ? <Text style={styles.errorText}>{errors.otp}</Text> : null}
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleRequestOTP}
                    disabled={loading}
                  >
                    <Text style={styles.resendButtonText}>Resend Code</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Accept Terms Checkbox */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  style={[
                    styles.customCheckbox,
                    formData.acceptTerms && styles.customCheckboxChecked
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, acceptTerms: !formData.acceptTerms })
                  }
                  disabled={loading || showOtpInput}
                  activeOpacity={0.8}
                >
                  {formData.acceptTerms && (
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  )}
                </TouchableOpacity>
                <View style={styles.termsText}>
                  <Text style={styles.termsLabel}>
                    I agree to the{' '}
                    <Text style={styles.termsLink} onPress={() => router.push('/legal/terms')}>
                      Terms & Conditions
                    </Text>{' '}
                    and{' '}
                    <Text style={styles.termsLink} onPress={() => router.push('/legal/privacy-policy')}>
                      Privacy Policy
                    </Text>
                  </Text>
                </View>
              </View>
              {errors.acceptTerms ? <Text style={[styles.errorText, { marginTop: -10, marginBottom: 15 }]}>{errors.acceptTerms}</Text> : null}

              {/* Signup Button */}
              <TouchableOpacity
                style={[styles.signupButton, loading && styles.buttonDisabled]}
                onPress={showOtpInput ? handleVerifyOTP : handleRequestOTP}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signupButtonText}>
                    {showOtpInput ? 'VERIFY & CREATE ACCOUNT' : 'CREATE ACCOUNT'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* OR Divider and Google button */}
              {!showOtpInput && (
                <>
                  <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={[styles.googleButton, loading && styles.buttonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-google" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.googleButtonText}>Sign In with Google</Text>
                  </TouchableOpacity>

                  {/* Apple Sign In Button (iOS only) */}
                  {Platform.OS === 'ios' && (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                    />
                  )}
                </>
              )}

              {/* Footer Link */}
              <View style={styles.loginPrompt}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/auth/login')}>
                  <Text style={styles.loginLink}>Log In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf6f0',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerSection: {
    marginBottom: 28,
  },
  welcomeTitle: {
    fontFamily: 'CormorantGaramond-Bold',
    fontSize: 32,
    color: '#2b3a1a',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontFamily: SANS_SERIF,
    fontSize: 14,
    color: '#777777',
  },
  inputGroup: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontFamily: SANS_SERIF,
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
    fontFamily: SANS_SERIF,
    paddingVertical: 10,
  },
  inputIconRight: {
    marginLeft: 12,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  prefixContainer: {
    width: 80,
    height: 52,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prefixText: {
    fontFamily: SANS_SERIF,
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 52,
  },
  errorText: {
    fontFamily: SANS_SERIF,
    color: '#ff4444',
    fontSize: 12,
    marginTop: 6,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 16,
  },
  customCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  customCheckboxChecked: {
    backgroundColor: BRAND_GREEN,
    borderColor: BRAND_GREEN,
  },
  termsText: {
    flex: 1,
  },
  termsLabel: {
    fontFamily: SANS_SERIF,
    fontSize: 13,
    color: '#555555',
    lineHeight: 18,
  },
  termsLink: {
    color: BRAND_GREEN,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: BRAND_GREEN,
    height: 50,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    fontFamily: SANS_SERIF,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontFamily: SANS_SERIF,
    color: '#555555',
    fontSize: 14,
  },
  loginLink: {
    fontFamily: SANS_SERIF,
    color: BRAND_GREEN,
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: 12,
  },
  resendButtonText: {
    fontFamily: SANS_SERIF,
    color: BRAND_GREEN,
    fontSize: 13,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    fontFamily: SANS_SERIF,
    color: '#777777',
    fontSize: 13,
    paddingHorizontal: 12,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    height: 50,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  appleButton: {
    width: '100%',
    height: 50,
    borderRadius: 6,
    marginBottom: 8,
  },
  googleButtonText: {
    fontFamily: SANS_SERIF,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});