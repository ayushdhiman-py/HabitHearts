import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useStatusBar } from '../context/StatusBarContext';
import { useTheme } from '../context/ThemeContext';
import { generateUniqueCode, linkUsers, getLinkedUsers, User, createUserDocument, getUserByUniqueCode } from '../services/userService';
import { responsiveFontSize, scale, verticalScale, moderateScale, widthPercentage } from '../utils/responsive';
import colors from '../theme/colors';
import globalStyles from '../theme/styles';
import { getTextColorForBackground } from '../utils/colorUtils';
import { getButtonColor } from '../utils/buttonUtils';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface LinkedUser {
  uid: string;
  displayName?: string;
  email?: string;
  uniqueCode: string;
}

// Define available theme colors
const THEME_COLORS = [
  colors.hotPink,
  colors.electricBlue,
  colors.electricGreen,
  colors.vibrantOrange,
  colors.brightPurple,
  colors.sunnyYellow,
  colors.brightRed,
  colors.mint,
  colors.textLight
];

// Memoize the component to prevent unnecessary re-renders
const ProfileScreen = () => {
  const { user, logout } = useAuth() as { user: User | null; logout: () => void };
  const [uniqueCode, setUniqueCode] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const { screenBackgroundColor, backgroundColor, themePalette } = useStatusBar();
  const { selectedTheme, setSelectedTheme } = useTheme();

  useEffect(() => {
    // The StatusBarContext will automatically use the selected theme
    // No need to set status bar manually here
  }, []);

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

  // Render color theme options
  const renderColorOption = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.colorOption,
        { backgroundColor: item },
        selectedTheme === item && styles.selectedColorOption
      ]}
      onPress={() => setSelectedTheme(item)}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, backgroundColor: screenBackgroundColor }}>
        <View style={[styles.header, { backgroundColor: backgroundColor }]}>
          <Text style={[styles.title, { color: getTextColorForBackground(backgroundColor) }]}>Profile</Text>
          <TouchableOpacity
            style={[styles.headerAddButton, { backgroundColor: getButtonColor(themePalette.primary) }]}
          >
            <Icon name="add" size={responsiveFontSize(24)} color={colors.textLight} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={globalStyles.flex1} contentContainerStyle={{ marginTop: verticalScale(16) }}>
          {loading ? (
            <View style={[styles.loadingContainer]}>
              <ActivityIndicator size="large" color={colors.electricBlue} />
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

              {/* Theme Selection Section */}
              <View style={globalStyles.card}>
                <Text style={globalStyles.sectionTitle}>App Theme</Text>
                <Text style={styles.themeDescription}>
                  Select your preferred color theme for the app
                </Text>
                <FlatList
                  data={THEME_COLORS}
                  renderItem={renderColorOption}
                  keyExtractor={(item, index) => index.toString()}
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.colorOptionsContainer}
                />
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
                    style={[globalStyles.button, styles.linkButton, linking && globalStyles.disabledButton, {backgroundColor: getButtonColor(themePalette.primary)}]} 
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
                <TouchableOpacity style={[globalStyles.button, styles.signOutButton, {backgroundColor: getButtonColor(themePalette.primary)}]} onPress={signOut}>
                  <Text style={globalStyles.buttonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerAddButton: {
    padding: scale(12),
    borderRadius: moderateScale(16),
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
    paddingVertical: verticalScale(32),
  },
  loadingText: {
    marginTop: verticalScale(8),
    fontSize: responsiveFontSize(15),
    color: colors.textSecondary,
  },
  profileInfo: {
    alignItems: 'center',
    paddingVertical: verticalScale(16),
  },
  avatar: {
    width: widthPercentage(20),
    height: widthPercentage(20),
    borderRadius: widthPercentage(10),
    backgroundColor: colors.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  avatarText: {
    fontSize: responsiveFontSize(32),
    color: colors.textLight,
    fontWeight: '600',
  },
  name: {
    fontSize: responsiveFontSize(20),
    fontWeight: '600',
    color: colors.text,
    marginBottom: verticalScale(8),
  },
  email: {
    fontSize: responsiveFontSize(15),
    color: colors.textSecondary,
  },
  themeDescription: {
    fontSize: responsiveFontSize(13),
    color: colors.textSecondary,
    marginBottom: verticalScale(12),
    textAlign: 'center',
  },
  colorOptionsContainer: {
    paddingVertical: verticalScale(8),
  },
  colorOption: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    marginHorizontal: scale(8),
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: colors.text,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  codeContainer: {
    backgroundColor: colors.electricBlue,
    padding: moderateScale(16),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  codeText: {
    fontSize: responsiveFontSize(24),
    fontWeight: '600',
    color: colors.textLight,
    letterSpacing: 2,
  },
  codeDescription: {
    fontSize: responsiveFontSize(13),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: verticalScale(18),
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkButton: {
    backgroundColor: colors.hotPink,
    marginLeft: scale(8),
    paddingHorizontal: scale(16),
  },
  linkedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
  },
  linkedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkedUserAvatar: {
    width: verticalScale(40),
    height: verticalScale(40),
    borderRadius: verticalScale(20),
    backgroundColor: colors.hotPink,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  linkedUserAvatarText: {
    fontSize: responsiveFontSize(16),
    color: colors.textLight,
    fontWeight: '600',
  },
  linkedUserName: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
    color: colors.text,
  },
  linkedUserCode: {
    fontSize: responsiveFontSize(11),
    color: colors.textSecondary,
    marginTop: verticalScale(2),
  },
  heartIcon: {
    width: verticalScale(24),
    height: verticalScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartEmoji: {
    fontSize: responsiveFontSize(16),
  },
  buttonContainer: {
    marginHorizontal: scale(16),
    marginVertical: verticalScale(8),
  },
  signOutButton: {
    backgroundColor: colors.error,
  },

});
export default ProfileScreen;