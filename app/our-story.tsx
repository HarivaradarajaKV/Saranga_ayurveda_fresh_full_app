import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';

// ── IMAGE ASSET NUMBERS FOR THE USER TO PROVIDE ──
// Image 1: main_hero_bg (Himalaya mountains & Saranga bag background)
const IMG_1 = require('../assets/images/our_story_new_1.png');
// Image 2: rooted_nature_top (Hands picking yellow flowers)
const IMG_2 = require('../assets/images/our_story_new_2.png');
// Image 3: process_step_1 (Valley/river landscape)
const IMG_3 = require('../assets/images/our_story_new_3.png');
// Image 4: process_step_2 (Basket of yellow flowers)
const IMG_4 = require('../assets/images/our_story_new_4.png');
// Image 5: process_step_3 (Hands sorting/washing green herbs)
const IMG_5 = require('../assets/images/our_story_new_5.png');
// Image 6: process_step_4 (Mortar pestle and bowl with herbal powder)
const IMG_6 = require('../assets/images/our_story_new_6.png');
// Image 7: process_step_5 (Product bottles and packaging setup)
const IMG_7 = require('../assets/images/our_story_new_7.png');
// Image 8: promise_watermark (Mountain outline line art watermark at the bottom of the card)
const IMG_8 = require('../assets/images/our_story_new_8.png');
// Image 9: quote_bg (Mountains with yellow flowers in the foreground)
const IMG_9 = require('../assets/images/our_story_new_9.png');
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
    <View style={[containerStyle, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7F2', position: 'relative', overflow: 'hidden' }]}>
      {loading && (
        <ActivityIndicator
          size="small"
          color="#3C583B"
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

// Custom leaf separator used across sections
const LeafSeparator = () => (
  <View style={styles.separatorContainer}>
    <View style={styles.separatorLine} />
    <Ionicons name="leaf" size={14} color="#3C583B" style={{ marginHorizontal: 8 }} />
    <View style={styles.separatorLine} />
  </View>
);

export default function OurStoryScreen() {
  React.useEffect(() => {
    // Preload local image assets
    Asset.loadAsync([IMG_1, IMG_2, IMG_3, IMG_4, IMG_5, IMG_6, IMG_7, IMG_8, IMG_9]);
  }, []);

  const BADGES = [
    { icon: 'image-filter-hdr', lib: 'MaterialCommunityIcons', title: 'Sourced from\nHimalayas' },
    { icon: 'leaf-outline', lib: 'Ionicons', title: '100% Natural\n& Pure' },
    { icon: 'bowl-mix', lib: 'MaterialCommunityIcons', title: 'Backed by\nAyurvedic Wisdom' },
    { icon: 'hand-heart', lib: 'MaterialCommunityIcons', title: 'Ethical &\nSustainable' },
  ];

  const PROCESS_STEPS = [
    {
      image: IMG_3,
      title: '1. Handpicked',
      desc: 'We handpick the finest herbs at high altitudes.',
      icon: 'leaf-outline',
      lib: 'Ionicons'
    },
    {
      image: IMG_4,
      title: '2. Naturally Dried',
      desc: 'Carefully dried using traditional methods to retain maximum potency.',
      icon: 'flower-outline',
      lib: 'Ionicons'
    },
    {
      image: IMG_5,
      title: '3. Quality Assured',
      desc: 'Stringent quality checks ensure purity and authenticity.',
      icon: 'shield-checkmark-outline',
      lib: 'Ionicons'
    },
    {
      image: IMG_6,
      title: '4. Expertly Processed',
      desc: 'Processed in our GMP certified facilities with Ayurvedic expertise.',
      icon: 'bowl-mix-outline',
      lib: 'MaterialCommunityIcons'
    },
    {
      image: IMG_7,
      title: '5. Delivered to You',
      desc: 'Delivered to your doorstep, bringing the best of Himalayas to you.',
      icon: 'mailbox-outline',
      lib: 'MaterialCommunityIcons'
    }
  ];

  const HIMALAYAS_REASONS = [
    { icon: 'sprout-outline', lib: 'MaterialCommunityIcons', text: 'Rich in biodiversity' },
    { icon: 'water-outline', lib: 'Ionicons', text: 'Pure, unpolluted environment' },
    { icon: 'weather-sunny', lib: 'MaterialCommunityIcons', text: 'Ideal growing conditions for medicinal plants' },
    { icon: 'hand-heart-outline', lib: 'MaterialCommunityIcons', text: 'Traditional knowledge & sustainable harvesting' }
  ];

  const renderBadgeIcon = (badge: typeof BADGES[0]) => {
    if (badge.lib === 'Ionicons') {
      return <Ionicons name={badge.icon as any} size={20} color="#3C583B" />;
    }
    return <MaterialCommunityIcons name={badge.icon as any} size={20} color="#3C583B" />;
  };

  const renderReasonIcon = (reason: typeof HIMALAYAS_REASONS[0]) => {
    if (reason.lib === 'Ionicons') {
      return <Ionicons name={reason.icon as any} size={18} color="#3C583B" />;
    }
    return <MaterialCommunityIcons name={reason.icon as any} size={18} color="#3C583B" />;
  };

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

          {/* Section 1: Hero Image background & Title Overlay */}
          <ImageBackground source={IMG_1} style={styles.heroBg}>
            <View style={styles.heroOverlay}>
              {/* <View style={styles.heroLabelRow}>

                <Ionicons name="leaf" size={12} color="#3C583B" style={{ marginLeft: 4 }} />
              </View> */}
              <Text style={styles.heroTitle}>
                Sourced raw materials from Himalayas to deliver you <Text style={{ fontStyle: 'italic' }}>the Best</Text>.
              </Text>
            </View>
          </ImageBackground>

          {/* Under Hero Centered Paragraph */}
          <View style={styles.heroTextSection}>
            <LeafSeparator />
            <Text style={styles.heroDescription}>
              At Saranga Ayurveda, nature is our greatest healer and the Himalayas are our purest source. We travel to the highest altitudes to bring back the finest, most potent raw materials for you.
            </Text>
          </View>


          {/* Section 2: Card with a Landscape Image on Top */}
          <View style={styles.rootedCard}>
            <LazyStoryImage
              source={IMG_2}
              style={styles.rootedImage}
              containerStyle={styles.rootedImageCol}
              resizeMode="cover"
            />
            <View style={styles.rootedCardContent}>
              <Text style={styles.rootedHeading}>
                Rooted in <Text style={{ fontStyle: 'italic' }}>Nature</Text>.{'\n'}Driven by <Text style={{ fontStyle: 'italic' }}>Purpose</Text>.
              </Text>

              <LeafSeparator />

              <Text style={styles.rootedBody}>
                Our journey began with a simple belief - that true wellness comes from the purity of nature and the wisdom of Ayurveda. This belief takes us to the untouched regions of the Himalayas, where we source powerful herbs and minerals, ethically and sustainably.
              </Text>

              {/* 4 Badges Row */}
              <View style={styles.badgesRow}>
                {BADGES.map((badge, idx) => (
                  <View key={idx} style={styles.badgeItemCol}>
                    <View style={styles.badgeIconWrap}>
                      {renderBadgeIcon(badge)}
                    </View>
                    <Text style={styles.badgeItemTitle}>{badge.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Section 3: OUR PROCESS Step Timeline */}
          <View style={styles.processSection}>
            <View style={styles.processHeaderRow}>
              <Text style={styles.processLabel}>OUR PROCESS</Text>
              <Ionicons name="leaf" size={12} color="#3C583B" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.processHeading}>
              From the Himalayas to <Text style={{ fontStyle: 'italic' }}>You</Text>
            </Text>

            {/* Timeline wrapper */}
            <View style={styles.timelineContainer}>
              {/* Vertical line running behind steps */}
              <View style={styles.timelineLine} />

              {PROCESS_STEPS.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  {/* Step Image */}
                  <LazyStoryImage
                    source={step.image}
                    style={styles.stepImage}
                    containerStyle={styles.stepImageCol}
                    resizeMode="cover"
                  />

                  {/* Circle Step Icon Wrapper */}
                  <View style={styles.stepCircleOuter}>
                    <View style={styles.stepCircleInner}>
                      {step.lib === 'Ionicons' ? (
                        <Ionicons name={step.icon as any} size={14} color="#3C583B" />
                      ) : (
                        <MaterialCommunityIcons name={step.icon as any} size={14} color="#3C583B" />
                      )}
                    </View>
                  </View>

                  {/* Step Info */}
                  <View style={styles.stepInfoCol}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>


          {/* Section 4: Our Promise Card */}
          <View style={styles.promiseCard}>
            <View style={styles.promiseIconWrap}>
              <MaterialCommunityIcons name="tree-outline" size={28} color="#3C583B" />
            </View>
            <Text style={styles.promiseTitle}>Our Promise</Text>
            <Text style={styles.promiseBody}>
              We are committed to delivering the purest, most effective Ayurvedic products while honoring nature and empowering local communities.
            </Text>

            <LeafSeparator />

            <Text style={styles.promiseSubtext}>Pure by Nature. Purely for You.</Text>

            {/* Mountain drawing/watermark absolute positioned at the bottom */}
            <Image
              source={IMG_8}
              style={styles.promiseWatermark}
              resizeMode="cover"
            />
          </View>

          {/* Section 5: Quote Image Card */}
          <View style={styles.quoteCardContainer}>
            <ImageBackground source={IMG_9} style={styles.quoteBg} imageStyle={{ borderRadius: 24 }}>
              <View style={styles.quoteOverlay}>
                <Text style={styles.quoteMarkOpen}>“</Text>
                <Text style={styles.quoteText}>
                  From the purity of Himalayas, for your holistic wellness.
                </Text>
                <Text style={styles.quoteMarkClose}>”</Text>
              </View>
            </ImageBackground>
          </View>

          {/* Section 6: Why Himalayas? List */}
          <View style={styles.whySection}>
            <Text style={styles.whyHeading}>Why Himalayas?</Text>

            <View style={styles.reasonsList}>
              {HIMALAYAS_REASONS.map((reason, idx) => (
                <View key={idx} style={styles.reasonRow}>
                  <View style={styles.reasonIconWrap}>
                    {renderReasonIcon(reason)}
                  </View>
                  <Text style={styles.reasonText}>{reason.text}</Text>
                </View>
              ))}
            </View>

            {/* Bottom green badge / button */}
            <View style={styles.footerBanner}>
              <View style={styles.footerBannerIconWrap}>
                <Ionicons name="leaf" size={16} color="#ffffff" />
              </View>
              <Text style={styles.footerBannerText}>
                Experience the power of pure, natural, and authentic Ayurveda.
              </Text>
            </View>
          </View>

          {/* Footer Badges Row */}
          <View style={styles.badgesFooter}>
            <View style={styles.badgeCol}>
              <Ionicons name="leaf-outline" size={20} color="#3C583B" style={styles.badgeIcon} />
              <Text style={styles.badgeTitle}>ROOTED IN</Text>
              <Text style={styles.badgeTitle}>TRADITION</Text>
              <Text style={styles.badgeDesc}>Inspired by classical{'\n'}Ayurvedic wisdom.</Text>
            </View>
            <View style={styles.badgeDivider} />
            <View style={styles.badgeCol}>
              <Ionicons name="flask-outline" size={20} color="#3C583B" style={styles.badgeIcon} />
              <Text style={styles.badgeTitle}>PURE &</Text>
              <Text style={styles.badgeTitle}>EFFECTIVE</Text>
              <Text style={styles.badgeDesc}>Crafted with clean,{'\n'}potent ingredients.</Text>
            </View>
            <View style={styles.badgeDivider} />
            <View style={styles.badgeCol}>
              <Ionicons name="globe-outline" size={20} color="#3C583B" style={styles.badgeIcon} />
              <Text style={styles.badgeTitle}>ETHICALLY</Text>
              <Text style={styles.badgeTitle}>SOURCED</Text>
              <Text style={styles.badgeDesc}>Responsibly sourced{'\n'}for people and planet.</Text>
            </View>
            <View style={styles.badgeDivider} />
            <View style={styles.badgeCol}>
              <Ionicons name="heart-outline" size={20} color="#3C583B" style={styles.badgeIcon} />
              <Text style={styles.badgeTitle}>MADE FOR</Text>
              <Text style={styles.badgeTitle}>YOU</Text>
              <Text style={styles.badgeDesc}>Thoughtful formulations{'\n'}for everyday wellness.</Text>
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
    backgroundColor: '#FAF7F2', // Soft, premium cream background
  },
  contentContainer: {
    paddingBottom: 40,
  },
  // Separator styles
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  separatorLine: {
    height: 1,
    width: 50,
    backgroundColor: '#dcd6cc',
    opacity: 0.8,
  },

  // Hero Section
  heroBg: {
    width: '100%',
    height: 480,
    justifyContent: 'flex-start',
  },
  heroOverlay: {
    padding: 24,
    paddingTop: 40,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3C583B',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    lineHeight: 36,
    maxWidth: '85%',
  },
  heroTextSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  heroDescription: {
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#505c48',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },

  // Split Horizontal Cards (All About, Connecting, Us)
  splitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#3C583B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(60, 88, 59, 0.04)',
  },
  splitCardLeft: {
    width: '55%',
    paddingRight: 8,
  },
  splitCardRight: {
    width: '55%',
    paddingLeft: 8,
  },
  splitCardLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#8c9a84',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  splitCardTitle: {
    fontSize: 17,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    marginVertical: 4,
  },
  splitCardDesc: {
    fontSize: 11,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#666',
    lineHeight: 15,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  readMoreText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3C583B',
    letterSpacing: 1,
  },
  splitCardImgWrap: {
    width: '42%',
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
  },
  splitCardImg: {
    width: '100%',
    height: '100%',
  },

  // Rooted in Nature Card
  rootedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 28,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#3C583B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(60, 88, 59, 0.05)',
  },
  rootedImageCol: {
    width: '100%',
    height: 200,
  },
  rootedImage: {
    width: '100%',
    height: '100%',
  },
  rootedCardContent: {
    padding: 20,
  },
  rootedHeading: {
    fontSize: 22,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    lineHeight: 28,
    textAlign: 'center',
  },
  rootedBody: {
    fontSize: 13,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#505c48',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeItemCol: {
    width: '23%',
    alignItems: 'center',
  },
  badgeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F2F6F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeItemTitle: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '600',
    color: '#2b3a1a',
    textAlign: 'center',
    lineHeight: 12,
  },

  // Process Section
  processSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  processHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  processLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3C583B',
    letterSpacing: 1.5,
  },
  processHeading: {
    fontSize: 22,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    marginBottom: 24,
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 100, // Aligns centered through the circles
    top: 20,
    bottom: 60,
    width: 1.5,
    backgroundColor: '#dcd6cc',
    zIndex: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepImageCol: {
    width: 85,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepImage: {
    width: '100%',
    height: '100%',
  },
  stepCircleOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0dcd0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    zIndex: 1,
    elevation: 1,
  },
  stepCircleInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F2F6F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepInfoCol: {
    flex: 1,
    paddingLeft: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 11,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#666',
    lineHeight: 14,
  },

  // Promise Card
  promiseCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 28,
    padding: 24,
    paddingBottom: 110,
    borderWidth: 1,
    borderColor: '#e8e2d8',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  promiseIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e2d8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#3C583B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  promiseTitle: {
    fontSize: 22,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    marginBottom: 10,
  },
  promiseBody: {
    fontSize: 13,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#505c48',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
    zIndex: 2,
  },
  promiseSubtext: {
    fontSize: 14,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#3C583B',
    textAlign: 'center',
    zIndex: 2,
    marginBottom: 20,
  },
  promiseWatermark: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    opacity: 0.95,
    zIndex: 1,
  },

  // Quote Card
  quoteCardContainer: {
    marginHorizontal: 16,
    marginBottom: 28,
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  quoteBg: {
    width: '100%',
    height: '100%',
  },
  quoteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 58, 26, 0.25)', // Semi-transparent green overlay for rich aesthetic
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteMarkOpen: {
    fontSize: 48,
    color: '#ffffff',
    opacity: 0.7,
    fontFamily: 'CormorantGaramond-Bold',
    alignSelf: 'flex-start',
    lineHeight: 30,
  },
  quoteText: {
    fontSize: 18,
    fontFamily: 'CormorantGaramond-Medium',
    fontStyle: 'italic',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  quoteMarkClose: {
    fontSize: 48,
    color: '#ffffff',
    opacity: 0.7,
    fontFamily: 'CormorantGaramond-Bold',
    alignSelf: 'flex-end',
    lineHeight: 10,
    marginTop: -8,
  },

  // Why Himalayas List & Footer Banner
  whySection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  whyHeading: {
    fontSize: 22,
    fontFamily: 'CormorantGaramond-Bold',
    color: '#2b3a1a',
    marginBottom: 16,
  },
  reasonsList: {
    marginBottom: 24,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  reasonIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F6F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reasonText: {
    fontSize: 13,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#505c48',
    flex: 1,
  },
  footerBanner: {
    backgroundColor: '#3C583B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#3C583B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  footerBannerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  footerBannerText: {
    fontSize: 12,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#ffffff',
    flex: 1,
    lineHeight: 16,
  },

  // Footer Badges Columns
  badgesFooter: {
    flexDirection: 'row',
    backgroundColor: '#f5f0e8',
    paddingVertical: 24,
    paddingHorizontal: 12,
    marginTop: 20,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e8e2d8',
  },
  badgeCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeIcon: {
    marginBottom: 8,
  },
  badgeTitle: {
    fontSize: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: 'bold',
    color: '#2b3a1a',
    textAlign: 'center',
    lineHeight: 10,
  },
  badgeDesc: {
    fontSize: 7.5,
    fontFamily: 'CormorantGaramond-Medium',
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 10,
  },
  badgeDivider: {
    width: 1,
    height: '75%',
    backgroundColor: '#dcd6cc',
    alignSelf: 'center',
  },
});
