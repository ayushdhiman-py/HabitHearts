import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainHomeScreen from '../screens/MainHomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import GoalsScreen from '../screens/GoalsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { responsiveFontSize, scale, verticalScale, moderateScale } from '../utils/responsive';

// Minimal icon components with clean, professional design
const HomeIcon = ({ focused, size = 24 }: { focused: boolean; size?: number }) => (
  <View style={styles.iconContainer}>
    <Text style={[styles.icon, { 
      fontSize: responsiveFontSize(size), 
      color: focused ? colors.primary : colors.secondary 
    }]}>
      {focused ? '⌂' : '⌂'}
    </Text>
  </View>
);

const CalendarIcon = ({ focused, size = 24 }: { focused: boolean; size?: number }) => (
  <View style={styles.iconContainer}>
    <Text style={[styles.icon, { 
      fontSize: responsiveFontSize(size), 
      color: focused ? colors.primary : colors.secondary 
    }]}>
      {focused ? '📅' : '📅'}
    </Text>
  </View>
);

const GoalsIcon = ({ focused, size = 24 }: { focused: boolean; size?: number }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.minimalIcon, {
      width: responsiveFontSize(size),
      height: responsiveFontSize(size),
      borderColor: focused ? colors.primary : colors.secondary,
    }]}>
      <View style={[styles.minimalIconInner, {
        backgroundColor: focused ? colors.primary : 'transparent',
        width: responsiveFontSize(size) * 0.6,
        height: responsiveFontSize(size) * 0.6,
      }]} />
    </View>
  </View>
);

const ProfileIcon = ({ focused, size = 24 }: { focused: boolean; size?: number }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.profileIcon, {
      width: responsiveFontSize(size),
      height: responsiveFontSize(size),
      borderColor: focused ? colors.primary : colors.secondary,
    }]}>
      <View style={[styles.profileIconInner, {
        backgroundColor: focused ? colors.primary : colors.secondary,
        width: responsiveFontSize(size) * 0.4,
        height: responsiveFontSize(size) * 0.4,
      }]} />
    </View>
  </View>
);

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          height: verticalScale(70) + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : verticalScale(10),
          paddingTop: verticalScale(8),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        },
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: responsiveFontSize(13),
          fontWeight: '600',
          marginBottom: verticalScale(5),
        },
      }}>
      <Tab.Screen
        name="Home"
        component={MainHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ focused }) => <CalendarIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarLabel: 'Goals',
          tabBarIcon: ({ focused }) => <GoalsIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(2),
  },
  icon: {
    textAlign: 'center',
  },
  minimalIcon: {
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalIconInner: {
    borderRadius: 3,
  },
  profileIcon: {
    borderWidth: 2,
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIconInner: {
    borderRadius: moderateScale(4),
  },
});

export default BottomTabNavigator;