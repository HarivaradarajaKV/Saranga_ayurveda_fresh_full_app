import React, { useState } from 'react';
import { StyleSheet, Text, Image, Pressable, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  Layout,
  EntryExitAnimationFunction,
  withDelay,
  EntryAnimationsValues,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { springConfig } from '../animations/shared';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  description?: string;
}

interface AnimatedProductCardProps {
  product: Product;
  index: number;
  onPress: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  style?: ViewStyle;
}

const entering: EntryExitAnimationFunction = (targetValues: EntryAnimationsValues) => {
  'worklet';
  const animations = {
    originY: withDelay(
      targetValues.targetOriginY * 50,
      withSpring(targetValues.targetOriginY, springConfig)
    ),
    opacity: withSpring(1, springConfig),
    transform: [
      { scale: withSpring(1, springConfig) },
      { translateY: withSpring(0, springConfig) },
    ],
  };
  const initialValues = {
    originY: targetValues.targetOriginY + 50,
    opacity: 0,
    transform: [{ scale: 0.8 }, { translateY: 50 }],
  };
  return {
    initialValues,
    animations,
  };
};

export const AnimatedProductCard: React.FC<AnimatedProductCardProps> = ({
  product,
  index,
  onPress,
  onAddToCart,
  style,
}) => {
  const scale = useSharedValue(1);
  const cartButtonScale = useSharedValue(1);
  const [imageError, setImageError] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cartButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartButtonScale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.95, springConfig),
      withSpring(1, springConfig)
    );
    onPress(product);
  };

  const handleAddToCart = () => {
    cartButtonScale.value = withSequence(
      withSpring(0.8, springConfig),
      withSpring(1.2, springConfig),
      withSpring(1, springConfig)
    );
    onAddToCart(product);
  };

  return (
    <AnimatedPressable
      style={[styles.container, style, animatedStyle]}
      onPress={handlePress}
      entering={entering}
      layout={Layout.springify()}
    >
      <Image 
        source={{ uri: imageError ? 'https://via.placeholder.com/144x144/f8f9fa/666666?text=No+Image' : product.image_url }} 
        style={styles.image}
        onError={() => {
          console.log('Image failed to load:', product.image_url);
          setImageError(true);
        }}
        onLoad={() => setImageError(false)}
      />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.price}>₹{product.price}</Text>
      </View>
      <Animated.View
        style={[styles.addToCartButton, cartButtonAnimatedStyle]}
      >
        <Pressable onPress={handleAddToCart} style={styles.addToCartTouchable}>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </Pressable>
      </Animated.View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  addToCartButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  addToCartTouchable: {
    padding: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 20,
  },
}); 