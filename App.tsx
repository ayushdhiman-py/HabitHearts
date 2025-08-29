import React, { useEffect } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { auth } from './firebaseConfig';

const App = () => {
  useEffect(() => {
    // Initialize Firebase Auth listener
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        console.log('User is signed in:', user);
      } else {
        console.log('User is signed out');
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;