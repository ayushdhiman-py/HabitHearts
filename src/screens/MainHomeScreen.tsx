import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
  TextInput,
  BackHandler,
  Platform,
  Animated,
  Image,
  InteractionManager,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { subscribeToTasksForUserAndLinked, createTask, updateTask, deleteTask, toggleTaskCompletion, Task } from '../services/taskService';
import { getLinkedUsers } from '../services/userService';
import { subscribeToGoalsForUserAndLinked } from '../services/goalService';
import { getGoalsProgress, updateGoalProgress, GoalProgress } from '../services/goalProgressService';
import colors from '../theme/colors';
import globalStyles from '../theme/styles';
import { responsiveFontSize, scale, verticalScale, moderateScale, widthPercentage } from '../utils/responsive';
import { useStatusBar } from '../context/StatusBarContext';
import { getTextColorForBackground } from '../utils/colorUtils';
import { getButtonColor } from '../utils/buttonUtils';

import Icon from 'react-native-vector-icons/MaterialIcons';
import SnappingCarousel, { SnappingCarouselRef } from '../components/SnappingCarousel';
import { Timestamp } from 'firebase/firestore';
import EnhancedTaskItem from '../components/home/EnhancedTaskItem';
import { swipeableManager } from '../utils/swipeableManager';

// Reanimated imports
import { useFocusEffect } from '@react-navigation/native';



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

// Helper function to get a random bright color for heatmap
const getRandomBrightColor = () => {
    const brightColors = [
      { light: colors.electricBlueLight, dark: colors.electricBlueDark },
      { light: colors.hotPinkLight, dark: colors.hotPinkDark },
      { light: colors.electricGreenLight, dark: colors.electricGreenDark },
      { light: colors.vibrantOrangeLight, dark: colors.vibrantOrangeDark },
      { light: colors.brightPurpleLight, dark: colors.brightPurpleDark },
      { light: colors.sunnyYellowLight, dark: colors.sunnyYellowDark },
      { light: colors.brightRedLight, dark: colors.brightRedDark },
      { light: colors.mintLight, dark: colors.mintDark }
    ];
    return brightColors[Math.floor(Math.random() * brightColors.length)];
  };

// Memoize the component to prevent unnecessary re-renders
const TimePicker = React.memo(({ 
  items, 
  selectedValue, 
  onValueChange 
}: { 
  items: number[]; 
  selectedValue: number; 
  onValueChange: (value: number) => void; 
}) => {
  const itemHeight = 40;
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollY, setScrollY] = useState(0);

  // Scroll to selected item when it changes or on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollViewRef.current) {
        const index = items.indexOf(selectedValue);
        if (index !== -1) {
          // Add padding at top to ensure proper centering (40px for the top padding)
          const y = index * itemHeight;
          scrollViewRef.current.scrollTo({ y, animated: false });
        }
      }
    }, 150);
    
    return () => {
      clearTimeout(timer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [selectedValue, items]);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    setScrollY(y);
    
    if (!isScrolling.current) return;
    
    // Adjust for the top padding (40px)
    const adjustedY = Math.max(0, y);
    // Calculate index with proper rounding
    const index = Math.round(adjustedY / itemHeight);
    // Ensure index is within bounds
    const clampedIndex = Math.min(Math.max(index, 0), items.length - 1);
    
    if (clampedIndex >= 0 && clampedIndex < items.length) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Update selection during scroll for visual feedback with a small delay
      timeoutRef.current = setTimeout(() => {
        if (items[clampedIndex] !== selectedValue) {
          onValueChange(items[clampedIndex]);
        }
      }, 50);
    }
  };

  const handleScrollBeginDrag = () => {
    isScrolling.current = true;
    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMomentumScrollEnd = (event: any) => {
    isScrolling.current = false;
    
    // Update scroll position
    const y = event.nativeEvent.contentOffset.y;
    setScrollY(y);
    
    // Calculate the final position
    const adjustedY = Math.max(0, y);
    
    // Determine the closest item
    const index = Math.round(adjustedY / itemHeight);
    const clampedIndex = Math.min(Math.max(index, 0), items.length - 1);
    
    if (clampedIndex >= 0 && clampedIndex < items.length) {
      // Scroll to the exact position to ensure proper alignment
      const targetY = clampedIndex * itemHeight;
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: targetY, animated: true });
      }
      
      // Update the value if it changed
      if (items[clampedIndex] !== selectedValue) {
        onValueChange(items[clampedIndex]);
      }
    }
  };

  // Function to determine if an item should have transparent text
  const isItemTransparent = (index: number) => {
    // Calculate the position of this item's top edge
    // Each item is 40px tall, and there's 40px padding at the top
    const itemTopPosition = (index * itemHeight) + 40;
    
    // If the item's top edge is above the scroll position, it's scrolled out
    return itemTopPosition < scrollY;
  };

  return (
    <View style={{
      height: 120,
      width: 50,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Center indicator line */}
      <View style={{
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        height: 40,
        borderColor: colors.electricBlue,
        borderWidth: 0,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        zIndex: 1,
        pointerEvents: 'none',
      }} />
      
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={itemHeight}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {/* Add padding at the top for the first item to be centered */}
        <View style={{ height: 40 }} />
        {items.map((item, index) => (
          <View 
            key={index} 
            style={{
              height: itemHeight,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: 16,
              color: item === selectedValue ? colors.text : colors.textSecondary,
              fontWeight: item === selectedValue ? '600' : 'normal',
              opacity: isItemTransparent(index) ? 0 : 1,
            }}>
              {item.toString().padStart(2, '0')}
            </Text>
          </View>
        ))}
        {/* Add padding at the bottom for the last item to be centered */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.selectedValue === nextProps.selectedValue &&
    prevProps.items.length === nextProps.items.length &&
    prevProps.items.every((item, index) => item === nextProps.items[index])
  );
});

const HeatmapGrid = React.memo(({ 
  heatmapDays,
  goalId,
  goalProgress,
  streak,
  lightColor,
  darkColor,
  onDatePress
}: {
  heatmapDays: any[];
  goalId: string;
  goalProgress: GoalProgress[];
  streak: number;
  lightColor: string;
  darkColor: string;
  onDatePress: (date: Date) => void;
}) => {
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  if (!heatmapDays || heatmapDays.length === 0) {
    return <Text style={styles.noGoalsText}>Loading heatmap...</Text>;
  }

  return (
    <View style={styles.heatmapGrid}>
      {heatmapDays.map((day, index) => {
        const dateStr = day.date.toISOString().split('T')[0];
        const progressRecord = goalProgress.find(p => p.date === dateStr);

        // Determine cell color based on progress
        let cellBackgroundColor = `${lightColor}60`;
        let cellTextColor = colors.text;

        if (progressRecord) {
          if (progressRecord.completed) {
            // Completed day - use dark background color
            cellBackgroundColor = darkColor;
            cellTextColor = colors.textLight;
          } else {
            // Missed day - use error color
            cellBackgroundColor = colors.error;
            cellTextColor = colors.textLight;
          }
        } else {
          // Future or unmarked date
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const checkDate = new Date(day.date);
          checkDate.setHours(0, 0, 0, 0);
          
          if (checkDate > today) {
            // Future date - lighter background
            cellBackgroundColor = `${lightColor}40`;
          } else {
            // Past unmarked date - default light background
            cellBackgroundColor = `${lightColor}60`;
          }
        }

        // Special handling for today
        const isTodayDate = isToday(day.date);
        if (isTodayDate) {
          cellBackgroundColor = darkColor;
          cellTextColor = colors.textLight;
        }

        // Special handling for streak highlight (yellow)
        const isStreakDay = streak > 0 && (() => {
          // Logic: if this date is within the streak period counting backwards from today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const checkDate = new Date(day.date);
          checkDate.setHours(0, 0, 0, 0);
          
          // Only highlight dates that are on or before today
          if (checkDate > today) {
            return false;
          }
          
          // Calculate the difference in days
          const diffTime = today.getTime() - checkDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Highlight if within the streak period
          return diffDays < streak;
        })();

        return (
          <TouchableOpacity
            key={`${goalId}-${dateStr}-${index}`}
            style={[
              styles.heatmapDateCell,
              day.isCurrentMonth ? styles.currentMonthCell : styles.otherMonthCell,
              isTodayDate && styles.todayDateCell,
              {
                backgroundColor: isStreakDay ? colors.streakHighlight : cellBackgroundColor,
                borderColor: isStreakDay ? colors.streakHighlight : darkColor,
              }
            ]}
            onPress={() => onDatePress(day.date)}
            disabled={!day.isCurrentMonth}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.heatmapDateText,
              day.isCurrentMonth ? styles.currentMonthDateText : styles.otherMonthDateText,
              isTodayDate && styles.todayDateText,
              { 
                color: isStreakDay ? colors.text : cellTextColor 
              }
            ]}>
              {day.day}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const HeatmapItem = React.memo(({ 
  goal, 
  goalId, 
  lightColor, 
  darkColor, 
  goalProgress,
  onUpdateProgress,
  user,
  heatmapDays
}: {
  goal: any;
  goalId: string;
  lightColor: string;
  darkColor: string;
  goalProgress: GoalProgress[];
  onUpdateProgress: (goalId: string, newProgress: GoalProgress[]) => void;
  user: User | null;
  heatmapDays: any[];
}) => {
  const [streak, setStreak] = useState(0);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [daysInMonth, setDaysInMonth] = useState(0);
  const [isGridVisible, setIsGridVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsGridVisible(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Calculate streak for this specific goal
  useEffect(() => {
    const calculateGoalStreak = () => {
      let streakCount = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count consecutive completed days backwards from today
      let currentDate = new Date(today);
      while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const progressRecord = goalProgress.find(p => p.date === dateStr);

        if (progressRecord && progressRecord.completed) {
          streakCount++;
          // Move to previous day
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      return streakCount;
    };

    setStreak(calculateGoalStreak());
  }, [goalProgress]);

  // Calculate completion percentage
  useEffect(() => {
    const getDaysInMonth = () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    };

    const calculateCompletionPercentage = () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Get the number of days in the current month
      const totalDaysInMonth = getDaysInMonth();

      // Count completed days in the current month
      let completedDays = 0;
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = date.toISOString().split('T')[0];
        const progressRecord = goalProgress.find(p => p.date === dateStr);

        if (progressRecord && progressRecord.completed) {
          completedDays++;
        }
      }

      // Calculate percentage based on total days in month
      return Math.round((completedDays / totalDaysInMonth) * 100);
    };

    const totalDays = getDaysInMonth();
    const percentage = calculateCompletionPercentage();
    
    setDaysInMonth(totalDays);
    setCompletionPercentage(percentage);
  }, [goalProgress]);

  // Handle date press - would show options to mark as done or not
  const handleDatePress = (date: Date) => {
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
                const existingProgress = goalProgress || [];
                // Filter out any existing record for this date
                const filteredProgress = existingProgress.filter(p => p.date !== progress.date);
                // Add the new/updated record
                const newProgress = [...filteredProgress, progress];
                onUpdateProgress(goalId, newProgress);
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
                const existingProgress = goalProgress || [];
                // Filter out any existing record for this date
                const filteredProgress = existingProgress.filter(p => p.date !== progress.date);
                // Add the new/updated record
                const newProgress = [...filteredProgress, progress];
                onUpdateProgress(goalId, newProgress);
              } catch (error) {
                console.error('Error marking goal as completed:', error);
              }
            }
          }
        ]
      );
    }
  };

  return (
    <View key={goal.id} style={styles.goalHeatmapContainer}>
      <View style={[styles.goalHeatmap, { backgroundColor: lightColor }]}>
        <View style={styles.goalHeader}>
          <Text style={[styles.goalName, { color: darkColor }]} numberOfLines={1}>
            {goal.text}
          </Text>
          <View style={styles.streakContainer}>
            <Icon name="local-fire-department" size={responsiveFontSize(16)} color={colors.streakHighlight} />
            <Text style={styles.streakText}>{streak} days</Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: darkColor }]}>{Math.round((completionPercentage / 100) * daysInMonth)} of {daysInMonth} days completed</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { 
              backgroundColor: darkColor,
              width: `${completionPercentage}%` 
            }]} />
          </View>
        </View>
        <TouchableOpacity
          style={[styles.dailyCheckButton, { 
            backgroundColor: `${darkColor}33`, // Glass effect
            borderColor: darkColor,
            borderWidth: 1
          }]}
          onPress={() => {
            if (user) {
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Normalize the time
              today.setMilliseconds(0); // Ensure milliseconds are zero
              
              // Mark today as completed for this goal directly
              Alert.alert(
                'Mark Completed',
                `Did you complete "${goal.text}" today?`,
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'No',
                    onPress: async () => {
                      // Mark today as missed for this goal
                      try {
                        const progress: GoalProgress = await updateGoalProgress(goalId, today, false, user.uid);
                        // Update local state with a new object reference to trigger re-render
                        const existingProgress = goalProgress || [];
                        // Filter out any existing record for this date
                        const filteredProgress = existingProgress.filter(p => p.date !== progress.date);
                        // Add the new/updated record
                        const newProgress = [...filteredProgress, progress];
                        onUpdateProgress(goalId, newProgress);
                      } catch (error) {
                        console.error('Error marking goal as missed:', error);
                        Alert.alert('Error', 'Failed to mark goal as missed. Please try again.');
                      }
                    }
                  },
                  {
                    text: 'Yes',
                    onPress: async () => {
                      // Mark today as completed for this goal
                      try {
                        const progress: GoalProgress = await updateGoalProgress(goalId, today, true, user.uid);
                        // Update local state with a new object reference to trigger re-render
                        const existingProgress = goalProgress || [];
                        // Filter out any existing record for this date
                        const filteredProgress = existingProgress.filter(p => p.date !== progress.date);
                        // Add the new/updated record
                        const newProgress = [...filteredProgress, progress];
                        onUpdateProgress(goalId, newProgress);
                      } catch (error) {
                        console.error('Error marking goal as completed:', error);
                        Alert.alert('Error', 'Failed to mark goal as completed. Please try again.');
                      }
                    }
                  }
                ]
              );
            }
          }}
        >
          <Icon name="check-circle" size={responsiveFontSize(16)} color={darkColor} />
          <Text style={[styles.dailyCheckButtonText, { color: darkColor }]}>Done Today</Text>
        </TouchableOpacity>
        <View style={[styles.heatmapCalendar, { backgroundColor: `${lightColor}80` }]}>
          {/* Days of week header */}
          <View style={[styles.heatmapWeekDays, { backgroundColor: darkColor }]}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={index} style={[styles.heatmapWeekDayText, { color: colors.textLight }]}>
                {day}
              </Text>
            ))}
          </View>
          {isGridVisible ? (
            <HeatmapGrid
              heatmapDays={heatmapDays}
              goalId={goalId}
              goalProgress={goalProgress}
              streak={streak}
              lightColor={lightColor}
              darkColor={darkColor}
              onDatePress={handleDatePress}
            />
          ) : (
            <View style={styles.heatmapGrid}>
              <ActivityIndicator color={darkColor} />
            </View>
          )}
        </View>
        {/* Heatmap Legend */}
        <View style={styles.heatmapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: darkColor }]} />
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
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.goal.id === nextProps.goal.id &&
    prevProps.goal.text === nextProps.goal.text &&
    prevProps.lightColor === nextProps.lightColor &&
    prevProps.darkColor === nextProps.darkColor &&
    prevProps.goalProgress.length === nextProps.goalProgress.length &&
    prevProps.goalProgress.every((progress, index) => 
      progress.date === nextProps.goalProgress[index].date &&
      progress.completed === nextProps.goalProgress[index].completed
    ) &&
    prevProps.user?.uid === nextProps.user?.uid &&
    prevProps.heatmapDays.length === nextProps.heatmapDays.length
  );
});

const MainHomeScreen = () => {
  const { user } = useAuth();
  const { screenBackgroundColor, backgroundColor, themePalette, setStatusBar } = useStatusBar();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [addingTask, setAddingTask] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStartDate, setWeekStartDate] = useState(() => {
    // Not used in the new approach but kept for compatibility
    const today = new Date();
    const day = today.getDay();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - day);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDate, setTaskDate] = useState(new Date());
  const [taskEmoji, setTaskEmoji] = useState('🎯');
  const [taskStartHour, setTaskStartHour] = useState(0);
  const [taskStartMinute, setTaskStartMinute] = useState(0);
  const [taskEndHour, setTaskEndHour] = useState(0);
  const [taskEndMinute, setTaskEndMinute] = useState(0);

  // For task detail modal date/time picker
  const [showTaskDetailDatePicker, setShowTaskDetailDatePicker] = useState(false);
  const [showTaskDetailTimePicker, setShowTaskDetailTimePicker] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [goalsProgress, setGoalsProgress] = useState<Record<string, GoalProgress[]>>({});
  const [heatmapColors, setHeatmapColors] = useState<Record<string, {light: string, dark: string}>>({});
  // For date/time selection in modals
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());
  const heatmapDaysRef = useRef<any[]>([]);
  const heatmapCarouselRef = useRef<SnappingCarouselRef>(null);
  const monthScrollViewRef = useRef<ScrollView>(null);
  const [isReturningToToday, setIsReturningToToday] = useState(false);
  const runnerAnimation = useRef(new Animated.Value(0)).current;
  const todayPulseAnimation = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      // Set status bar to match the app's primary theme (only when needed)
      setStatusBar(themePalette.statusBar, 'light-content');
    }, [themePalette.statusBar])
  );

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

  

  const fetchLinkedUsers = useCallback(async () => {
    if (user?.uid) {
      try {
        const linkedUsers = await getLinkedUsers(user.uid);
        const linkedUids = linkedUsers.map(u => u.uid);
        return linkedUids;
      } catch (error) {
        console.error('Error fetching linked users:', error);
        return [];
      }
    }
    return [];
  }, [user?.uid]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Initialize heatmap days only once when component mounts
  useEffect(() => {
    if (!heatmapDaysRef.current || heatmapDaysRef.current.length === 0) {
      const newDays = generateCalendarDaysForHeatmap();
      heatmapDaysRef.current = newDays;
    }
  }, []);

  // Generate random colors for each goal heatmap when goals change
  useEffect(() => {
    const newHeatmapColors: Record<string, {light: string, dark: string}> = {};
    let hasNewColors = false;
    
    goals.forEach(goal => {
      if (!heatmapColors[goal.id]) {
        newHeatmapColors[goal.id] = getRandomBrightColor();
        hasNewColors = true;
      }
    });
    
    if (hasNewColors) {
      setHeatmapColors(prev => ({ ...prev, ...newHeatmapColors }));
    }
  }, [goals]);

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
    if (monthScrollViewRef.current) {
      const itemWidth = verticalScale(44) + scale(8); // day circle width + margin
      // Get the width of the ScrollView container
      const scrollViewWidth = Dimensions.get('window').width - scale(32); // Account for paddingHorizontal
      // Calculate the offset to center the item
      const centerOffset = (scrollViewWidth - itemWidth) / 2;
      const scrollTo = dayIndex * itemWidth - centerOffset;
      monthScrollViewRef.current?.scrollTo({ x: scrollTo, animated: true });
    }
  };

  // Scroll to selected day when it changes, positioning it as the 3rd circle
  useEffect(() => {
    const findAndScroll = () => {
      // With the new approach, we always center on the selected date
      // So we just need to scroll to the middle of the view (index 15 for 30 items)
      scrollToSelectedDay(15);
    };

    // Only run the scroll positioning after interactions to avoid blocking the UI
    InteractionManager.runAfterInteractions(() => {
      findAndScroll();
    });
  }, [selectedDate]);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Check modals in reverse order of appearance (topmost first)
      if (showTaskDetailDatePicker) {
        setShowTaskDetailDatePicker(false);
        return true; // Prevent default back behavior
      } else if (showTaskDetailTimePicker) {
        setShowTaskDetailTimePicker(false);
        return true; // Prevent default back behavior
      } else if (selectedTask) {
        setSelectedTask(null);
        return true; // Prevent default back behavior
      } else if (isTaskModalVisible) {
        setIsTaskModalVisible(false);
        return true; // Prevent default back behavior
      }
      return false; // Use default back behavior
    });

    return () => backHandler.remove();
  }, [selectedTask, isTaskModalVisible, showTaskDetailDatePicker, showTaskDetailTimePicker]);

  // Scroll to today's date when component mounts
  useEffect(() => {
    const scrollToToday = () => {
      // With the new approach, we always center on the selected date
      // So we just need to scroll to the middle of the view (index 15 for 30 items)
      scrollToSelectedDay(15);
    };

    // Only run the scroll positioning after interactions to avoid blocking the UI
    InteractionManager.runAfterInteractions(() => {
      scrollToToday();
    });
  }, []);

  // Set up real-time listeners once when component mounts
  useEffect(() => {
    let tasksUnsubscribe: (() => void) | null = null;
    let goalsUnsubscribe: (() => void) | null = null;
    let setupTimer: ReturnType<typeof setTimeout> | null = null;
    let isComponentMounted = true; // Track component mount status

    const setupListeners = async () => {
      if (user && isComponentMounted) {
        try {
          const linkedUids = await fetchLinkedUsers();

          // Set up real-time listener for tasks with a small delay
          setTimeout(() => {
            if (user && isComponentMounted) {
              tasksUnsubscribe = subscribeToTasksForUserAndLinked(
                user.uid,
                linkedUids,
                (fetchedTasks) => {
                  if (isComponentMounted) {
                    setTasks(fetchedTasks);
                    if (loading) {
                      setLoading(false);
                    }
                  }
                }
              );
            }
          }, 50); // Small delay to allow screen transition to complete

          // Add a slightly longer delay before setting up goals listener to reduce initial load
          setTimeout(() => {
            if (user && isComponentMounted) {
              // Set up real-time listener for goals
              goalsUnsubscribe = subscribeToGoalsForUserAndLinked(
                user.uid,
                linkedUids,
                (fetchedGoals) => {
                  if (isComponentMounted) {
                    setGoals(fetchedGoals);

                    // Initialize heatmap colors for new goals
                    setHeatmapColors(prev => {
                      const newColors: Record<string, {light: string, dark: string}> = {};
                      fetchedGoals.forEach(goal => {
                        if (!prev[goal.id]) {
                          newColors[goal.id] = getRandomBrightColor();
                        }
                      });
                      return { ...prev, ...newColors };
                    });

                    // Fetch progress data for all goals with another delay
                    if (fetchedGoals.length > 0) {
                      setTimeout(() => {
                        if (isComponentMounted) {
                          const goalIds = fetchedGoals.map(goal => goal.id);
                          // Add caching to prevent unnecessary fetches
                          getGoalsProgress(goalIds, user.uid).then(progressData => {
                            if (isComponentMounted) {
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
                          }).catch(error => {
                            console.error('Error fetching goals progress:', error);
                            // Set empty progress data on error to prevent infinite loading
                            if (isComponentMounted) {
                              const emptyProgress: Record<string, GoalProgress[]> = {};
                              fetchedGoals.forEach(goal => {
                                emptyProgress[goal.id] = [];
                              });
                              setGoalsProgress(emptyProgress);
                            }
                          });
                        }
                      }, 100); // Additional delay for progress data fetching
                    }
                  }
                }
              );
            }
          }, 200); // Longer delay to allow tasks to load first
        } catch (error) {
          console.error('Error setting up listeners:', error);
          if (isComponentMounted && loading) {
            setLoading(false);
          }
        }
      }
    };

    // Defer the heavy setup to next frame to allow screen transition to complete
    setupTimer = setTimeout(() => {
      setupListeners();
    }, 100); // Small delay to allow screen transition to complete

    // Add a fallback to ensure loading is set to false even if there are errors
    const fallbackTimer = setTimeout(() => {
      if (isComponentMounted && loading) {
        setLoading(false);
      }
    }, 3000); // 3 second fallback

    return () => {
      isComponentMounted = false; // Mark component as unmounted
      if (setupTimer) {
        clearTimeout(setupTimer);
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      if (tasksUnsubscribe) {
        tasksUnsubscribe();
      }
      if (goalsUnsubscribe) {
        goalsUnsubscribe();
      }
    };
  }, [user, loading]); // Removed fetchLinkedUsers from dependencies since it's memoized with useCallback

  // Memoize the normalized selected date to avoid recalculating in filter
  const normalizedSelectedDate = useMemo(() => {
    const date = new Date(selectedDate);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, [selectedDate]);

  // Filter tasks based on selected date
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Check if task matches selected date
      let matchesDate = true;
      if (task.dueDate) {
        const taskDate = task.dueDate.toDate();
        taskDate.setHours(0, 0, 0, 0);
        matchesDate = taskDate.getTime() === normalizedSelectedDate;
      }

      return matchesDate;
    });
  }, [tasks, normalizedSelectedDate]);

  const addTask = async () => {
    if (taskTitle.trim() && taskDate) {
      setAddingTask(true);
      try {
        // Create a new date object with the selected time
        const startDate = new Date(taskDate);
        startDate.setHours(taskStartHour, taskStartMinute, 0, 0);

        // Create end date with the end time
        const endDate = new Date(taskDate);
        endDate.setHours(taskEndHour, taskEndMinute, 0, 0);

        // If end time is before start time, move end date to next day
        if (endDate < startDate) {
          endDate.setDate(endDate.getDate() + 1);
        }

        // Format time strings
        const startTimeString = `${taskStartHour.toString().padStart(2, '0')}:${taskStartMinute.toString().padStart(2, '0')}`;
        const endTimeString = `${taskEndHour.toString().padStart(2, '0')}:${taskEndMinute.toString().padStart(2, '0')}`;

        // Optimistic update - add task to UI immediately
        const tempTask: Task = {
          id: `temp_${Date.now()}`,
          text: taskTitle.trim(),
          description: taskDescription,
          dueDate: Timestamp.fromDate(startDate),
          completed: false,
          createdBy: user?.uid || '',
          creatorName: user?.displayName || user?.name || user?.email || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          status: 'active',
          startTime: startTimeString,
          endTime: endTimeString,
          emoji: taskEmoji // Include emoji in creation
        };

        setTasks(prevTasks => [...prevTasks, tempTask]);
        const newTaskTitle = taskTitle.trim();
        const newTaskEmoji = taskEmoji; // Capture current emoji
        setIsTaskModalVisible(false);

        // Actually create the task
        await createTask({
          text: newTaskTitle,
          description: taskDescription,
          dueDate: Timestamp.fromDate(startDate),
          completed: false,
          createdBy: user?.uid || '',
          creatorName: user?.displayName || user?.name || user?.email || '',
          startTime: startTimeString,
          endTime: endTimeString,
          emoji: newTaskEmoji // Include emoji in creation
        });

        // Replace temporary task with actual task (real-time listener will handle this)
      } catch (error) {
        console.error('Error creating task:', error);
        Alert.alert('Error', 'Failed to create task. Please try again.');
        // Remove temporary task on error
        setTasks(prevTasks => prevTasks.filter(t => !t.id.startsWith('temp_')));
      } finally {
        setAddingTask(false);
      }
    }
  };

  const toggleTask = useCallback(async (taskItem: Task) => {
    try {
      // Optimistic update
      setTasks(tasks => tasks.map(task =>
        task.id === taskItem.id ? { ...task, completed: !task.completed } : task
      ));

      // Actually toggle the task
      await toggleTaskCompletion(taskItem.id, taskItem.completed);
      // Real-time listener will update the UI when the change is confirmed
    } catch (error) {
      console.error('Error toggling task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
      // Revert on error
      setTasks(tasks => tasks.map(task =>
        task.id === taskItem.id ? { ...task, completed: taskItem.completed } : task
      ));
    }
  }, []);

  const deleteTaskItem = useCallback(async (taskId: string) => {
    try {
      // Optimistic update
      const taskToDelete = tasks.find(task => task.id === taskId);
      setTasks(tasks => tasks.filter(task => task.id !== taskId));

      // Actually delete the task
      await deleteTask(taskId);
      // Real-time listener will update the UI when the change is confirmed
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert('Error', 'Failed to delete task. Please try again.');
      // In a real scenario, the listener would restore the task if deletion failed server-side
    }
  }, []);

  const openAddTaskModal = () => {
    setSelectedTask(null);
    const today = new Date();
    setTaskTitle('');
    setTaskDescription('');
    setTaskDate(today);
    setTaskEmoji('🎯'); // Reset to default emoji
    setTaskStartHour(0); // Reset to 00
    setTaskStartMinute(0); // Reset to 00
    setTaskEndHour(0); // Reset to 00
    setTaskEndMinute(0); // Reset to 00
    setIsTaskModalVisible(true);
    
    // Ensure time pickers reset to 00:00 with a small delay
    setTimeout(() => {
      setTaskStartHour(0);
      setTaskStartMinute(0);
      setTaskEndHour(0);
      setTaskEndMinute(0);
    }, 50);
  };

  const saveTaskEdits = async () => {
    if (selectedTask && user) {
      try {
        // Use the tempSelectedDate if it has been updated, otherwise use the existing dueDate
        const finalDueDate = tempSelectedDate;
        
        // Format time strings
        const startTimeString = `${taskStartHour.toString().padStart(2, '0')}:${taskStartMinute.toString().padStart(2, '0')}`;
        const endTimeString = `${taskEndHour.toString().padStart(2, '0')}:${taskEndMinute.toString().padStart(2, '0')}`;
        
        // Optimistic update
        const updatedTasks = tasks.map(task =>
          task.id === selectedTask.id
            ? { 
                ...task, 
                text: taskTitle, 
                description: taskDescription,
                dueDate: Timestamp.fromDate(finalDueDate),
                startTime: startTimeString,
                endTime: endTimeString,
                emoji: taskEmoji
              }
            : task
        );
        setTasks(updatedTasks);

        // Actually update the task
        await updateTask(selectedTask.id, {
          text: taskTitle,
          description: taskDescription,
          dueDate: Timestamp.fromDate(finalDueDate),
          startTime: startTimeString,
          endTime: endTimeString,
          emoji: taskEmoji
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

  const handleSaveTask = async () => {
    if (selectedTask) {
      await saveTaskEdits();
    } else {
      await addTask();
    }
    setIsTaskModalVisible(false);
    setSelectedTask(null);
  };

  const openTaskDetail = useCallback((taskItem: Task) => {
    setSelectedTask(taskItem);
    setTaskTitle(taskItem.text);      
    setTaskDescription(taskItem.description || '');
    setTaskEmoji(taskItem.emoji || '🎯');
    
    // Parse start time if it exists
    if (taskItem.startTime) {
      const [hour, minute] = taskItem.startTime.split(':').map(Number);
      setTaskStartHour(hour || 0);
      setTaskStartMinute(minute || 0);
    } else {
      setTaskStartHour(0);
      setTaskStartMinute(0);
    }
    
    // Parse end time if it exists
    if (taskItem.endTime) {
      const [hour, minute] = taskItem.endTime.split(':').map(Number);
      setTaskEndHour(hour || 0);
      setTaskEndMinute(minute || 0);
    } else {
      setTaskEndHour(0);
      setTaskEndMinute(0);
    }
    
    // Initialize tempSelectedDate with the task's due date or current date
    const dueDate = taskItem.dueDate?.toDate() || new Date();
    setTaskDate(dueDate);
    setTempSelectedDate(dueDate);
    setIsTaskModalVisible(true);
  }, []);

  
  
  // Reset time values when modal opens
  useEffect(() => {
    if (isTaskModalVisible && !selectedTask) {
      // Ensure time values are reset to 00:00 when modal opens for adding a task
      setTaskStartHour(0);
      setTaskStartMinute(0);
      setTaskEndHour(0);
      setTaskEndMinute(0);
    }
  }, [isTaskModalVisible, selectedTask]);

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

  // Helper functions for time pickers
  const getDayHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  const getMinutes = () => {
    return [0, 15, 30, 45];
  };

  // Render time picker with proper selection handling
  const renderTimePicker = useCallback((items: number[], selectedValue: number, onValueChange: (value: number) => void) => {
    return (
      <TimePicker 
        items={items} 
        selectedValue={selectedValue} 
        onValueChange={onValueChange} 
      />
    );
  }, []);

  const getStartOfWeek = (date: Date) => {
    const day = date.getDay();
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - day);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
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

  return ( 
    <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, backgroundColor: screenBackgroundColor }}>
        {/* Show loading indicator while initializing */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.electricBlue} />
            <Text style={{ marginTop: verticalScale(10), fontSize: responsiveFontSize(16), color: colors.text }}>
              Loading your habits...
            </Text>
          </View>
        ) : (
          <>
            {/* Animated Header */}
            <Animated.View
              style={[
                styles.headerBar,
                {
                  transform: [{ translateY: headerTranslateY }],
                  opacity: headerOpacity,
                  backgroundColor: backgroundColor,
                }
              ]}
            >
              <View style={styles.headerContent}>
                <Image source={require('../../assets/images/heartlogo.png')} style={styles.headerLogo} />
                <Text style={[styles.headerText, { color: getTextColorForBackground(backgroundColor) }]}>Habit Hearts</Text>
                <TouchableOpacity
                  style={[styles.headerAddButton, { backgroundColor: getButtonColor(themePalette.primary), shadowColor: getButtonColor(themePalette.primary) }]}
                  onPress={openAddTaskModal}
                >
                  <Icon name="add" size={responsiveFontSize(20)} color={colors.textLight} />
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
              <View style={styles.weekSelectorContainer}>
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
                    ref={monthScrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled={false}
                    decelerationRate="fast"
                    snapToInterval={verticalScale(44) + scale(8)} // day circle width + margin
                    style={styles.weekDaysContainer}
                    contentContainerStyle={styles.weekDaysContentContainer}
                  >
                    {Array.from({ length: 30 }, (_, i) => {
                      // Render only 30 days instead of 60 for better performance
                      // Center around the selected date
                      const centerIndex = 15; // Middle of the 30 days
                      const day = new Date(selectedDate);
                      day.setDate(selectedDate.getDate() + (i - centerIndex));
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
                            <View style={[
                              styles.dayInnerCircle,
                              isSelected && styles.selectedDayInnerCircle,
                              isTodayDate && styles.todayDayInnerCircle
                            ]}>
                              <Text style={[
                                styles.dayNumber,
                                isSelected && styles.selectedDayNumber,
                                isTodayDate && styles.todayDayNumber
                              ]}>
                                {day.getDate()}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
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
              </View>

              {/* Today Button */}
              <View style={{
                flexDirection: 'row',
                alignSelf: 'center',
                alignItems: 'center',
                paddingHorizontal: scale(16),
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: moderateScale(24),
                marginBottom: verticalScale(20),
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.8)',
              }}>
                <Icon name="favorite" size={responsiveFontSize(18)} color={colors.hotPink} />
                <Text style={[styles.hiText, { marginLeft: scale(8) }]}>Hi, {user?.name || 'User'}, </Text>
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
                  <Text style={[styles.hiText, { textDecorationLine: 'none', fontWeight: '800' }]}>
                    today is 
                  </Text>
                  <Text style={[styles.hiText, { 
                    textDecorationLine: 'underline', 
                    marginLeft: scale(6),
                    fontWeight: '900'
                  }]}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                  <Icon name="calendar-today" size={responsiveFontSize(16)} color={colors.electricBlue} style={{ marginLeft: scale(6) }} />
                </TouchableOpacity>
              </View>

              {/* Task List */}
              <View style={styles.taskListContainer}>
                {filteredTasks
                  .slice()
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
                      const { light: lightColor, dark: darkColor } = heatmapColors[goal.id] || { light: colors.electricBlueLight, dark: colors.electricBlueDark };
                      const goalProgress = goalsProgress[goal.id] || [];

                      return (
                        <HeatmapItem
                          goal={goal}
                          goalId={goal.id}
                          lightColor={lightColor}
                          darkColor={darkColor}
                          goalProgress={goalProgress}
                          onUpdateProgress={(goalId, newProgress) => {
                            setGoalsProgress(prev => ({
                              ...prev,
                              [goalId]: newProgress
                            }));
                          }}
                          user={user}
                          heatmapDays={heatmapDaysRef.current || []}
                        />
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
          </>
        )}

        {/* Task Modal */}
        <Modal
          visible={isTaskModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setIsTaskModalVisible(false);
            setSelectedTask(null);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {selectedTask ? 'Edit Event' : `Add Task for ${taskDate.toDateString()}`}
              </Text>
              <TextInput
                style={[globalStyles.input, { marginBottom: verticalScale(8), marginHorizontal: moderateScale(6) }]}
                placeholder="Task title"
                value={taskTitle}
                onChangeText={setTaskTitle}
                autoFocus={true}
                editable={!addingTask}
              />

              <TextInput
                style={[globalStyles.input, { marginBottom: verticalScale(8), marginHorizontal: moderateScale(6) }]}
                placeholder="Task description (optional)"
                value={taskDescription}
                onChangeText={setTaskDescription}
                multiline
                textAlignVertical="top"
              />

              {/* Emoji Selection */}
              <View style={styles.emojiSelectionContainer}>
                <Text style={styles.emojiSelectionTitle}>Choose an Emoji:</Text>
                <ScrollView
                  showsHorizontalScrollIndicator={false}
                  style={styles.emojiScrollView}
                  contentContainerStyle={styles.emojiScrollContent}
                  horizontal={true}
                >
                  <View style={styles.emojiRowContainer}>
                    <View style={styles.emojiRow}>
                      {[
                        // Row 1 - Events, Activities, Objects
                        '🎯', '🎉', '🥳', '🎊', '🎂', '🎁', '🎈', '🎆', '🎇', '🧨',
                        '✨', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎬', '🎭', '🎨',
                        '🎪', '🎫', '🎟️', '🎵', '🎶', '🎸', '🎹', '🎺', '🎻', '🥁',
                        '🎤', '🎧', '🎮', '🎲', '♟️', '⚽', '🏀', '🏈', '⚾', '🎾',
                        '🏐', '🏉', '🎱', '🪀', '🏓', '🏸', '🥅', '⛳', '🪁', '🏹',
                        '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '⛸️', '🥌', '🎿',
                        '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️',
                        '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆'
                      ].map((emoji, index) => (
                        <TouchableOpacity
                          key={`row1-${emoji}-${index}`}
                          style={[
                            styles.emojiOption,
                            taskEmoji === emoji && styles.selectedEmoji
                          ]}
                          onPress={() => setTaskEmoji(emoji)}
                        >
                          <Text style={styles.emojiOptionText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.emojiRow}>
                      {[
                        // Row 2 - Food, Nature, Faces, Hearts
                        '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
                        '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
                        '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐',
                        '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇',
                        '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪',
                        '🥗', '🍿', '🍦', '🍩', '🍪', '🍫', '🍬', '🍭', '🍮', '🎂',
                        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
                        '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚'
                      ].map((emoji, index) => (
                        <TouchableOpacity
                          key={`row2-${emoji}-${index}`}
                          style={[
                            styles.emojiOption,
                            taskEmoji === emoji && styles.selectedEmoji
                          ]}
                          onPress={() => setTaskEmoji(emoji)}
                        >
                          <Text style={styles.emojiOptionText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </View>

              {/* Time Selection */}
              <View style={styles.timeSelectionContainer}>
                <Text style={styles.timeSelectionTitle}>Select Time:</Text>
                <View style={styles.timePickerHeaders}>
                  <Text style={[styles.timePickerLabel, styles.timePickerHeader]}>From:</Text>
                  <Text style={[styles.timePickerLabel, styles.timePickerHeader]}>To:</Text>
                </View>
                <View style={styles.timePickerLayout}>
                  <View style={styles.timePickerGroup}>
                    <TimePicker items={getDayHours()} selectedValue={taskStartHour} onValueChange={setTaskStartHour} />
                    <Text style={styles.timePickerSeparator}>:</Text>
                    <TimePicker items={getMinutes()} selectedValue={taskStartMinute} onValueChange={setTaskStartMinute} />
                  </View>
                  <View style={styles.timePickerGroup}>
                    <TimePicker items={getDayHours()} selectedValue={taskEndHour} onValueChange={setTaskEndHour} />
                    <Text style={styles.timePickerSeparator}>:</Text>
                    <TimePicker items={getMinutes()} selectedValue={taskEndMinute} onValueChange={setTaskEndMinute} />
                  </View>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[globalStyles.button, globalStyles.outlineButton, styles.modalButton]}
                  onPress={() => {
                    setIsTaskModalVisible(false);
                    setSelectedTask(null);
                  }}
                  disabled={addingTask}
                >
                  <Text style={[globalStyles.buttonText, globalStyles.outlineButtonText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalStyles.button, styles.modalButton, addingTask && globalStyles.disabledButton, {backgroundColor: getButtonColor(themePalette.primary)}]}
                  onPress={handleSaveTask}
                  disabled={!taskTitle.trim() || addingTask}
                >
                  {addingTask ? (
                    <ActivityIndicator color={colors.textLight} size="small" />
                  ) : (
                    <Text style={globalStyles.buttonText}>{selectedTask ? 'Update Event' : 'Add Task'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Task Detail Date Picker Modal */}
        <Modal
          visible={showTaskDetailDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTaskDetailDatePicker(false)}
        >
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => setShowTaskDetailDatePicker(false)}
                  style={styles.pickerCloseButton}
                >
                  <Icon name="close" size={responsiveFontSize(20)} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity onPress={() => {
                    const newDate = new Date(tempSelectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setTempSelectedDate(newDate);
                  }}>
                    <Icon name="chevron-left" size={responsiveFontSize(24)} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthYear}>
                    {tempSelectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    const newDate = new Date(tempSelectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setTempSelectedDate(newDate);
                  }}>
                    <Icon name="chevron-right" size={responsiveFontSize(24)} color={colors.text} />
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
                  onPress={() => setShowTaskDetailDatePicker(false)}
                >
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickerConfirmButton}
                  onPress={() => {
                    setTaskDate(tempSelectedDate);
                    setShowTaskDetailDatePicker(false);
                  }}
                >
                  <Text style={styles.pickerConfirmText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: verticalScale(76),
    flexGrow: 1,
  },
  taskListContainer: {
    paddingHorizontal: scale(16),
  },
  headerBar: {
    backgroundColor: colors.surface,
    paddingVertical: verticalScale(12),
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
    borderRadius: moderateScale(12),
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    minWidth: verticalScale(36),
    minHeight: verticalScale(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: verticalScale(5.5),
  },
  headerLogo: {
    width: verticalScale(30),
    height: verticalScale(30),
    borderRadius: verticalScale(15),
    marginVertical: verticalScale(2),
  },
  headerText: {
    color: colors.text,
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    paddingHorizontal: scale(12),
    flex: 1,
    textAlign: 'center',
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
  heatmapNavigation: {
    flexDirection: 'row',
  },
  heatmapNavButton: {
    marginHorizontal: scale(4),
  },
  heatmapNavButtonCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: colors.electricBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapNavButtonText: {
    color: colors.textLight,
    fontSize: responsiveFontSize(20),
    fontWeight: '700',
  },
  dailyCheckButton: {
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(30),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(18),
    borderWidth: 1,
  },
  dailyCheckButtonText: {
    fontSize: responsiveFontSize(15),
    fontWeight: '800',
    marginLeft: scale(8),
  },
  goalHeatmapContainer: {
    width: '100%',
    marginBottom: verticalScale(16),
  },
  goalHeatmap: {
    borderRadius: moderateScale(20),
    paddingVertical: scale(16),
    paddingHorizontal: scale(16),
    height: '100%',
    // Flat surface with no shadow
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  goalName: {
    fontSize: responsiveFontSize(19),
    fontWeight: '800',
    maxWidth: '70%',
    lineHeight: responsiveFontSize(24),
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  streakText: {
    color: colors.text,
    fontSize: responsiveFontSize(13),
    fontWeight: '800',
    marginLeft: scale(6),
  },
  progressContainer: {
    marginBottom: verticalScale(16),
  },
  progressBarContainer: {
    height: verticalScale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: moderateScale(4),
    marginVertical: verticalScale(6),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: moderateScale(4),
  },
  progressText: {
    fontSize: responsiveFontSize(13),
    textAlign: 'right',
    marginBottom: verticalScale(4),
    fontWeight: '600',
  },
  heatmapCalendar: {
    borderRadius: moderateScale(16),
    padding: scale(12),
    height: 200,
  },
  heatmapWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(4),
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(6),
  },
  heatmapWeekDayText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '700',
    width: '14%',
    textAlign: 'center',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: verticalScale(8),
  },
  heatmapDateCell: {
    width: '14%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: scale(2),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    // Flat surface with no shadow
  },
  currentMonthCell: {
  },
  otherMonthCell: {
    opacity: 0.4,
  },
  heatmapDateText: {
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
  },
  currentMonthDateText: {
  },
  otherMonthDateText: {
  },
  todayDateCell: {
    // Flat surface with no shadow
  },
  todayDateText: {
    fontWeight: '800',
  },
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
    paddingHorizontal: scale(16),
    marginTop: verticalScale(20),
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorBox: {
    width: scale(16),
    height: scale(16),
    borderRadius: moderateScale(4),
    marginRight: scale(8),
  },
  legendMissed: {
    backgroundColor: colors.error,
  },
  legendDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  legendText: {
    fontSize: responsiveFontSize(13),
    color: colors.text,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: moderateScale(30),
    marginHorizontal: scale(16),
    marginVertical: verticalScale(4),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
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
    paddingHorizontal: 0,
    marginTop: verticalScale(12),
    width: '100%',
  },
  daysScrollViewContainer: {
    flex: 1,
    marginHorizontal: 0,
    position: 'relative',
    marginTop: verticalScale(-10),
  },
  weekDaysContainer: {
    flex: 1,
    marginBottom: verticalScale(12),
  },
  weekDaysContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
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
    marginHorizontal: scale(4),
    marginVertical: verticalScale(4),
  },
  monthIndicator: {
    fontSize: responsiveFontSize(11),
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: verticalScale(4),
  },
  dayCircle: {
    width: verticalScale(44),
    height: verticalScale(54),
    borderRadius: moderateScale(22),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: verticalScale(6),
  },
  dayInnerCircle: {
    width: verticalScale(32),
    height: verticalScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedDayInnerCircle: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  todayDayInnerCircle: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  selectedDayCircle: {
    backgroundColor: colors.electricBlue,
    borderColor: colors.electricBlue,
  },
  todayDayCircle: {
    backgroundColor: colors.hotPink,
    borderColor: colors.hotPink,
  },
  dayName: {
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayNumber: {
    fontSize: responsiveFontSize(12),
    fontWeight: '800',
    color: colors.text,
  },
  selectedDayNumber: {
    color: colors.text,
  },
  todayDayNumber: {
    color: colors.text,
  },
  selectedDayText: {
    color: colors.textLight,
    fontWeight: '700',
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
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
    fontSize: responsiveFontSize(12),
    fontWeight: '900',
  },
  runnerContainer: {
    position: 'absolute',
    top: verticalScale(120), // Position it below the date scroller
    zIndex: 2000,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: moderateScale(12),
  },
  // Date/Time Picker Styles
  pickerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    width: '90%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
  },
  pickerCloseButton: {
    padding: scale(4),
  },
  calendarContainer: {
    padding: scale(16),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  calendarMonthYear: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.text,
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  calendarDayHeader: {
    width: '14%',
    textAlign: 'center',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDay: {
    width: '14%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: scale(2),
    borderRadius: moderateScale(8),
  },
  currentMonthDay: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otherMonthDay: {
    opacity: 0.4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedDay: {
    backgroundColor: colors.electricBlue,
    borderColor: colors.electricBlue,
  },
  calendarDayText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  currentMonthDayText: {
    color: colors.text,
  },
  otherMonthDayText: {
    color: colors.textSecondary,
  },
  datePickerContainer: {
    alignItems: 'center',
    marginVertical: verticalScale(16),
  },
  datePicker: {
    width: '100%',
    height: verticalScale(150),
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: scale(16),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickerCancelButton: {
    flex: 1,
    padding: moderateScale(12),
    alignItems: 'center',
    marginRight: scale(8),
    borderRadius: moderateScale(8),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerConfirmButton: {
    flex: 1,
    padding: moderateScale(12),
    alignItems: 'center',
    marginLeft: scale(8),
    borderRadius: moderateScale(8),
    backgroundColor: colors.electricBlue,
  },
  pickerCancelText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.text,
  },
  pickerConfirmText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.textLight,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: responsiveFontSize(17),
    fontWeight: '600',
    marginBottom: verticalScale(12),
    textAlign: 'center',
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(12),
    paddingHorizontal: moderateScale(6),
  },
  modalButton: {
    flex: 1,
    marginHorizontal: scale(6),
    paddingVertical: verticalScale(8),
    minHeight: 0,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editTitleInput: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(16),
    minHeight: verticalScale(40),
  },
  editDescriptionInput: {
    fontSize: responsiveFontSize(15),
    color: colors.text,
    textAlignVertical: 'top',
    paddingVertical: verticalScale(12),
    minHeight: verticalScale(80),
    maxHeight: verticalScale(120),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: verticalScale(16),
  },
  // Emoji Selection Styles
  emojiSelectionContainer: {
  },
  emojiSelectionTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emojiScrollView: {
    maxHeight: verticalScale(140), // Increased height for 2 rows with more emojis
  },
  emojiScrollContent: {
  },
  emojiScrollWrapper: {
    position: 'relative',
  },
  emojiRowContainer: {
    flexDirection: 'column',
  },
  emojiRow: {
    flexDirection: 'row',
    marginVertical: verticalScale(4),
  },
  emojiOption: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(10),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    margin: scale(2),
  },
  selectedEmoji: {
    backgroundColor: colors.electricBlueLight,
    borderColor: colors.electricBlue,
  },
  emojiOptionText: {
    fontSize: responsiveFontSize(20),
  },
  // Time Selection Styles
  timeSelectionContainer: {
    paddingHorizontal: moderateScale(8),
    width: '100%',
    paddingTop: verticalScale(4),
  },
  timeSelectionTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
    color: colors.text,
    marginBottom: verticalScale(6),
    textAlign: 'center',
  },
  timePickerHeaders: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: scale(20),
    marginBottom: -verticalScale(20),
    zIndex: 100,
    position: 'relative',
    height: verticalScale(30),
  },
  timePickerHeader: {
    flex: 1,
    textAlign: 'center',
    backgroundColor: '#f8f8f8ff',
    paddingVertical: verticalScale(4),
    marginHorizontal: moderateScale(14),
    borderRadius: moderateScale(8),
    minWidth: scale(80),
    zIndex: 100,
    position: 'relative',
  },
  timePickerLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: moderateScale(20),
    marginTop: verticalScale(0),
  },
  timePickerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(90),
  },
  timePickerSeparator: {
    fontSize: responsiveFontSize(20),
    color: colors.text,
    marginHorizontal: scale(2),
    fontWeight: '600',
    lineHeight: responsiveFontSize(20),
    textAlignVertical: 'center',
    alignSelf: 'center',
  },
  timePickerLabel: {
    fontSize: responsiveFontSize(14),
    color: colors.text,
    fontWeight: '500',
  },
  dateDisplay: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(12),
    padding: scale(12),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateDisplayText: {
    fontSize: responsiveFontSize(16),
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedDateTimeContainer: {
    marginBottom: verticalScale(8),
  },
  selectedDateTimeText: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.electricBlue,
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  taskDetailDateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(MainHomeScreen);