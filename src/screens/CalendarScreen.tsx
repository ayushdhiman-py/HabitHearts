import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getLinkedUsers } from '../services/userService';
import colors from '../theme/colors';
import globalStyles from '../theme/styles';
import { responsiveFontSize, scale, verticalScale, moderateScale, widthPercentage, heightPercentage } from '../utils/responsive';
import { useStatusBar } from '../context/StatusBarContext';
import { getTextColorForBackground } from '../utils/colorUtils';
import { getButtonColor } from '../utils/buttonUtils';
import SafeStatusBar from '../components/SafeStatusBar';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { CalendarEvent, createCalendarEvent, deleteCalendarEvent, subscribeToCalendarEventsForUserAndLinked, updateCalendarEvent } from '../services/calendarService';
import notificationService from '../services/notificationService';
import EnhancedEventItem from '../components/home/EnhancedEventItem';
import { TextInput } from 'react-native-gesture-handler';

interface LinkedUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  uniqueCode: string;
  linkedUsers: string[];
  createdAt: any;
  updatedAt: any;
  status: string;
}

interface AuthUser {
  uid: string;
  displayName?: string;
  email?: string;
}

// Memoize the component to prevent unnecessary re-renders
const CalendarScreen = () => {
  console.log(`[Perf] CalendarScreen render start: ${Date.now()}`);
  const { screenBackgroundColor, backgroundColor, themePalette } = useStatusBar();
  const { user } = useAuth() as { user: AuthUser };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingEvent, setAddingEvent] = useState(false);
  const [linkedUserUids, setLinkedUserUids] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯'); // Default emoji
  const [startHour, setStartHour] = useState(0); // Default start hour (0-23)
  const [startMinute, setStartMinute] = useState(0); // Default start minute (0,15,30,45)
  const [endHour, setEndHour] = useState(0); // Default end hour (0-23)
  const [endMinute, setEndMinute] = useState(0); // Default end minute (0,15,30,45)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventEmoji, setEditEventEmoji] = useState('🎯');
  const [editStartHour, setEditStartHour] = useState(0);
  const [editStartMinute, setEditStartMinute] = useState(0);
  const [editEndHour, setEditEndHour] = useState(0);
  const [editEndMinute, setEditEndMinute] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      InteractionManager.runAfterInteractions(() => {
        console.log(`[Perf] CalendarScreen interactive: ${Date.now()}`);
      });
      return () => {
        console.log(`[Perf] CalendarScreen blur/navigate away: ${Date.now()}`);
      };
    }, [])
  );

  // Define emoji arrays as constants to prevent recreation on each render
  const row1Emojis = [
    // Row 1 - Events, Activities, Objects
    '🎯', '🎉', '🥳', '🎊', '🎂', '🎁', '🎈', '🎆', '🎇', '🧨',
    '✨', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎬', '🎭', '🎨',
    '🎪', '🎫', '🎟️', '🎵', '🎶', '🎸', '🎹', '🎺', '🎻', '🥁',
    '🎤', '🎧', '🎮', '🎲', '♟️', '⚽', '🏀', '🏈', '⚾', '🎾',
    '🏐', '🏉', '🎱', '🪀', '乒乓球', '🏸', '🥅', '⛳', '🪁', '🏹',
    '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '⛸️', '🥌', '🎿',
    '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️',
    '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆'
  ];

  const row2Emojis = [
    // Row 2 - Food, Nature, Faces, Hearts
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
    '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
    '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐',
    '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇',
    '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪',
    '🥗', '🍿', '🍦', '🍩', '🍪', '🍫', '🍬', '🍭', '🍮', '🎂',
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚'
  ];

  // Memoized callbacks for time picker value changes
  const handleStartHourChange = useCallback((value: number) => {
    setStartHour(value);
  }, []);

  const handleStartMinuteChange = useCallback((value: number) => {
    setStartMinute(value);
  }, []);

  const handleEndHourChange = useCallback((value: number) => {
    setEndHour(value);
  }, []);

  const handleEndMinuteChange = useCallback((value: number) => {
    setEndMinute(value);
  }, []);

  // Set status bar for calendar screen
  useEffect(() => {
    // The StatusBarContext will automatically use the selected theme
    // No need to set status bar manually here
  }, []);

  // Reset time values when modal opens
  useEffect(() => {
    if (modalVisible) {
      // Ensure time values are reset to 00:00 when modal opens
      setStartHour(0);
      setStartMinute(0);
      setEndHour(0);
      setEndMinute(0);
    }
  }, [modalVisible]);
  const insets = useSafeAreaInsets();
  const eventsUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupEventsListener = async () => {
      if (user) {
        try {
          // Get linked users
          const linkedUsers = await getLinkedUsers(user.uid);
          const linkedUids = linkedUsers.map((u: LinkedUser) => u.uid);
          setLinkedUserUids(linkedUids);

          // Get date range based on current view mode
          let startDate, endDate;

          if (viewMode === 'day') {
            // For day view, get events for just that day
            startDate = new Date(currentDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(currentDate);
            endDate.setHours(23, 59, 59, 999);
          } else if (viewMode === 'week') {
            // For week view, get events for that week
            const day = new Date(currentDate);
            startDate = new Date(day);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
          } else {
            // For month view, get events for that month
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0);
            endDate.setHours(23, 59, 59, 999);
          }

          // Unsubscribe from previous listener if exists
          if (eventsUnsubscribeRef.current) {
            eventsUnsubscribeRef.current();
          }

          // Set up real-time listener for calendar events
          eventsUnsubscribeRef.current = subscribeToCalendarEventsForUserAndLinked(
            user.uid,
            linkedUids,
            startDate,
            endDate,
            (fetchedEvents) => {
              if (isMounted) {
                setEvents(fetchedEvents);
                if (loading) {
                  setLoading(false);
                }
              }
            }
          );
        } catch (error) {
          console.error('Error setting up calendar events listener:', error);
          if (isMounted) {
            setLoading(false);
          }
        }
      }
    };

    setupEventsListener();

    return () => {
      isMounted = false;
      // Unsubscribe from listener when component unmounts
      if (eventsUnsubscribeRef.current) {
        eventsUnsubscribeRef.current();
      }
    };
  }, [user, currentDate, viewMode]);

  // Listen for manual refresh notifications
  useEffect(() => {
    const refreshListener = () => {
      // This will trigger a re-setup of the listener with updated linked users
      setCurrentDate(prev => new Date(prev)); // Force re-render
    };

    notificationService.subscribe('userChange', refreshListener);

    return () => {
      notificationService.unsubscribe('userChange', refreshListener);
    };
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleCreateEvent = async () => {
    if (eventTitle.trim() && selectedDate) {
      setAddingEvent(true);
      try {
        // Create a new date object with the selected time
        const startDate = new Date(selectedDate);
        startDate.setHours(startHour, startMinute, 0, 0);

        // Create end date with the end time
        const endDate = new Date(selectedDate);
        endDate.setHours(endHour, endMinute, 0, 0);

        // If end time is before start time, move end date to next day
        if (endDate < startDate) {
          endDate.setDate(endDate.getDate() + 1);
        }

        // Format time strings
        const startTimeString = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        const endTimeString = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        // Optimistic update - add event to UI immediately
        const tempEvent: CalendarEvent = {
          id: `temp_${Date.now()}`,
          title: eventTitle.trim(),
          date: startDate,
          endDate: endDate,
          startTime: startTimeString,
          endTime: endTimeString,
          emoji: selectedEmoji, // Add selected emoji
          createdBy: user.uid,
          creatorName: user.displayName || user.email || '',
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
          status: 'active'
        };

        setEvents(prevEvents => [...prevEvents, tempEvent]);
        const newEventTitle = eventTitle.trim();
        const newEventEmoji = selectedEmoji; // Capture current emoji
        setModalVisible(false);
        setEventTitle('');
        setSelectedEmoji('🎯'); // Reset to default
        setStartHour(0); // Reset to 00
        setStartMinute(0); // Reset to 00
        setEndHour(0); // Reset to 00
        setEndMinute(0); // Reset to 00

        // Actually create the event
        await createCalendarEvent({
          title: newEventTitle,
          date: startDate,
          endDate: endDate,
          startTime: startTimeString,
          endTime: endTimeString,
          emoji: newEventEmoji, // Include emoji in creation
          createdBy: user.uid,
          creatorName: user.displayName || user.email || ''
        });

        // Replace temporary event with actual event (real-time listener will handle this)
      } catch (error) {
        console.error('Error creating event:', error);
        Alert.alert('Error', 'Failed to create event. Please try again.');
        // Remove temporary event on error
        setEvents(prevEvents => prevEvents.filter(e => !e.id.startsWith('temp_')));
      } finally {
        setAddingEvent(false);
      }
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const eventToDelete = events.find(e => e.id === eventId);
    if (!eventToDelete) return;

    // Optimistic update
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));

    try {
      // Actually delete the event
      await deleteCalendarEvent(eventId);
      // Real-time listener will update the UI when the change is confirmed
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event. Please try again.');
      // Restore the event on failure
      setEvents(prevEvents => [...prevEvents, eventToDelete]);
    }
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(i);
    }

    return (
      <View style={styles.monthContainer}>
        <View style={styles.calendarDaysHeader}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={index} style={styles.calendarDayHeader}>{day}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => renderDay(day, index, today))}
        </View>
      </View>
    );
  };

  const renderDay = (day: number | null, index: number, today: Date) => {
    if (!day) {
      return <View key={index} style={styles.dayCell} />;
    }

    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Filter events for this day with proper error handling
    const dayEvents = events.filter(e => {
      try {
        // Handle different date formats for the date property
        let eventDateStr = '';
        if (e.date && typeof e.date === 'object' && 'seconds' in e.date) {
          // It's a Firebase Timestamp
          const eventDate = new Date((e.date as any).seconds * 1000);
          eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
        } else if (e.date instanceof Date) {
          const eventDate = e.date;
          eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
        } else if (typeof e.date === 'string') {
          // Handle different string formats
          if (e.date.match(/^\d{4}-\d{2}-\d{2}/)) {
            // Already in YYYY-MM-DD format
            eventDateStr = e.date.split('T')[0];
          } else {
            // Try to parse as date string
            const dateObj = new Date(e.date);
            if (!isNaN(dateObj.getTime())) {
              eventDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            }
          }
        }
        return eventDateStr === dateStr;
      } catch (error) {
        console.error('Error processing event date for filtering:', error, 'Event:', e);
        return false;
      }
    });

    // Check if this is today
    const isToday = date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    // Check if this day has events
    const hasEvents = dayEvents.length > 0;
    const isOwnEvent = dayEvents.some(e => e.createdBy === user.uid);
    const isSharedEvent = dayEvents.some(e => e.createdBy !== user.uid);

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCell,
          isToday && styles.todayCell,
          hasEvents && styles.eventDayCell,
          isSharedEvent && styles.sharedEventDayCell
        ]}
        onPress={() => {
          setSelectedDate(date);
          setEventTitle('');
          setModalVisible(true);
        }}
      >
        {hasEvents && (
          <View style={[
            styles.eventBackgroundCircle,
            isSharedEvent ? styles.sharedEventBackgroundCircle : styles.ownEventBackgroundCircle
          ]} />
        )}
        <Text style={[
          styles.dayText,
          isToday && styles.todayText
        ]}>
          {day}
        </Text>
        {hasEvents && (
          <View style={styles.heartIndicatorContainer}>
            {dayEvents.length > 1 && (
              <Text style={styles.heartCountText}>+{dayEvents.length - 1}</Text>
            )}
            <Text style={styles.emojiIcon}>{dayEvents[0].emoji || '❤️'}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEvent = ({ item }: { item: CalendarEvent }) => {
    return (
      <EnhancedEventItem
        item={item}
        user={user}
        onOpenEventDetail={openEventDetail}
        onDeleteEvent={handleDeleteEvent}
        onToggleEvent={toggleEvent}
      />
    );
  };

  const toggleEvent = async (eventItem: CalendarEvent) => {
    try {
      // Update the event with the opposite completed status
      await updateCalendarEvent(eventItem.id, {
        completed: !eventItem.completed,
        updatedAt: new Date() as any
      });
    } catch (error) {
      console.error('Error toggling event completion:', error);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    }
  };

  const openEventDetail = (eventItem: CalendarEvent) => {
    setSelectedEvent(eventItem);
    setEditEventTitle(eventItem.title);
    setEditEventEmoji(eventItem.emoji || '🎯');

    // Parse start time if it exists
    if (eventItem.startTime) {
      const [hour, minute] = eventItem.startTime.split(':').map(Number);
      setEditStartHour(hour || 0);
      setEditStartMinute(minute || 0);
    } else {
      setEditStartHour(0);
      setEditStartMinute(0);
    }

    // Parse end time if it exists
    if (eventItem.endTime) {
      const [hour, minute] = eventItem.endTime.split(':').map(Number);
      setEditEndHour(hour || 0);
      setEditEndMinute(minute || 0);
    } else {
      setEditEndHour(0);
      setEditEndMinute(0);
    }

    setEditModalVisible(true);
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    try {
      const startTimeString = `${editStartHour.toString().padStart(2, '0')}:${editStartMinute.toString().padStart(2, '0')}`;
      const endTimeString = `${editEndHour.toString().padStart(2, '0')}:${editEndMinute.toString().padStart(2, '0')}`;

      // Update the event with new values
      await updateCalendarEvent(selectedEvent.id, {
        title: editEventTitle.trim(),
        startTime: startTimeString,
        endTime: endTimeString,
        emoji: editEventEmoji,
        updatedAt: new Date() as any
      });

      setEditModalVisible(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    }
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  // Get days for the week view
  const getWeekDays = () => {
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Get hours for the day view
  const getDayHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Get minutes (0, 15, 30, 45)
  const getMinutes = () => {
    return [0, 15, 30, 45];
  };

  // Format time for display
  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Simple Time Picker Component
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

  // Render week view
  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const today = new Date();

    // Group events by date
    const eventsByDate: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      try {
        let eventDateStr = '';
        if (event.date && typeof event.date === 'object' && 'seconds' in event.date) {
          const eventDate = new Date((event.date as any).seconds * 1000);
          eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
        } else if (event.date instanceof Date) {
          eventDateStr = `${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, '0')}-${String(event.date.getDate()).padStart(2, '0')}`;
        } else if (typeof event.date === 'string') {
          if (event.date.match(/^\d{4}-\d{2}-\d{2}/)) {
            eventDateStr = event.date.split('T')[0];
          } else {
            const dateObj = new Date(event.date);
            if (!isNaN(dateObj.getTime())) {
              eventDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            }
          }
        }
        if (!eventsByDate[eventDateStr]) {
          eventsByDate[eventDateStr] = [];
        }
        eventsByDate[eventDateStr].push(event);
      } catch (error) {
        // Ignore events that can't be processed
      }
    });

    return (
      <View style={styles.weekContainer}>
        <View style={styles.weekScrollView}>
          {weekDays.map((day, dayIndex) => {
            const isToday = day.getDate() === today.getDate() &&
              day.getMonth() === today.getMonth() &&
              day.getFullYear() === today.getFullYear();

            const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
            const dayEvents = eventsByDate[dateStr] || [];

            return (
              <View key={dayIndex} style={[styles.weekDayContainer, isToday && styles.todayWeekDayContainer]}>
                {/* Day header */}
                <View style={[styles.weekDayHeader, isToday && styles.todayWeekDayHeader]}>
                  <Text style={[styles.weekDayName, isToday && styles.todayWeekDayName]}>
                    {day.toLocaleDateString('default', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.weekDayDate, isToday && styles.todayWeekDayDate]}>
                    {day.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>

                {/* Day events */}
                <View style={styles.weekDayEventsContainer}>
                  {dayEvents.length > 0 ? (
                    dayEvents.map((event, eventIndex) => (
                      <TouchableOpacity
                        key={eventIndex}
                        style={styles.weekEventItem}
                        onPress={() => {
                          // Handle event press if needed
                        }}
                      >
                        <Text style={styles.weekEventText} numberOfLines={1}>{event.title}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noEventsText}>No events</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = getDayHours();
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const dayEvents = events.filter(e => {
      try {
        let eventDateStr = '';
        if (e.date && typeof e.date === 'object' && 'seconds' in e.date) {
          const eventDate = new Date((e.date as any).seconds * 1000);
          eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
        } else if (e.date instanceof Date) {
          eventDateStr = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}-${String(e.date.getDate()).padStart(2, '0')}`;
        } else if (typeof e.date === 'string') {
          if (e.date.match(/^\d{4}-\d{2}-\d{2}/)) {
            eventDateStr = e.date.split('T')[0];
          } else {
            const dateObj = new Date(e.date);
            if (!isNaN(dateObj.getTime())) {
              eventDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            }
          }
        }
        return eventDateStr === dateStr;
      } catch (error) {
        return false;
      }
    });

    // Group events by hour
    const eventsByHour: Record<number, CalendarEvent[]> = {};
    dayEvents.forEach(event => {
      try {
        let eventHour = 0;
        if (event.date && typeof event.date === 'object' && 'seconds' in event.date) {
          eventHour = new Date((event.date as any).seconds * 1000).getHours();
        } else if (event.date instanceof Date) {
          eventHour = event.date.getHours();
        } else if (typeof event.date === 'string') {
          const dateObj = new Date(event.date);
          if (!isNaN(dateObj.getTime())) {
            eventHour = dateObj.getHours();
          }
        }
        if (!eventsByHour[eventHour]) {
          eventsByHour[eventHour] = [];
        }
        eventsByHour[eventHour].push(event);
      } catch (error) {
        // Ignore events that can't be processed
      }
    });

    return (
      <View style={styles.dayContainer}>
        <View style={styles.dayScrollView}>
          {hours.map((hour, index) => {
            const hourEvents = eventsByHour[hour] || [];
            const hasEvents = hourEvents.length > 0;

            return (
              <View key={index} style={[styles.hourRow, !hasEvents && styles.hourRowEmpty]}>
                <Text style={styles.hourLabel}>
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </Text>
                <View style={styles.hourEventsContainer}>
                  {hourEvents.map((event, eventIndex) => (
                    <TouchableOpacity
                      key={eventIndex}
                      style={styles.dayEventItem}
                      onPress={() => {
                        // Handle event press if needed
                      }}
                    >
                      <Text style={styles.dayEventText} numberOfLines={1}>{event.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const openAddEventModal = () => {
    const today = new Date();
    setSelectedDate(today);
    setEventTitle('');
    setSelectedEmoji('🎯'); // Reset to default emoji
    setStartHour(0); // Reset to 00
    setStartMinute(0); // Reset to 00
    setEndHour(0); // Reset to 00
    setEndMinute(0); // Reset to 00
    setModalVisible(true);

    // Ensure time pickers reset to 00:00 with a small delay
    setTimeout(() => {
      setStartHour(0);
      setStartMinute(0);
      setEndHour(0);
      setEndMinute(0);
    }, 50);
  };

  // Navigation functions for different view modes
  const navigateToPrevious = () => {
    if (viewMode === 'day') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1));
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const navigateToNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1));
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  // Get the title for the current view
  const getViewTitle = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('default', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    } else if (viewMode === 'week') {
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      const startMonth = startDate.toLocaleDateString('default', { month: 'short' });
      const startDay = startDate.getDate();
      const startYear = startDate.getFullYear();

      const endMonth = endDate.toLocaleDateString('default', { month: 'short' });
      const endDay = endDate.getDate();
      const endYear = endDate.getFullYear();

      if (startYear === endYear) {
        if (startMonth === endMonth) {
          return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
        } else {
          return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
        }
      } else {
        return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
      }
    } else {
      return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }} edges={['top', 'left', 'right']}>
      <SafeStatusBar />
      <View style={{ flex: 1, backgroundColor: screenBackgroundColor }}>
        <View style={[styles.header, { backgroundColor: backgroundColor }]}>
          <Text style={[styles.title, { color: getTextColorForBackground(backgroundColor) }]}>Your Events</Text>
          <TouchableOpacity
            style={[styles.headerAddButton, { backgroundColor: getButtonColor(themePalette.primary) }]}
            onPress={openAddEventModal}
          >
            <Icon name="add" size={responsiveFontSize(24)} color={colors.textLight} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.mainScrollView}>
          <View style={{ marginTop: verticalScale(16) }}>

            {/* View Mode Selector */}
            <View style={styles.viewModeContainer}>
              <View style={styles.segmentedControlContainer}>
                <TouchableOpacity
                  style={[styles.segmentedButton, viewMode === 'day' && styles.segmentedButtonActive]}
                  onPress={() => setViewMode('day')}
                >
                  <Text style={[styles.segmentedButtonText, viewMode === 'day' && styles.segmentedButtonTextActive]}>Day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentedButton, viewMode === 'week' && styles.segmentedButtonActive]}
                  onPress={() => setViewMode('week')}
                >
                  <Text style={[styles.segmentedButtonText, viewMode === 'week' && styles.segmentedButtonTextActive]}>Week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentedButton, viewMode === 'month' && styles.segmentedButtonActive]}
                  onPress={() => setViewMode('month')}
                >
                  <Text style={[styles.segmentedButtonText, viewMode === 'month' && styles.segmentedButtonTextActive]}>Month</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Calendar Navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.navButton} onPress={navigateToPrevious}>
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.calendarHeaderCenter}>
                <Text style={styles.headerText}>{getViewTitle()}</Text>
                <TouchableOpacity onPress={navigateToToday}>
                  <Text style={styles.todayButton}>Today</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.navButton} onPress={navigateToNext}>
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Calendar View */}
            <View style={styles.calendarContainer}>
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'day' && renderDayView()}
            </View>

            {/* Events Section at the Bottom */}
            <View style={styles.eventsSection}>
              <View style={styles.eventsHeader}>
                <Text style={styles.eventsTitle}>Events this period</Text>
                <Text style={styles.eventsCount}>{events.length} events</Text>
              </View>
              {loading ? (
                <View style={styles.emptyEventsContainer}>
                  <ActivityIndicator size="small" color={colors.electricBlue} />
                  <Text style={styles.emptyEventsText}>Loading events...</Text>
                </View>
              ) : events.length > 0 ? (
                <View style={styles.eventsListContainer}>
                  {events.map((event, index) => (
                    <View key={`${event.id}-${event.updatedAt?.seconds || event.updatedAt || index}`} style={{ marginBottom: index === events.length - 1 ? verticalScale(16) : 0 }}>
                      {renderEvent({ item: event })}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyEventsContainer}>
                  <Text style={styles.emptyEventsText}>No events this period</Text>
                  <Text style={styles.emptyEventsSubtext}>Tap the + button to add events</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Add Event Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Add Event for {selectedDate ? selectedDate.toDateString() : ''}
              </Text>
              <TextInput
                style={[globalStyles.input, { marginBottom: verticalScale(8), marginHorizontal: moderateScale(6) }]}
                placeholder="Event title"
                value={eventTitle}
                onChangeText={setEventTitle}
                autoFocus={true}
                editable={!addingEvent}
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
                      {row1Emojis.map((emoji, index) => (
                        <TouchableOpacity
                          key={`row1-${emoji}-${index}`}
                          style={[
                            styles.emojiOption,
                            selectedEmoji === emoji && styles.selectedEmoji
                          ]}
                          onPress={() => setSelectedEmoji(emoji)}
                        >
                          <Text style={styles.emojiOptionText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.emojiRow}>
                      {row2Emojis.map((emoji, index) => (
                        <TouchableOpacity
                          key={`row2-${emoji}-${index}`}
                          style={[
                            styles.emojiOption,
                            selectedEmoji === emoji && styles.selectedEmoji
                          ]}
                          onPress={() => setSelectedEmoji(emoji)}
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
                    {renderTimePicker(getDayHours(), startHour, handleStartHourChange)}
                    <Text style={styles.timePickerSeparator}>:</Text>
                    {renderTimePicker(getMinutes(), startMinute, handleStartMinuteChange)}
                  </View>
                  <View style={styles.timePickerGroup}>
                    {renderTimePicker(getDayHours(), endHour, handleEndHourChange)}
                    <Text style={styles.timePickerSeparator}>:</Text>
                    {renderTimePicker(getMinutes(), endMinute, handleEndMinuteChange)}
                  </View>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[globalStyles.button, globalStyles.outlineButton, styles.modalButton]}
                  onPress={() => setModalVisible(false)}
                  disabled={addingEvent}
                >
                  <Text style={[globalStyles.buttonText, globalStyles.outlineButtonText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalStyles.button, styles.modalButton, addingEvent && globalStyles.disabledButton, { backgroundColor: getButtonColor(themePalette.primary) }]}
                  onPress={handleCreateEvent}
                  disabled={!eventTitle.trim() || addingEvent}
                >
                  {addingEvent ? (
                    <ActivityIndicator color={colors.textLight} size="small" />
                  ) : (
                    <Text style={globalStyles.buttonText}>Add Event</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Event Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Edit Event
              </Text>
              <TextInput
                style={[globalStyles.input, { marginBottom: verticalScale(8), marginHorizontal: moderateScale(6) }]}
                placeholder="Event title"
                value={editEventTitle}
                onChangeText={setEditEventTitle}
                autoFocus={true}
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
                      {row1Emojis.map((emoji, index) => (
                        <TouchableOpacity
                          key={`edit-row1-${emoji}-${index}`}
                          style={[
                            styles.emojiOption,
                            editEventEmoji === emoji && styles.selectedEmoji
                          ]}
                          onPress={() => setEditEventEmoji(emoji)}
                        >
                          <Text style={styles.emojiOptionText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.emojiRow}>
                      {row2Emojis.map((emoji, index) => (
                        <TouchableOpacity
                          key={`edit-row2-${emoji}-${index}`}
                          style={[
                            styles.emojiOption,
                            editEventEmoji === emoji && styles.selectedEmoji
                          ]}
                          onPress={() => setEditEventEmoji(emoji)}
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
                    {renderTimePicker(getDayHours(), editStartHour, (value) => setEditStartHour(value))}
                    <Text style={styles.timePickerSeparator}>:</Text>
                    {renderTimePicker(getMinutes(), editStartMinute, (value) => setEditStartMinute(value))}
                  </View>
                  <View style={styles.timePickerGroup}>
                    {renderTimePicker(getDayHours(), editEndHour, (value) => setEditEndHour(value))}
                    <Text style={styles.timePickerSeparator}>:</Text>
                    {renderTimePicker(getMinutes(), editEndMinute, (value) => setEditEndMinute(value))}
                  </View>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[globalStyles.button, globalStyles.outlineButton, styles.modalButton]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={[globalStyles.buttonText, globalStyles.outlineButtonText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalStyles.button, styles.modalButton, { backgroundColor: getButtonColor(themePalette.primary) }]}
                  onPress={handleUpdateEvent}
                >
                  <Text style={globalStyles.buttonText}>Update Event</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        {(() => { console.log(`[Perf] CalendarScreen render end: ${Date.now()}`); return null; })()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: responsiveFontSize(16),
    color: colors.textSecondary,
  },
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
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  navButton: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: verticalScale(18),
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButtonText: {
    fontSize: responsiveFontSize(20),
    color: colors.text,
    fontWeight: '600',
  },
  headerText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  viewModeContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: verticalScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedButtonActive: {
    backgroundColor: colors.electricBlue,
  },
  segmentedButtonText: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  segmentedButtonTextActive: {
    color: colors.textLight,
    fontWeight: '600',
  },
  calendarHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  todayButton: {
    fontSize: responsiveFontSize(14),
    color: colors.electricBlue,
    fontWeight: '500',
    marginTop: verticalScale(4),
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    marginHorizontal: scale(16),
    marginTop: verticalScale(16),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Day View Styles
  dayContainer: {
    flex: 1,
  },
  dayScrollView: {
    flex: 1,
  },
  hourRow: {
    flexDirection: 'row',
    minHeight: verticalScale(60),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hourRowEmpty: {
    minHeight: verticalScale(10),
  },
  hourLabel: {
    width: scale(60),
    padding: moderateScale(4),
    margin: moderateScale(4),
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    textAlign: 'center',
    backgroundColor: colors.glassMint,
    borderRadius: moderateScale(8),
  },
  hourEventsContainer: {
    flex: 1,
    padding: moderateScale(4),
  },
  dayEventItem: {
    backgroundColor: colors.electricBlueLight,
    borderRadius: moderateScale(8),
    padding: moderateScale(8),
    marginBottom: verticalScale(4),
    borderLeftWidth: 3,
    borderLeftColor: colors.electricBlue,
  },
  dayEventText: {
    fontSize: responsiveFontSize(14),
    color: colors.text,
    fontWeight: '500',
  },
  // Week View Styles
  weekContainer: {
    flex: 1,
  },
  weekScrollView: {
    flex: 1,
  },
  weekDayContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: verticalScale(80),
  },
  todayWeekDayContainer: {
    backgroundColor: colors.electricBlueLight,
  },
  weekDayHeader: {
    width: scale(80),
    padding: moderateScale(12),
    borderRightWidth: 1,
    borderRightColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayWeekDayHeader: {
    backgroundColor: colors.electricBlue,
  },
  weekDayName: {
    fontSize: responsiveFontSize(14),
    color: colors.text,
    fontWeight: '600',
  },
  todayWeekDayName: {
    color: colors.textLight,
  },
  weekDayDate: {
    fontSize: responsiveFontSize(12),
    color: colors.textSecondary,
    marginTop: verticalScale(4),
  },
  todayWeekDayDate: {
    color: colors.textLight,
  },
  weekDayEventsContainer: {
    flex: 1,
    padding: moderateScale(12),
  },
  weekEventItem: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(8),
    padding: moderateScale(8),
    marginBottom: verticalScale(6),
    borderLeftWidth: 3,
    borderLeftColor: colors.electricBlue,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekEventText: {
    fontSize: responsiveFontSize(14),
    color: colors.text,
    fontWeight: '500',
  },
  noEventsText: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(8),
  },
  calendarDayHeader: {
    width: '14%',
    textAlign: 'center',
    fontWeight: '600',
    color: colors.textSecondary,
    fontSize: responsiveFontSize(13),
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: '14%',
    height: verticalScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(6),
  },
  todayCell: {
    backgroundColor: 'transparent',
  },
  eventDayCell: {
    backgroundColor: 'transparent',
  },
  sharedEventDayCell: {
    backgroundColor: 'transparent',
  },
  dayText: {
    fontSize: responsiveFontSize(15),
    color: colors.text, // Always black
    fontWeight: '500',
    zIndex: 2, // Ensure text is above background elements
  },
  todayText: {
    color: colors.text,
    fontWeight: '600',
  },
  eventCircleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: verticalScale(4),
  },
  eventCircle: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  ownEventCircle: {
    backgroundColor: colors.hotPinkLight,
  },
  sharedEventCircle: {
    backgroundColor: colors.electricBlueLight,
  },
  eventCountText: {
    fontSize: responsiveFontSize(8),
    color: colors.textSecondary,
    marginLeft: scale(2),
    fontWeight: '600',
  },
  eventBackgroundCircle: {
    position: 'absolute',
    width: scale(29),
    height: scale(29),
    borderRadius: scale(30),
    zIndex: 1,
  },
  ownEventBackgroundCircle: {
    backgroundColor: colors.hotPinkLight,
  },
  sharedEventBackgroundCircle: {
    backgroundColor: colors.electricBlueLight,
  },
  heartIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: verticalScale(2),
    zIndex: 2,
  },
  emojiIcon: {
    fontSize: responsiveFontSize(12),
  },
  heartCountText: {
    fontSize: responsiveFontSize(9),
    color: colors.text,
    marginLeft: scale(1),
    fontWeight: '900',
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
  monthContainer: {
    flex: 1,
    padding: moderateScale(12),
  },
  eventsSection: {
    marginTop: verticalScale(16),
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(20),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    marginHorizontal: scale(16),
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: verticalScale(10),
    overflow: 'hidden',
    shadowColor: colors.textSecondary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventsListContainer: {
    paddingBottom: verticalScale(12),
    paddingTop: verticalScale(12),
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
    marginTop: verticalScale(8),
  },
  eventsTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: colors.text,
  },
  eventsCount: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    fontWeight: '500',
  },
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
  eventTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
    color: colors.text,
    marginBottom: verticalScale(4),
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
  emptyEventsContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(24),
    borderRadius: moderateScale(12),
  },
  emptyEventsText: {
    fontSize: responsiveFontSize(16),
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: verticalScale(4),
  },
  emptyEventsSubtext: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: moderateScale(12),
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
});

export default CalendarScreen;