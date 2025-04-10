import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(tabs)');
      return true;
    });

    return () => backHandler.remove();
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
            backgroundColor: '#fff',
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
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>
                Sign in to continue your beauty journey
              </Text>
            </View>

            <View style={styles.form}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email or Phone</Text>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) {
                      setError('');
                    }
                  }}
                  placeholder="Enter your email or phone number"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
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
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.passwordInput,
                      error && styles.inputError,
                    ]}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {showOtpInput && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Verification Code</Text>
                    <TextInput
                      style={[styles.input, error && styles.inputError]}
                      value={otp}
                      onChangeText={(text) => {
                        setOtp(text);
                        if (error) {
                          setError('');
                        }
                      }}
                      placeholder="Enter verification code"
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                    />
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
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {showOtpInput ? 'Verify' : 'Login'}
                  </Text>
                )}
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  welcomeSection: {
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
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
    width: '100%',
    marginTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
    width: '100%',
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
    width: '100%',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: '500',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  eyeIcon: {
    padding: 10,
  },
  loginButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 24,
    paddingHorizontal: 20,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
}); 