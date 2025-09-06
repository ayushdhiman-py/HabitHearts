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
import { responsiveFontSize, scale, verticalScale, moderateScale } from '../../utils/responsive';
import { CalendarEvent } from '../../services/calendarService';
import { swipeableManager } from '../../utils/swipeableManager';

interface EnhancedEventItemProps {
  item: CalendarEvent;
  user: any;
  onOpenEventDetail: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onToggleEvent: (event: CalendarEvent) => void;
}

// Function to get event status based on time and completion
const getEventStatus = (eventDate: Date, completed?: boolean): 'completed' | 'overdue' | 'dueSoon' | 'dueInFewDays' | 'later' => {
  // If event is completed, show completed status
  if (completed) return 'completed';
  
  const now = new Date();
  const timeDiff = eventDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  // If event is in the past and not completed, it's overdue
  if (hoursDiff < 0) return 'overdue';
  
  // If event is within 5 hours, it's due soon
  if (hoursDiff <= 5) return 'dueSoon';
  
  // If event is within 24 hours, it's due in a few days
  if (hoursDiff <= 24) return 'dueInFewDays';
  
  return 'later';
};

const EnhancedEventItem: React.FC<EnhancedEventItemProps> = ({ 
  item, 
  user, 
  onOpenEventDetail, 
  onDeleteEvent,
  onToggleEvent
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

  // Handle both string and Date formats for the date property with error handling
  let eventDate: Date;
  let eventEndDate: Date | null = null;

  try {
    if (item.date && typeof item.date === 'object' && 'seconds' in item.date) {
      // It's a Firebase Timestamp
      eventDate = new Date((item.date as any).seconds * 1000);
    } else if (item.date instanceof Date) {
      eventDate = item.date;
    } else if (typeof item.date === 'string') {
      // Try different parsing approaches
      if (item.date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        // ISO string format
        eventDate = new Date(item.date);
      } else if (item.date.match(/^\d{4}-\d{2}-\d{2}/)) {
        // Date-only string format (YYYY-MM-DD)
        const parts = item.date.split('-');
        if (parts.length === 3) {
          eventDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          throw new Error('Invalid date format');
        }
      } else {
        // Try to parse as a general date string
        eventDate = new Date(item.date);
      }
    } else {
      // Fallback to current date if we can't parse the date
      eventDate = new Date();
    }

    // Check if the date is valid
    if (isNaN(eventDate.getTime())) {
      eventDate = new Date();
    }

    // Handle end date if it exists
    if (item.endDate) {
      if (item.endDate && typeof item.endDate === 'object' && 'seconds' in item.endDate) {
        // It's a Firebase Timestamp
        eventEndDate = new Date((item.endDate as any).seconds * 1000);
      } else if (item.endDate instanceof Date) {
        eventEndDate = item.endDate;
      } else if (typeof item.endDate === 'string') {
        // Try different parsing approaches
        if (item.endDate.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          // ISO string format
          eventEndDate = new Date(item.endDate);
        } else if (item.endDate.match(/^\d{4}-\d{2}-\d{2}/)) {
          // Date-only string format (YYYY-MM-DD)
          const parts = item.endDate.split('-');
          if (parts.length === 3) {
            eventEndDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          }
        } else {
          // Try to parse as a general date string
          eventEndDate = new Date(item.endDate);
        }
      }

      // Validate end date
      if (eventEndDate && isNaN(eventEndDate.getTime())) {
        eventEndDate = null;
      }
    }
  } catch (error) {
    eventDate = new Date();
    eventEndDate = null;
  }

  const isOwnEvent = item.createdBy === user.uid;
  const eventStatus = getEventStatus(eventDate, item.completed);

  // Get border color based on event status
  const getEventBorderColor = () => {
    switch (eventStatus) {
      case 'completed':
        return colors.electricGreenDark; // Same as completed tasks
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

  // Format time for display
  const timeString = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTimeString = eventEndDate ? eventEndDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

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
              onOpenEventDetail(item);
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
                'Delete Event',
                'Are you sure you want to delete this event?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onDeleteEvent(item.id) }
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

  const borderColor = getEventBorderColor();

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
        style={[styles.eventItem, !isOwnEvent && styles.sharedEventItem, { borderLeftColor: borderColor }]}
        onPress={() => onToggleEvent(item)}
        activeOpacity={0.7}
      >
        <View style={styles.eventContent}>
          {/* Checkbox for completion */}
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, { borderColor: borderColor }]}>
              {item.completed && (
                <Icon 
                  name="check" 
                  size={responsiveFontSize(16)} 
                  color={borderColor} 
                />
              )}
            </View>
          </View>
          
          {/* Emoji indicator */}
          <View style={styles.emojiContainer}>
            <Text style={[styles.emojiText, item.completed && styles.completedEvent]}>{item.emoji || '🎯'}</Text>
          </View>
          
          <View style={styles.eventTextContainer}>
            <Text 
              style={[styles.eventTitle, item.completed && styles.completedEvent]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            
            <Text style={[styles.eventTime, item.completed && styles.completedEvent]}>
              {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : timeString}
            </Text>
            
            {item.createdBy !== user.uid && (
              <Text style={[styles.creatorText, item.completed && styles.completedEvent]} numberOfLines={1}>
                by {item.creatorName || 'Someone'}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.detailButton}
            onPress={(e) => {
              e.stopPropagation();
              // Open swipe actions instead of opening event detail
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
  eventItem: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginBottom: verticalScale(8),
    borderLeftWidth: 3,
    borderLeftColor: colors.electricBlue,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sharedEventItem: {
    borderLeftColor: colors.electricBlue,
  },
  eventContent: {
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
  emojiContainer: {
    marginRight: scale(10),
    width: scale(24),
    height: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: responsiveFontSize(16),
  },
  eventTextContainer: {
    flex: 1,
    marginRight: scale(8),
  },
  eventTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
    color: colors.text,
    marginBottom: verticalScale(4),
  },
  completedEvent: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  eventTime: {
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    fontWeight: '400',
  },
  creatorText: {
    fontSize: responsiveFontSize(11),
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: verticalScale(4),
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

export default memo(EnhancedEventItem);