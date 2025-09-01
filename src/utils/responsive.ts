import { Dimensions, PixelRatio } from 'react-native';

// Device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes for responsive design (based on iPhone 14 Pro design)
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

// Scale functions for responsive sizing
const scale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

// Responsive font size function
const responsiveFontSize = (size: number) => {
  const newSize = scale(size);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Responsive width percentage
const widthPercentage = (percentage: number) => {
  return (SCREEN_WIDTH * percentage) / 100;
};

// Responsive height percentage
const heightPercentage = (percentage: number) => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Device type detection
const isSmallDevice = SCREEN_WIDTH < 375;
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
const isLargeDevice = SCREEN_WIDTH >= 414;

// Orientation detection
const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;

export {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  widthPercentage,
  heightPercentage,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isLandscape,
};