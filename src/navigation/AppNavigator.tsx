import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
// Lazy load the BottomTabNavigator for better performance
const BottomTabNavigator = React.lazy(() => import('./BottomTabNavigator'));

// Create a loading component for lazy-loaded screens
const LazyScreenWrapper = ({ component: Component, ...props }: any) => {
  return (
    <React.Suspense fallback={null}>
      <Component {...props} />
    </React.Suspense>
  );
};

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user } = useAuth();

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo(() => ({
    headerShown: false,
    contentStyle: { flex: 1 }, // Ensure full height
    // Optimize transitions
    animation: 'fade',
    animationDuration: 200,
  }), []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {user ? (
          <Stack.Screen 
            name="Main" 
            component={(props) => <LazyScreenWrapper component={BottomTabNavigator} {...props} />}
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
