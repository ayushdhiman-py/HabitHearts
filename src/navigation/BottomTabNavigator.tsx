import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useStatusBar } from '../context/StatusBarContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../theme/colors';
import { responsiveFontSize, verticalScale } from '../utils/responsive';

// Import screens directly instead of lazy loading to avoid inline function warnings
import MainHomeScreen from '../screens/MainHomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import GoalsScreen from '../screens/GoalsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TestingScreen from '../screens/TestingScreen';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { backgroundColor } = useStatusBar();

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo(() => ({
    tabBarShowLabel: true,
    tabBarStyle: {
      backgroundColor: backgroundColor,
      height: verticalScale(55) + insets.bottom,
      paddingBottom: insets.bottom,
      paddingTop: verticalScale(8),
    },
    headerShown: false,
    tabBarActiveTintColor: colors.textLight,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarLabelStyle: {
      fontSize: responsiveFontSize(11),
      fontWeight: '600',
      marginBottom: verticalScale(3),
    },
    // Optimize tab bar transitions
    tabBarHideOnKeyboard: true,
  }), [backgroundColor, insets.bottom]);

  return (
    <Tab.Navigator
      screenOptions={screenOptions}
      detachInactiveScreens={true} // Unmount inactive screens to save memory
    >
      <Tab.Screen
        name="Home"
        component={MainHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "home" : "home-outline"} color={color} size={22} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "calendar" : "calendar-outline"} color={color} size={22} />
          ),
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarLabel: 'Goals',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "flag-checkered" : "flag-outline"} color={color} size={22} />
          ),
        }}
      />
      <Tab.Screen
        name="Testing"
        component={TestingScreen}
        options={{
          tabBarLabel: 'Testing',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "test-tube" : "test-tube-outline"} color={color} size={22} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "account-circle" : "account-circle-outline"} color={color} size={22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;