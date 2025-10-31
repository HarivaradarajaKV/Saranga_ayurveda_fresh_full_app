import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, Animated, Easing, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

type ThemeMode = 'light' | 'dark';

export default function SettingsThemeScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [loading, setLoading] = useState(true);
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const fullTitle = 'Lights out. Magic on.';
  const fullSubtitle = 'The Dark Theme is about to drop — sleeker, smoother, and cooler than ever. Get ready to experience your screen like never before.';
  const [typedTitle, setTypedTitle] = useState('');
  const [typedSubtitle, setTypedSubtitle] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('app_theme');
        if (saved === 'light' || saved === 'dark') setTheme(saved);
      } finally {
        setLoading(false);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    let titleTimer: ReturnType<typeof setInterval> | null = null;
    let subtitleTimer: ReturnType<typeof setInterval> | null = null;

    const startPulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(sparkleAnim, { toValue: 0, duration: 700, useNativeDriver: true, easing: Easing.in(Easing.ease) })
        ])
      ).start();
    };

    if (theme === 'dark') {
      // Run typewriter once
      sparkleAnim.stopAnimation();
      sparkleAnim.setValue(0);
      setIsTyping(true);
      setTypedTitle('');
      setTypedSubtitle('');

      // Type title
      let i = 0;
      titleTimer = setInterval(() => {
        i += 1;
        setTypedTitle(fullTitle.slice(0, i));
        if (i >= fullTitle.length && titleTimer) {
          clearInterval(titleTimer);
          // Type subtitle after small delay
          let j = 0;
          subtitleTimer = setInterval(() => {
            j += 1;
            setTypedSubtitle(fullSubtitle.slice(0, j));
            if (j >= fullSubtitle.length && subtitleTimer) {
              clearInterval(subtitleTimer);
              setIsTyping(false);
              startPulse();
            }
          }, 18);
        }
      }, 18);
    } else {
      // Reset for light
      setIsTyping(false);
      setTypedTitle('');
      setTypedSubtitle('');
      sparkleAnim.stopAnimation();
      sparkleAnim.setValue(0);
    }

    return () => {
      if (titleTimer) clearInterval(titleTimer);
      if (subtitleTimer) clearInterval(subtitleTimer);
    };
  }, [theme]);

  const applyTheme = async (mode: ThemeMode) => {
    try {
      setTheme(mode);
      await AsyncStorage.setItem('app_theme', mode);
    } catch {}
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Ionicons name="color-palette-outline" size={26} color="#b0761b" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.title}>Theme</Text>
            <Text style={styles.subtitle}>Choose your appearance</Text>
          </View>
        </View>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, theme === 'light' && styles.selectedToggle]}
            onPress={() => applyTheme('light')}
            activeOpacity={0.8}
          >
            <Ionicons name="sunny-outline" size={18} color={theme === 'light' ? '#fff' : '#694d21'} />
            <Text style={[styles.toggleText, theme === 'light' && styles.selectedToggleText]}>Light</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, theme === 'dark' && styles.selectedToggle]}
            onPress={() => applyTheme('dark')}
            activeOpacity={0.8}
          >
            <Ionicons name="moon-outline" size={18} color={theme === 'dark' ? '#fff' : '#694d21'} />
            <Text style={[styles.toggleText, theme === 'dark' && styles.selectedToggleText]}>Dark</Text>
          </TouchableOpacity>
        </View>

        {theme === 'dark' && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Alert.alert('Dark Theme', 'Dark theme is coming very soon. Stay tuned for the theme magic.')}
          >
          <Animated.View
            style={[
              styles.comingSoonCard,
              {
                opacity: sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
                transform: [{ scale: sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }]
              }
            ]}
          >
            <View style={styles.sparkleWrap}>
              <Animated.View
                style={{
                  transform: [{ rotate: sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] }) }]
                }}
              >
                <Ionicons name="sparkles-outline" size={20} color="#694d21" />
              </Animated.View>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.comingSoonTitle}>{isTyping ? typedTitle : fullTitle}</Text>
              <Text style={styles.comingSoonSubtitle}>{isTyping ? typedSubtitle : fullSubtitle}</Text>
            </View>
          </Animated.View>
          </TouchableOpacity>
        )}

        {!loading && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color="#694d21" />
            <Text style={styles.infoText}>Current: Light Mode</Text>
          </View>
        )}

        {/* Footer (mirrors Home screen footer with working links) */}
        <View style={styles.footerContainer}>
          <View style={styles.footerSection}>
            <Text style={styles.footerTitle}>Quick Links</Text>
            <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/profile')} activeOpacity={0.8}>
              <Ionicons name="person-outline" size={20} color="#694d21" />
              <Text style={styles.footerLinkText}>My Account</Text>
              <Ionicons name="chevron-forward" size={16} color="#694d21" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/(tabs)/wishlist')} activeOpacity={0.8}>
              <Ionicons name="heart-outline" size={20} color="#694d21" />
              <Text style={styles.footerLinkText}>Wishlist</Text>
              <Ionicons name="chevron-forward" size={16} color="#694d21" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/explore')} activeOpacity={0.8}>
              <Ionicons name="pricetag-outline" size={20} color="#694d21" />
              <Text style={styles.footerLinkText}>Offers & Deals</Text>
              <Ionicons name="chevron-forward" size={16} color="#694d21" />
            </TouchableOpacity>
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerTitle}>Customer Service</Text>
            <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/contact')} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={20} color="#694d21" />
              <Text style={styles.footerLinkText}>Contact Us</Text>
              <Ionicons name="chevron-forward" size={16} color="#694d21" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/faqs')} activeOpacity={0.8}>
              <Ionicons name="help-circle-outline" size={20} color="#694d21" />
              <Text style={styles.footerLinkText}>FAQs</Text>
              <Ionicons name="chevron-forward" size={16} color="#694d21" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/legal/shipping')} activeOpacity={0.8}>
              <Ionicons name="car-outline" size={20} color="#694d21" />
              <Text style={styles.footerLinkText}>Shipping Information</Text>
              <Ionicons name="chevron-forward" size={16} color="#694d21" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/return-policy')} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={20} color="#694d21" />
              <Text style={styles.footerLinkText}>Return Policy</Text>
              <Ionicons name="chevron-forward" size={16} color="#694d21" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffbe9',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    padding: 16,
    backgroundColor: '#fffbe9',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#efd8bb',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#694d21',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#efd8bb',
  },
  selectedToggle: {
    backgroundColor: '#694d21',
    borderColor: '#694d21',
  },
  toggleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#694d21',
    fontWeight: '600',
  },
  selectedToggleText: {
    color: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#efd8bb',
  },
  infoText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
  },
  footerContainer: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efd8bb',
    overflow: 'hidden',
  },
  footerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f2e3cc',
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#694d21',
    marginBottom: 8,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbe9',
    borderWidth: 1,
    borderColor: '#efd8bb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  footerLinkText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#694d21',
    fontWeight: '600',
  },
  comingSoonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2caa5',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  sparkleWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff5d7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2caa5',
  },
  comingSoonTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.2,
  },
  comingSoonSubtitle: {
    fontSize: 17,
    lineHeight: 22,
    color: '#694d21',
    marginTop: 4,
  },
});


