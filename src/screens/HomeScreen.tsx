import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

const HomeScreen = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.message}>hi {user?.name || 'User'}</Text>
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
