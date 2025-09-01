import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createUserDocument, getUserByUniqueCode, linkUsers, getLinkedUsers } from '../services/userService';
import colors from '../theme/colors';
import globalStyles from '../theme/styles';
import { responsiveFontSize, scale, verticalScale, moderateScale, widthPercentage, heightPercentage } from '../utils/responsive';

interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

interface LinkedUser {
  uid: string;
  displayName?: string;
  email?: string;
  uniqueCode: string;
}

const ProfileScreen = () => {
  const { user, logout } = useAuth() as { user: User | null; logout: () => void };
  const [uniqueCode, setUniqueCode] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const initializeUser = async () => {
      if (user) {
        try {
          setLoading(true);
          const code = await createUserDocument(user);
          setUniqueCode(code);
          await fetchLinkedUsers();
        } catch (error) {
          console.error('Error initializing user:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    initializeUser();
  }, [user]);

  const fetchLinkedUsers = async () => {
    try {
      if (user) {
        const users = await getLinkedUsers(user.uid);
        setLinkedUsers(users);
      }
    } catch (error) {
      console.error('Error fetching linked users:', error);
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      logout();
    } catch (error) {
      console.error(error);
    }
  };

  const handleLinkUser = async () => {
    if (!linkCode.trim()) {
      Alert.alert('Error', 'Please enter a valid code');
      return;
    }

    if (linkCode === uniqueCode) {
      Alert.alert('Error', 'You cannot link with yourself');
      return;
    }

    setLinking(true);
    try {
      const otherUser = await getUserByUniqueCode(linkCode);
      
      if (!otherUser) {
        Alert.alert('Error', 'No user found with this code');
        setLinking(false);
        return;
      }

      // Check if already linked
      const isAlreadyLinked = linkedUsers.some(u => u.uid === otherUser.uid);
      if (isAlreadyLinked) {
        Alert.alert('Info', 'You are already linked with this user');
        setLinking(false);
        return;
      }

      // Link users
      await linkUsers(user!.uid, otherUser.uid);
      
      // Refresh linked users for both users
      await fetchLinkedUsers();
      
      // Also refresh the other user's linked users (to show this user in their list)
      // This would require a more complex implementation with real-time listeners
      
      Alert.alert('Success', `You are now linked with ${otherUser.displayName || otherUser.email}`);
      setLinkCode('');
    } catch (error) {
      console.error('Error linking users:', error);
      Alert.alert('Error', 'Failed to link users. Please try again.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView style={globalStyles.flex1}>
        <View style={[styles.header, { marginTop: insets.top > 0 ? insets.top : verticalScale(10) }]}>
          <Text style={styles.title}>Profile 👥</Text>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            <View style={globalStyles.card}>
              <View style={styles.profileInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </Text>
                </View>
                <Text style={styles.name}>{user?.displayName || 'User'}</Text>
                <Text style={styles.email}>{user?.email || 'No email'}</Text>
              </View>
            </View>

            {/* Unique Code Section */}
            <View style={globalStyles.card}>
              <Text style={globalStyles.sectionTitle}>Your Unique Code</Text>
              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>{uniqueCode || 'Generating...'}</Text>
              </View>
              <Text style={styles.codeDescription}>
                Share this code with your partner to link your accounts
              </Text>
            </View>

            {/* Link User Section */}
            <View style={globalStyles.card}>
              <Text style={globalStyles.sectionTitle}>Link with Your Partner</Text>
              <View style={styles.linkContainer}>
                <TextInput
                  style={globalStyles.input}
                  placeholder="Enter partner's unique code"
                  value={linkCode}
                  onChangeText={setLinkCode}
                  autoCapitalize="none"
                  editable={!linking}
                />
                <TouchableOpacity 
                  style={[globalStyles.button, styles.linkButton, linking && globalStyles.disabledButton]} 
                  onPress={handleLinkUser}
                  disabled={linking}
                >
                  {linking ? (
                    <ActivityIndicator color={colors.textLight} size="small" />
                  ) : (
                    <Text style={globalStyles.buttonText}>Link</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Linked Users Section */}
            {linkedUsers.length > 0 && (
              <View style={globalStyles.card}>
                <Text style={globalStyles.sectionTitle}>Linked Partners</Text>
                {linkedUsers.map((linkedUser) => (
                  <View key={linkedUser.uid} style={styles.linkedUserItem}>
                    <View style={styles.linkedUserInfo}>
                      <View style={styles.linkedUserAvatar}>
                        <Text style={styles.linkedUserAvatarText}>
                          {linkedUser.displayName?.charAt(0) || linkedUser.email?.charAt(0) || 'P'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.linkedUserName}>
                          {linkedUser.displayName || linkedUser.email}
                        </Text>
                        <Text style={styles.linkedUserCode}>
                          Code: {linkedUser.uniqueCode}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.heartIcon}>
                      <Text style={styles.heartEmoji}>❤️</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[globalStyles.button, styles.signOutButton]} onPress={signOut}>
                <Text style={globalStyles.buttonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
  },
  title: {
    fontSize: responsiveFontSize(24),
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: responsiveFontSize(16),
    color: colors.textSecondary,
  },
  profileInfo: {
    alignItems: 'center',
    paddingVertical: verticalScale(20),
  },
  avatar: {
    width: widthPercentage(25),
    height: widthPercentage(25),
    borderRadius: widthPercentage(12.5),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarText: {
    fontSize: responsiveFontSize(40),
    color: colors.textLight,
    fontWeight: '700',
  },
  name: {
    fontSize: responsiveFontSize(22),
    fontWeight: '700',
    color: colors.text,
    marginBottom: verticalScale(10),
  },
  email: {
    fontSize: responsiveFontSize(16),
    color: colors.textSecondary,
  },
  codeContainer: {
    backgroundColor: colors.gradientStart,
    padding: moderateScale(20),
    borderRadius: moderateScale(16),
    alignItems: 'center',
    marginBottom: verticalScale(15),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeText: {
    fontSize: responsiveFontSize(28),
    fontWeight: '800',
    color: colors.textLight,
    letterSpacing: 3,
  },
  codeDescription: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: verticalScale(20),
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkButton: {
    backgroundColor: colors.tertiary,
    marginLeft: scale(10),
    paddingHorizontal: scale(20),
  },
  linkedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkedUserAvatar: {
    width: verticalScale(50),
    height: verticalScale(50),
    borderRadius: verticalScale(25),
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(15),
  },
  linkedUserAvatarText: {
    fontSize: responsiveFontSize(20),
    color: colors.textLight,
    fontWeight: '700',
  },
  linkedUserName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: colors.text,
  },
  linkedUserCode: {
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    marginTop: verticalScale(3),
  },
  heartIcon: {
    width: verticalScale(30),
    height: verticalScale(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartEmoji: {
    fontSize: responsiveFontSize(20),
  },
  buttonContainer: {
    marginHorizontal: scale(20),
    marginVertical: verticalScale(30),
  },
  signOutButton: {
    backgroundColor: colors.error,
  },
});

export default ProfileScreen;