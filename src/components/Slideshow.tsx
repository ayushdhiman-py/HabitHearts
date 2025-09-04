import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Import all images from the assets/images folder
const images = [
  require('../../assets/images/couple_travel.jpg'),
  require('../../assets/images/couple_future.jpg'),
  require('../../assets/images/couple_goals.jpg'),
  require('../../assets/images/couple_white.jpg'),
];

const Slideshow = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [opacity, setOpacity] = useState(0);
  const fadeIntervalRef = useRef<number | null>(null);
  const transitionIntervalRef = useRef<number | null>(null);

  // Preload all images
  useEffect(() => {
    images.forEach((image) => {
      if (image && typeof image === 'number') {
        Image.prefetch(Image.resolveAssetSource(image).uri);
      }
    });
  }, []);

  // Handle the crossfade transition
  useEffect(() => {
    const startTransition = () => {
      // Clear any existing fade interval
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }

      // Set up the next image before starting fade
      setCurrentIndex(prevIndex => {
        const newIndex = (prevIndex + 1) % images.length;
        setNextIndex((newIndex + 1) % images.length);
        // Start with opacity 0 for the next image
        setOpacity(0);
        return newIndex;
      });

      let fadeProgress = 0;
      const fadeDuration = 1000; // 1 second fade
      const interval = 16; // ~60fps

      fadeIntervalRef.current = setInterval(() => {
        fadeProgress += interval;
        const newOpacity = Math.min(fadeProgress / fadeDuration, 1);
        setOpacity(newOpacity);

        if (fadeProgress >= fadeDuration) {
          clearInterval(fadeIntervalRef.current!);
          fadeIntervalRef.current = null;
        }
      }, interval);
    };

    transitionIntervalRef.current = setInterval(startTransition, 3000); // Change image every 3 seconds

    return () => {
      if (transitionIntervalRef.current) {
        clearInterval(transitionIntervalRef.current);
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []); // Run only once on mount

  return (
    <View style={styles.container}>
      {/* Current image (background) */}
      <Image
        source={images[currentIndex]}
        style={styles.image}
        resizeMode="cover"
      />
      
      {/* Next image (fades in on top) */}
      <Image
        source={images[nextIndex]}
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
  }
});

export default Slideshow;
