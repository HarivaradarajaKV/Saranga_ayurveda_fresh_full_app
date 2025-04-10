import { StackCardStyleInterpolator } from '@react-navigation/stack';
import { Animated } from 'react-native';

export const customScreenAnimation: StackCardStyleInterpolator = ({
  current,
  next,
  inverted,
  layouts: { screen },
}) => {
  const progress = Animated.add(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        })
      : 0
  );

  return {
    cardStyle: {
      transform: [
        {
          translateX: Animated.multiply(
            progress.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [screen.width, 0, -screen.width * 0.3],
              extrapolate: 'clamp',
            }),
            inverted
          ),
        },
        {
          scale: progress.interpolate({
            inputRange: [0, 1, 2],
            outputRange: [0.95, 1, 1],
            extrapolate: 'clamp',
          }),
        },
      ],
      opacity: progress.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [0.5, 1, 0.5],
        extrapolate: 'clamp',
      }),
    },
    overlayStyle: {
      opacity: progress.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [0, 0.3, 0.3],
        extrapolate: 'clamp',
      }),
    },
  };
}; 