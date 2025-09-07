import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import colors from '../../theme/colors';
import { responsiveFontSize, scale, verticalScale } from '../../utils/responsive';
import { Task } from '../../services/taskService';
import { swipeableManager } from '../../utils/swipeableManager';

interface EnhancedTaskItemProps {
  item: Task;
  user: any;
  onOpenTaskDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (task: Task) => void;
}

const getDueDateStatus = (dueDate: any): 'overdue' | 'dueSoon' | 'dueInFewDays' | 'later' => {
  if (!dueDate) {
    return 'later';
  }
  const date = dueDate.toDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const timeDiff = date.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  if (daysDiff < 0) return 'overdue';
  if (daysDiff <= 1) return 'dueSoon';
  if (daysDiff <= 3) return 'dueInFewDays';
  return 'later';
};

// Function to calculate time remaining
const getTimeRemaining = (dueDate: any) => {
  if (!dueDate) return null;
  
  const dueDateTime = dueDate.toDate();
  const now = new Date();
  const timeDiff = dueDateTime.getTime() - now.getTime();
  
  // If overdue
  if (timeDiff <= 0) {
    return 'Overdue';
  }
  
  // Calculate days, hours, minutes remaining
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  // If due in less than 1 hour, show minutes
  if (days === 0 && hours === 0) {
    return `${minutes}m`;
  }
  
  // If due in less than 1 day, show hours
  if (days === 0) {
    return `${hours}h ${minutes}m`;
  }
  
  // Show days
  return `${days}d ${hours}h`;
};

const EnhancedTaskItem: React.FC<EnhancedTaskItemProps> = ({ 
  item, 
  user, 
  onOpenTaskDetail, 
  onDeleteTask,
  onToggleTask
}) => {
  const swipeableRef = useRef<Swipeable>(null);

  useEffect(() => {
    // Register this swipeable with the manager
    if (swipeableRef.current) {
      swipeableManager.register(item.id, swipeableRef.current);
    }

    // Unregister on unmount
    return () => {
      swipeableManager.unregister(item.id);
    };
  }, [item.id]);

  const getTaskPriorityColor = () => {
    if (item.completed) return colors.electricGreenDark; // Using the dark green from the theme
    
    const status = getDueDateStatus(item.dueDate);
    switch (status) {
      case 'overdue':
        return colors.error;
      case 'dueSoon':
        return colors.vibrantOrange;
      case 'dueInFewDays':
        return colors.sunnyYellow;
      default:
        return colors.electricBlue;
    }
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [75, 0],
    });

    return (
      <View style={styles.rightActionsContainer}>
        <Animated.View style={{ transform: [{ translateX: trans }] }}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => {
              swipeableRef.current?.close();
              onOpenTaskDetail(item);
            }}
          >
            <Icon name="edit" size={responsiveFontSize(20)} color={colors.text} />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ transform: [{ translateX: trans }] }}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => {
              swipeableRef.current?.close();
              Alert.alert(
                'Delete Task',
                'Are you sure you want to delete this task?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onDeleteTask(item.id) }
                ]
              );
            }}
          >
            <Icon name="delete" size={responsiveFontSize(20)} color={colors.text} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const priorityColor = getTaskPriorityColor();
  const timeRemaining = getTimeRemaining(item.dueDate);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      onSwipeableOpen={() => {
        // Close all other swipeables when this one opens
        swipeableManager.closeAllExcept(item.id);
      }}
    >
      <TouchableOpacity 
        style={styles.taskItem}
        onPress={() => onToggleTask(item)}
        activeOpacity={0.7}
      >
        <View style={styles.taskContent}>
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, { borderColor: priorityColor }]}>
              {item.completed && (
                <Icon 
                  name="check" 
                  size={responsiveFontSize(16)} 
                  color={priorityColor} 
                />
              )}
            </View>
          </View>
          
          <View style={styles.taskTextContainer}>
            <View style={styles.taskHeader}>
              {/* Display emoji if available */}
              {item.emoji && (
                <Text style={styles.taskEmoji}>{item.emoji}</Text>
              )}
              <Text 
                style={[
                  styles.taskText, 
                  item.completed && styles.completedTask
                ]}
                numberOfLines={1}
              >
                {item.text}
              </Text>
            </View>
            
            {item.description && (
              <Text style={[styles.taskDescription]} numberOfLines={1}>
                {item.description}
              </Text>
            )}
            
            {/* Display time if available */}
            {item.startTime && item.endTime && (
              <Text style={styles.taskTime}>
                {item.startTime} - {item.endTime}
              </Text>
            )}
          </View>
          
          {/* Due time indicator */}
          {item.dueDate && timeRemaining && (
            <View style={styles.timeIndicator}>
              <Text style={[styles.timeText, { color: priorityColor }]}>
                {timeRemaining}
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.detailButton}
            onPress={(e) => {
              e.stopPropagation();
              // Open swipe actions instead of opening task detail
              swipeableRef.current?.openRight();
            }}
          >
            <Icon 
              name="chevron-right" 
              size={responsiveFontSize(20)} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    backgroundColor: colors.surface,
    marginBottom: verticalScale(6),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: scale(10),
  },
  checkbox: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  taskTextContainer: {
    flex: 1,
    marginRight: scale(8),
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskEmoji: {
    fontSize: responsiveFontSize(16),
    marginRight: scale(6),
  },
  taskText: {
    fontSize: responsiveFontSize(15),
    color: colors.text,
    fontWeight: '500',
    lineHeight: responsiveFontSize(20),
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  taskDescription: {
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    lineHeight: responsiveFontSize(16),
    marginTop: verticalScale(2),
  },
  taskTime: {
    fontSize: responsiveFontSize(11),
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: verticalScale(2),
  },
  timeIndicator: {
    marginRight: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: responsiveFontSize(10),
    fontWeight: '600',
  },
  detailButton: {
    padding: scale(2),
  },
  rightActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: scale(8),
  },
  actionButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: scale(4),
  },
  editButton: {
    backgroundColor: colors.hotPink,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
});

export default memo(EnhancedTaskItem);