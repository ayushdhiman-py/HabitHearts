import { db } from '../../firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  Timestamp
} from 'firebase/firestore';

export interface GoalProgress {
  id: string;
  goalId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Get progress records for a specific goal
export const getGoalProgress = async (goalId: string, userId: string): Promise<GoalProgress[]> => {
  try {
    const q = query(
      collection(db, 'goalProgress'),
      where('goalId', '==', goalId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const progress: GoalProgress[] = [];
    
    querySnapshot.forEach((doc) => {
      progress.push({ id: doc.id, ...(doc.data() as Omit<GoalProgress, 'id'>) });
    });
    
    return progress;
  } catch (error) {
    console.error('Error getting goal progress:', error);
    throw error;
  }
};

// Get progress records for multiple goals
export const getGoalsProgress = async (goalIds: string[], userId: string): Promise<GoalProgress[]> => {
  try {
    if (goalIds.length === 0) return [];
    
    const q = query(
      collection(db, 'goalProgress'),
      where('goalId', 'in', goalIds),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const progress: GoalProgress[] = [];
    
    querySnapshot.forEach((doc) => {
      progress.push({ id: doc.id, ...(doc.data() as Omit<GoalProgress, 'id'>) });
    });
    
    return progress;
  } catch (error) {
    console.error('Error getting goals progress:', error);
    throw error;
  }
};

// Update or create progress record for a specific date
export const updateGoalProgress = async (
  goalId: string, 
  date: Date, 
  completed: boolean,
  userId: string
): Promise<GoalProgress> => {
  try {
    // Format date as YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    
    // Check if progress record already exists
    const q = query(
      collection(db, 'goalProgress'),
      where('goalId', '==', goalId),
      where('userId', '==', userId),
      where('date', '==', dateStr)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Update existing record
      const docRef = querySnapshot.docs[0].ref;
      const updatedProgress: Partial<GoalProgress> = {
        completed,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updatedProgress);
      
      return { 
        id: docRef.id, 
        goalId, 
        date: dateStr, 
        completed, 
        userId,
        createdAt: querySnapshot.docs[0].data().createdAt,
        updatedAt: Timestamp.now()
      };
    } else {
      // Create new record
      const progressId = doc(collection(db, 'goalProgress')).id;
      const progressRef = doc(db, 'goalProgress', progressId);
      
      const newProgress: GoalProgress = {
        id: progressId,
        goalId,
        date: dateStr,
        completed,
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      await setDoc(progressRef, newProgress);
      return newProgress;
    }
  } catch (error) {
    console.error('Error updating goal progress:', error);
    throw error;
  }
};

// Get today's progress status for a specific goal
export const getTodaysProgress = async (goalId: string, userId: string): Promise<boolean> => {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    const q = query(
      collection(db, 'goalProgress'),
      where('goalId', '==', goalId),
      where('userId', '==', userId),
      where('date', '==', dateStr)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data().completed;
    }
    
    return false; // Not completed by default
  } catch (error) {
    console.error('Error getting today\'s progress:', error);
    return false;
  }
};