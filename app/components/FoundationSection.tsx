import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const FoundationSection = () => {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#fffbf2', '#fff']}
                style={styles.gradientBackground}
            >
                <View style={styles.contentContainer}>
                    <View style={styles.headerContainer}>
                        <Ionicons name="leaf-outline" size={24} color="#694d21" style={{ marginBottom: 8 }} />
                        <Text style={styles.headerTitle}>Saranga Anugraha Foundation</Text>
                        <View style={styles.decorativeLine} />
                    </View>

                    <View style={styles.missionCard}>
                        <Text style={styles.missionText}>
                            "Established with a clear purpose — to bring authentic Ayurvedic healing and compassionate social support to people who truly need it but cannot afford it."
                        </Text>
                    </View>

                    <Text style={styles.contextText}>
                        In today’s fast-paced world, many individuals suffer from chronic illnesses, stress, and financial limitations that prevent them from accessing quality healthcare.
                    </Text>

                    <View style={styles.valuesContainer}>
                        <Text style={styles.valuesTitle}>Our Core Beliefs</Text>
                        <View style={styles.valueItem}>
                            <Ionicons name="heart-circle-outline" size={24} color="#694d21" />
                            <Text style={styles.valueText}>Healthcare should be a right, not a privilege.</Text>
                        </View>
                        <View style={styles.valueItem}>
                            <Ionicons name="flower-outline" size={24} color="#694d21" />
                            <Text style={styles.valueText}>Ayurveda has the power to restore wellbeing naturally.</Text>
                        </View>
                        <View style={styles.valueItem}>
                            <Ionicons name="people-outline" size={24} color="#694d21" />
                            <Text style={styles.valueText}>No individual should be left helpless due to financial difficulties.</Text>
                        </View>
                    </View>

                    <Text style={styles.bridgeText}>
                        Built on compassion, community support, and traditional healing values blended with modern care.
                    </Text>

                    <View style={styles.imageContainer}>
                        <Image
                            source={require('../../assets/images/foundation.png')}
                            style={styles.image}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.3)']}
                            style={styles.imageOverlay}
                        />
                    </View>

                    <View style={styles.whoWeAreSection}>
                        <Text style={styles.subHeader}>Who We Are</Text>
                        <Text style={styles.subHeaderSubtitle}>Tradition • Care • Community</Text>

                        <Text style={styles.storyText}>
                            We are Saranga Ayurveda—a humble blend of tradition, care, and community. Rooted in ancient Ayurvedic wisdom and guided by the rhythms of nature, we craft wellness solutions that speak to real people and real lives.
                        </Text>

                        <Text style={styles.storyText}>
                            We’re not here just to offer products. We’re here to share a way of living—one that honors balance, celebrates connection, and restores harmony in everyday moments.
                        </Text>

                        <View style={styles.quoteContainer}>
                            <Text style={styles.storyText}>
                                With every herb we source and every remedy we create, our purpose is simple: to help you feel seen, supported, and whole.
                            </Text>
                        </View>

                        <Text style={styles.closingText}>
                            This is us. And we’re here for you—naturally.
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    gradientBackground: {
        paddingVertical: 32,
    },
    contentContainer: {
        paddingHorizontal: 20,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#694d21',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    decorativeLine: {
        width: 40,
        height: 3,
        backgroundColor: '#d4c5b0',
        marginTop: 12,
        borderRadius: 2,
    },
    missionCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#694d21',
        shadowColor: '#694d21',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 24,
    },
    missionText: {
        fontSize: 16,
        lineHeight: 26,
        color: '#2c1e0b',
        fontStyle: 'italic',
        textAlign: 'center',
        fontWeight: '500',
    },
    contextText: {
        fontSize: 15,
        lineHeight: 24,
        color: '#5a5a5a',
        marginBottom: 28,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    valuesContainer: {
        backgroundColor: '#fdf8f0',
        borderRadius: 20,
        padding: 24,
        marginBottom: 28,
    },
    valuesTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#694d21',
        marginBottom: 16,
        textAlign: 'center',
    },
    valueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    valueText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        lineHeight: 20,
        color: '#444',
        fontWeight: '500',
    },
    bridgeText: {
        fontSize: 15,
        textAlign: 'center',
        color: '#694d21',
        fontWeight: '600',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    imageContainer: {
        width: '100%',
        height: 220,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 32,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
    },
    whoWeAreSection: {
        alignItems: 'center',
    },
    subHeader: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c1e0b',
        marginBottom: 4,
    },
    subHeaderSubtitle: {
        fontSize: 12,
        color: '#8c7b66',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 24,
    },
    storyText: {
        fontSize: 15,
        lineHeight: 26,
        color: '#4a4a4a',
        marginBottom: 16,
        textAlign: 'center',
    },
    quoteContainer: {
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    closingText: {
        fontSize: 18,
        fontStyle: 'italic',
        fontWeight: '600',
        color: '#694d21',
        marginTop: 12,
        textAlign: 'center',
    },
});

export default FoundationSection;
