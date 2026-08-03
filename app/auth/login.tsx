import React, { useState, useEffect, useRef } from 'react';
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
  SafeAreaView,
  BackHandler,
  Animated,
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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  // ──────────────────────────────────────────────────────────────────────────
  // Google Sign-In — backend-handled OAuth flow
  // The backend at /api/auth/google handles the Google OAuth handshake,
  // then redirects back to the app with a signed JWT token.
  // Works in Expo Go (exp://) and standalone (myapp://) without any proxy.
  // ──────────────────────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      // Linking.createURL adapts automatically:
      //   Expo Go      →  exp://192.168.x.x:8081/--/auth/callback
      //   Production   →  myapp://auth/callback
      const appCallback = Linking.createURL('auth/callback');
      const googleUrl = `${BACKEND_URL}/auth/google?app_callback=${encodeURIComponent(appCallback)}`;

      const result = await WebBrowser.openAuthSessionAsync(googleUrl, appCallback);

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token as string | undefined;
        const authError = parsed.queryParams?.error as string | undefined;

        if (authError) {
          setError('Google Sign-In failed. Please try again.');
          return;
        }

        // iOS: ASWebAuthenticationSession captures the redirect internally —
        // the OS never fires a deep link, so we must process the token here.
        // Android: the deep link fires separately and app/auth/callback.tsx
        // handles token processing — we skip it here to avoid double navigation.
        if (Platform.OS === 'ios' && token) {
          await processAuthToken(decodeURIComponent(token));
        }
        // On Android, just let the loading spinner stop —
        // callback.tsx will navigate to the correct screen.
      }
      // type === 'cancel' → user closed browser, no error shown
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setError('Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processAuthToken = async (token: string) => {
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      console.log('Login role:', tokenData.role);

      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_role', tokenData.role);
      if (tokenData.id) await AsyncStorage.setItem('user_id', String(tokenData.id));

      const nameVal = tokenData.name || '';
      const emailVal = tokenData.email || '';

      const isPlaceholder = (n: string, e: string) => {
        if (!n || n.trim() === '' || n === 'Apple User' || n === 'Google User') return true;
        if (n.includes('@')) return true;
        const prefix = e.split('@')[0].toLowerCase();
        const normalizedName = n.toLowerCase().replace(/[\s\._\-]/g, '');
        const normalizedPrefix = prefix.replace(/[\s\._\-]/g, '');
        if (normalizedName === normalizedPrefix) return true;
        if (normalizedName.startsWith(normalizedPrefix) && /^\d*$/.test(normalizedName.slice(normalizedPrefix.length))) {
          return true;
        }
        if (/^\d+$/.test(normalizedName)) return true;
        return false;
      };

      const navigateNext = () => {
        authEvents.notify();
        if (tokenData.role === 'admin') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/(tabs)');
        }
      };

      if (isPlaceholder(nameVal, emailVal) && Platform.OS === 'ios') {
        Alert.prompt(
          'Enter Your Name',
          'Please enter your full name to complete your profile.',
          [
            {
              text: 'Skip',
              onPress: async () => {
                await AsyncStorage.setItem('name', nameVal || 'Apple User');
                await AsyncStorage.setItem('user_name', nameVal || 'Apple User');
                navigateNext();
              },
              style: 'cancel',
            },
            {
              text: 'Save',
              onPress: async (enteredName?: string) => {
                const finalName = enteredName?.trim();
                if (finalName) {
                  try {
                    await apiService.updateUserProfile({ name: finalName });
                    await AsyncStorage.setItem('name', finalName);
                    await AsyncStorage.setItem('user_name', finalName);
                  } catch (e) {
                    console.error('Failed to update name:', e);
                    await AsyncStorage.setItem('name', finalName);
                    await AsyncStorage.setItem('user_name', finalName);
                  }
                } else {
                  await AsyncStorage.setItem('name', nameVal || 'Apple User');
                  await AsyncStorage.setItem('user_name', nameVal || 'Apple User');
                }
                navigateNext();
              },
            },
          ],
          'plain-text',
          ''
        );
      } else {
        if (nameVal) {
          await AsyncStorage.setItem('name', nameVal);
          await AsyncStorage.setItem('user_name', nameVal);
        }
        navigateNext();
      }
    } catch (err) {
      console.error('Token processing error:', err);
      router.replace('/(tabs)');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

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
          setError(response.error);
          return;
        }

        if (response.data?.token) {
          await processAuthToken(response.data.token);
        } else {
          setError('Apple Sign-In failed. Please try again.');
        }
      } else {
        setError('Apple Sign-In failed: No identity token returned.');
      }
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple Sign-In error:', err);
        setError('Apple Sign-In failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    async function checkAppleAuth() {
      try {
        if (Platform.OS === 'ios' && AppleAuthentication && typeof AppleAuthentication.isAvailableAsync === 'function') {
          const avail = await AppleAuthentication.isAvailableAsync();
          setIsAppleAvailable(avail);
        }
      } catch (err) {
        console.warn('Apple Authentication check error:', err);
        setIsAppleAvailable(false);
      }
    }
    checkAppleAuth();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(tabs)');
      return true;
    });

    return () => backHandler.remove();
  }, []);

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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await apiService.login(email, password);

      if (response.error) {
        setError(response.error || 'Invalid email or password');
        if (response.needsVerification) {
          setShowOtpInput(true);
        }
        return;
      }

      // Get user role from token
      const token = response.data?.token;
      if (token) {
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          console.log('User role:', tokenData.role);

          // Store token and role
          await AsyncStorage.setItem('auth_token', token);
          await AsyncStorage.setItem('user_role', tokenData.role);
          if (tokenData.id) {
            await AsyncStorage.setItem('user_id', String(tokenData.id));
          }
          if (tokenData.name) {
            await AsyncStorage.setItem('name', tokenData.name);
            await AsyncStorage.setItem('user_name', tokenData.name);
          }

          authEvents.notify();

          // Navigate based on role
          if (tokenData.role === 'admin') {
            router.replace('/admin/dashboard');
          } else {
            router.replace('/(tabs)');
          }
        } catch (error) {
          console.error('Error parsing token:', error);
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      setError('Unable to log in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await apiService.verifySignupOTP(email, otp, '', password);

      if (response.error) {
        setError(response.error);
        return;
      }

      router.replace('/(tabs)');
    } catch (error) {
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.requestSignupOTP(email);

      if (response.error) {
        setError(response.error);
        return;
      }

      Alert.alert('Success', 'A new verification code has been sent to your email.');
    } catch (error) {
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Login',
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
                <Text style={styles.welcomeTitle}>Welcome Back</Text>
                <Text style={styles.welcomeSubtitle}>Sign in to continue to your account</Text>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#ff4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[styles.inputContainer, error && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) setError('');
                    }}
                    placeholder="Enter your email address"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIconRight} />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, error && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) setError('');
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    editable={!loading}
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
                <TouchableOpacity
                  onPress={() => router.push('/auth/forgot-password')}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* OTP Section (if needed) */}
              {showOtpInput && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <View style={[styles.inputContainer, error && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={otp}
                      onChangeText={(text) => {
                        setOtp(text);
                        if (error) setError('');
                      }}
                      placeholder="Enter verification code"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                    />
                    <Ionicons name="shield-checkmark-outline" size={20} color="#999" style={styles.inputIconRight} />
                  </View>
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendOTP}
                    disabled={loading}
                  >
                    <Text style={styles.resendButtonText}>Resend verification code</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.buttonDisabled]}
                onPress={showOtpInput ? handleVerifyOTP : handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {showOtpInput ? 'VERIFY' : 'SIGN IN'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* OR Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign In Button */}
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
              {isAppleAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              )}

              {/* Footer Link */}
              <View style={styles.signupPrompt}>
                <Text style={styles.signupText}>New to Saranga Ayurveda? </Text>
                <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                  <Text style={styles.signupLink}>Create an account</Text>
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
    paddingVertical: 30,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: SANS_SERIF,
    color: '#ff4444',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  forgotPasswordText: {
    fontFamily: SANS_SERIF,
    color: BRAND_GREEN,
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
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
  loginButtonText: {
    fontFamily: SANS_SERIF,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    fontFamily: SANS_SERIF,
    color: '#555555',
    fontSize: 14,
  },
  signupLink: {
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