import React, { useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  ViewToken,
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

const SnappingCarousel = forwardRef<SnappingCarouselRef, SnappingCarouselProps>((
  {
    data,
    renderItem,
    onIndexChanged,
    showNavigation = false,
    slideWidth = screenWidth, // Default to full screen width
  },
  ref
) => {
  const flatListRef = useRef<FlatList<any>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number) => {
      if (index >= 0 && index < data.length && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index, animated: true });
      }
    },
    getCurrentIndex: () => currentIndex,
  }));

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== currentIndex) {
        setCurrentIndex(index);
        onIndexChanged?.(index);
      }
    }
  }, [currentIndex, onIndexChanged]);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={({ item, index }) => (
          <View style={[styles.slideContainer, { width: slideWidth }]}>
            {renderItem(item, index)}
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        decelerationRate="fast"
        snapToInterval={slideWidth}
        snapToAlignment="start"
        contentContainerStyle={styles.contentContainer}
      />
      
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