import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const HomeScreen = () => {
  const { user, logout } = useAuth();

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      logout();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.message}>hi {user?.name || 'User'}</Text>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 22,
    marginBottom: 20,
  },
});

export default HomeScreen;
