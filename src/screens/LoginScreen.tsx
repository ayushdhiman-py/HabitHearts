import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { auth } from '../../firebaseConfig';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

// IMPORTANT: You must get this from your Google Cloud project
GoogleSignin.configure({
  webClientId: '545998989450-ierli7eqdnkr5slmsm3vl2dcke96a7rn.apps.googleusercontent.com',
});

const LoginScreen = () => {
  const { login } = useAuth();

  const signIn = async () => {
    try {
      console.log('Attempting to check Play Services...');
      await GoogleSignin.hasPlayServices();
      console.log('Play Services available, proceeding with sign in...');
      
      // Sign in with Google
      const { data } = await GoogleSignin.signIn();
      console.log('Google Sign-In data:', data);
      
      if (!data?.idToken) {
        console.log('No ID token received from Google Sign-In');
        Alert.alert('Sign In Failed', 'Could not get authentication token from Google. Please try again.');
        return;
      }
      
      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(data.idToken);
      
      // Sign in to Firebase with the Google credential
      const userCredential = await signInWithCredential(auth, googleCredential);
      console.log('Firebase user:', userCredential.user);
      
      // Update the app's authentication context
      login({
        name: userCredential.user.displayName || '',
        email: userCredential.user.email || '',
        picture: userCredential.user.photoURL || ''
      });
      
      console.log('User successfully signed in to Firebase');
    } catch (error: any) {
      // It's crucial to log the error for debugging
      console.log('Google Sign-In Error:', error);
      console.log('Error type:', typeof error);
      console.log('Error keys:', Object.keys(error || {}));

      // Handle both string and object errors
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        // This is not really an error, the user just cancelled the process
      } else if (error?.code === statusCodes.IN_PROGRESS) {
        Alert.alert('In Progress', 'Google Sign-In is already in progress.');
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Play Services Error', 'Google Play Services is not available or outdated on this device.');
      } else if (error?.message && error.message.includes('Network request failed')) {
        Alert.alert('Network Error', 'Could not connect to the authentication service.');
      } else {
        // Some other error happened
        Alert.alert('Google Sign-In Error', `An unexpected error occurred: ${errorMessage}. Check the Metro console for the full error message.`);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HabitHearts</Text>
      <Button title="Sign in with Google" onPress={signIn} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default LoginScreen;
