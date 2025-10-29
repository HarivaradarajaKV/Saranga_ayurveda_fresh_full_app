import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { springConfig } from '../animations/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 5;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tab: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    paddingBottom: 4,
  },
  indicator: {
    position: 'absolute',
    width: TAB_WIDTH,
    height: 6,
    backgroundColor: '#694d21',
    top: 56,
    borderRadius: 3,
  },
});

export const AnimatedTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withSpring(state.index * TAB_WIDTH, {
            ...springConfig,
            stiffness: 120,
            damping: 12,
          }),
        },
      ],
    };
  });

  return (
    <View style={[
      styles.container,
      {
        paddingBottom: Math.max(insets.bottom, 4),
        height: 60 + Math.max(insets.bottom, 4)
      }
    ]}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const animatedIconStyle = useAnimatedStyle(() => {
          const scale = withSpring(isFocused ? 1.2 : 1, springConfig);
          const opacity = withTiming(isFocused ? 1 : 0.7);
          const translateY = withSpring(isFocused ? -1 : 0, springConfig);

          return {
            transform: [{ scale }, { translateY }],
            opacity,
          };
        });

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={[styles.tab, { width: TAB_WIDTH }]}
            activeOpacity={0.7}
          >
            <Animated.View style={animatedIconStyle}>
              {options.tabBarIcon && 
                options.tabBarIcon({
                  focused: isFocused,
                  color: isFocused ? '#007AFF' : '#8E8E93',
                  size: 24,
                })}
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}; 