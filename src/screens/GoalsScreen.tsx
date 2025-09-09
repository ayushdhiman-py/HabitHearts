import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
  BackHandler,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useStatusBar } from '../context/StatusBarContext';
import { createGoal, updateGoal, deleteGoal, Goal, subscribeToGoalsForUserAndLinked, getGoalsForUserAndLinked } from '../services/goalService';
import { getLinkedUsers, User as UserServiceUser } from '../services/userService';
import colors from '../theme/colors';
import globalStyles from '../theme/styles';
import { responsiveFontSize, scale, verticalScale, moderateScale, widthPercentage, heightPercentage } from '../utils/responsive';
import { getTextColorForBackground } from '../utils/colorUtils';
import { getButtonColor } from '../utils/buttonUtils';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { Timestamp } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { swipeableManager } from '../utils/swipeableManager';
import { getGoalsProgress, GoalProgress } from '../services/goalProgressService';

// Memoize the component to prevent unnecessary re-renders
const GoalsScreen = () => {
  const { user } = useAuth() as { user: any };
  const { screenBackgroundColor, backgroundColor, themePalette } = useStatusBar();
  const [goals, setGoals] = useState<any[]>([]);
  const [goalsProgress, setGoalsProgress] = useState<Record<string, GoalProgress[]>>({});
  const [goalText, setGoalText] = useState('');
  const [loading, setLoading] = useState(true);
  const [linkedUserUids, setLinkedUserUids] = useState<string[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [editGoalText, setEditGoalText] = useState('');
  const [newGoalText, setNewGoalText] = useState('');

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        // Get linked users
        const linkedUsers = await getLinkedUsers(user.uid);
        const linkedUids = linkedUsers.map((u: any) => u.uid);
        setLinkedUserUids(linkedUids);
        
        // Get goals for user and linked users
        const fetchedGoals = await getGoalsForUserAndLinked(user.uid, linkedUids);
        setGoals(fetchedGoals);
        
        // Fetch progress data for all goals
        if (fetchedGoals.length > 0) {
          const goalIds = fetchedGoals.map((goal: any) => goal.id);
          const progressData = await getGoalsProgress(goalIds, user.uid);
          
          // Group progress by goalId
          const progressByGoal: Record<string, GoalProgress[]> = {};
          progressData.forEach((progress: GoalProgress) => {
            if (!progressByGoal[progress.goalId]) {
              progressByGoal[progress.goalId] = [];
            }
            progressByGoal[progress.goalId].push(progress);
          });
          
          setGoalsProgress(progressByGoal);
        }
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchGoals();
      
      // Set up interval to refresh data every 30 seconds
      const interval = setInterval(fetchGoals, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const addGoal = async () => {
    if (goalText.trim()) {
      try {
        const newGoal = await createGoal({
          text: goalText.trim(),
          completed: false,
          createdBy: user.uid,
          creatorName: user.displayName || user.name || user.email,
        });
        setGoals([...goals, newGoal]);
        setGoalText('');
      } catch (error) {
        console.error('Error adding goal:', error);
        Alert.alert('Error', 'Failed to add goal. Please try again.');
      }
    }
  };

  const toggleGoal = async (goalItem: any) => {
    try {
      await updateGoal(goalItem.id, { completed: !goalItem.completed });
      setGoals(goals.map(goal => 
        goal.id === goalItem.id ? { ...goal, completed: !goal.completed } : goal
      ));
    } catch (error) {
      console.error('Error toggling goal:', error);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    }
  };

  const deleteGoalItem = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      setGoals(goals.filter(goal => goal.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
      Alert.alert('Error', 'Failed to delete goal. Please try again.');
    }
  };

  const startEditGoal = (goalItem: any) => {
    setEditingGoal(goalItem);
    setEditGoalText(goalItem.text);
    setIsEditModalVisible(true);
  };

  const saveEditedGoal = async () => {
    if (editingGoal && editGoalText.trim()) {
      try {
        await updateGoal(editingGoal.id, { text: editGoalText.trim() });
        setGoals(goals.map(goal => 
          goal.id === editingGoal.id ? { ...goal, text: editGoalText.trim() } : goal
        ));
        setIsEditModalVisible(false);
        setEditingGoal(null);
        setEditGoalText('');
      } catch (error) {
        console.error('Error editing goal:', error);
        Alert.alert('Error', 'Failed to edit goal. Please try again.');
      }
    }
  };

  const cancelEditGoal = () => {
    setIsEditModalVisible(false);
    setEditingGoal(null);
    setEditGoalText('');
  };

  const openAddGoalModal = () => {
    setNewGoalText('');
    setIsAddModalVisible(true);
  };

  const cancelAddGoal = () => {
    setIsAddModalVisible(false);
    setNewGoalText('');
  };

  const saveNewGoal = async () => {
    if (newGoalText.trim()) {
      try {
        const newGoal = await createGoal({
          text: newGoalText.trim(),
          completed: false,
          createdBy: user.uid,
          creatorName: user.displayName || user.name || user.email,
        });
        setGoals([...goals, newGoal]);
        setIsAddModalVisible(false);
        setNewGoalText('');
      } catch (error) {
        console.error('Error adding goal:', error);
        Alert.alert('Error', 'Failed to add goal. Please try again.');
      }
    }
  };

  // Helper function to calculate goal progress percentage
  const calculateGoalProgress = (goalId: string) => {
    const goalProgress = goalsProgress[goalId] || [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get the number of days in the current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Count completed days in the current month
    let completedDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      const progressRecord = goalProgress.find(p => p.date === dateStr);
      
      if (progressRecord && progressRecord.completed) {
        completedDays++;
      }
    }
    
    // Calculate percentage based on total days in month
    return Math.round((completedDays / daysInMonth) * 100);
  };

  const renderGoal = ({ item }: { item: any }) => {
    const progressPercentage = calculateGoalProgress(item.id);
    const progressText = progressPercentage === 0 ? 'Just started' : `${progressPercentage}% complete`;
    
    return (
      <View style={[styles.goalCard, item.completed && styles.completedGoalCard]}>
        <View style={styles.goalCardHeader}>
          <TouchableOpacity 
            style={styles.goalToggleContainer}
            onPress={() => toggleGoal(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.goalToggle, item.completed && styles.completedGoalToggle]}>
              {item.completed && (
                <Icon name="check" size={responsiveFontSize(16)} color={colors.textLight} />
              )}
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={[styles.goalText, item.completed && styles.completedGoalText]}>
                {item.text}
              </Text>
              {item.createdBy !== user.uid && (
                <Text style={styles.creatorText}>by {item.creatorName}</Text>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.goalActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={(e) => {
                e.stopPropagation();
                startEditGoal(item);
              }}
            >
              <Icon name="edit" size={responsiveFontSize(16)} color={colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={(e) => {
                e.stopPropagation();
                deleteGoalItem(item.id);
              }}
            >
              <Icon name="delete" size={responsiveFontSize(16)} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Progress indicator for incomplete goals */}
        {!item.completed && (
          <View style={styles.goalProgressContainer}>
            <View style={styles.goalProgressBar}>
              <View style={[styles.goalProgressFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.goalProgressText}>{progressText}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, backgroundColor: screenBackgroundColor }}>
          <View style={[styles.header, { backgroundColor: backgroundColor }]}>
            <Text style={[styles.title, { color: getTextColorForBackground(backgroundColor) }]}>Your Goals</Text>
          </View>
          <View style={globalStyles.card}>
            <Text style={globalStyles.text}>Loading goals...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, backgroundColor: screenBackgroundColor }}>
        <View style={[styles.header, { backgroundColor: backgroundColor }]}>
          <Text style={[styles.title, { color: getTextColorForBackground(backgroundColor) }]}>Your Goals</Text>
          <TouchableOpacity
            style={[styles.headerAddButton, { backgroundColor: getButtonColor(themePalette.primary) }]}
            onPress={openAddGoalModal}
          >
            <Icon name="add" size={responsiveFontSize(24)} color={colors.textLight} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.mainScrollView}>
          <View style={{ marginTop: verticalScale(16) }}>
            <View style={styles.goalsContainer}>
              <FlatList
                data={goals}
                renderItem={renderGoal}
                keyExtractor={item => item.id}
                style={styles.list}
                contentContainerStyle={goals.length === 0 ? styles.emptyList : { paddingBottom: verticalScale(55) }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Icon name="emoji-events" size={responsiveFontSize(60)} color={colors.textSecondary} />
                    <Text style={[globalStyles.text, { marginTop: verticalScale(16), fontSize: responsiveFontSize(18) }]}>
                      No goals yet
                    </Text>
                    <Text style={[globalStyles.textSecondary, { marginTop: verticalScale(8), textAlign: 'center' }]}>
                      Tap the + button to add your first goal and start your journey!
                    </Text>
                  </View>
                }
                scrollEnabled={false}
              />
            </View>
          </View>
        </ScrollView>
      </View>
      
      {/* Edit Goal Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelEditGoal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Goal</Text>
              <TouchableOpacity
                style={styles.editModalCloseButton}
                onPress={cancelEditGoal}
              >
                <Icon name="close" size={responsiveFontSize(24)} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.editModalContent}>
              <Text style={styles.editModalLabel}>Goal Text</Text>
              <TextInput
                style={styles.editGoalInput}
                value={editGoalText}
                onChangeText={setEditGoalText}
                placeholder="Enter your goal"
                multiline
                autoFocus
              />
              
              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalCancelButton]}
                  onPress={cancelEditGoal}
                >
                  <Text style={styles.editModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalSaveButton]}
                  onPress={saveEditedGoal}
                >
                  <Text style={styles.editModalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Add Goal Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelAddGoal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Add New Goal</Text>
              <TouchableOpacity
                style={styles.editModalCloseButton}
                onPress={cancelAddGoal}
              >
                <Icon name="close" size={responsiveFontSize(24)} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.editModalContent}>
              <Text style={styles.editModalLabel}>Goal Text</Text>
              <TextInput
                style={styles.editGoalInput}
                value={newGoalText}
                onChangeText={setNewGoalText}
                placeholder="Enter your goal"
                multiline
                autoFocus
              />
              
              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalCancelButton]}
                  onPress={cancelAddGoal}
                >
                  <Text style={styles.editModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalSaveButton]}
                  onPress={saveNewGoal}
                >
                  <Text style={styles.editModalSaveText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainScrollView: {
    flex: 1,
  },
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
    color: colors.text,
    textAlign: 'center',
  },
  goalsContainer: {
    flex: 1,
    marginTop: verticalScale(16),
  },
  list: {
    flex: 1,
    marginHorizontal: scale(14),
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(64),
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(18),
    padding: moderateScale(16),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  completedGoalCard: {
    backgroundColor: colors.electricBlueLight,
    borderColor: colors.electricBlue,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalToggleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  goalToggle: {
    width: verticalScale(24),
    height: verticalScale(24),
    borderRadius: moderateScale(12),
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
    marginTop: verticalScale(2),
  },
  completedGoalToggle: {
    backgroundColor: colors.electricGreen,
    borderColor: colors.electricGreen,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalText: {
    fontSize: responsiveFontSize(17),
    color: colors.text,
    fontWeight: '600',
    lineHeight: responsiveFontSize(22),
  },
  completedGoalText: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
    fontWeight: '400',
  },
  creatorText: {
    fontSize: responsiveFontSize(13),
    color: colors.textSecondary,
    marginTop: verticalScale(4),
    fontStyle: 'italic',
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
  },
  editButton: {
    backgroundColor: colors.hotPink,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  goalProgressContainer: {
    marginTop: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalProgressBar: {
    flex: 1,
    height: verticalScale(6),
    backgroundColor: colors.border,
    borderRadius: moderateScale(3),
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.electricBlue,
    borderRadius: moderateScale(3),
  },
  goalProgressText: {
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    marginLeft: scale(8),
    fontWeight: '500',
  },
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
    overflow: 'hidden', // This will ensure the corners are properly clipped
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  editModalTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
  },
  editModalCloseButton: {
    padding: scale(4),
  },
  editModalContent: {
    padding: scale(16),
  },
  editModalLabel: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
    color: colors.text,
    marginBottom: verticalScale(8),
  },
  editGoalInput: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    fontSize: responsiveFontSize(16),
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
    minHeight: verticalScale(100),
    maxHeight: verticalScale(200),
    marginBottom: verticalScale(16),
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(8),
  },
  editModalButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalCancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: scale(8),
  },
  editModalSaveButton: {
    backgroundColor: colors.electricBlue,
    marginLeft: scale(8),
  },
  editModalCancelText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.text,
  },
  editModalSaveText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.textLight,
  },
});

export default GoalsScreen;