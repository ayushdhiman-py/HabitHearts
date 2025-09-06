import React, { useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import colors from '../theme/colors';

interface SnappingCarouselProps {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  onIndexChanged?: (index: number) => void;
  showNavigation?: boolean;
  slideWidth?: number; // Allow custom slide width
}

export interface SnappingCarouselRef {
  scrollToIndex: (index: number) => void;
  getCurrentIndex: () => number;
}

const { width: screenWidth } = Dimensions.get('window');

const SnappingCarousel = forwardRef<SnappingCarouselRef, SnappingCarouselProps>(({
  data,
  renderItem,
  onIndexChanged,
  showNavigation = false,
  slideWidth = screenWidth, // Default to full screen width
}, ref) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isScrollingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number) => {
      if (index >= 0 && index < data.length && scrollViewRef.current) {
        isScrollingRef.current = true;
        scrollViewRef.current.scrollTo({
          x: index * slideWidth,
          animated: true,
        });
        // Update the state immediately
        setCurrentIndex(index);
        onIndexChanged?.(index);
        // Reset scrolling flag after animation
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 300);
      }
    },
    getCurrentIndex: () => currentIndex,
  }));

  const handleScroll = useCallback((event: any) => {
    if (isScrollingRef.current) {
      // Skip updates during programmatic scrolling
      return;
    }
    
    const contentOffset = event.nativeEvent.contentOffset;
    const index = Math.round(contentOffset.x / slideWidth);
    
    if (index !== currentIndex && index >= 0 && index < data.length) {
      setCurrentIndex(index);
      onIndexChanged?.(index);
    }
  }, [currentIndex, data.length, onIndexChanged, slideWidth]);

  const handleScrollEnd = useCallback(() => {
    isScrollingRef.current = false;
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={slideWidth}
        snapToAlignment="start" // Align to start to prevent cropping
        contentContainerStyle={styles.contentContainer}
      >
        {data.map((item, index) => (
          <View key={index} style={[styles.slideContainer, { width: slideWidth }]}>
            {renderItem(item, index)}
          </View>
        ))}
      </ScrollView>
      
      {showNavigation && (
        <View style={styles.indicatorContainer}>
          {data.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex ? styles.activeIndicator : styles.inactiveIndicator,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
  },
  slideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: colors.electricBlueLight,
  },
  activeIndicator: {
    backgroundColor: colors.electricBlue,
  },
  inactiveIndicator: {
    backgroundColor: colors.electricBlueLight,
  },
});

export default SnappingCarousel;