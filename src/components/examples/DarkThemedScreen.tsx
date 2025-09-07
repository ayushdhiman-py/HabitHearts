import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { useStatusBar } from '../../context/StatusBarContext';

/**
 * Example component demonstrating how to use the StatusBarManager with a dark theme
 */
const DarkThemedScreen = () => {
  const { setStatusBar } = useStatusBar();

  useEffect(() => {
    // Set status bar for dark theme
    setStatusBar(colors.electricBlueDark, 'light-content');
    
    // Reset to default when component unmounts
    return () => {
      setStatusBar(colors.surface, 'dark-content');
    };
  }, [setStatusBar]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dark Theme Screen</Text>
      <Text style={styles.description}>
        This screen demonstrates how to use the StatusBarManager with a dark background.
        The system status bar automatically adapts to match the screen's theme.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.electricBlueDark,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textLight,
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default DarkThemedScreen;