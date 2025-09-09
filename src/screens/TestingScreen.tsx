import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStatusBar } from '../context/StatusBarContext';
import { responsiveFontSize, scale, verticalScale, moderateScale } from '../utils/responsive';
import { getTextColorForBackground } from '../utils/colorUtils';
import { getButtonColor } from '../utils/buttonUtils';
import colors from '../theme/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Memoize the component to prevent unnecessary re-renders
const TestingScreen = () => {
  const { screenBackgroundColor, backgroundColor, themePalette } = useStatusBar();

  useEffect(() => {
    // The StatusBarContext will automatically use the selected theme
    // No need to set status bar manually here
  }, []);

  const openAddEventModal = () => {
    // Dummy function for now
    console.log('Add event button pressed');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, backgroundColor: screenBackgroundColor }}>
        <View style={[styles.header, { backgroundColor: backgroundColor }]}>
          <Text style={[styles.title, { color: getTextColorForBackground(backgroundColor) }]}>Testing Screen</Text>
          <TouchableOpacity
            style={[styles.headerAddButton, { backgroundColor: getButtonColor(backgroundColor) }]}
            onPress={openAddEventModal}
          >
            <Icon name="add" size={responsiveFontSize(24)} color={colors.textLight} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.description}>
            This screen demonstrates the status bar styling used in the Calendar screen.
            The status bar should now match the app's theme with a light background and dark text.
          </Text>
          <View style={styles.featureBox}>
            <Text style={styles.featureTitle}>Status Bar Synchronization</Text>
            <Text style={styles.featureDescription}>
              This screen uses the same status bar configuration as the Calendar screen:
            </Text>
            <Text style={styles.featureItem}>• Background: {colors.surface}</Text>
            <Text style={styles.featureItem}>• Text Style: dark-content</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerAddButton: {
    padding: scale(12),
    borderRadius: moderateScale(16),
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: responsiveFontSize(24),
    fontWeight: '700',
    color: colors.textLight,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: scale(20),
    justifyContent: 'center',
  },
  description: {
    fontSize: responsiveFontSize(16),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(30),
    lineHeight: responsiveFontSize(24),
  },
  featureBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: scale(20),
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '600',
    color: colors.text,
    marginBottom: verticalScale(15),
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    marginBottom: verticalScale(10),
    lineHeight: responsiveFontSize(20),
  },
  featureItem: {
    fontSize: responsiveFontSize(14),
    color: colors.text,
    marginBottom: verticalScale(5),
    lineHeight: responsiveFontSize(20),
  },
});

export default TestingScreen;
