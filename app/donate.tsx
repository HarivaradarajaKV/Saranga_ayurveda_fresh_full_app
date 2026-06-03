import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getBaseUrl } from './config/api';
import WebView from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DonateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Form states
  const [amount, setAmount] = useState('100');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(100);
  const [donateAnonymously, setDonateAnonymously] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('+91');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Razorpay states
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');
  const [currentDonationId, setCurrentDonationId] = useState<number | null>(null);

  const presets = [100, 500, 1000, 2000];

  const handlePresetSelect = (val: number) => {
    setSelectedPreset(val);
    setAmount(val.toString());
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers
    const cleanText = text.replace(/[^0-9]/g, '');
    setAmount(cleanText);
    
    // Check if the typed amount matches a preset
    const numericAmount = parseInt(cleanText, 10);
    if (presets.includes(numericAmount)) {
      setSelectedPreset(numericAmount);
    } else {
      setSelectedPreset(null);
    }
  };

  const handleDonate = async () => {
    if (!amount || parseInt(amount, 10) <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter a valid donation amount.');
      return;
    }
    if (!agreeToTerms) {
      Alert.alert('Terms Agreement Required', 'Please agree to the terms and conditions to proceed.');
      return;
    }
    if (!donateAnonymously) {
      if (!donorName.trim()) {
        Alert.alert('Name Required', 'Please enter your name.');
        return;
      }
      if (!donorPhone.trim() || donorPhone.trim() === '+91') {
        Alert.alert('Mobile Number Required', 'Please enter your mobile number.');
        return;
      }
    }

    try {
      setLoading(true);

      const nameToUse = donateAnonymously ? 'Anonymous' : donorName.trim();
      const numericAmount = parseInt(amount, 10);

      // Call the public donation endpoint — no auth token needed
      // getBaseUrl() already includes /api, e.g. http://192.168.1.5:5001/api
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/razorpay/create-donation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numericAmount,
          donor_name: nameToUse,
          is_anonymous: donateAnonymously,
          donor_phone: donateAnonymously ? '' : donorPhone.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }

      const razorpayOrder = await res.json();

      if (!razorpayOrder.id || !razorpayOrder.key) {
        throw new Error('Invalid response from donation payment service');
      }

      // Store donation_id so we can mark it paid after Razorpay confirms
      setCurrentDonationId(razorpayOrder.donation_id);

      // Build inline Razorpay checkout HTML
      const options = {
        key: razorpayOrder.key || razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        name: 'Saranga Ayurveda LLP',
        description: `Donation by ${nameToUse}`,
        order_id: razorpayOrder.id,
        prefill: { 
          name: nameToUse, 
          contact: donateAnonymously ? '' : donorPhone.trim() 
        },
        theme: { color: '#2b3a1a' },
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { height: 100vh; display: flex; justify-content: center; align-items: center; background: #fff; }
          </style>
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        </head>
        <body>
          <script>
            var options = ${JSON.stringify(options)};
            options.handler = function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', data: response }));
            };
            options.modal = {
              ondismiss: function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismissed' }));
              }
            };
            var rzp = new Razorpay(options);
            rzp.open();
          </script>
        </body>
        </html>
      `;

      setPaymentHtml(html);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error('Donation error:', error);
      Alert.alert('Donation Error', error.message || 'Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      if (msg.type === 'success') {
        setShowPaymentModal(false);

        // Verify & record the payment in the donations table (fire-and-forget with best-effort)
        if (currentDonationId && msg.data) {
          try {
            const baseUrl = getBaseUrl();
            await fetch(`${baseUrl}/razorpay/verify-donation-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   msg.data.razorpay_order_id,
                razorpay_payment_id: msg.data.razorpay_payment_id,
                razorpay_signature:  msg.data.razorpay_signature,
                donation_id:         currentDonationId,
              }),
            });
          } catch (verifyErr) {
            // Non-blocking — payment already happened on Razorpay's end
            console.warn('Donation verification call failed (non-critical):', verifyErr);
          }
        }

        Alert.alert(
          'Thank You! 🙏',
          `Your generous donation of ₹${amount} to the Ayurveda Saranga Foundation is deeply appreciated. Together, we are making a difference.`,
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else if (msg.type === 'dismissed') {
        setShowPaymentModal(false);
      }
    } catch (e) {
      setShowPaymentModal(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF4EB" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Beige/Cream Header */}
          <View style={styles.topHeader}>
            <View style={styles.navigationRow}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Circular brand logo (background transparent matching header beige) */}
            <View style={styles.logoContainer}>
              <Image 
                source={require('./assets/images/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Our Impact Pill */}
            <View style={styles.impactPill}>
              <Text style={styles.impactText}>Our Impact</Text>
            </View>

            {/* Main Heading */}
            <Text style={styles.mainHeading}>
              Together, We're Making{'\n'}A Difference
            </Text>
          </View>

          {/* White Card Section */}
          <View style={styles.whiteCard}>
            <Text style={styles.sectionTitle}>Choose amount</Text>

            {/* Amount input box with INR selector */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="Enter amount"
                placeholderTextColor="#999"
              />
              <View style={styles.currencySelector}>
                <Text style={styles.currencyText}>INR</Text>
              </View>
            </View>

            {/* Row of preset buttons */}
            <View style={styles.presetsRow}>
              {presets.map((presetVal) => {
                const isActive = selectedPreset === presetVal;
                return (
                  <TouchableOpacity
                    key={presetVal}
                    style={[styles.presetButton, isActive && styles.presetButtonActive]}
                    onPress={() => handlePresetSelect(presetVal)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                      ₹{presetVal}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Donate Anonymously checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setDonateAnonymously(!donateAnonymously)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, donateAnonymously && styles.checkboxChecked]}>
                {donateAnonymously && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Donate Anonymously</Text>
            </TouchableOpacity>

            {/* Name Input Box (disabled if anonymous) */}
            <TextInput
              style={[styles.nameInput, donateAnonymously && styles.nameInputDisabled]}
              value={donateAnonymously ? '' : donorName}
              onChangeText={setDonorName}
              placeholder="Your Name"
              placeholderTextColor="#999"
              editable={!donateAnonymously}
              selectTextOnFocus={!donateAnonymously}
            />

            {/* Mobile Number Input Box (disabled if anonymous) */}
            <TextInput
              style={[styles.nameInput, { marginTop: 12 }, donateAnonymously && styles.nameInputDisabled]}
              value={donateAnonymously ? '' : donorPhone}
              onChangeText={setDonorPhone}
              placeholder="Mobile Number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              editable={!donateAnonymously}
              selectTextOnFocus={!donateAnonymously}
            />

            {/* Agree to Terms checkbox */}
            <TouchableOpacity
              style={[styles.checkboxRow, { marginTop: 16 }]}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                {agreeToTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>I Agree To The Terms</Text>
            </TouchableOpacity>

            {/* DONATE Capsule Button */}
            <TouchableOpacity
              style={styles.donateButton}
              onPress={handleDonate}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.donateButtonText}>DONATE</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Inline Razorpay payment modal — no auth token required */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPaymentModal(false)}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.paymentModalContainer}>
          <TouchableOpacity
            style={[styles.paymentModalClose, { top: insets.top + 8 }]}
            onPress={() => setShowPaymentModal(false)}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <WebView
            source={{ html: paymentHtml }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            style={{ flex: 1 }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FAF4EB',
  },
  topHeader: {
    paddingBottom: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  navigationRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  logoContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  impactPill: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  impactText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  mainHeading: {
    fontSize: 28,
    fontFamily: 'CormorantGaramond-Bold',
    fontWeight: 'bold',
    color: '#1c1c1c',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 36,
  },
  whiteCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  currencyText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  presetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 20,
    paddingVertical: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  presetButtonActive: {
    borderColor: '#25c469',
    backgroundColor: '#f3fbf6',
  },
  presetText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  presetTextActive: {
    color: '#25c469',
    fontWeight: 'bold',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#25c469',
    borderColor: '#25c469',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  nameInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  nameInputDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#eee',
    color: '#999',
  },
  donateButton: {
    backgroundColor: '#25c469',
    borderRadius: 24,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    elevation: 3,
    shadowColor: '#25c469',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  donateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  paymentModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  paymentModalClose: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    padding: 6,
  },
});
