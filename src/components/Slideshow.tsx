import React, { useState, useEffect } from 'react';
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

  // Preload all images
  useEffect(() => {
    images.forEach((image) => {
      if (image && typeof image === 'number') {
        const imageUri = Image.resolveAssetSource(image).uri;
        Image.prefetch(imageUri).catch(error => {
          console.warn('Failed to preload image:', imageUri, error);
        });
      }
    });
  }, []);

  // Handle the crossfade transition
  useEffect(() => {
    let transitionInterval;
    let fadeInterval;

    const startTransition = () => {
      let fadeProgress = 0;
      const fadeDuration = 1000; // 1.5 seconds
      const interval = 16; // ~60fps

      fadeInterval = setInterval(() => {
        fadeProgress += interval;
        const newOpacity = Math.min(fadeProgress / fadeDuration, 1);
        setOpacity(newOpacity);

        if (fadeProgress >= fadeDuration) {
          clearInterval(fadeInterval);
          // Update indices after fade completes
          const newIndex = (currentIndex + 1) % images.length;
          const newNextIndex = (newIndex + 1) % images.length;
          setCurrentIndex(newIndex);
          setNextIndex(newNextIndex);
          setOpacity(0); // Reset opacity for next transition
        }
      }, interval);
    };

    transitionInterval = setInterval(() => {
      startTransition();
    }, 2000); // Change image every 2 seconds

    return () => {
      clearInterval(transitionInterval);
      if (fadeInterval) clearInterval(fadeInterval);
    };
  }, [currentIndex]);

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