import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { subscribeToCalendarEventsForUserAndLinked, createCalendarEvent, deleteCalendarEvent } from '../services/calendarService';
import { getLinkedUsers } from '../services/userService';
import { notificationService } from '../services/notificationService';
import colors from '../theme/colors';
import globalStyles from '../theme/styles';
import { responsiveFontSize, scale, verticalScale, moderateScale, widthPercentage, heightPercentage } from '../utils/responsive';

// Define types based on what the services actually return
interface CalendarEvent {
  id: string;
  title: string;
  date: any;
  createdBy: string;
  creatorName: string;
  createdAt: any;
  updatedAt: any;
  status: string;
}

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

const CalendarScreen = () => {
  const { user } = useAuth() as { user: AuthUser };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingEvent, setAddingEvent] = useState(false);
  const [linkedUserUids, setLinkedUserUids] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState('');
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
          
          // Get start and end of month for filtering
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const startDate = new Date(year, month, 1);
          const endDate = new Date(year, month + 1, 0);
          
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
  }, [user, currentDate, loading]);

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

  const handleDayPress = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    setEventTitle('');
    setModalVisible(true);
  };

  const handleCreateEvent = async () => {
    if (eventTitle.trim() && selectedDate) {
      setAddingEvent(true);
      try {
        // Optimistic update - add event to UI immediately
        const tempEvent = {
          id: `temp_${Date.now()}`,
          title: eventTitle.trim(),
          date: selectedDate,
          createdBy: user.uid,
          creatorName: user.displayName || user.email || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active'
        };
        
        setEvents([...events, tempEvent as CalendarEvent]);
        const newEventTitle = eventTitle.trim();
        setModalVisible(false);
        setEventTitle('');
        
        // Actually create the event
        const newEvent = await createCalendarEvent({
          title: newEventTitle,
          date: selectedDate,
          createdBy: user.uid,
          creatorName: user.displayName || user.email || ''
        });
        
        // Replace temporary event with actual event (real-time listener will handle this)
      } catch (error) {
        console.error('Error creating event:', error);
        Alert.alert('Error', 'Failed to create event. Please try again.');
        // Remove temporary event on error
        setEvents(events.filter(e => !e.id.startsWith('temp_')));
      } finally {
        setAddingEvent(false);
      }
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Optimistic update
      const eventToDelete = events.find(event => event.id === eventId);
      setEvents(events.filter(event => event.id !== eventId));
      
      // Actually delete the event
      await deleteCalendarEvent(eventId);
      // Real-time listener will update the UI when the change is confirmed
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event. Please try again.');
      // In a real scenario, the listener would restore the event if deletion failed server-side
    }
  };

  const renderCalendar = () => {
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
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={index} style={styles.dayHeader}>{day}</Text>
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
        onPress={() => handleDayPress(day)}
      >
        <Text style={[
          styles.dayText, 
          isToday && styles.todayText
        ]}>
          {day}
        </Text>
        {hasEvents && (
          <View style={styles.eventIndicatorContainer}>
            <View style={[
              styles.eventIndicator,
              isSharedEvent && styles.sharedEventIndicator
            ]} />
            {dayEvents.length > 1 && (
              <Text style={styles.eventCountText}>+{dayEvents.length - 1}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEvent = ({ item }: { item: CalendarEvent }) => {
    // Handle both string and Date formats for the date property with error handling
    let eventDate: Date;
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
    } catch (error) {
      eventDate = new Date();
    }
    
    const isOwnEvent = item.createdBy === user.uid;
    
    return (
      <View style={[styles.eventItem, !isOwnEvent && styles.sharedEventItem]}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{item.title}</Text>
        </View>
        <Text style={styles.eventDate}>{eventDate.toLocaleDateString()}</Text>
        {item.creatorName && item.createdBy !== user.uid && (
          <Text style={styles.creatorText}>by {item.creatorName}</Text>
        )}
        <TouchableOpacity onPress={() => handleDeleteEvent(item.id)} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
        {item.createdBy !== user.uid && (
          <Text style={styles.creatorTag}>Shared</Text>
        )}
      </View>
    );
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[globalStyles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { marginTop: insets.top > 0 ? 0 : verticalScale(10) }]}>
        <TouchableOpacity style={styles.navButton} onPress={() => changeMonth(-1)}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity style={styles.navButton} onPress={() => changeMonth(1)}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>
      
      {renderCalendar()}
      
      <View style={styles.eventsSection}>
        <View style={styles.eventsHeader}>
          <Text style={styles.eventsTitle}>Events this month</Text>
          <Text style={styles.eventsCount}>{events.length} events</Text>
        </View>
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={item => item.id}
          style={styles.eventList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: verticalScale(55) }}
          ListEmptyComponent={
            <View style={styles.emptyEventsContainer}>
              <Text style={globalStyles.text}>No events this month</Text>
              <Text style={globalStyles.textSecondary}>Tap on a date to add events</Text>
            </View>
          }
        />
      </View>

      {/* Add Event Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add Event for {selectedDate ? selectedDate.toDateString() : ''}
            </Text>
            <TextInput
              style={globalStyles.input}
              placeholder="Event title"
              value={eventTitle}
              onChangeText={setEventTitle}
              autoFocus={true}
              editable={!addingEvent}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[globalStyles.button, globalStyles.outlineButton, styles.modalButton]}
                onPress={() => setModalVisible(false)} 
                disabled={addingEvent}
              >
                <Text style={[globalStyles.buttonText, globalStyles.outlineButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[globalStyles.button, styles.modalButton, addingEvent && globalStyles.disabledButton]}
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
        </View>
      </Modal>
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  },
  calendarContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: scale(16),
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(8),
  },
  dayHeader: {
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
    backgroundColor: colors.primary,
  },
  eventDayCell: {
    backgroundColor: colors.secondary,
  },
  sharedEventDayCell: {
    backgroundColor: colors.yellow,
  },
  dayText: {
    fontSize: responsiveFontSize(15),
    color: colors.text,
    fontWeight: '500',
  },
  todayText: {
    color: colors.textLight,
    fontWeight: '600',
  },
  eventIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: verticalScale(4),
  },
  eventIndicator: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(2.5),
    backgroundColor: colors.primary,
  },
  sharedEventIndicator: {
    backgroundColor: colors.primary,
  },
  eventCountText: {
    fontSize: responsiveFontSize(9),
    color: colors.primary,
    marginLeft: scale(2),
    fontWeight: '600',
  },
  eventsSection: {
    flex: 1,
    marginTop: verticalScale(16),
    paddingHorizontal: scale(16),
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  eventsTitle: {
    fontSize: responsiveFontSize(17),
    fontWeight: '600',
    color: colors.text,
  },
  eventsCount: {
    fontSize: responsiveFontSize(13),
    color: colors.textSecondary,
  },
  eventList: {
    flex: 1,
  },
  eventItem: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginBottom: verticalScale(8),
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sharedEventItem: {
    borderLeftColor: colors.primary,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  eventTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  creatorTag: {
    backgroundColor: colors.secondary,
    color: colors.textLight,
    fontSize: responsiveFontSize(9),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(8),
    overflow: 'hidden',
    fontWeight: '600',
    position: 'absolute',
    bottom: moderateScale(12),
    right: moderateScale(12),
  },
  eventDate: {
    fontSize: responsiveFontSize(13),
    color: colors.textSecondary,
    marginBottom: verticalScale(2),
  },
  creatorText: {
    fontSize: responsiveFontSize(11),
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  deleteButton: {
    position: 'absolute',
    top: moderateScale(12),
    right: moderateScale(12),
    width: verticalScale(20),
    height: verticalScale(20),
    borderRadius: verticalScale(10),
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  emptyEventsContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(32),
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    width: '80%',
    maxWidth: 400,
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
    marginTop: verticalScale(16),
  },
  modalButton: {
    flex: 1,
    marginHorizontal: scale(4),
  },
});

export default CalendarScreen;