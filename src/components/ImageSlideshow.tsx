import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Import all the images
const images = [
  require('../../assets/images/couple illustration planning for future travelling trips.jpg'),
  require('../../assets/images/couple illustration planning for future.jpg'),
  require('../../assets/images/make an beautiful illustration of couple (men and women) making goals and sharing ideas and planning event.jpg'),
  require('../../assets/images/white couple illustration planning for future.jpg'),
];

const ImageSlideshow = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={images[currentImageIndex]} 
        style={styles.image} 
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6, // Adjust this value as needed
    resizeMode: 'cover',
  },
});

export default ImageSlideshow;