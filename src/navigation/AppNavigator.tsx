import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
// Lazy load the BottomTabNavigator for better performance
const BottomTabNavigator = React.lazy(() => import('./BottomTabNavigator'));

// Create a loading component for lazy-loaded screens
const LazyBottomTabNavigator = (props: any) => {
  return (
    <React.Suspense fallback={null}>
      <BottomTabNavigator {...props} />
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
    // Optimize transitions
    animation: 'fade_from_bottom',
    animationDuration: 200,
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
              // Optimize tab navigator transitions
              animation: 'none'
            }}
          />
        ) : (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              animation: 'slide_from_right',
              animationDuration: 200,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
