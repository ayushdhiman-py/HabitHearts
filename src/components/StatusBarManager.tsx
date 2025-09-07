import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import colors from '../theme/colors';

interface StatusBarManagerProps {
  backgroundColor?: string;
  barStyle?: 'light-content' | 'dark-content' | 'default';
}

/**
 * StatusBarManager component that synchronizes the system status bar with the app's theme
 * Automatically adapts to light/dark mode and provides seamless color synchronization
 */
const StatusBarManager: React.FC<StatusBarManagerProps> = ({
  backgroundColor = colors.surface,
  barStyle = 'dark-content',
}) => {
  useEffect(() => {
    // Update status bar appearance when component mounts or props change
    StatusBar.setBarStyle(barStyle, true);
    
    // On Android, also set the background color
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(backgroundColor, true);
      // Set translucent to false for better color matching
      StatusBar.setTranslucent(false);
    }
    
    // Enable network activity indicator on iOS
    if (Platform.OS === 'ios') {
      StatusBar.setNetworkActivityIndicatorVisible(true);
    }
    
    // Hide StatusBar animation for smoother transitions
    StatusBar.setHidden(false, 'none');
  }, [backgroundColor, barStyle]);

  return null; // This component doesn't render anything
};

export default StatusBarManager;