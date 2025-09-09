import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, withTiming, Easing, runOnJS } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const images = [
  require('../../assets/images/couple_travel.jpg'),
  require('../../assets/images/couple_future.jpg'),
  require('../../assets/images/couple_goals.jpg'),
  require('../../assets/images/couple_white.jpg'),
];

const Slideshow = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    images.forEach(image => {
      if (image && typeof image === 'number') {
        Image.prefetch(Image.resolveAssetSource(image).uri);
      }
    });
  }, []);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) });

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }, (isFinished) => {
        if (isFinished) {
          runOnJS(setCurrentIndex)((prevIndex) => (prevIndex + 1) % images.length);
        }
      });
    }, 4000);

    return () => clearTimeout(timeout);
  }, [currentIndex, opacity]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={images[currentIndex]}
        style={[styles.image, { opacity }]}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    zIndex: -1,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
});

export default Slideshow;