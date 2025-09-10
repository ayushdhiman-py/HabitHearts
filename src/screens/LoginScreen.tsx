import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { auth } from '../../firebaseConfig';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import colors from '../theme/colors';
import globalStyles from '../theme/styles';
import { responsiveFontSize, scale, verticalScale, widthPercentage } from '../utils/responsive';
import Slideshow from '../components/Slideshow';
import { useStatusBar } from '../context/StatusBarContext';
import { useFocusEffect } from '@react-navigation/native';
import SafeStatusBar from '../components/SafeStatusBar';

// Import the fade transition component
import { FadeTransition } from '../navigation/ScreenTransitions';

// Import logos
const heartLogo = require('../../assets/images/heartlogotransparent.png');
const titleLogo = require('../../assets/images/logo2.png');
const googleLogo = require('../../assets/images/google-logo.png');

// Memoize the component to prevent unnecessary re-renders
const LoginScreen = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isSignInReady, setIsSignInReady] = useState(false);
  const { setStatusBar, screenBackgroundColor, themePalette } = useStatusBar();

  // Check for Play Services on mount to "warm up" the module and prevent "activity is null"
  useEffect(() => {
    // IMPORTANT: You must get this from your Google Cloud project
    GoogleSignin.configure({
      webClientId: '545998989450-ierli7eqdnkr5slmsm3vl2dcke96a7rn.apps.googleusercontent.com',
      offlineAccess: true,
    });

    const checkPlayServices = async () => {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        setIsSignInReady(true);
      } catch (error: any) {
        if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
          Alert.alert('Play Services Error', 'Google Play Services is not available or outdated on this device.');
        }
      }
    };
    checkPlayServices();
  }, []);

  // Set status bar for login screen
  useFocusEffect(
    useCallback(() => {
      // Set status bar to match the app's primary theme
      setStatusBar(themePalette.statusBar, 'light-content');
    }, [setStatusBar, themePalette.statusBar])
  );

  const signIn = async () => {
    if (!isSignInReady) {
      Alert.alert('Initialization', 'Google Sign-In is not ready yet, please wait a moment.');
      return;
    }
    try {
      setLoading(true);

      // Sign in with Google
      const { data } = await GoogleSignin.signIn();
      console.log('Google Sign-In data:', data);

      if (!data?.idToken) {
        console.log('No ID token received from Google Sign-In');
        Alert.alert('Sign In Failed', 'Could not get authentication token from Google. Please try again.');
        setLoading(false); // Manually set loading false here
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
      // No need to log full error object in production, but useful for debug
      console.log('Google Sign-In Error:', error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow, do nothing
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('In Progress', 'Google Sign-In is already in progress.');
      } else {
        // Some other error happened
        Alert.alert('Google Sign-In Error', 'An unexpected error occurred during sign-in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FadeTransition>
      <View style={styles.container}>
        <SafeStatusBar />
        <Slideshow />
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Image source={heartLogo} style={styles.heartLogo} />
          <View style={styles.titleContainer}>
            <Image source={titleLogo} style={styles.titleLogo} />
            {/* <Text style={styles.subtitle}>Your relationship partner</Text> */}
          </View>

          <View style={styles.bottomContent}>
            <TouchableOpacity
              style={[globalStyles.button, styles.signInButton, loading && globalStyles.disabledButton]}
              onPress={signIn}
              disabled={loading || !isSignInReady}
            >
              {loading ? (
                <ActivityIndicator color={colors.textLight} size="small" />
              ) : (
                <>
                  <Image source={googleLogo} style={styles.googleIcon} />
                  <Text style={[globalStyles.buttonText, styles.buttonText]}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.description}>
              Connect with your partner to build healthy habits together and track your progress side by side.
            </Text>
          </View>
        </View>
      </View>
    </FadeTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(50),
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent dark overlay
  },
  content: {
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 1,
    flex: 1,
    justifyContent: 'flex-start',
    position: 'relative',
  },
  titleContainer: {
    alignItems: 'center',
    height: verticalScale(20),
    width: scale(290),
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    // Glow effect properties
    shadowColor: '#ffffffff', // Cyan color for the glow
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10, // For Android
    paddingVertical: verticalScale(30),
  },
  titleLogo: {
    width: widthPercentage(80),
    height: verticalScale(80),
    resizeMode: 'cover',
    // White glow effect
    shadowColor: '#ffffffff', // White glow
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 100,
    elevation: 10, // For Android
  },
  subtitle: {
    fontSize: responsiveFontSize(16),
    color: '#fbff00ff',
    marginBottom: verticalScale(10),
    textAlign: 'center',
  },
  heartLogo: {
    width: responsiveFontSize(100),
    height: responsiveFontSize(100),
    resizeMode: 'contain',
    position: 'absolute',
    bottom: verticalScale(-30),
    zIndex: -2,
  },
  bottomContent: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: verticalScale(50),
  },
  signInButton: {
    width: '100%',
    marginBottom: verticalScale(30),
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
  },
  googleIcon: {
    width: responsiveFontSize(50),
    height: responsiveFontSize(20),
  },
  buttonText: {
    color: colors.text,
    fontWeight: '600',
  },
  description: {
    fontSize: responsiveFontSize(16),
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: verticalScale(24),
  },
});

export default LoginScreen;