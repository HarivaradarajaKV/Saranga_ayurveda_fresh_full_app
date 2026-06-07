import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { apiService } from './services/api';

const HERO_IMG = require('../assets/images/contact_hero.png');

const PREFIXES = ['+91', '+1', '+44', '+971'];

const SUBJECTS = [
  'Product Inquiry',
  'Order Status & Support',
  'Consultation Booking',
  'Feedback / Suggestions',
  'Business Partnership',
  'Other'
];

export default function ContactScreen() {
  const router = useRouter();

  useEffect(() => {
    // Preload local contact hero asset so it loads reliably every time
    Asset.loadAsync([HERO_IMG]);
  }, []);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown toggles
  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  // Submit Handler
  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    if (!subject) {
      Alert.alert('Validation Error', 'Please select a subject.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Validation Error', 'Please enter your message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiService.post('/submissions/contact', {
        fullName,
        email,
        phoneCode: phonePrefix,
        phoneNumber,
        subject,
        message
      });

      if (response.error) {
        Alert.alert('Error', response.error);
      } else {
        Alert.alert(
          'Message Sent',
          'Thank you for contacting, we will get back to you soon.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit contact form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Contact Us',
          headerShown: true,
          headerBackTitle: '',
          headerStyle: { backgroundColor: '#fbf7f4' },
          headerTintColor: '#2b3a1a',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: 'CormorantGaramond-Bold',
            fontSize: 22,
            color: '#2b3a1a',
          },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center' }}>
        {/* Section 1: Hero Block */}
        <View style={styles.heroSection}>
          <View style={styles.heroRow}>
            <View style={styles.heroTextCol}>
              <Text style={styles.sectionTag}>CONTACT US</Text>
              <Text style={styles.heroHeading}>We're Here to Help You</Text>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Ionicons name="heart" size={12} color="#694d21" style={{ marginHorizontal: 8 }} />
                <View style={styles.dividerLine} />
              </View>
              <Text style={styles.heroBody}>
                Have a question, need guidance, or simply want to connect? We'd love to hear from you.
              </Text>
            </View>
            <View style={styles.heroImageCol}>
              <Image
                source={HERO_IMG}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        {/* Section 2: Ways to Reach Us */}
        <View style={styles.waysSection}>
          <Text style={styles.sectionTagGreen}>WAYS TO REACH US</Text>
          <View style={styles.tagUnderline} />
          
          <View style={styles.gridContainer}>
            {/* Call Us (Full Width) */}
            <TouchableOpacity
              style={styles.gridCardFull}
              onPress={() => Linking.openURL('tel:+919611200444')}
              activeOpacity={0.8}
            >
              <View style={styles.circleIconContainer}>
                <Ionicons name="call-outline" size={18} color="#556C3A" />
              </View>
              <Text style={styles.cardTitle}>CALL US</Text>
              <Text style={styles.cardValue}>+91 96112 00444</Text>
              <Text style={styles.cardSubtext}>Mon - Sat | 10:00 AM - 6:00 PM (IST)</Text>
            </TouchableOpacity>

            {/* Email Us (Half Width, Left) */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => Linking.openURL('mailto:hello@sarangaayurveda.com')}
              activeOpacity={0.8}
            >
              <View style={styles.circleIconContainer}>
                <Ionicons name="mail-outline" size={18} color="#556C3A" />
              </View>
              <Text style={styles.cardTitle}>EMAIL US</Text>
              <Text style={styles.cardValue} numberOfLines={1} adjustsFontSizeToFit>hello@sarangaayurveda.com</Text>
              <Text style={styles.cardSubtext}>We reply within{"\n"}24 business hours</Text>
            </TouchableOpacity>

            {/* WhatsApp (Half Width, Right) */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => Linking.openURL('https://wa.me/919611200444')}
              activeOpacity={0.8}
            >
              <View style={styles.circleIconContainer}>
                <Ionicons name="chatbubbles-outline" size={18} color="#556C3A" />
              </View>
              <Text style={styles.cardTitle}>WHATSAPP</Text>
              <Text style={styles.cardValue}>Chat with us</Text>
              <Text style={styles.cardSubtext}>WhatsApp Support{"\n"}+91 96112 00444</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Send Us a Message Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTag}>SEND US A MESSAGE</Text>
          
          {/* Row 1: Full Name & Email Address */}
          <View style={[styles.formRow, { zIndex: 50 }]}>
            {/* Full Name */}
            <View style={styles.formInputGroupHalf}>
              <Text style={styles.inputLabel}>Full Name <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor="#999"
                />
                <Ionicons name="person-outline" size={16} color="#999" style={styles.inputIcon} />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.formInputGroupHalf}>
              <Text style={styles.inputLabel}>Email Address <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  placeholderTextColor="#999"
                />
                <Ionicons name="mail-outline" size={16} color="#999" style={styles.inputIcon} />
              </View>
            </View>
          </View>

          {/* Row 2: Phone Number & Subject */}
          <View style={[styles.formRow, { zIndex: 40 }]}>
            {/* Phone Number */}
            <View style={styles.formInputGroupHalf}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={{ position: 'relative', zIndex: 1000 }}>
                <View style={styles.phoneInputContainer}>
                  <TouchableOpacity
                    style={styles.prefixSelect}
                    onPress={() => {
                      setShowPrefixDropdown(!showPrefixDropdown);
                      setShowSubjectDropdown(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.prefixText}>{phonePrefix}</Text>
                    <Ionicons name={showPrefixDropdown ? "chevron-up" : "chevron-down"} size={12} color="#666" style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                  <View style={styles.phoneSeparator} />
                  <TextInput
                    style={styles.phoneTextInput}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholderTextColor="#999"
                  />
                  <Ionicons name="call-outline" size={16} color="#999" style={styles.phoneInputIcon} />
                </View>
                {showPrefixDropdown && (
                  <View style={styles.prefixDropdown}>
                    {PREFIXES.map((prefix) => (
                      <TouchableOpacity
                        key={prefix}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setPhonePrefix(prefix);
                          setShowPrefixDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{prefix}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Subject */}
            <View style={styles.formInputGroupHalf}>
              <Text style={styles.inputLabel}>Subject <Text style={styles.required}>*</Text></Text>
              <View style={{ position: 'relative', zIndex: 1000 }}>
                <TouchableOpacity
                  style={styles.customSelect}
                  onPress={() => {
                    setShowSubjectDropdown(!showSubjectDropdown);
                    setShowPrefixDropdown(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.selectText, !subject && { color: '#999' }]} numberOfLines={1}>
                    {subject ? subject : "Choose a subject"}
                  </Text>
                  <Ionicons name={showSubjectDropdown ? "chevron-up" : "chevron-down"} size={16} color="#666" />
                </TouchableOpacity>
                {showSubjectDropdown && (
                  <View style={styles.dropdownOptionsContainer}>
                    {SUBJECTS.map((sub) => (
                      <TouchableOpacity
                        key={sub}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setSubject(sub);
                          setShowSubjectDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Row 3: Message */}
          <View style={[styles.formInputGroup, { zIndex: 10 }]}>
            <Text style={styles.inputLabel}>Message <Text style={styles.required}>*</Text></Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Type your message here..."
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            <View style={styles.submitBtnContent}>
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "SENDING..." : "SEND MESSAGE"}
              </Text>
              {!isSubmitting && <Ionicons name="send-outline" size={16} color="#fff" style={{ marginLeft: 8 }} />}
            </View>
          </TouchableOpacity>

          {/* Privacy Statement */}
          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#556C3A" style={{ marginRight: 6 }} />
            <Text style={styles.privacyText}>Your information is safe with us. We respect your privacy.</Text>
          </View>
        </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextCol: {
    width: '56%',
    paddingRight: 8,
  },
  heroImageCol: {
    width: '42%',
    aspectRatio: 0.9,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    backgroundColor: '#f5f0e8',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  sectionTag: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    color: '#694d21',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroHeading: {
    fontSize: 26,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    lineHeight: 32,
    marginBottom: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#694d21',
    opacity: 0.3,
  },
  heroBody: {
    fontSize: 13,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#555',
    lineHeight: 18,
  },

  // Ways to Reach Us Section
  waysSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTagGreen: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    color: '#556C3A',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tagUnderline: {
    width: 36,
    height: 1.5,
    backgroundColor: '#556C3A',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(105, 77, 33, 0.04)',
    minHeight: 146,
  },
  gridCardFull: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(105, 77, 33, 0.04)',
    minHeight: 120,
  },
  circleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f0e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#694d21',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 13,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#777',
    textAlign: 'center',
    lineHeight: 13,
  },

  // Form Section
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(105, 77, 33, 0.04)',
  },
  formTag: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    color: '#556C3A',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  formInputGroup: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
  },
  formInputGroupHalf: {
    width: '48%',
    position: 'relative',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    minHeight: 34,
  },
  required: {
    color: '#ff4d4f',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dcd6cc',
    borderRadius: 8,
    backgroundColor: '#fff',
    height: 44,
    paddingHorizontal: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dcd6cc',
    borderRadius: 8,
    backgroundColor: '#fff',
    height: 44,
  },
  prefixSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 6,
    height: '100%',
  },
  prefixText: {
    fontSize: 13,
    color: '#333',
  },
  phoneSeparator: {
    width: 1,
    height: '50%',
    backgroundColor: '#dcd6cc',
  },
  phoneTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: '#333',
    paddingLeft: 8,
  },
  phoneInputIcon: {
    marginRight: 10,
  },
  prefixDropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    width: 80,
    borderWidth: 1,
    borderColor: '#dcd6cc',
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: '#333',
    padding: 0,
  },
  inputIcon: {
    marginLeft: 6,
  },
  customSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#dcd6cc',
    borderRadius: 8,
    backgroundColor: '#fff',
    height: 44,
    paddingHorizontal: 12,
  },
  selectText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  dropdownOptionsContainer: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: '#dcd6cc',
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
    zIndex: 1000,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f0e8',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#333',
  },
  textAreaContainer: {
    borderWidth: 1,
    borderColor: '#dcd6cc',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 10,
  },
  textArea: {
    fontSize: 13,
    color: '#333',
    height: 80,
    textAlignVertical: 'top',
    padding: 0,
  },
  submitButton: {
    backgroundColor: '#3b4e28',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  privacyText: {
    fontSize: 11,
    color: '#666',
  },
});
