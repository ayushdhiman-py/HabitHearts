import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
// Lazy load the BottomTabNavigator for better performance
const BottomTabNavigator = React.lazy(() => import('./BottomTabNavigator'));

// Import the fade transition component
import { FadeTransition } from './ScreenTransitions';

// Create a loading component for lazy-loaded screens
const LazyBottomTabNavigator = (props: any) => {
  return (
    <React.Suspense fallback={null}>
      <FadeTransition>
        <BottomTabNavigator {...props} />
      </FadeTransition>
    </React.Suspense>
  );
};

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user } = useAuth();

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo<NativeStackNavigationOptions>(() => ({
    headerShown: false,
    contentStyle: { flex: 1 }, // Ensure full height
    // Use fade transition for stack navigator
    animation: 'fade',
    animationDuration: 300,
  }), []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {user ? (
          <Stack.Screen 
            name="Main" 
            component={LazyBottomTabNavigator}
            options={{ 
              contentStyle: { flex: 1 },
              // Use fade transition for tab navigator screens
              animation: 'fade'
            }}
          />
        ) : (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              animation: 'fade',
              animationDuration: 300,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;