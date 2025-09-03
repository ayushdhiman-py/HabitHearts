import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import { responsiveFontSize, verticalScale } from '../utils/responsive';

const HomeScreen = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.message}>Hi {user?.name || 'User'}!</Text>
      <Text style={styles.subMessage}>Welcome to HabitHearts</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  message: {
    fontSize: responsiveFontSize(24),
    fontWeight: '600',
    color: colors.text,
    marginBottom: verticalScale(8),
  },
  subMessage: {
    fontSize: responsiveFontSize(16),
    color: colors.textSecondary,
  },
});

export default HomeScreen;
