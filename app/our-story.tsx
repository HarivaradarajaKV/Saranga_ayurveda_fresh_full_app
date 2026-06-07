import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';

const HERO_IMG = require('../assets/images/our_story_hero.png');
const ABOUT_IMG = require('../assets/images/our_story_about.png');
const CONNECTING_IMG = require('../assets/images/our_story_connecting.png');
const US_IMG = require('../assets/images/our_story_us.png');

const { width: screenWidth } = Dimensions.get('window');

interface LazyStoryImageProps {
  source: any;
  style: any;
  containerStyle: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const LazyStoryImage: React.FC<LazyStoryImageProps> = ({
  source,
  style,
  containerStyle,
  resizeMode = 'cover',
}) => {
  const [loading, setLoading] = useState(true);

  return (
    <View style={[containerStyle, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f0e8', position: 'relative', overflow: 'hidden' }]}>
      {loading && (
        <ActivityIndicator
          size="small"
          color="#694d21"
          style={{ position: 'absolute', zIndex: 1 }}
        />
      )}
      <Image
        source={source}
        style={[style, { opacity: loading ? 0 : 1 }]}
        resizeMode={resizeMode}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
    </View>
  );
};

export default function OurStoryScreen() {
  React.useEffect(() => {
    // Preload local image assets so they load reliably every time
    Asset.loadAsync([HERO_IMG, ABOUT_IMG, CONNECTING_IMG, US_IMG]);
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Our Story',
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
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 750, alignSelf: 'center', flex: 1 }}>
          {/* Section 1: Hero Block */}
          <View style={styles.heroSection}>
            <View style={styles.heroRow}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroSub}>OUR STORY</Text>
                <Text style={styles.heroHeading}>A Journey of Care</Text>
                <Text style={styles.heroDividerLine}>—</Text>
                <Text style={styles.heroBody}>
                  We believe that true beauty comes from alignment — when our minds, bodies, and choices are in harmony.
                </Text>
              </View>
              <LazyStoryImage 
                source={HERO_IMG} 
                style={styles.heroImage} 
                containerStyle={styles.heroImageCol}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Section 2: About Us Block */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <LazyStoryImage 
                source={ABOUT_IMG} 
                style={styles.cardImage} 
                containerStyle={styles.cardImageCol}
                resizeMode="cover"
              />
              <View style={styles.cardTextCol}>
                <Text style={styles.cardHeading}>Who We Are</Text>
                <Text style={styles.cardBody}>
                  Saranga Ayurveda was founded with a clear, heartfelt vision: to build a bridge between traditional Ayurvedic wisdom and the practical needs of modern life. We are dedicated to creating products that respect your skin, respect your health, and respect the planet.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 3: Connecting Block */}
          <View style={styles.card}>
            <View style={[styles.cardRow, styles.reverseRow]}>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardHeading}>Connecting Wellness</Text>
                <Text style={styles.cardBody}>
                  Every formulation is a promise of authenticity. We combine organic extracts, soothing oils, and gentle active botanicals to create remedies that do not just beautify, but restore.
                </Text>
              </View>
              <LazyStoryImage 
                source={CONNECTING_IMG} 
                style={styles.cardImage} 
                containerStyle={styles.cardImageCol}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Section 4: Us Block */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardHeading}>This Is Us</Text>
                <Text style={styles.cardBody}>
                  We are Saranga Ayurveda — a humble blend of tradition, care, and community. We create wellness solutions that speak to real people and real lives. Our purpose is to help you feel seen, supported, and whole.
                </Text>
              </View>
              <LazyStoryImage 
                source={US_IMG} 
                style={styles.cardImage} 
                containerStyle={styles.cardImageCol}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Section 5: Pillars / Badges Footer */}
          <View style={styles.badgesFooter}>
            <View style={styles.badgeCol}>
              <Ionicons name="leaf-outline" size={24} color="#2b3a1a" style={styles.badgeIcon} />
              <Text style={styles.badgeTitle}>ROOTED IN</Text>
              <Text style={styles.badgeTitle}>TRADITION</Text>
              <Text style={styles.badgeDesc}>Inspired by classical Ayurvedic wisdom.</Text>
            </View>
            <View style={styles.badgeDivider} />
            <View style={styles.badgeCol}>
              <Ionicons name="flask-outline" size={24} color="#2b3a1a" style={styles.badgeIcon} />
              <Text style={styles.badgeTitle}>PURE &</Text>
              <Text style={styles.badgeTitle}>EFFECTIVE</Text>
              <Text style={styles.badgeDesc}>Crafted with clean, potent ingredients.</Text>
            </View>
            <View style={styles.badgeDivider} />
            <View style={styles.badgeCol}>
              <Ionicons name="globe-outline" size={24} color="#2b3a1a" style={styles.badgeIcon} />
              <Text style={styles.badgeTitle}>ETHICALLY</Text>
              <Text style={styles.badgeTitle}>SOURCED</Text>
              <Text style={styles.badgeDesc}>Responsibly sourced for people and planet.</Text>
            </View>
            <View style={styles.badgeDivider} />
            <View style={styles.badgeCol}>
              <Ionicons name="heart-outline" size={24} color="#2b3a1a" style={styles.badgeIcon} />
              <Text style={styles.badgeTitle}>MADE FOR</Text>
              <Text style={styles.badgeTitle}>YOU</Text>
              <Text style={styles.badgeDesc}>Thoughtful formulations for everyday wellness.</Text>
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
    paddingBottom: 24,
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
  heroSub: {
    fontSize: 12,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#694d21',
    letterSpacing: 2,
    marginBottom: 4,
  },
  heroDividerLine: {
    fontSize: 16,
    color: '#694d21',
    marginBottom: 10,
  },
  reverseRow: {
    flexDirection: 'row-reverse',
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

  // Cards layout
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#694d21',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(105, 77, 33, 0.04)',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextCol: {
    width: '54%',
    paddingRight: 12,
  },
  cardTextColRight: {
    width: '54%',
    paddingLeft: 12,
  },
  cardImageCol: {
    width: '42%',
    aspectRatio: 0.85,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f0e8',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardHeading: {
    fontSize: 20,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    marginBottom: 8,
    lineHeight: 24,
  },
  cardBody: {
    fontSize: 13,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#555',
    lineHeight: 18,
  },

  // Footer Badges
  badgesFooter: {
    flexDirection: 'row',
    backgroundColor: '#f5f0e8',
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  badgeCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeIcon: {
    marginBottom: 10,
  },
  badgeTitle: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: 'bold',
    color: '#2b3a1a',
    textAlign: 'center',
    lineHeight: 11,
  },
  badgeDesc: {
    fontSize: 8,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 11,
  },
  badgeDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#dcd6cc',
    alignSelf: 'center',
  },
});
