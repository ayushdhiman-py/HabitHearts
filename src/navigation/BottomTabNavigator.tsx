import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainHomeScreen from '../screens/MainHomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import GoalsScreen from '../screens/GoalsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../theme/colors';
import { responsiveFontSize, verticalScale } from '../utils/responsive';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          height: verticalScale(55) + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: verticalScale(8),
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
        },
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: responsiveFontSize(11),
          fontWeight: '600',
          marginBottom: verticalScale(3),
        },
      }}>
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