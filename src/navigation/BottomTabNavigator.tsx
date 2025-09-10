import React, { useMemo } from 'react';
import { createBottomTabNavigator, type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useStatusBar } from '../context/StatusBarContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import { responsiveFontSize, verticalScale } from '../utils/responsive';
import { type TextStyle } from 'react-native';

// Import screens directly instead of lazy loading to avoid inline function warnings
import MainHomeScreen from '../screens/MainHomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import GoalsScreen from '../screens/GoalsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TestingScreen from '../screens/TestingScreen';

// Import custom animated tab icon
import AnimatedTabIcon from '../components/AnimatedTabIcon';

// Import the fade transition component
import { FadeTransition } from './ScreenTransitions';

// Wrap screens with fade transition
const HomeScreenWithTransition = (props: any) => (
  <FadeTransition>
    <MainHomeScreen {...props} />
  </FadeTransition>
);

const CalendarScreenWithTransition = (props: any) => (
  <FadeTransition>
    <CalendarScreen {...props} />
  </FadeTransition>
);

const GoalsScreenWithTransition = (props: any) => (
  <FadeTransition>
    <GoalsScreen {...props} />
  </FadeTransition>
);

const ProfileScreenWithTransition = (props: any) => (
  <FadeTransition>
    <ProfileScreen {...props} />
  </FadeTransition>
);

const TestingScreenWithTransition = (props: any) => (
  <FadeTransition>
    <TestingScreen {...props} />
  </FadeTransition>
);

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { backgroundColor } = useStatusBar();

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo<BottomTabNavigationOptions>(() => ({
    tabBarShowLabel: true,
    tabBarStyle: {
      backgroundColor: backgroundColor,
      height: verticalScale(55) + insets.bottom,
      paddingBottom: insets.bottom,
      paddingTop: verticalScale(8),
    },
    headerShown: false,
    tabBarActiveTintColor: colors.primary, // Use primary color for active tabs
    tabBarInactiveTintColor: colors.text, // Use text color for inactive tabs
    tabBarLabelStyle: {
      fontSize: responsiveFontSize(11),
      fontWeight: '600' as TextStyle['fontWeight'],
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
        component={HomeScreenWithTransition}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon 
              name="home-outline" 
              focusedName="home" 
              color={color} 
              size={22} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreenWithTransition}
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon 
              name="calendar-outline" 
              focusedName="calendar" 
              color={color} 
              size={22} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreenWithTransition}
        options={{
          tabBarLabel: 'Goals',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon 
              name="flag-outline" 
              focusedName="flag-checkered" 
              color={color} 
              size={22} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Testing"
        component={TestingScreenWithTransition}
        options={{
          tabBarLabel: 'Testing',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon 
              name="test-tube-outline" 
              focusedName="test-tube" 
              color={color} 
              size={22} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreenWithTransition}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon 
              name="account-circle-outline" 
              focusedName="account-circle" 
              color={color} 
              size={22} 
              focused={focused} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;