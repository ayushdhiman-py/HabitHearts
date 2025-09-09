import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// Import logos
const heartLogo = require('../../assets/images/heartlogotransparent.png');
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
    <View style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
      <Slideshow />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Image source={heartLogo} style={styles.heartLogo} />
        <View style={styles.titleContainer}>
          <Text style={styles.title}>HabitHearts</Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(50),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 1,
    flex: 1,
    justifyContent: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginLeft: scale(13), // Keep an eye on this as it might cause overflow with width: '100%'
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Semi-transparent white base

    // Glow Effect
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(255, 255, 255, 0.7)', // Lighter, slightly opaque white for glow
        shadowOffset: { width: 0, height: 0 }, // No offset for an even glow
        shadowOpacity: 1, // Full opacity for the glow
        shadowRadius: 15, // Increased radius for a wider, softer glow
      },
      android: {
        // Android's elevation primarily adds a dark shadow.
        // To simulate glow, we often need to overlay another view
        // or rely on a very light background with a subtle elevation.
        // For a true glow, you might need a custom approach like a BlurView or an image.
        // For a basic glowing *appearance* with elevation:
        elevation: 25, // Increase elevation to make it 'pop' more
        shadowColor: 'rgba(255, 255, 255, 1)', // Not directly used by elevation for the glow color, but good for consistency
      },
    }),
    // Optional: Add a subtle border to enhance the glowing edge, especially on Android
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)', 
  },
  title: {
    fontSize: responsiveFontSize(32),
    fontWeight: 'bold',
    fontFamily: 'cursive',
    textAlign: 'center',
    lineHeight: responsiveFontSize(50),
    marginLeft: scale(-10),
    color: '#ffffff',
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
    bottom: scale(-40),
    zIndex: -2,
  },
  bottomContent: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: verticalScale(30),
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