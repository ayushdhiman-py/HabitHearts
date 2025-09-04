import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
  TextInput,
  Pressable,
  BackHandler,
  Platform,
  Animated,
  Image,
  InteractionManager
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
import { getTextColorForBackground } from '../utils/colorUtils';

import Icon from 'react-native-vector-icons/MaterialIcons';
import SnappingCarousel, { SnappingCarouselRef } from '../components/SnappingCarousel';
import { Timestamp } from 'firebase/firestore';
import EnhancedTaskItem from '../components/home/EnhancedTaskItem';
import { swipeableManager } from '../utils/swipeableManager';

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

// Define header height as a constant
const HEADER_HEIGHT = verticalScale(60);

const getDarkerColor = (hexColor: string, factor: number = 0.8): string => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Darken each component
  const darkR = Math.floor(r * factor);
  const darkG = Math.floor(g * factor);
  const darkB = Math.floor(b * factor);

  return `rgb(${darkR}, ${darkG}, ${darkB})`;
};

const MainHomeScreen = () => {
  const { user } = useAuth() as { user: User | null };
  const insets = useSafeAreaInsets();
  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [linkedUserUids, setLinkedUserUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - day);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  });
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
  const tasksUnsubscribeRef = useRef<(() => void) | null>(null);
  const eventsUnsubscribeRef = useRef<(() => void) | null>(null);
  const heatmapDaysRef = useRef<any[]>([]);
  const heatmapCarouselRef = useRef<SnappingCarouselRef>(null);
  const daySelectorRef = useRef<ScrollView>(null);
  const [isReturningToToday, setIsReturningToToday] = useState(false);
  const runnerAnimation = useRef(new Animated.Value(0)).current;
  const todayPulseAnimation = useRef(new Animated.Value(1)).current;
  const buttonPressAnimation = useRef(new Animated.Value(1)).current;

  // For animated header
  const scrollY = useRef(new Animated.Value(0)).current;

  // Create interpolated values for header animation
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // For heatmap cell animations
  const scaleValue = useRef(new Animated.Value(1)).current;



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

  // Pulse animation for today's date
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(todayPulseAnimation, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(todayPulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    );
    
    pulseAnimation.start();
    
    return () => {
      pulseAnimation.stop();
    };
  }, [todayPulseAnimation]);

  const scrollToSelectedDay = (dayIndex: number) => {
    if (daySelectorRef.current) {
      const itemWidth = verticalScale(36) + scale(6); // day circle width + margin
      const scrollTo = dayIndex * itemWidth;
      daySelectorRef.current.scrollTo({ x: scrollTo, animated: true });
    }
  };

  // Scroll to selected day when it changes, positioning it as the 3rd circle
  useEffect(() => {
    const findAndScroll = () => {
      // Calculate the index of the selected date in our 60-day array
      const startDate = new Date(weekStartDate);
      startDate.setHours(0, 0, 0, 0);

      const targetDate = new Date(selectedDate);
      targetDate.setHours(0, 0, 0, 0);

      const timeDiff = targetDate.getTime() - startDate.getTime();
      const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));

      // Check if the selected date is within our 60-day range
      if (dayDiff >= 0 && dayDiff < 60) {
        if (dayDiff < 2) {
          // Selected date is too close to the start of the list.
          // We need to shift the weekStartDate back to make space.
          const newWeekStartDate = new Date(weekStartDate);
          newWeekStartDate.setDate(newWeekStartDate.getDate() - 7);
          setWeekStartDate(newWeekStartDate);
          return; // This effect will re-run with the new weekStartDate
        }

        const scrollIndex = dayDiff - 2;
        scrollToSelectedDay(scrollIndex);
        return;
      }

      // If we are here, the selectedDate is not in the current 60-day view.
      // We'll reset the weekStartDate to the week of the selectedDate.
      const newWeekStartDate = getStartOfWeek(selectedDate);
      setWeekStartDate(newWeekStartDate);
    };

    // Only run the scroll positioning after interactions to avoid blocking the UI
    InteractionManager.runAfterInteractions(() => {
      findAndScroll();
    });
  }, [selectedDate, weekStartDate]);



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

  // Memoize the normalized selected date to avoid recalculating in filter
  const normalizedSelectedDate = useMemo(() => {
    const date = new Date(selectedDate);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, [selectedDate]);

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
        matchesDate = taskDate.getTime() === normalizedSelectedDate;
      }

      return matchesSearch && matchesDate;
    });

    setFilteredTasks(filtered);
  }, [tasks, searchQuery, normalizedSelectedDate]);

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

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate > today;
  }

  const findIndexForDate = (targetDate: Date) => {
    for (let i = 0; i < 60; i++) {
      const arrayDay = new Date(weekStartDate);
      arrayDay.setDate(weekStartDate.getDate() + i);
      if (arrayDay.toDateString() === targetDate.toDateString()) {
        return i;
      }
    }
    return -1; // Not found
  };

  const animateScrollToToday = () => {
    const today = new Date();
    const startIndex = findIndexForDate(selectedDate);
    const endIndex = findIndexForDate(today);
    const itemWidth = verticalScale(32) + scale(4);

    if (startIndex === -1 || endIndex === -1 || startIndex <= endIndex) {
      setSelectedDate(today);
      return;
    }

    setIsReturningToToday(true);
    runnerAnimation.setValue(0);

    // Animate the runner emoji
    Animated.timing(runnerAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const duration = 500; // ms
    const startTime = Date.now();

    const animationLoop = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      const currentIndex = startIndex - (startIndex - endIndex) * easedProgress;

      const scrollIndex = Math.max(0, currentIndex - 2);
      const scrollPos = scrollIndex * itemWidth;

      daySelectorRef.current?.scrollTo({ x: scrollPos, animated: false });

      if (progress < 1) {
        requestAnimationFrame(animationLoop);
      } else {
        setSelectedDate(today);
        setIsReturningToToday(false);
      }
    };

    requestAnimationFrame(animationLoop);
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

  // Helper function to get the start of the week (Sunday)
  const getStartOfWeek = (date: Date) => {
    const day = date.getDay();
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - day);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  };

  // Helper function to get the end of the week (Saturday)
  const getEndOfWeek = (date: Date) => {
    const day = date.getDay();
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + (6 - day));
    endDate.setHours(23, 59, 59, 999);
    return endDate;
  };

  // Helper function to get an array of 7 days for the current week
  const getWeekDays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };



  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const newWeekStartDate = new Date(weekStartDate);
    if (direction === 'prev') {
      newWeekStartDate.setDate(newWeekStartDate.getDate() - 7);
    } else {
      newWeekStartDate.setDate(newWeekStartDate.getDate() + 7);
    }
    setWeekStartDate(newWeekStartDate);

    // Also update selectedDate to the same day of week in the new week
    const newSelectedDate = new Date(selectedDate);
    if (direction === 'prev') {
      newSelectedDate.setDate(newSelectedDate.getDate() - 7);
    } else {
      newSelectedDate.setDate(newSelectedDate.getDate() + 7);
    }
    setSelectedDate(newSelectedDate);
  };





  // Removed skeleton loader - directly render the main content
  if (loading) {
    setLoading(false);
  }

  return (
    <View style={[globalStyles.container, { paddingTop: insets.top }]}>
      <View style={{ flex: 1 }}>
        {/* Animated Header */}
        <Animated.View
          style={[
            styles.headerBar,
            {
              transform: [{ translateY: headerTranslateY }],
              opacity: headerOpacity,
            }
          ]}
        >
          <View style={styles.headerContent}>
            <Image source={require('../../assets/images/heartlogo.png')} style={styles.headerLogo} />
            <Text style={styles.headerText}>Habit Hearts</Text>
            <TouchableOpacity
              style={styles.headerAddButton}
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
              <Icon name="add" size={responsiveFontSize(24)} color={colors.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {isReturningToToday && (
          <Animated.View style={[styles.runnerContainer, {
            transform: [{
              translateX: runnerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [widthPercentage(100), -50] // From right to left
              })
            }]
          }]}>
            <Text style={styles.runnerEmoji}>🏃</Text>
          </Animated.View>
        )}

        {/* Scrollable Content */}
        <Animated.ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          onTouchStart={() => {
            // Close all swipeables when touching the scroll view
            swipeableManager.closeAll();
          }}
        >
          {/* Search Bar */}
          {/* <View style={styles.searchContainer}>
            <Icon name="search" size={responsiveFontSize(20)} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View> */}

          {/* Scrollable Day Selector with Month Names and Fade Shades */}
          {/* Today Button */}
          <View style={{
            flexDirection: 'row',
            alignSelf: 'center',
            alignItems: 'center',
            paddingHorizontal: scale(16),
            paddingVertical: verticalScale(6),
            backgroundColor: colors.surface,
            borderRadius: moderateScale(20),
            elevation: 2,
            shadowColor: '#2a2a2aff',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            marginTop: verticalScale(8),
            marginBottom: verticalScale(1),
          }}>
            <Icon name="favorite" size={responsiveFontSize(16)} color={colors.secondary} />
            <Text style={[styles.hiText, { marginLeft: scale(6) }]}>Hi, {user?.name || 'User'}, </Text>
            <TouchableOpacity
              onPress={() => {
                const today = new Date();
                setSelectedDate(today);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={[styles.hiText, { textDecorationLine: 'none', fontWeight: '700' }]}>
                today is 
              </Text>
              <Text style={[styles.hiText, { 
                textDecorationLine: 'underline', 
                marginLeft: scale(4),
                fontWeight: '800'
              }]}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Icon name="calendar-today" size={responsiveFontSize(14)} color={colors.secondary} style={{ marginLeft: scale(4) }} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekSelectorContainer}>
            <TouchableOpacity
              style={[styles.weekNavButton, { backgroundColor: 'white', transform: [{ scale: buttonPressAnimation }] }]}
              onPress={() => changeDate('prev')}
              activeOpacity={0.7}
              onPressIn={() => Animated.timing(buttonPressAnimation, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
              }).start()}
              onPressOut={() => Animated.timing(buttonPressAnimation, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
              }).start()}
            >
              <Icon name="chevron-left" size={responsiveFontSize(28)} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.daysScrollViewContainer}>
              {/* Left fade shade */}
              <View style={styles.leftFade} pointerEvents="none">
                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.8)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.6)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0)' }} />
              </View>

              <ScrollView
                ref={daySelectorRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled={false}
                decelerationRate="fast"
                snapToInterval={verticalScale(36) + scale(6)} // day circle width + margin
                style={styles.weekDaysContainer}
                contentContainerStyle={styles.weekDaysContentContainer}
              >
                {/* Generate 60 days (about 2 months) for scrolling */}
                {useMemo(() => Array.from({ length: 60 }, (_, i) => {
                  const day = new Date(weekStartDate);
                  day.setDate(weekStartDate.getDate() + i);
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isTodayDate = isToday(day);

                  return (
                    <View key={`${day.toISOString()}-${i}`} style={styles.dayContainer}>
                      <Text style={styles.monthIndicator}>
                        {day.toLocaleDateString('en-US', { month: 'short' })}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.dayCircle,
                          isSelected && styles.selectedDayCircle,
                          isTodayDate && styles.todayDayCircle,
                          {
                            transform: [
                              { scale: isTodayDate ? todayPulseAnimation : 1 }
                            ]
                          }
                        ]}
                        onPress={() => {
                          setSelectedDate(day);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.dayName,
                          isSelected && styles.selectedDayText,
                          isTodayDate && styles.todayDayText
                        ]}>
                          {day.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1)}
                        </Text>
                        <Text style={[
                          styles.dayNumber,
                          isSelected && styles.selectedDayText,
                          isTodayDate && styles.todayDayText
                        ]}>
                          {day.getDate()}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }), [weekStartDate, selectedDate])}
              </ScrollView>

              {/* Right fade shade */}
              <View style={styles.rightFade} pointerEvents="none">
                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.6)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.8)' }} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.weekNavButton, { backgroundColor: 'white', transform: [{ scale: buttonPressAnimation }] }]}
              onPress={() => changeDate('next')}
              activeOpacity={0.7}
              onPressIn={() => Animated.timing(buttonPressAnimation, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
              }).start()}
              onPressOut={() => Animated.timing(buttonPressAnimation, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
              }).start()}
            >
              <Icon name="chevron-right" size={responsiveFontSize(28)} color={colors.primary} />
            </TouchableOpacity>
          </View>



          {/* Task List */}
          <View style={styles.taskListContainer}>
            {filteredTasks
              .sort((a, b) => {
                // First sort by completion status (incomplete tasks first)
                if (a.completed !== b.completed) {
                  return a.completed ? 1 : -1;
                }
                
                // Then sort by due date (earlier dates first)
                if (a.dueDate && b.dueDate) {
                  return a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime();
                }
                
                // Tasks with due dates come before tasks without due dates
                if (a.dueDate && !b.dueDate) return -1;
                if (!a.dueDate && b.dueDate) return 1;
                
                // Finally sort by creation date (newer first)
                return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
              })
              .map((item) => (
                <EnhancedTaskItem
                  key={item.id}
                  item={item}
                  user={user}
                  onOpenTaskDetail={openTaskDetail}
                  onDeleteTask={deleteTaskItem}
                  onToggleTask={toggleTask}
                />
              ))}
            {filteredTasks.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={globalStyles.text}>No tasks found. Add your first task!</Text>
              </View>
            )}
          </View>
          {/* Goals Heatmap */}
          <View style={styles.heatmapContainer}>
            <View style={styles.heatmapHeader}>
              <Text style={styles.heatmapTitle}>Your Goals Progress</Text>
              {goals.length > 0 && (
                <View style={styles.heatmapNavigation}>
                  <TouchableOpacity
                    style={styles.heatmapNavButton}
                    onPress={() => {
                      if (heatmapCarouselRef.current) {
                        const currentIndex = heatmapCarouselRef.current.getCurrentIndex();
                        if (currentIndex > 0) {
                          heatmapCarouselRef.current.scrollToIndex(currentIndex - 1);
                        }
                      }
                    }}
                  >
                    <View style={styles.heatmapNavButtonCircle}>
                      <Text style={styles.heatmapNavButtonText}>‹</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.heatmapNavButton}
                    onPress={() => {
                      if (heatmapCarouselRef.current) {
                        const currentIndex = heatmapCarouselRef.current.getCurrentIndex();
                        if (currentIndex < goals.length - 1) {
                          heatmapCarouselRef.current.scrollToIndex(currentIndex + 1);
                        }
                      }
                    }}
                  >
                    <View style={styles.heatmapNavButtonCircle}>
                      <Text style={styles.heatmapNavButtonText}>›</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {goals.length > 0 ? (
              <SnappingCarousel
                ref={heatmapCarouselRef}
                data={goals}
                showNavigation={true}
                slideWidth={widthPercentage(100) - scale(30)} // Account for container padding (15 + 15)
                renderItem={(goal, index) => {
                  // Use light pastel colors instead of vibrant colors
                  const pastelColors = [
                    '#FFE4E1', // Light pink
                    '#E0FFFF', // Light cyan
                    '#F0FFF0', // Honeydew
                    '#F5F5DC', // Beige
                    '#E6E6FA', // Lavender
                    '#FFFACD', // Lemon chiffon
                    '#F0FFF0', // Light green
                    '#F0F8FF', // Alice blue
                    '#FFF5EE', // Seashell
                    '#FDF5E6'  // Old lace
                  ];

                  const backgroundColor = pastelColors[index % pastelColors.length];

                  const titleColor = getDarkerColor(backgroundColor);
                  const weekDaysBackgroundColor = getDarkerColor(backgroundColor, 0.7); // Even darker for weekdays

                  // Calculate streak for this specific goal
                  const calculateGoalStreak = () => {
                    const goalProgress = goalsProgress[goal.id] || [];
                    let streak = 0;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    // Count consecutive completed days backwards from today
                    let currentDate = new Date(today);
                    while (true) {
                      const dateStr = currentDate.toISOString().split('T')[0];
                      const progressRecord = goalProgress.find(p => p.date === dateStr);

                      if (progressRecord && progressRecord.completed) {
                        streak++;
                        // Move to previous day
                        currentDate.setDate(currentDate.getDate() - 1);
                      } else {
                        break;
                      }
                    }

                    return streak;
                  };

                  const getDaysInMonth = () => {
                    const now = new Date();
                    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                  };

                  const calculateCompletionPercentage = () => {
                    const goalProgress = goalsProgress[goal.id] || [];
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    const currentYear = now.getFullYear();

                    // Get the number of days in the current month
                    const daysInMonth = getDaysInMonth();

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

                  const daysInMonth = getDaysInMonth();
                  const completionPercentage = calculateCompletionPercentage();
                  const streak = calculateGoalStreak();

                  return (
                    <View key={goal.id} style={styles.goalHeatmapContainer}>
                      <View style={[styles.goalHeatmap, { backgroundColor }]}>
                        <View style={styles.goalHeader}>
                          <Text style={[styles.goalName, { color: titleColor }]} numberOfLines={1}>
                            {goal.text}
                          </Text>
                          <View style={styles.streakContainer}>
                            <Icon name="local-fire-department" size={responsiveFontSize(14)} color={colors.textLight} />
                            <Text style={styles.streakText}>{streak} days</Text>
                          </View>
                        </View>
                        <View style={styles.progressContainer}>
                          <Text style={styles.progressText}>{Math.round((completionPercentage / 100) * daysInMonth)} of {daysInMonth} days completed</Text>
                          <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${completionPercentage}%` }]} />
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[styles.dailyCheckButton, { backgroundColor: titleColor }]}
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
                          <Icon name="check-circle" size={responsiveFontSize(14)} color={colors.textLight} />
                          <Text style={styles.dailyCheckButtonText}>Done Today?</Text>
                        </TouchableOpacity>
                        <View style={[styles.heatmapCalendar, { backgroundColor: getDarkerColor(backgroundColor, 0.95) }]}>
                          {/* Days of week header */}
                          <View style={[styles.heatmapWeekDays, { backgroundColor: weekDaysBackgroundColor }]}>
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
                                  activeOpacity={0.7}
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
                    </View>
                  );
                }}
              />
            ) : (
              <View style={styles.noGoalsContainer}>
                <Icon name="emoji-events" size={responsiveFontSize(40)} color={colors.textSecondary} />
                <Text style={styles.noGoalsText}>No goals yet. Add goals to see your progress heatmap.</Text>
              </View>
            )}
          </View>
        </Animated.ScrollView>

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
                        {`Selected due date & time:
`} {newTaskDate.toLocaleDateString()} at {newTaskDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: verticalScale(60),
    minHeight: scale(1000), // Add padding to account for absolute positioned header (HEADER_HEIGHT)
  },
  taskListContainer: {
    paddingHorizontal: scale(16),
  },
  headerBar: {
    backgroundColor: colors.surface,
    paddingVertical: verticalScale(10),
    // Make it absolutely positioned to float above content
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: scale(16),
  },
  headerAddButton: {
    padding: scale(8),
    backgroundColor: colors.secondary,
    borderRadius: moderateScale(10),
  },
  headerLogo: {
    width: verticalScale(30),
    height: verticalScale(30),
    borderRadius: verticalScale(15),
    marginLeft: scale(16),
  },
  headerText: {
    color: colors.text,
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    paddingHorizontal: scale(12),
  },
  heatmapContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    backgroundColor: colors.surface,
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  heatmapTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '700',
    color: colors.text,
  },
  dailyCheckButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(25),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    alignSelf: 'center',
    marginTop: verticalScale(10),
    marginBottom: verticalScale(15),
  },
  dailyCheckButtonText: {
    color: colors.textLight,
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    marginLeft: scale(6),
  },
  goalHeatmapContainer: {
    width: '100%',
    marginBottom: verticalScale(12),
  },
  goalHeatmap: {
    borderRadius: moderateScale(16),
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    height: '100%',
    backgroundColor: colors.surface,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  goalName: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: colors.text,
    maxWidth: '65%',
    lineHeight: responsiveFontSize(22),
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
  },
  streakText: {
    color: colors.textLight,
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
    marginLeft: scale(4),
  },
  progressContainer: {
    marginBottom: verticalScale(12),
  },
  progressBarContainer: {
    height: verticalScale(6),
    backgroundColor: colors.gray200,
    borderRadius: moderateScale(3),
    marginVertical: verticalScale(4),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: moderateScale(3),
  },
  progressText: {
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: verticalScale(2),
  },
  heatmapCalendar: {
    borderRadius: moderateScale(12),
    backgroundColor: colors.gray50,
    padding: scale(10),
    height: 200,
  },
  heatmapWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(2),
    backgroundColor: colors.primary,
    borderRadius: moderateScale(6),
    paddingVertical: verticalScale(4),
  },
  heatmapWeekDayText: {
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
    color: colors.textLight,
    width: '14.28%',
    textAlign: 'center',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: verticalScale(6),
  },
  heatmapDateCell: {
    width: '12%', // Reduced width to prevent overflow
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: scale(1),
    borderRadius: moderateScale(6),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  currentMonthCell: {
    // No additional styling needed
  },
  otherMonthCell: {
    opacity: 0.3,
  },
  heatmapDateText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
    color: colors.text,
  },
  currentMonthDateText: {
    // No additional styling needed
  },
  otherMonthDateText: {
    color: colors.textSecondary,
  },
  heatmapDateDefault: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray300,
  },
  heatmapDateFuture: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray200,
  },
  heatmapDateCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.successDark,
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  heatmapDateMissed: {
    backgroundColor: colors.error,
    borderColor: colors.errorDark,
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  todayDateCell: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    // Add glow effect for today
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  todayDateText: {
    color: colors.textLight,
    fontWeight: '700',
  },
  // Removed tick mark styles
  noGoalsContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(30),
  },
  noGoalsText: {
    fontSize: responsiveFontSize(16),
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: verticalScale(20),
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: scale(12),
    marginTop: verticalScale(16),
    backgroundColor: colors.gray50,
    borderRadius: moderateScale(10),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorBox: {
    width: scale(14),
    height: scale(14),
    borderRadius: moderateScale(3),
    marginRight: scale(6),
  },
  legendCompleted: {
    backgroundColor: colors.success,
  },
  legendMissed: {
    backgroundColor: colors.error,
  },
  legendDefault: {
    backgroundColor: colors.gray200,
  },
  legendText: {
    fontSize: responsiveFontSize(12),
    color: colors.text,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Glass background
    borderRadius: moderateScale(100),
    marginHorizontal: scale(15),
    marginVertical: verticalScale(0),
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(5),
    borderWidth: 1,
    borderColor: 'black',
    // Glass effect
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
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(12),
    marginTop: verticalScale(8),
  },
  dateButton: {
    width: verticalScale(40),
    height: verticalScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
  },
  weekSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(16),
    marginTop: verticalScale(8),
    width: '100%',
  },
  weekNavButton: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  daysScrollViewContainer: {
    flex: 1,
    marginHorizontal: scale(8),
    position: 'relative',
    marginTop: verticalScale(-8),
  },
  weekDaysContainer: {
    flex: 1,
  },
  weekDaysContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(15), // Increased padding to prevent cropping
    paddingVertical: verticalScale(5),
  },
  leftFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: scale(15),
    zIndex: 1,
    flexDirection: 'row',
    pointerEvents: 'none',
  },
  rightFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: scale(15),
    zIndex: 1,
    flexDirection: 'row',
    pointerEvents: 'none',
  },


  dayContainer: {
    alignItems: 'center',
    marginHorizontal: scale(3),
    marginVertical: verticalScale(2),
  },
  monthIndicator: {
    fontSize: responsiveFontSize(10),
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: verticalScale(2),
  },
  dayCircle: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  selectedDayCircle: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  todayDayCircle: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  dayName: {
    fontSize: responsiveFontSize(9),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayNumber: {
    fontSize: responsiveFontSize(11),
    fontWeight: '700',
    color: colors.text,
  },
  selectedDayText: {
    color: colors.textLight,
    fontWeight: '600',
  },
  todayDayText: {
    color: colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(48),
  },
  taskItem: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginBottom: verticalScale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  taskTextContainer: {
    flex: 1,
    marginRight: scale(8),
  },
  taskText: {
    fontSize: responsiveFontSize(16),
    color: colors.text,
    fontWeight: '500',
    lineHeight: responsiveFontSize(20),
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  creatorText: {
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    marginTop: verticalScale(2),
    fontStyle: 'italic',
  },
  taskActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: verticalScale(32),
    height: verticalScale(32),
    borderRadius: moderateScale(16),
  },
  hiText: {
    color: colors.secondary,
    fontSize: responsiveFontSize(12),
    fontWeight: '900',
  },
  runnerContainer: {
    position: 'absolute',
    top: verticalScale(120), // Position it below the date scroller
    zIndex: 2000,
    elevation: 20,
  },
  runnerEmoji: {
    fontSize: responsiveFontSize(40),
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    width: '90%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: scale(8),
  },
  saveButtonSmall: {
    backgroundColor: colors.primary,
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  saveButtonTextSmall: {
    color: colors.textLight,
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  modalContent: {
    padding: scale(16),
  },
  editTitleInput: {
    fontSize: responsiveFontSize(17),
    fontWeight: '600',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(14),
    minHeight: verticalScale(40),
  },
  editDescriptionInput: {
    fontSize: responsiveFontSize(14),
    color: colors.text,
    textAlignVertical: 'top',
    paddingVertical: verticalScale(10),
    minHeight: verticalScale(70),
    maxHeight: verticalScale(100),
    backgroundColor: colors.gray50,
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(10),
    marginBottom: verticalScale(12),
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  datePickerLabel: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
    color: colors.text,
    marginRight: scale(8),
  },
  dateDisplay: {
    flex: 1,
    paddingVertical: verticalScale(8),
  },
  dateDisplayText: {
    fontSize: responsiveFontSize(15),
    color: colors.textSecondary,
    flex: 1,
  },
  calendarIcon: {
    marginLeft: scale(8),
  },
  selectedDateTimeContainer: {
    marginTop: verticalScale(8),
    padding: scale(8),
    backgroundColor: colors.gray50,
    borderRadius: moderateScale(6),
  },
  selectedDateTimeText: {
    fontSize: responsiveFontSize(13),
    color: colors.text,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  saveButtonText: {
    color: colors.textLight,
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    width: '90%',
    maxWidth: 400,
    padding: scale(16),
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  pickerTitle: {
    fontSize: responsiveFontSize(17),
    fontWeight: '600',
    color: colors.text,
  },
  pickerCloseButton: {
    padding: scale(4),
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(16),
  },
  pickerCancelButton: {
    flex: 1,
    padding: moderateScale(12),
    alignItems: 'center',
    marginRight: scale(8),
    borderRadius: moderateScale(8),
    backgroundColor: colors.gray200,
  },
  pickerCancelText: {
    color: colors.text,
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
  },
  pickerConfirmButton: {
    flex: 1,
    padding: moderateScale(12),
    alignItems: 'center',
    marginLeft: scale(8),
    borderRadius: moderateScale(8),
    backgroundColor: colors.primary,
  },
  pickerConfirmText: {
    color: colors.textLight,
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
  },
  customPickerContainer: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
  },
  customPickerText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.text,
    marginBottom: verticalScale(8),
  },
  customPickerHint: {
    fontSize: responsiveFontSize(13),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: verticalScale(12),
  },
  customPickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: verticalScale(8),
    width: '100%',
  },
  customPickerButton: {
    padding: scale(8),
    borderRadius: moderateScale(8),
    backgroundColor: colors.gray200,
    minWidth: widthPercentage(20),
    alignItems: 'center',
  },
  customPickerLabel: {
    fontSize: responsiveFontSize(13),
    color: colors.text,
    fontWeight: '500',
  },
  customPickerTodayButton: {
    backgroundColor: colors.primary,
    minWidth: widthPercentage(40),
    marginTop: verticalScale(8),
  },
  customPickerTodayText: {
    color: colors.textLight,
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
  },
  calendarContainer: {
    padding: scale(16),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  calendarMonthYear: {
    fontSize: responsiveFontSize(17),
    fontWeight: '600',
    color: colors.text,
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(8),
    paddingVertical: verticalScale(4),
    backgroundColor: colors.gray200,
    borderRadius: moderateScale(6),
  },
  calendarDayHeader: {
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
    color: colors.text,
    width: scale(28),
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%', // 100% / 7 days
    height: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: verticalScale(2),
    borderRadius: moderateScale(16),
  },
  currentMonthDay: {
    // No additional styling needed
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    borderRadius: scale(16),
  },
  calendarDayText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
  },
  currentMonthDayText: {
    color: colors.text,
  },
  otherMonthDayText: {
    color: colors.textSecondary,
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(24),
    backgroundColor: colors.gray100,
    borderRadius: moderateScale(12),
    marginVertical: verticalScale(8),
  },
  timePickerRow: {
    alignItems: 'center',
    marginHorizontal: scale(12),
  },
  timePickerButton: {
    padding: scale(6),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: colors.border,
  },
  timePickerValue: {
    fontSize: responsiveFontSize(24),
    fontWeight: '600',
    color: colors.text,
    marginVertical: verticalScale(6),
    minWidth: scale(36),
    textAlign: 'center',
  },
  timePickerColon: {
    fontSize: responsiveFontSize(24),
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: scale(4),
  },
  timePickerAmPmContainer: {
    flexDirection: 'row',
    marginLeft: scale(20),
  },
  timePickerAmPmButton: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    marginHorizontal: scale(6),
    borderRadius: moderateScale(8),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedAmPmButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timePickerAmPmText: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectedAmPmText: {
    color: colors.textLight,
    fontWeight: '600',
  },
  heatmapNavigation: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  heatmapNavButton: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  heatmapNavButtonCircle: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: verticalScale(18),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  heatmapNavButtonText: {
    fontSize: responsiveFontSize(22),
    fontWeight: '700',
    color: colors.textLight,
  },
});

export default MainHomeScreen;