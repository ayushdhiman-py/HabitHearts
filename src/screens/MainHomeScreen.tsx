import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
  BackHandler,
  Platform,
  StatusBar,
  Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { subscribeToTasksForUserAndLinked, createTask, updateTask, deleteTask, toggleTaskCompletion, Task } from '../services/taskService';
import { getLinkedUsers, User as UserServiceUser } from '../services/userService';
import { subscribeToCalendarEventsForUserAndLinked, CalendarEvent } from '../services/calendarService';
import { notificationService } from '../services/notificationService';
import { getGoalsForUserAndLinked } from '../services/goalService';
import { getGoalsProgress, updateGoalProgress, GoalProgress } from '../services/goalProgressService';
import colors from '../theme/colors';
import globalStyles from '../theme/styles';
import { responsiveFontSize, scale, verticalScale, moderateScale, widthPercentage, heightPercentage } from '../utils/responsive';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Timestamp } from 'firebase/firestore';

// Conditional import for DateTimePicker
let DateTimePicker: any = null;
// We're not using the native picker due to issues, using custom implementation instead

// Define types for our components
interface User {
  uid: string;
  name: string;
  email: string;
  picture?: string;
  displayName?: string;
}

const MainHomeScreen = () => {
  const { user } = useAuth() as { user: User | null };
  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [linkedUserUids, setLinkedUserUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [isAddTaskModalVisible, setIsAddTaskModalVisible] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [goals, setGoals] = useState<any[]>([]);
  const [goalsProgress, setGoalsProgress] = useState<Record<string, GoalProgress[]>>({});
  const insets = useSafeAreaInsets();
  const tasksUnsubscribeRef = useRef<(() => void) | null>(null);
  const eventsUnsubscribeRef = useRef<(() => void) | null>(null);
  const heatmapDaysRef = useRef<any[]>([]);

  const fetchLinkedUsers = useCallback(async () => {
    if (user) {
      try {
        const linkedUsers = await getLinkedUsers(user?.uid);
        const linkedUids = linkedUsers.map(u => u.uid);
        setLinkedUserUids(linkedUids);
        return linkedUids;
      } catch (error) {
        console.error('Error fetching linked users:', error);
        return [];
      }
    }
    return [];
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (user) {
      try {
        const linkedUids = await fetchLinkedUsers();
        const fetchedGoals = await getGoalsForUserAndLinked(user?.uid, linkedUids);
        setGoals(fetchedGoals);
        
        // Fetch progress data for all goals
        if (fetchedGoals.length > 0) {
          const goalIds = fetchedGoals.map(goal => goal.id);
          const progressData = await getGoalsProgress(goalIds, user?.uid);
          
          // Group progress by goalId
          const progressByGoal: Record<string, GoalProgress[]> = {};
          progressData.forEach(progress => {
            if (!progressByGoal[progress.goalId]) {
              progressByGoal[progress.goalId] = [];
            }
            progressByGoal[progress.goalId].push(progress);
          });
          
          setGoalsProgress(progressByGoal);
        }
      } catch (error) {
        console.error('Error fetching goals:', error);
      }
    }
  }, [user, fetchLinkedUsers]);
  
  // Refresh heatmap days when goals change
  useEffect(() => {
    heatmapDaysRef.current = generateCalendarDaysForHeatmap();
  }, [goals]);
  
  // Initialize heatmap days
  useEffect(() => {
    if (heatmapDaysRef.current.length === 0) {
      heatmapDaysRef.current = generateCalendarDaysForHeatmap();
    }
  }, []);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Check modals in reverse order of appearance (topmost first)
      if (showDatePicker) {
        setShowDatePicker(false);
        return true; // Prevent default back behavior
      } else if (selectedTask) {
        setSelectedTask(null);
        return true; // Prevent default back behavior
      } else if (isAddTaskModalVisible) {
        setIsAddTaskModalVisible(false);
        return true; // Prevent default back behavior
      }
      return false; // Use default back behavior
    });

    return () => backHandler.remove();
  }, [selectedTask, isAddTaskModalVisible, showDatePicker]);

  // Set up real-time listeners for tasks
  useEffect(() => {
    let isMounted = true;
    
    const setupTaskListener = async () => {
      if (user) {
        try {
          const linkedUids = await fetchLinkedUsers();
          
          // Fetch goals
          await fetchGoals();
          
          // Unsubscribe from previous listener if exists
          if (tasksUnsubscribeRef.current) {
            tasksUnsubscribeRef.current();
          }
          
          // Set up real-time listener for tasks
          tasksUnsubscribeRef.current = subscribeToTasksForUserAndLinked(
            user?.uid, 
            linkedUids,
            (fetchedTasks) => {
              if (isMounted) {
                setTasks(fetchedTasks);
                if (loading) {
                  setLoading(false);
                }
              }
            }
          );
        } catch (error) {
          console.error('Error setting up task listener:', error);
          if (isMounted) {
            setLoading(false);
          }
        }
      }
    };

    setupTaskListener();
    
    return () => {
      isMounted = false;
      if (tasksUnsubscribeRef.current) {
        tasksUnsubscribeRef.current();
      }
    };
  }, [user, fetchLinkedUsers, loading, fetchGoals]);

  // Filter tasks based on search query and selected date
  useEffect(() => {
    const filtered = tasks.filter(task => {
      // Check if task matches search query
      const matchesSearch = task.text.toLowerCase().includes(searchQuery.toLowerCase());

      // Check if task matches selected date
      let matchesDate = true;
      if (task.dueDate) {
        const taskDate = task.dueDate.toDate();
        taskDate.setHours(0, 0, 0, 0);
        const selectedDateNormalized = new Date(selectedDate);
        selectedDateNormalized.setHours(0, 0, 0, 0);
        matchesDate = taskDate.getTime() === selectedDateNormalized.getTime();
      }

      return matchesSearch && matchesDate;
    });

    setFilteredTasks(filtered);
  }, [tasks, searchQuery, selectedDate]);

  const addTask = async () => {
    if (newTaskText.trim() && user) {
      setAddingTask(true);
      try {
        // Actually create the task first to get the real ID
        const newTask = await createTask({
          text: newTaskText,
          description: newTaskDescription,
          dueDate: Timestamp.fromDate(newTaskDate),
          completed: false,
          createdBy: user?.uid || '',
          creatorName: user?.displayName || user?.name || user?.email || ''
        });
        
        // Add task to UI immediately (real-time listener will update this)
        const taskWithId: Task = {
          id: newTask.id,
          text: newTaskText,
          description: newTaskDescription,
          dueDate: Timestamp.fromDate(newTaskDate),
          completed: false,
          createdBy: user?.uid || '',
          creatorName: user?.displayName || user?.name || user?.email || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          status: 'active'
        };
        
        setTasks([taskWithId, ...tasks]);
        setNewTaskText('');
        setNewTaskDescription('');
        
        // The real-time listener will update the task list with the server version
      } catch (error) {
        console.error('Error adding task:', error);
        Alert.alert('Error', 'Failed to add task. Please try again.');
      } finally {
        setAddingTask(false);
      }
    }
  };

  const toggleTask = async (taskItem: Task) => {
    try {
      // Optimistic update
      setTasks(tasks.map(task =>
        task.id === taskItem.id ? { ...task, completed: !task.completed } : task
      ));

      // Actually toggle the task
      await toggleTaskCompletion(taskItem.id, taskItem.completed);
      // Real-time listener will update the UI when the change is confirmed
    } catch (error) {
      console.error('Error toggling task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
      // Revert on error
      setTasks(tasks.map(task =>
        task.id === taskItem.id ? { ...task, completed: taskItem.completed } : task
      ));
    }
  };

  const deleteTaskItem = async (taskId: string) => {
    try {
      // Optimistic update
      const taskToDelete = tasks.find(task => task.id === taskId);
      setTasks(tasks.filter(task => task.id !== taskId));

      // Actually delete the task
      await deleteTask(taskId);
      // Real-time listener will update the UI when the change is confirmed
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert('Error', 'Failed to delete task. Please try again.');
      // In a real scenario, the listener would restore the task if deletion failed server-side
    }
  };

  const openTaskDetail = (taskItem: Task) => {
    setSelectedTask(taskItem);
    setEditTaskTitle(taskItem.text);
    setEditTaskDescription(taskItem.description || '');
  };

  const saveTaskEdits = async () => {
    if (selectedTask && user) {
      try {
        // Optimistic update
        const updatedTasks = tasks.map(task =>
          task.id === selectedTask.id
            ? { ...task, text: editTaskTitle, description: editTaskDescription }
            : task
        );
        setTasks(updatedTasks);

        // Actually update the task
        await updateTask(selectedTask.id, {
          text: editTaskTitle,
          description: editTaskDescription,
          dueDate: selectedTask.dueDate
        });

        // Close the modal
        setSelectedTask(null);
        // Real-time listener will update the UI when the change is confirmed
      } catch (error) {
        console.error('Error editing task:', error);
        Alert.alert('Error', 'Failed to edit task. Please try again.');
        // Revert on error
        setTasks(tasks);
      }
    }
  };

  const deleteSelectedTask = () => {
    if (selectedTask) {
      Alert.alert(
        'Delete Task',
        'Are you sure you want to delete this task?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteTaskItem(selectedTask.id);
              setSelectedTask(null);
            }
          }
        ]
      );
    }
  };

  // Helper function to generate calendar days
  const getCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    // First day of the calendar (Sunday of the week containing the 1st)
    const startDay = new Date(firstDay);
    startDay.setDate(firstDay.getDate() - firstDay.getDay());
    // Last day of the calendar (Saturday of the week containing the last day)
    const endDay = new Date(lastDay);
    endDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

    const days = [];
    const currentDay = new Date(startDay);

    while (currentDay <= endDay) {
      days.push({
        day: currentDay.getDate(),
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month
      });
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  // Helper function to generate calendar days for heatmap (shows actual dates)
  const generateCalendarDaysForHeatmap = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    // First day of the calendar (Sunday of the week containing the 1st)
    const startDay = new Date(firstDay);
    startDay.setDate(firstDay.getDate() - firstDay.getDay());
    // Last day of the calendar (Saturday of the week containing the last day)
    const endDay = new Date(lastDay);
    endDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const days = [];
    const currentDay = new Date(startDay);
    
    while (currentDay <= endDay) {
      days.push({
        day: currentDay.getDate(),
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month
      });
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  // Helper function to get heatmap color based on date and goal
  const getHeatmapDateColor = (date: Date, goalId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // If it's a future date, show grey
    if (checkDate > today) {
      return styles.heatmapDateFuture;
    }
    
    // Check if we have progress data for this goal
    const goalProgress = goalsProgress[goalId] || [];
    
    // Format the date to match our progress records
    const dateStr = checkDate.toISOString().split('T')[0];
    
    // Find progress record for this date
    const progressRecord = goalProgress.find(p => p.date === dateStr);
    
    if (progressRecord) {
      return progressRecord.completed ? styles.heatmapDateCompleted : styles.heatmapDateMissed;
    }
    
    // For past dates without records, show grey by default
    return styles.heatmapDateDefault;
  };

  // Handle date press - would show options to mark as done or not
  const handleDatePress = (date: Date, goalId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Only allow marking for today or past dates
    if (checkDate <= today && user) {
      Alert.alert(
        `Mark ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        'Did you complete this goal on this day?',
        [
          {
            text: 'No', 
            onPress: async () => {
              // Mark as missed
              try {
                const progress: GoalProgress = await updateGoalProgress(goalId, date, false, user.uid);
                // Update local state with a new object reference to trigger re-render
                setGoalsProgress(prev => {
                  const existingProgress = prev[goalId] || [];
                  // Filter out any existing record for this date
                  const filteredProgress = existingProgress.filter(p => p.date !== progress.date);
                  // Add the new/updated record
                  const newProgress = [...filteredProgress, progress];
                  return {
                    ...prev,
                    [goalId]: newProgress
                  };
                });
              } catch (error) {
                console.error('Error marking goal as missed:', error);
              }
            }
          },
          {
            text: 'Yes', 
            onPress: async () => {
              // Mark as completed
              try {
                const progress: GoalProgress = await updateGoalProgress(goalId, date, true, user.uid);
                // Update local state with a new object reference to trigger re-render
                setGoalsProgress(prev => {
                  const existingProgress = prev[goalId] || [];
                  // Filter out any existing record for this date
                  const filteredProgress = existingProgress.filter(p => p.date !== progress.date);
                  // Add the new/updated record
                  const newProgress = [...filteredProgress, progress];
                  return {
                    ...prev,
                    [goalId]: newProgress
                  };
                });
              } catch (error) {
                console.error('Error marking goal as completed:', error);
              }
            }
          }
        ]
      );
    }
  };

  // Helper function to check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  const renderTask = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.taskItem}
      onPress={() => openTaskDetail(item)}
    >
      <View style={styles.taskTextContainer}>
        <Text style={[styles.taskText, item.completed && styles.completedTask]}>
          {item.text}
        </Text>
        {item.createdBy !== user?.uid && (
          <Text style={styles.creatorText}>by {item.creatorName}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={(e) => {
          e.stopPropagation();
          deleteTaskItem(item.id);
        }}
      >
        <Icon name="delete" size={responsiveFontSize(18)} color={colors.textLight} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderTaskSkeleton = () => (
    <View style={styles.taskItem}>
      <View style={styles.taskTextContainer}>
        <View style={styles.skeletonText} />
        <View style={[styles.skeletonText, { width: '60%', marginTop: verticalScale(8) }]} />
      </View>
      <View style={styles.taskActions}>
        <View style={[styles.skeletonButton, { marginRight: scale(10) }]} />
        <View style={styles.skeletonButton} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.container}>
        

        <View style={styles.searchContainer}>
          <View style={styles.skeletonInput} />
        </View>

        <View style={styles.dateNavigation}>
          <View style={[styles.skeletonButton, { width: widthPercentage(20) }]} />
          <View style={[styles.skeletonText, { width: '50%' }]} />
          <View style={[styles.skeletonButton, { width: widthPercentage(20) }]} />
        </View>

        <FlatList
          data={[1, 2, 3, 4, 5]}
          renderItem={renderTaskSkeleton}
          keyExtractor={item => item.toString()}
          style={styles.taskList}
          contentContainerStyle={styles.emptyTaskList}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="black" 
        translucent={false}
      />
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top > 0 ? insets.top : verticalScale(10) }]}>
        <Text style={styles.headerText}>HabitHearts💗</Text>
      </View>

      {/* Goals Heatmap */}
      <View style={styles.heatmapContainer}>
        <View style={styles.heatmapHeader}>
          <Text style={styles.heatmapTitle}>Your Goals Progress</Text>
        </View>
        
        {goals.length > 0 ? (
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.heatmapCarousel}
          >
            {goals.map((goal) => (
              <View key={goal.id} style={styles.goalHeatmap}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName} numberOfLines={1}>{goal.text}</Text>
                  <TouchableOpacity 
                    style={styles.dailyCheckButton}
                    onPress={() => {
                      if (user) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); // Normalize the time
                        Alert.alert(
                          'Daily Check-in',
                          `Did you complete "${goal.text}" today?`,
                          [
                            {
                              text: 'No', 
                              onPress: async () => {
                                // Mark today as missed for this goal
                                try {
                                  const progress: GoalProgress = await updateGoalProgress(goal.id, today, false, user.uid);
                                  // Update local state with a new object reference to trigger re-render
                                  setGoalsProgress(prev => {
                                    const existingProgress = prev[goal.id] || [];
                                    // Filter out any existing record for this date
                                    const filteredProgress = existingProgress.filter(p => p.date !== progress.date);
                                    // Add the new/updated record
                                    const newProgress = [...filteredProgress, progress];
                                    return {
                                      ...prev,
                                      [goal.id]: newProgress
                                    };
                                  });
                                } catch (error) {
                                  console.error('Error marking goal as missed:', error);
                                }
                              }
                            },
                            {
                              text: 'Yes', 
                              onPress: async () => {
                                // Mark today as completed for this goal
                                try {
                                  const progress: GoalProgress = await updateGoalProgress(goal.id, today, true, user.uid);
                                  // Update local state with a new object reference to trigger re-render
                                  setGoalsProgress(prev => {
                                    const existingProgress = prev[goal.id] || [];
                                    // Filter out any existing record for this date
                                    const filteredProgress = existingProgress.filter(p => p.date !== progress.date);
                                    // Add the new/updated record
                                    const newProgress = [...filteredProgress, progress];
                                    return {
                                      ...prev,
                                      [goal.id]: newProgress
                                    };
                                  });
                                } catch (error) {
                                  console.error('Error marking goal as completed:', error);
                                }
                              }
                            }
                          ]
                        );
                      }
                    }}
                  >
                    <Text style={styles.dailyCheckButtonText}>Done Today?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.heatmapCalendar}>
                  {/* Days of week header */}
                  <View style={styles.heatmapWeekDays}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <Text key={index} style={styles.heatmapWeekDayText}>
                        {day}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.heatmapGrid}>
                    {heatmapDaysRef.current.map((day, index) => {
                      const dateStr = day.date.toISOString().split('T')[0];
                      const goalProgress = goalsProgress[goal.id] || [];
                      const progressRecord = goalProgress.find(p => p.date === dateStr);
                      
                      // Get the color style for this cell
                      const colorStyle = getHeatmapDateColor(day.date, goal.id);
                      
                      return (
                        <TouchableOpacity
                          key={`${goal.id}-${dateStr}-${index}`}
                          style={[
                            styles.heatmapDateCell,
                            day.isCurrentMonth ? styles.currentMonthCell : styles.otherMonthCell,
                            isToday(day.date) && styles.todayDateCell,
                            colorStyle
                          ]}
                          onPress={() => {
                            // Handle cell press - would mark goal progress for this day
                            handleDatePress(day.date, goal.id);
                          }}
                          disabled={!day.isCurrentMonth}
                        >
                          <Text style={[
                            styles.heatmapDateText,
                            day.isCurrentMonth ? styles.currentMonthDateText : styles.otherMonthDateText,
                            isToday(day.date) && styles.todayDateText
                          ]}>
                            {day.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                {/* Heatmap Legend */}
                <View style={styles.heatmapLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColorBox, styles.legendCompleted]} />
                    <Text style={styles.legendText}>Completed</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColorBox, styles.legendMissed]} />
                    <Text style={styles.legendText}>Missed</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColorBox, styles.legendDefault]} />
                    <Text style={styles.legendText}>Not Marked</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noGoalsText}>No goals yet. Add goals to see your progress heatmap.</Text>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={responsiveFontSize(20)} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => changeDate('prev')}
        >
          <Icon name="chevron-left" size={responsiveFontSize(24)} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => changeDate('next')}
        >
          <Icon name="chevron-right" size={responsiveFontSize(24)} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        style={styles.taskList}
        contentContainerStyle={filteredTasks.length === 0 ? styles.emptyTaskList : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={globalStyles.text}>No tasks found. Add your first task!</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          const now = new Date();
          // Set default time to 12:00 AM (midnight) for the same day
          now.setHours(0, 0, 0, 0);
          setNewTaskText('');
          setNewTaskDescription('');
          setNewTaskDate(now);
          setTempSelectedDate(now);
          setIsAddTaskModalVisible(true);
        }}
      >
        <Icon name="add" size={responsiveFontSize(30)} color="white" />
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal
        visible={isAddTaskModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAddTaskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsAddTaskModalVisible(false)}
              >
                <Icon name="close" size={responsiveFontSize(24)} color="black" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add New Task</Text>
              <TouchableOpacity
                style={styles.saveButtonSmall}
                onPress={() => {
                  if (newTaskText.trim()) {
                    addTask();
                    setIsAddTaskModalVisible(false);
                  }
                }}
              >
                <Text style={styles.saveButtonTextSmall}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <TextInput
                style={styles.editTitleInput}
                value={newTaskText}
                onChangeText={setNewTaskText}
                placeholder="Task title"
                multiline
                autoFocus
              />

              <TextInput
                style={styles.editDescriptionInput}
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                placeholder="Task description (optional)"
                multiline
                textAlignVertical="top"
              />

              <View style={styles.datePickerContainer}>
                <TouchableOpacity
                  style={styles.dateDisplay}
                  onPress={() => {
                    setTempSelectedDate(newTaskDate);
                    setShowDatePicker(true);
                  }}
                >
                  <View style={styles.selectedDateTimeContainer}>
                    <Text style={styles.selectedDateTimeText}>
                      {`Selected due date & time:\n`} {newTaskDate.toLocaleDateString()} at {newTaskDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                  <Text style={styles.dateDisplayText}>

                    {newTaskDate.toLocaleDateString()} at {newTaskDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Display selected date and time below the picker */}


              {/* Custom Date Picker Modal */}
              <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.pickerModalContainer}>
                  <View style={styles.pickerModalContent}>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerTitle}>Select Date</Text>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                        style={styles.pickerCloseButton}
                      >
                        <Icon name="close" size={responsiveFontSize(20)} color="black" />
                      </TouchableOpacity>
                    </View>

                    {/* Calendar View */}
                    <View style={styles.calendarContainer}>
                      <View style={styles.calendarHeader}>
                        <TouchableOpacity onPress={() => {
                          const newDate = new Date(tempSelectedDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setTempSelectedDate(newDate);
                        }}>
                          <Icon name="chevron-left" size={responsiveFontSize(24)} color="black" />
                        </TouchableOpacity>
                        <Text style={styles.calendarMonthYear}>
                          {tempSelectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </Text>
                        <TouchableOpacity onPress={() => {
                          const newDate = new Date(tempSelectedDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setTempSelectedDate(newDate);
                        }}>
                          <Icon name="chevron-right" size={responsiveFontSize(24)} color="black" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.calendarDaysHeader}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <Text key={day} style={styles.calendarDayHeader}>{day}</Text>
                        ))}
                      </View>

                      <View style={styles.calendarGrid}>
                        {getCalendarDays(tempSelectedDate).map((day, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.calendarDay,
                              day.isCurrentMonth ? styles.currentMonthDay : styles.otherMonthDay,
                              day.date && day.date.toDateString() === tempSelectedDate.toDateString() ? styles.selectedDay : null
                            ]}
                            onPress={() => {
                              if (day.date) {
                                setTempSelectedDate(day.date);
                              }
                            }}
                            disabled={!day.isCurrentMonth}
                          >
                            <Text style={[
                              styles.calendarDayText,
                              day.isCurrentMonth ? styles.currentMonthDayText : styles.otherMonthDayText,
                              day.date && day.date.toDateString() === tempSelectedDate.toDateString() ? styles.selectedDayText : null
                            ]}>
                              {day.day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.pickerActions}>
                      <TouchableOpacity
                        style={styles.pickerCancelButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.pickerCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.pickerConfirmButton}
                        onPress={() => {
                          // After selecting date, switch to time picker
                          setShowDatePicker(false);
                          setShowTimePicker(true);
                        }}
                      >
                        <Text style={styles.pickerConfirmText}>Next</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>

              {/* Custom Time Picker Modal */}
              <Modal
                visible={showTimePicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTimePicker(false)}
              >
                <View style={styles.pickerModalContainer}>
                  <View style={styles.pickerModalContent}>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerTitle}>Select Time</Text>
                      <TouchableOpacity
                        onPress={() => setShowTimePicker(false)}
                        style={styles.pickerCloseButton}
                      >
                        <Icon name="close" size={responsiveFontSize(20)} color="black" />
                      </TouchableOpacity>
                    </View>

                    {/* Time Picker */}
                    <View style={styles.timePickerContainer}>
                      <View style={styles.timePickerRow}>
                        <TouchableOpacity
                          style={styles.timePickerButton}
                          onPress={() => {
                            const newDate = new Date(tempSelectedDate);
                            let hours = newDate.getHours();
                            hours = (hours - 1 + 24) % 24;
                            newDate.setHours(hours);
                            setTempSelectedDate(newDate);
                          }}
                        >
                          <Icon name="expand-less" size={responsiveFontSize(24)} color="black" />
                        </TouchableOpacity>
                        <Text style={styles.timePickerValue}>
                          {tempSelectedDate.getHours() % 12 === 0 ? 12 : tempSelectedDate.getHours() % 12}
                        </Text>
                        <TouchableOpacity
                          style={styles.timePickerButton}
                          onPress={() => {
                            const newDate = new Date(tempSelectedDate);
                            let hours = newDate.getHours();
                            hours = (hours + 1) % 24;
                            newDate.setHours(hours);
                            setTempSelectedDate(newDate);
                          }}
                        >
                          <Icon name="expand-more" size={responsiveFontSize(24)} color="black" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.timePickerColon}>:</Text>

                      <View style={styles.timePickerRow}>
                        <TouchableOpacity
                          style={styles.timePickerButton}
                          onPress={() => {
                            const newDate = new Date(tempSelectedDate);
                            let minutes = newDate.getMinutes();
                            minutes = (minutes - 1 + 60) % 60;
                            newDate.setMinutes(minutes);
                            setTempSelectedDate(newDate);
                          }}
                        >
                          <Icon name="expand-less" size={responsiveFontSize(24)} color="black" />
                        </TouchableOpacity>
                        <Text style={styles.timePickerValue}>
                          {tempSelectedDate.getMinutes().toString().padStart(2, '0')}
                        </Text>
                        <TouchableOpacity
                          style={styles.timePickerButton}
                          onPress={() => {
                            const newDate = new Date(tempSelectedDate);
                            let minutes = newDate.getMinutes();
                            minutes = (minutes + 1) % 60;
                            newDate.setMinutes(minutes);
                            setTempSelectedDate(newDate);
                          }}
                        >
                          <Icon name="expand-more" size={responsiveFontSize(24)} color="black" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.timePickerAmPmContainer}>
                        <TouchableOpacity
                          style={[
                            styles.timePickerAmPmButton,
                            tempSelectedDate.getHours() < 12 ? styles.selectedAmPmButton : null
                          ]}
                          onPress={() => {
                            const newDate = new Date(tempSelectedDate);
                            if (newDate.getHours() >= 12) {
                              newDate.setHours(newDate.getHours() - 12);
                              setTempSelectedDate(newDate);
                            }
                          }}
                        >
                          <Text style={[
                            styles.timePickerAmPmText,
                            tempSelectedDate.getHours() < 12 ? styles.selectedAmPmText : null
                          ]}>
                            AM
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.timePickerAmPmButton,
                            tempSelectedDate.getHours() >= 12 ? styles.selectedAmPmButton : null
                          ]}
                          onPress={() => {
                            const newDate = new Date(tempSelectedDate);
                            if (newDate.getHours() < 12) {
                              newDate.setHours(newDate.getHours() + 12);
                              setTempSelectedDate(newDate);
                            }
                          }}
                        >
                          <Text style={[
                            styles.timePickerAmPmText,
                            tempSelectedDate.getHours() >= 12 ? styles.selectedAmPmText : null
                          ]}>
                            PM
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.pickerActions}>
                      <TouchableOpacity
                        style={styles.pickerCancelButton}
                        onPress={() => setShowTimePicker(false)}
                      >
                        <Text style={styles.pickerCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.pickerConfirmButton}
                        onPress={() => {
                          // Update the newTaskDate with the selected date and time
                          setNewTaskDate(tempSelectedDate);
                          setShowTimePicker(false);
                        }}
                      >
                        <Text style={styles.pickerConfirmText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        visible={!!selectedTask}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTask(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedTask(null)}
            >
              <Icon name="close" size={responsiveFontSize(24)} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={deleteSelectedTask}
            >
              <Icon name="delete" size={responsiveFontSize(24)} color={colors.error} />
            </TouchableOpacity>
          </View>

          {selectedTask && (
            <View style={styles.modalContent}>
              <TextInput
                style={styles.editTitleInput}
                value={editTaskTitle}
                onChangeText={setEditTaskTitle}
                placeholder="Task title"
                multiline
              />

              <TextInput
                style={styles.editDescriptionInput}
                value={editTaskDescription}
                onChangeText={setEditTaskDescription}
                placeholder="Task description"
                multiline
                textAlignVertical="top"
              />

              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerLabel}>Due Date:</Text>
                <Text style={styles.dateDisplay}>
                  {selectedTask.dueDate ? selectedTask.dueDate.toDate().toDateString() : 'No date set'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveTaskEdits}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    backgroundColor: colors.primary,
    paddingVertical: verticalScale(25),
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: moderateScale(25),
    borderBottomRightRadius: moderateScale(25),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  headerText: {
    color: 'white',
    fontSize: responsiveFontSize(26),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heatmapContainer: {
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(15),
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  heatmapTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: colors.text,
  },
  dailyCheckButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dailyCheckButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
  },
  heatmapCarousel: {
    height: verticalScale(320),
  },
  goalHeatmap: {
    width: widthPercentage(100),
    height: '100%',
    paddingHorizontal: scale(5),
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    paddingHorizontal: scale(5),
  },
  goalName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.text,
    maxWidth: '75%',
  },
  heatmapCalendar: {
    backgroundColor: '#f8f9fa',
    borderRadius: moderateScale(12),
    padding: scale(12),
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  heatmapWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(5),
  },
  heatmapWeekDayText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  heatmapDateCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: scale(2),
    borderRadius: moderateScale(6),
  },
  currentMonthCell: {
    // No additional styling needed
  },
  otherMonthCell: {
    opacity: 0.3,
  },
  heatmapDateText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '500',
  },
  currentMonthDateText: {
    color: colors.text,
  },
  otherMonthDateText: {
    color: '#999999',
  },
  heatmapDateDefault: {
    backgroundColor: '#e9ecef', // Light grey for unmarked days
  },
  heatmapDateFuture: {
    backgroundColor: '#f8f9fa', // Very light grey for future days
  },
  heatmapDateCompleted: {
    backgroundColor: '#4caf50', // Green for completed
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  heatmapDateMissed: {
    backgroundColor: '#f44336', // Red for missed
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  todayDateCell: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  todayDateText: {
    color: 'white',
    fontWeight: '700',
  },
  noGoalsText: {
    fontSize: responsiveFontSize(14),
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center', // Center the text
    paddingVertical: verticalScale(20), // Add some padding
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: verticalScale(15),
    paddingHorizontal: scale(10),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorBox: {
    width: scale(12),
    height: scale(12),
    borderRadius: moderateScale(2),
    marginRight: scale(5),
  },
  legendCompleted: {
    backgroundColor: '#4caf50',
  },
  legendMissed: {
    backgroundColor: '#f44336',
  },
  legendDefault: {
    backgroundColor: '#e9ecef',
  },
  legendText: {
    fontSize: responsiveFontSize(11),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: moderateScale(15),
    marginHorizontal: scale(20),
    marginVertical: verticalScale(15),
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: scale(12),
    color: colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    color: colors.text,
    fontWeight: '500',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(15),
  },
  dateButton: {
    width: verticalScale(45),
    height: verticalScale(45),
    borderRadius: moderateScale(22.5),
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dateText: {
    fontSize: responsiveFontSize(19),
    fontWeight: '700',
    color: colors.text,
  },
  taskList: {
    flex: 1,
    paddingHorizontal: scale(20),
  },
  emptyTaskList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(60),
  },
  taskItem: {
    backgroundColor: 'white',
    borderRadius: moderateScale(18),
    padding: moderateScale(18),
    marginBottom: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
  },
  taskTextContainer: {
    flex: 1,
  },
  taskText: {
    fontSize: responsiveFontSize(17),
    color: colors.text,
    fontWeight: '500',
    lineHeight: responsiveFontSize(22),
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  creatorText: {
    fontSize: responsiveFontSize(13),
    color: colors.textSecondary,
    marginTop: verticalScale(4),
    fontStyle: 'italic',
  },
  taskActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 50% black background
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: moderateScale(20),
    width: '90%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(18),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: scale(10),
  },
  saveButtonSmall: {
    backgroundColor: colors.primary,
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButtonTextSmall: {
    color: 'white',
    fontSize: responsiveFontSize(15),
    fontWeight: '700',
  },
  modalContent: {
    padding: scale(20),
  },
  editTitleInput: {
    fontSize: responsiveFontSize(19),
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(18),
    minHeight: verticalScale(45),
  },
  editDescriptionInput: {
    fontSize: responsiveFontSize(15),
    color: colors.text,
    textAlignVertical: 'top',
    paddingVertical: verticalScale(12),
    minHeight: verticalScale(80),
    maxHeight: verticalScale(120),
    backgroundColor: '#f8f9fa',
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(15),
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  datePickerLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.text,
    marginRight: scale(10),
  },
  dateDisplay: {
    flex: 1,
    paddingVertical: verticalScale(10),
  },
  dateDisplayText: {
    fontSize: responsiveFontSize(16),
    color: colors.textSecondary,
    flex: 1,
  },
  calendarIcon: {
    marginLeft: scale(10),
  },
  selectedDateTimeContainer: {
    marginTop: verticalScale(10),
    padding: scale(10),
    backgroundColor: '#f0f0f0',
    borderRadius: moderateScale(8),
  },
  selectedDateTimeText: {
    fontSize: responsiveFontSize(14),
    color: '#333',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: moderateScale(15),
    padding: moderateScale(18),
    alignItems: 'center',
    marginTop: verticalScale(10),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(17),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skeletonText: {
    height: verticalScale(16),
    backgroundColor: colors.border,
    borderRadius: moderateScale(8),
  },
  skeletonInput: {
    height: verticalScale(50),
    backgroundColor: colors.border,
    borderRadius: moderateScale(12),
  },
  skeletonButton: {
    height: verticalScale(50),
    backgroundColor: colors.border,
    borderRadius: moderateScale(12),
  },
  fab: {
    position: 'absolute',
    bottom: verticalScale(30),
    right: scale(20),
    width: verticalScale(60),
    height: verticalScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 50% black background
  },
  pickerModalContent: {
    backgroundColor: 'white',
    borderRadius: moderateScale(20),
    width: '90%',
    maxWidth: 400,
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  pickerTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: colors.text,
  },
  pickerCloseButton: {
    padding: scale(5),
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(20),
  },
  pickerCancelButton: {
    flex: 1,
    padding: moderateScale(16),
    alignItems: 'center',
    marginRight: scale(12),
    borderRadius: moderateScale(15),
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerCancelText: {
    color: colors.text,
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  pickerConfirmButton: {
    flex: 1,
    padding: moderateScale(16),
    alignItems: 'center',
    marginLeft: scale(12),
    borderRadius: moderateScale(15),
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  pickerConfirmText: {
    color: 'white',
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
  },
  customPickerContainer: {
    paddingVertical: verticalScale(20),
    alignItems: 'center',
  },
  customPickerText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
    marginBottom: verticalScale(10),
  },
  customPickerHint: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: verticalScale(15),
  },
  customPickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: verticalScale(10),
    width: '100%',
  },
  customPickerButton: {
    padding: scale(10),
    borderRadius: moderateScale(12),
    backgroundColor: colors.surface,
    minWidth: widthPercentage(20),
    alignItems: 'center',
  },
  customPickerLabel: {
    fontSize: responsiveFontSize(14),
    color: colors.text,
    fontWeight: '500',
  },
  customPickerTodayButton: {
    backgroundColor: colors.primary,
    minWidth: widthPercentage(40),
    marginTop: verticalScale(10),
  },
  customPickerTodayText: {
    color: 'white',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  calendarContainer: {
    padding: scale(20),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  calendarMonthYear: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: colors.text,
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(10),
    paddingVertical: verticalScale(5),
    backgroundColor: '#f8f9fa',
    borderRadius: moderateScale(8),
  },
  calendarDayHeader: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    color: colors.text,
    width: scale(30),
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%', // 100% / 7 days
    height: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: verticalScale(3),
    borderRadius: moderateScale(18),
  },
  currentMonthDay: {
    // No additional styling needed
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    borderRadius: scale(18),
  },
  calendarDayText: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
  },
  currentMonthDayText: {
    color: colors.text,
  },
  otherMonthDayText: {
    color: '#999999',
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '700',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(30),
    backgroundColor: '#f8f9fa',
    borderRadius: moderateScale(15),
    marginVertical: verticalScale(10),
  },
  timePickerRow: {
    alignItems: 'center',
    marginHorizontal: scale(15),
  },
  timePickerButton: {
    padding: scale(8),
    backgroundColor: 'white',
    borderRadius: moderateScale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timePickerValue: {
    fontSize: responsiveFontSize(28),
    fontWeight: '700',
    color: colors.text,
    marginVertical: verticalScale(8),
    minWidth: scale(40),
    textAlign: 'center',
  },
  timePickerColon: {
    fontSize: responsiveFontSize(28),
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: scale(5),
  },
  timePickerAmPmContainer: {
    flexDirection: 'row',
    marginLeft: scale(25),
  },
  timePickerAmPmButton: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(15),
    marginHorizontal: scale(8),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: '#cccccc',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  selectedAmPmButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timePickerAmPmText: {
    fontSize: responsiveFontSize(16),
    color: '#666666',
    fontWeight: '600',
  },
  selectedAmPmText: {
    color: 'white',
    fontWeight: '700',
  },
});

export default MainHomeScreen;