import { db } from '../../firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { notificationService } from './notificationService';

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date | { seconds: number } | string;
  endDate?: Date | { seconds: number } | string;
  startTime?: string; // Added startTime field
  endTime?: string; // Added endTime field
  createdBy: string;
  creatorName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: string;
  emoji?: string; // Added emoji field
}

// Create a new calendar event
export const createCalendarEvent = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<CalendarEvent> => {
  try {
    const eventId = doc(collection(db, 'calendarEvents')).id;
    const eventRef = doc(db, 'calendarEvents', eventId);
    
    const event: CalendarEvent = {
      id: eventId,
      ...eventData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    };
    
    await setDoc(eventRef, event);
    
    // Notify subscribers of calendar event change
    notificationService.notifyCalendarEventChange();
    
    return event;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

// Get calendar events for a user and their linked users with real-time listener
export const subscribeToCalendarEventsForUserAndLinked = (
  userUid: string, 
  linkedUserUids: string[] = [], 
  startDate: Date, 
  endDate: Date,
  callback: (events: CalendarEvent[]) => void
): () => void => {
  try {
    // Include current user and all linked users
    const allUids = [userUid, ...linkedUserUids];
    
    let q = query(
      collection(db, 'calendarEvents'),
      where('createdBy', 'in', allUids),
      where('status', '==', 'active')
    );
    
    // Add date filtering if provided
    if (startDate && endDate) {
      q = query(
        q,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
    }
    
    q = query(q, orderBy('date', 'asc'));
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const events: CalendarEvent[] = [];
      
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...(doc.data() as Omit<CalendarEvent, 'id'>) });
      });
      
      callback(events);
    }, (error) => {
      console.error('Error listening to calendar events:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up calendar event listener:', error);
    throw error;
  }
};

// Update a calendar event
export const updateCalendarEvent = async (eventId: string, updateData: Partial<CalendarEvent>): Promise<boolean> => {
  try {
    const eventRef = doc(db, 'calendarEvents', eventId);
    await updateDoc(eventRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
    
    // Notify subscribers of calendar event change
    notificationService.notifyCalendarEventChange();
    
    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
};

// Soft delete a calendar event (set status to inactive)
export const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
  try {
    const eventRef = doc(db, 'calendarEvents', eventId);
    await updateDoc(eventRef, {
      status: 'inactive',
      updatedAt: Timestamp.now()
    });
    
    // Notify subscribers of calendar event change
    notificationService.notifyCalendarEventChange();
    
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
};