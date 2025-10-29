import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { apiService } from '../services/api';

interface ImageDebuggerProps {
  imageUrl: string;
  style?: any;
}

export const ImageDebugger: React.FC<ImageDebuggerProps> = ({ imageUrl, style }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const fullImageUrl = apiService.getFullImageUrl(imageUrl);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    setDebugInfo(`✅ Image loaded successfully: ${fullImageUrl}`);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
    setDebugInfo(`❌ Image failed to load: ${fullImageUrl}`);
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: imageError ? 'https://via.placeholder.com/144x144/f8f9fa/666666?text=No+Image' : fullImageUrl }}
        style={[styles.image, style]}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>Original: {imageUrl}</Text>
        <Text style={styles.debugText}>Full URL: {fullImageUrl}</Text>
        <Text style={styles.debugText}>Status: {imageLoaded ? 'Loaded' : imageError ? 'Error' : 'Loading...'}</Text>
        {debugInfo ? <Text style={styles.debugText}>{debugInfo}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  debugInfo: {
    marginTop: 8,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
});



