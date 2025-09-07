import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StatusBar, Platform } from 'react-native';
import { createThemePalette } from '../utils/themeUtils';
import { useTheme } from './ThemeContext';

interface StatusBarContextType {
  backgroundColor: string; // Bottom tab color (30% lighter)
  barStyle: 'light-content' | 'dark-content' | 'default';
  screenBackgroundColor: string; // Screen background (80% lighter)
  themePalette: ReturnType<typeof createThemePalette>; // Complete color palette
  setStatusBar: (backgroundColor: string, barStyle: 'light-content' | 'dark-content' | 'default') => void;
}

const StatusBarContext = createContext<StatusBarContextType | undefined>(undefined);

export const useStatusBar = () => {
  const context = useContext(StatusBarContext);
  if (context === undefined) {
    throw new Error('useStatusBar must be used within a StatusBarProvider');
  }
  return context;
};

interface StatusBarProviderProps {
  children: React.ReactNode;
}

export const StatusBarProvider: React.FC<StatusBarProviderProps> = ({ children }) => {
  const [backgroundColor, setBackgroundColor] = useState('#FF2B9D'); // Default hot pink (30% lighter would be #FFE6F5)
  const [barStyle, setBarStyle] = useState<'light-content' | 'dark-content' | 'default'>('light-content');
  const [screenBackgroundColor, setScreenBackgroundColor] = useState('#FFE6F5'); // Default hot pink (80% lighter)
  const [themePalette, setThemePalette] = useState(createThemePalette('#FF2B9D')); // Default palette
  const { selectedTheme } = useTheme();

  // Update colors when theme changes
  useEffect(() => {
    const palette = createThemePalette(selectedTheme);
    setThemePalette(palette);
    setBackgroundColor(palette.bottomTab);
    setScreenBackgroundColor(palette.screenBackground);
    setBarStyle(palette.textOnBottomTab === '#FFFFFF' ? 'light-content' : 'dark-content');
  }, [selectedTheme]);

  const setStatusBar = useCallback((newBackgroundColor: string, newBarStyle: 'light-content' | 'dark-content' | 'default') => {
    const palette = createThemePalette(newBackgroundColor);
    setThemePalette(palette);
    setBackgroundColor(palette.bottomTab);
    setBarStyle(newBarStyle);
    setScreenBackgroundColor(palette.screenBackground);
  }, []);

  useEffect(() => {
    StatusBar.setBarStyle(barStyle, true);
    // Use the actual theme color for the StatusBar (not lightened)
    StatusBar.setBackgroundColor(themePalette.statusBar, true);
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
    }
  }, [backgroundColor, barStyle, themePalette.statusBar]);

  return (
    <StatusBarContext.Provider value={{ backgroundColor, barStyle, screenBackgroundColor, themePalette, setStatusBar }}>
      {children}
    </StatusBarContext.Provider>
  );
};
