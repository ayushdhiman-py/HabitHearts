import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeStatusBarProps {
  backgroundColor?: string;
}

const SafeStatusBar: React.FC<SafeStatusBarProps> = ({ 
  backgroundColor = 'rgba(255, 255, 255, 0.85)' 
}) => {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'android') {
    return null; // Android handled differently through StatusBar API
  }

  return (
    <View 
      style={[
        styles.statusBar, 
        { 
          height: insets.top, 
          backgroundColor,
          // Add iOS-specific blur effect
          ...Platform.select({
            ios: {
              backdropFilter: 'blur(10px)',
              // Fallback for older iOS versions
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
            },
          }),
        }
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    // Add a subtle border for better visibility
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default SafeStatusBar;