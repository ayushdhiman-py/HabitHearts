import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getGoalsForUserAndLinked, createGoal, updateGoal, deleteGoal } from '../services/goalService';
import { getLinkedUsers } from '../services/userService';
import colors from '../theme/colors';
import globalStyles from '../theme/styles';
import { responsiveFontSize, scale, verticalScale, moderateScale, widthPercentage, heightPercentage } from '../utils/responsive';

const GoalsScreen = () => {
  const { user } = useAuth() as { user: any };
  const [goals, setGoals] = useState<any[]>([]);
  const [goalText, setGoalText] = useState('');
  const [loading, setLoading] = useState(true);
  const [linkedUserUids, setLinkedUserUids] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

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
    Alert.prompt(
      'Edit Goal',
      'Update your goal',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'OK',
          onPress: async (text?: string) => {
            if (text && text.trim()) {
              try {
                await updateGoal(goalItem.id, { text: text.trim() });
                setGoals(goals.map(goal => 
                  goal.id === goalItem.id ? { ...goal, text: text.trim() } : goal
                ));
              } catch (error) {
                console.error('Error editing goal:', error);
                Alert.alert('Error', 'Failed to edit goal. Please try again.');
              }
            }
          }
        },
      ],
      'plain-text',
      goalItem.text
    );
  };

  const renderGoal = ({ item }: { item: any }) => (
    <View style={[styles.goalItem, item.completed && styles.completedGoalItem]}>
      <TouchableOpacity 
        style={styles.goalTextContainer}
        onPress={() => toggleGoal(item)}
      >
        <Text style={[styles.goalText, item.completed && styles.completedGoal]}>
          {item.text}
        </Text>
        {item.createdBy !== user.uid && (
          <Text style={styles.creatorText}>by {item.creatorName}</Text>
        )}
      </TouchableOpacity>
      <View style={styles.goalActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => startEditGoal(item)}
        >
          <Text style={styles.actionButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteGoalItem(item.id)}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <View style={[styles.header, { marginTop: insets.top > 0 ? insets.top : verticalScale(10) }]}>
          <Text style={styles.title}>Your Goals</Text>
        </View>
        <View style={globalStyles.card}>
          <Text style={globalStyles.text}>Loading goals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={[styles.header, { marginTop: insets.top > 0 ? insets.top : verticalScale(10) }]}>
        <Text style={styles.title}>Your Goals 💫</Text>
      </View>
      
      <View style={globalStyles.card}>
        <View style={styles.inputContainer}>
          <TextInput
            style={globalStyles.input}
            placeholder="Add a new goal"
            value={goalText}
            onChangeText={setGoalText}
            onSubmitEditing={addGoal}
          />
          <TouchableOpacity 
            style={[globalStyles.button, styles.addButton]}
            onPress={addGoal}
          >
            <Text style={globalStyles.buttonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={goals}
        renderItem={renderGoal}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={goals.length === 0 ? styles.emptyList : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={globalStyles.text}>No goals yet. Add your first goal!</Text>
          </View>
        }
      />
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
    color: colors.text,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: colors.tertiary,
    marginLeft: scale(10),
    paddingHorizontal: scale(20),
  },
  list: {
    flex: 1,
    paddingHorizontal: scale(20),
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  goalItem: {
    backgroundColor: colors.surface,
    padding: moderateScale(15),
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(12),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.tertiary,
  },
  completedGoalItem: {
    borderLeftColor: colors.border,
    opacity: 0.8,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalText: {
    fontSize: responsiveFontSize(16),
    color: colors.text,
    fontWeight: '500',
  },
  completedGoal: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  creatorText: {
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    marginTop: verticalScale(3),
    fontStyle: 'italic',
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: verticalScale(30),
    height: verticalScale(30),
    borderRadius: moderateScale(15),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(5),
  },
  editButton: {
    backgroundColor: colors.purple,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: responsiveFontSize(14),
  },
});

export default GoalsScreen;