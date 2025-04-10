import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { springConfig } from '../animations/shared';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedCartButtonProps {
  onPress: () => void;
  itemCount: number;
}

export const AnimatedCartButton: React.FC<AnimatedCartButtonProps> = ({ onPress, itemCount }) => {
  const scale = useSharedValue(1);
  const badge = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badge.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9, springConfig),
      withSpring(1, springConfig)
    );
    onPress();
  };

  React.useEffect(() => {
    badge.value = withSequence(
      withSpring(1.3, springConfig),
      withSpring(1, springConfig)
    );
  }, [itemCount]);

  return (
    <AnimatedTouchable
      style={[styles.container, animatedStyle]}
      onPress={handlePress}
    >
      <Ionicons name="cart-outline" size={24} color="#007AFF" />
      {itemCount > 0 && (
        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>{itemCount}</Text>
        </Animated.View>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 