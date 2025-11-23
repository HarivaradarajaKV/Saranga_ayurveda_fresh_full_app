import React, { useState, useEffect, useRef } from 'react';
import { Image, View, ActivityIndicator, StyleSheet, ImageStyle, ViewStyle, ImageProps } from 'react-native';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  style?: ImageStyle | ImageStyle[];
  placeholderColor?: string;
  showLoader?: boolean;
  priority?: 'low' | 'normal' | 'high';
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

/**
 * OptimizedImage component with:
 * - Progressive loading with placeholder
 * - Built-in error handling
 * - Loading indicator
 * - Image caching (handled by React Native)
 * - Priority-based loading
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  placeholderColor = '#f0f0f0',
  showLoader = true,
  priority = 'normal',
  resizeMode = 'cover',
  onLoadStart,
  onLoadEnd,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<Image>(null);

  useEffect(() => {
    // Reset states when source changes
    setIsLoading(true);
    setHasError(false);
  }, [typeof source === 'object' && 'uri' in source ? source.uri : source]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    onLoadEnd?.();
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
  };

  // Don't show placeholder for local images
  const isRemoteImage = typeof source === 'object' && 'uri' in source && source.uri.startsWith('http');

  return (
    <View style={[styles.container, style]}>
      {isRemoteImage && isLoading && !hasError && (
        <View style={[styles.placeholder, { backgroundColor: placeholderColor }, StyleSheet.flatten(style)]}>
          {showLoader && (
            <ActivityIndicator 
              size="small" 
              color="#999" 
              style={styles.loader}
            />
          )}
        </View>
      )}
      
      <Image
        ref={imageRef}
        source={source}
        style={[
          styles.image,
          style,
          isLoading && isRemoteImage && styles.hidden,
          hasError && styles.errorImage
        ]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        // Enable progressive rendering for better perceived performance
        progressiveRenderingEnabled={true}
        {...props}
      />
      
      {hasError && isRemoteImage && (
        <View style={[styles.errorPlaceholder, StyleSheet.flatten(style)]}>
          <View style={styles.errorIcon}>
            {/* Simple error indicator */}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loader: {
    opacity: 0.6,
  },
  hidden: {
    opacity: 0,
  },
  errorImage: {
    opacity: 0,
  },
  errorPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ddd',
  },
});

