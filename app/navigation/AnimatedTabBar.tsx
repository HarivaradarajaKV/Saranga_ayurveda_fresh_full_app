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

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 5;

export const AnimatedTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
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
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const animatedIconStyle = useAnimatedStyle(() => {
          const scale = withSpring(isFocused ? 1.2 : 1, springConfig);
          const opacity = withTiming(isFocused ? 1 : 0.7);
          const translateY = withSpring(isFocused ? -4 : 0, springConfig);

          return {
            transform: [{ scale }, { translateY }],
            opacity,
          };
        });

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: 4,
    justifyContent: 'space-between',
  },
  tab: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    width: TAB_WIDTH,
    height: 3,
    backgroundColor: '#007AFF',
    bottom: 0,
    borderRadius: 1.5,
  },
}); 