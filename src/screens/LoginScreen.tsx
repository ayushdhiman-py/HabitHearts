import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { auth } from '../../firebaseConfig';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import colors from '../theme/colors';
import globalStyles from '../theme/styles';
import { responsiveFontSize, scale, verticalScale, moderateScale, widthPercentage, heightPercentage } from '../utils/responsive';
import Icon from 'react-native-vector-icons/FontAwesome';

// IMPORTANT: You must get this from your Google Cloud project
GoogleSignin.configure({
  webClientId: '545998989450-ierli7eqdnkr5slmsm3vl2dcke96a7rn.apps.googleusercontent.com',
  offlineAccess: true,
});

const LoginScreen = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    try {
      setLoading(true);
      console.log('Attempting to check Play Services...');
      await GoogleSignin.hasPlayServices();
      console.log('Play Services available, proceeding with sign in...');
      
      // Sign in with Google
      const { data } = await GoogleSignin.signIn();
      console.log('Google Sign-In data:', data);
      
      if (!data?.idToken) {
        console.log('No ID token received from Google Sign-In');
        setTimeout(() => {
          Alert.alert('Sign In Failed', 'Could not get authentication token from Google. Please try again.');
        }, 100);
        return;
      }
      
      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(data.idToken);
      
      // Sign in to Firebase with the Google credential
      const userCredential = await signInWithCredential(auth, googleCredential);
      console.log('Firebase user:', userCredential.user);
      
      // Update the app's authentication context
      login({
        uid: userCredential.user.uid,
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
        setTimeout(() => {
          Alert.alert('In Progress', 'Google Sign-In is already in progress.');
        }, 100);
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setTimeout(() => {
          Alert.alert('Play Services Error', 'Google Play Services is not available or outdated on this device.');
        }, 100);
      } else if (error?.message && error.message.includes('Network request failed')) {
        setTimeout(() => {
          Alert.alert('Network Error', 'Could not connect to the authentication service.');
        }, 100);
      } else if (error?.message && error.message.includes('activity is null')) {
        setTimeout(() => {
          Alert.alert('Sign-In Error', 'There was an issue with the sign-in process. Please try again.');
        }, 100);
      } else {
        // Some other error happened
        setTimeout(() => {
          Alert.alert('Google Sign-In Error', `An unexpected error occurred: ${errorMessage}. Check the Metro console for the full error message.`);
        }, 100);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>HabitHearts 💕</Text>
        <Text style={styles.subtitle}>Build better habits together</Text>
        
        <View style={styles.heartContainer}>
          <Text style={styles.heartEmoji}>❤️</Text>
        </View>
        
        <TouchableOpacity 
          style={[globalStyles.button, styles.signInButton, loading && globalStyles.disabledButton]} 
          onPress={signIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textLight} size="small" />
          ) : (
            <>
              <Icon name="google" size={responsiveFontSize(20)} color="#fff" style={styles.googleIcon} />
              <Text style={[globalStyles.buttonText, styles.buttonText]}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.description}>
          Connect with your partner to build healthy habits together and track your progress side by side.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: responsiveFontSize(32),
    fontWeight: '800',
    color: colors.primary,
    marginBottom: verticalScale(10),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: responsiveFontSize(18),
    color: colors.textSecondary,
    marginBottom: verticalScale(40),
    textAlign: 'center',
  },
  heartContainer: {
    width: widthPercentage(25),
    height: widthPercentage(25),
    borderRadius: widthPercentage(12.5),
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(40),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  heartEmoji: {
    fontSize: responsiveFontSize(60),
    color: colors.primary,
  },
  signInButton: {
    width: '100%',
    marginBottom: verticalScale(30),
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
  },
  googleIcon: {
    marginRight: scale(10),
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  description: {
    fontSize: responsiveFontSize(16),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: verticalScale(24),
  },
});

export default LoginScreen