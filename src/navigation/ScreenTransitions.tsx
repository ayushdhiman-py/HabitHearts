import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeOutDown,
} from 'react-native-reanimated';

// Fade transition component
export const FadeTransition = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={[styles.container, style]}
    >
      {children}
    </Animated.View>
  );
};

// Alternative fade with slight movement for more dynamic effect
export const FadeSlideTransition = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      exiting={FadeOutDown.duration(300).springify()}
      style={[styles.container, style]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});