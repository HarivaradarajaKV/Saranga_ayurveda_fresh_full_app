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
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

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
        setError('Invalid email or password');
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
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
            color: '#1A1A1A',
          },
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerBackVisible: false,
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

        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
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
                  <Text style={styles.welcomeTitle}>Welcome Back!</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Sign in to continue your beauty journey with Saranga Ayurveda
                  </Text>
                </View>

                {/* Form Section */}
                <BlurView intensity={20} style={styles.formContainer}>
                  <View style={styles.form}>
                    {error ? (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#ff4444" />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Email or Phone</Text>
                      <View style={[styles.inputContainer, error && styles.inputError]}>
                        <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={email}
                          onChangeText={(text) => {
                            setEmail(text);
                            if (error) {
                              setError('');
                            }
                          }}
                          placeholder="Enter your email or phone number"
                          placeholderTextColor="#999"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          editable={!loading}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <View style={styles.passwordHeader}>
                        <Text style={styles.label}>Password</Text>
                        <TouchableOpacity
                          onPress={() => router.push('/auth/forgot-password')}
                        >
                          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={[styles.inputContainer, error && styles.inputError]}>
                        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={password}
                          onChangeText={(text) => {
                            setPassword(text);
                            if (error) {
                              setError('');
                            }
                          }}
                          placeholder="Enter your password"
                          placeholderTextColor="#999"
                          secureTextEntry={!showPassword}
                          editable={!loading}
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
                    </View>

                    {showOtpInput && (
                      <>
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Verification Code</Text>
                          <View style={[styles.inputContainer, error && styles.inputError]}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              value={otp}
                              onChangeText={(text) => {
                                setOtp(text);
                                if (error) {
                                  setError('');
                                }
                              }}
                              placeholder="Enter verification code"
                              placeholderTextColor="#999"
                              keyboardType="number-pad"
                              maxLength={6}
                              editable={!loading}
                            />
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.resendButton}
                          onPress={handleResendOTP}
                          disabled={loading}
                        >
                          <Text style={styles.resendButtonText}>Resend verification code</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity
                      style={[styles.loginButton, loading && styles.buttonDisabled]}
                      onPress={showOtpInput ? handleVerifyOTP : handleLogin}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={loading ? ['#ccc', '#999'] : ['#007AFF', '#0056CC']}
                        style={styles.loginButtonGradient}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Text style={styles.loginButtonText}>
                              {showOtpInput ? 'Verify' : 'Login'}
                            </Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or continue with</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialButtons}>
                      <TouchableOpacity style={styles.socialButton}>
                        <Ionicons name="logo-google" size={24} color="#DB4437" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.socialButton}>
                        <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                      </TouchableOpacity>
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity style={styles.socialButton}>
                          <Ionicons name="logo-apple" size={24} color="#000" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.signupPrompt}>
                      <Text style={styles.signupText}>Don't have an account? </Text>
                      <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                        <Text style={styles.signupLink}>Sign Up</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </BlurView>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
  safeArea: {
    flex: 1,
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
    shadowColor: '#FF69B4',
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
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
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    borderRadius: 16,
    marginVertical: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 