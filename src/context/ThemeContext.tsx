import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../theme/colors';

interface ThemeContextType {
  selectedTheme: string;
  setSelectedTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [selectedTheme, setSelectedTheme] = useState(colors.hotPink); // Default theme

  // Load saved theme from storage on app start
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('selectedTheme');
        if (savedTheme) {
          setSelectedTheme(savedTheme);
        }
      } catch (error) {
        console.error('Error loading saved theme:', error);
      }
    };

    loadSavedTheme();
  }, []);

  // Save theme to storage whenever it changes
  const updateSelectedTheme = (theme: string) => {
    setSelectedTheme(theme);
    AsyncStorage.setItem('selectedTheme', theme).catch(error => {
      console.error('Error saving theme:', error);
    });
  };

  return (
    <ThemeContext.Provider value={{ selectedTheme, setSelectedTheme: updateSelectedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};