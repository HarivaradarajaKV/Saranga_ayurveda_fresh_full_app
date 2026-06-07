import React, { useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Asset } from 'expo-asset';

const HERO_IMG = require('../assets/images/careers_hero.png');

const POSITIONS = [
  'Ayurvedic Doctor / Consultant',
  'Therapist',
  'Product Developer / Formulator',
  'Sales & Marketing Executive',
  'Operations & Logistics Manager',
  'Customer Support Representative'
];

const EXPERIENCES = [
  'Fresher (0-1 years)',
  '1-3 years',
  '3-5 years',
  '5+ years'
];

const PREFIXES = ['+91', '+1', '+44', '+971'];

export default function CareersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  React.useEffect(() => {
    // Preload local career hero asset so it loads reliably every time
    Asset.loadAsync([HERO_IMG]);
  }, []);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [position, setPosition] = useState('');
  const [experience, setExperience] = useState('');
  const [resume, setResume] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [agree, setAgree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown toggles
  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false);
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [showExperienceDropdown, setShowExperienceDropdown] = useState(false);

  // Pick Resume Document
  const handlePickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (file.size && file.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please upload a resume under 5MB.');
          return;
        }
        setResume(file);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  // Submit Application
  const handleSubmit = () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number.');
      return;
    }
    if (!position) {
      Alert.alert('Validation Error', 'Please select a position.');
      return;
    }
    if (!resume) {
      Alert.alert('Validation Error', 'Please upload your resume/CV.');
      return;
    }
    if (!agree) {
      Alert.alert('Validation Error', 'You must agree to the Terms & Conditions and Privacy Policy.');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Application Submitted',
        'Thank you for contacting, we will get back to you soon.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 1500);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Careers',
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
              <Text style={styles.heroHeading}>Grow With Purpose. Rooted in Wellness.</Text>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Ionicons name="heart" size={12} color="#694d21" style={{ marginHorizontal: 8 }} />
                <View style={styles.dividerLine} />
              </View>
              <Text style={styles.heroBody}>
                At Saranga Ayurveda, we believe that people are our greatest strength. Join a team that is passionate about natural healing, conscious living, and creating a positive impact every day.
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

        {/* Section 2: Why Work With Us */}
        <View style={styles.whySection}>
          <Text style={styles.sectionTag}>WHY WORK WITH US</Text>
          <View style={styles.tagUnderline} />
          
          <View style={styles.whyGrid}>
            <View style={styles.whyItemRow}>
              <View style={styles.whyIconContainer}>
                <Ionicons name="leaf-outline" size={24} color="#556C3A" />
              </View>
              <View style={styles.whyTextContainer}>
                <Text style={styles.whyTitle}>Meaningful Work</Text>
                <Text style={styles.whyDesc}>Be part of a mission that brings the wisdom of Ayurveda to modern lives.</Text>
              </View>
            </View>
            
            <View style={styles.whyItemRow}>
              <View style={styles.whyIconContainer}>
                <Ionicons name="people-outline" size={24} color="#556C3A" />
              </View>
              <View style={styles.whyTextContainer}>
                <Text style={styles.whyTitle}>Supportive Culture</Text>
                <Text style={styles.whyDesc}>Work in a collaborative and inclusive environment that values your growth.</Text>
              </View>
            </View>

            <View style={styles.whyItemRow}>
              <View style={styles.whyIconContainer}>
                <Ionicons name="trending-up-outline" size={24} color="#556C3A" />
              </View>
              <View style={styles.whyTextContainer}>
                <Text style={styles.whyTitle}>Growth & Learning</Text>
                <Text style={styles.whyDesc}>We encourage continuous learning and offer opportunities to grow.</Text>
              </View>
            </View>

            <View style={styles.whyItemRow}>
              <View style={styles.whyIconContainer}>
                <Ionicons name="globe-outline" size={24} color="#556C3A" />
              </View>
              <View style={styles.whyTextContainer}>
                <Text style={styles.whyTitle}>Positive Impact</Text>
                <Text style={styles.whyDesc}>Contribute to a healthier planet and happier communities.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 3: Apply Now Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formTag}>APPLY NOW</Text>
              <Text style={styles.formHeading}>We'd Love to Hear From You</Text>
              <Text style={styles.formSubtitle}>
                Fill out the form below to apply. Our team will get in touch if your profile matches our requirements.
              </Text>
            </View>
            <View style={styles.clipboardIconContainer}>
              <Ionicons name="clipboard-outline" size={48} color="#2b3a1a" style={{ opacity: 0.8 }} />
            </View>
          </View>

          {/* Row 1: Full Name & Email Address */}
          <View style={[styles.formRow, { zIndex: 40 }]}>
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

          {/* Row 2: Phone Number & Position Applying For */}
          <View style={[styles.formRow, { zIndex: 30 }]}>
            {/* Phone Number */}
            <View style={styles.formInputGroupHalf}>
              <Text style={styles.inputLabel}>Phone Number <Text style={styles.required}>*</Text></Text>
              <View style={styles.phoneInputContainer}>
                <TouchableOpacity
                  style={styles.prefixSelect}
                  onPress={() => {
                    setShowPrefixDropdown(!showPrefixDropdown);
                    setShowPositionDropdown(false);
                    setShowExperienceDropdown(false);
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

            {/* Position Applying For */}
            <View style={styles.formInputGroupHalf}>
              <Text style={styles.inputLabel}>Position Applying For <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={styles.customSelect}
                onPress={() => {
                  setShowPositionDropdown(!showPositionDropdown);
                  setShowPrefixDropdown(false);
                  setShowExperienceDropdown(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.selectText, !position && { color: '#999' }]} numberOfLines={1}>
                  {position ? position : "Select position"}
                </Text>
                <Ionicons name={showPositionDropdown ? "chevron-up" : "chevron-down"} size={16} color="#666" />
              </TouchableOpacity>
              {showPositionDropdown && (
                <View style={styles.dropdownOptionsContainer}>
                  {POSITIONS.map((pos) => (
                    <TouchableOpacity
                      key={pos}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setPosition(pos);
                        setShowPositionDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{pos}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Row 3: Experience & Resume/CV */}
          <View style={[styles.formRow, { zIndex: 20 }]}>
            {/* Experience (in years) */}
            <View style={styles.formInputGroupHalf}>
              <Text style={styles.inputLabel}>Experience (in years)</Text>
              <TouchableOpacity
                style={styles.customSelect}
                onPress={() => {
                  setShowExperienceDropdown(!showExperienceDropdown);
                  setShowPrefixDropdown(false);
                  setShowPositionDropdown(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.selectText, !experience && { color: '#999' }]}>
                  {experience ? experience : "Select experience"}
                </Text>
                <Ionicons name={showExperienceDropdown ? "chevron-up" : "chevron-down"} size={16} color="#666" />
              </TouchableOpacity>
              {showExperienceDropdown && (
                <View style={styles.dropdownOptionsContainer}>
                  {EXPERIENCES.map((exp) => (
                    <TouchableOpacity
                      key={exp}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setExperience(exp);
                        setShowExperienceDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{exp}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Resume/CV */}
            <View style={styles.formInputGroupHalf}>
              <Text style={styles.inputLabel}>Resume/CV <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={styles.uploadContainer}
                onPress={handlePickResume}
                activeOpacity={0.8}
              >
                <Ionicons name={resume ? "checkmark-circle-outline" : "cloud-upload-outline"} size={18} color="#556C3A" />
                <Text style={styles.uploadText} numberOfLines={1}>
                  {resume ? resume.name : "Upload PDF, DOC (Max. 5MB)"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cover Letter */}
          <View style={[styles.formInputGroup, { zIndex: 1 }]}>
            <Text style={styles.inputLabel}>Cover Letter (Optional)</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Tell us why you'd be a great fit for Saranga Ayurveda..."
                multiline
                numberOfLines={4}
                value={coverLetter}
                onChangeText={setCoverLetter}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Checkbox agreement */}
          <TouchableOpacity
            style={[styles.checkboxRow, { zIndex: 1 }]}
            onPress={() => setAgree(!agree)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={agree ? "checkbox" : "square-outline"}
              size={20}
              color={agree ? "#2b3a1a" : "#999"}
            />
            <Text style={styles.checkboxText}>
              I agree to the <Text style={styles.link}>Terms & Conditions</Text> and <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton, { zIndex: 1 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "SUBMITTING..." : "SUBMIT APPLICATION"}
            </Text>
          </TouchableOpacity>
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
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#555',
    lineHeight: 20,
  },

  // Why Work With Us Section
  whySection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTag: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    color: '#694d21',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tagUnderline: {
    width: 36,
    height: 1.5,
    backgroundColor: '#694d21',
    marginBottom: 16,
  },
  whyGrid: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(105, 77, 33, 0.04)',
  },
  whyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  whyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f0e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  whyTextContainer: {
    flex: 1,
  },
  whyTitle: {
    fontSize: 15,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    marginBottom: 2,
  },
  whyDesc: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#666',
    lineHeight: 16,
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
  formHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  formTag: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    color: '#556C3A',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  formHeading: {
    fontSize: 22,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#666',
    lineHeight: 16,
  },
  clipboardIconContainer: {
    paddingLeft: 10,
  },
  formInputGroup: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
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
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  formInputGroupHalf: {
    width: '48%',
    position: 'relative',
    marginBottom: 16,
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
    top: 70,
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
  },
  dropdownOptionsContainer: {
    position: 'absolute',
    top: 70,
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
  uploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#556C3A',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    height: 44,
    paddingHorizontal: 12,
  },
  uploadText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 4,
  },
  checkboxText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  link: {
    color: '#556C3A',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#3b4e28',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
});
