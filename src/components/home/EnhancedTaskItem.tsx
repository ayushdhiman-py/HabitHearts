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
    if (item.completed) return colors.success;
    
    const status = getDueDateStatus(item.dueDate);
    switch (status) {
      case 'overdue':
        return colors.error;
      case 'dueSoon':
        return colors.orange;
      case 'dueInFewDays':
        return colors.yellow;
      default:
        return colors.primary;
    }
  };

  const getBackgroundColor = () => {
    if (item.completed) return colors.successLight;
    
    const status = getDueDateStatus(item.dueDate);
    switch (status) {
      case 'overdue':
        return colors.errorLight;
      case 'dueSoon':
        return colors.orangeLight;
      case 'dueInFewDays':
        return colors.yellowLight;
      default:
        return colors.surface;
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
  const backgroundColor = getBackgroundColor();

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
      <View style={[styles.taskItem, { backgroundColor }]}>
        <View style={styles.taskContent}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={(e) => {
              e.stopPropagation();
              onToggleTask(item);
            }}
          >
            <View style={[styles.checkbox, { borderColor: priorityColor }]}>
              {item.completed && (
                <Icon 
                  name="check" 
                  size={responsiveFontSize(16)} 
                  color={priorityColor} 
                />
              )}
            </View>
          </TouchableOpacity>
          
          <View style={styles.taskTextContainer}>
            <Text 
              style={[
                styles.taskText, 
                item.completed && styles.completedTask,
                { borderLeftColor: priorityColor }
              ]}
            >
              {item.text}
            </Text>
            
            {item.description && (
              <Text style={styles.taskDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
            
            {item.dueDate && (
              <Text style={styles.dueDateText}>
                Due: {item.dueDate.toDate().toLocaleDateString()}
              </Text>
            )}
            
            {item.createdBy !== user?.uid && (
              <Text style={styles.creatorText}>
                by {item.creatorName}
              </Text>
            )}
          </View>
          
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
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    borderRadius: 12,
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
  },
  checkboxContainer: {
    marginRight: scale(12),
  },
  checkbox: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  taskTextContainer: {
    flex: 1,
    marginRight: scale(8),
  },
  taskText: {
    fontSize: responsiveFontSize(16),
    color: colors.text,
    fontWeight: '500',
    lineHeight: responsiveFontSize(22),
    borderLeftWidth: 3,
    paddingLeft: scale(8),
    marginBottom: verticalScale(2),
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  taskDescription: {
    fontSize: responsiveFontSize(13),
    color: colors.textSecondary,
    lineHeight: responsiveFontSize(18),
    marginBottom: verticalScale(2),
  },
  dueDateText: {
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: verticalScale(2),
  },
  creatorText: {
    fontSize: responsiveFontSize(11),
    color: colors.secondary,
    fontWeight: '600',
  },
  detailButton: {
    padding: scale(4),
  },
  rightActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: scale(10),
  },
  actionButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: scale(5),
  },
  editButton: {
    backgroundColor: colors.secondary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
});

export default memo(EnhancedTaskItem);
