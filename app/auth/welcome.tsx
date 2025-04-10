import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Hold for 1 second
      Animated.delay(1000),
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after 3 seconds
    const checkUserAndNavigate = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        setTimeout(() => {
          if (decodedToken.role === 'admin') {
            router.replace('/admin');
          } else {
            router.replace('/(tabs)');
          }
        }, 3000);
      }
    };

    checkUserAndNavigate();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.appName}>BeautyHub</Text>
        <Text style={styles.welcomeText}>Welcome</Text>
        <Text style={styles.subtitle}>
          Enhance your beauty with our premium products
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 