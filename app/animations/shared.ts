import { withSpring, withTiming, withSequence, withDelay } from 'react-native-reanimated';

export const springConfig = {
  damping: 10,
  mass: 1,
  stiffness: 100,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

export const timingConfig = {
  duration: 300,
};

export const cartItemAnimation = {
  entering: (index: number) => ({
    initialValues: {
      opacity: 0,
      transform: [{ translateX: -50 }, { scale: 0.8 }],
    },
    animations: {
      opacity: withDelay(index * 100, withSpring(1, springConfig)),
      transform: [
        { translateX: withDelay(index * 100, withSpring(0, springConfig)) },
        { scale: withDelay(index * 100, withSpring(1, springConfig)) },
      ],
    },
  }),
  exiting: {
    initialValues: {
      opacity: 1,
      transform: [{ translateX: 0 }, { scale: 1 }],
    },
    animations: {
      opacity: withTiming(0, timingConfig),
      transform: [
        { translateX: withTiming(50, timingConfig) },
        { scale: withTiming(0.8, timingConfig) },
      ],
    },
  },
};

export const productCardAnimation = {
  entering: (index: number) => ({
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 50 }, { scale: 0.9 }],
    },
    animations: {
      opacity: withDelay(index * 100, withSpring(1, springConfig)),
      transform: [
        { translateY: withDelay(index * 100, withSpring(0, springConfig)) },
        { scale: withDelay(index * 100, withSpring(1, springConfig)) },
      ],
    },
  }),
};

export const addToCartAnimation = {
  start: {
    transform: [{ scale: 1 }],
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  success: {
    transform: [
      { 
        scale: withSequence(
          withSpring(1.2, springConfig),
          withSpring(1, springConfig)
        )
      }
    ],
  },
};

export const pageTransition = {
  entering: {
    initialValues: {
      opacity: 0,
      transform: [{ translateX: 50 }],
    },
    animations: {
      opacity: withTiming(1, timingConfig),
      transform: [{ translateX: withSpring(0, springConfig) }],
    },
  },
  exiting: {
    initialValues: {
      opacity: 1,
      transform: [{ translateX: 0 }],
    },
    animations: {
      opacity: withTiming(0, timingConfig),
      transform: [{ translateX: withSpring(-50, springConfig) }],
    },
  },
}; 