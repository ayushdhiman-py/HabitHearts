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
  Timestamp
} from 'firebase/firestore';

export interface Goal {
  id: string;
  text: string;
  completed: boolean;
  createdBy: string;
  creatorName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: string;
}

// Create a new goal
export const createGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Goal> => {
  try {
    const goalId = doc(collection(db, 'goals')).id;
    const goalRef = doc(db, 'goals', goalId);
    
    const goal: Goal = {
      id: goalId,
      ...goalData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    };
    
    await setDoc(goalRef, goal);
    return goal;
  } catch (error) {
    console.error('Error creating goal:', error);
    throw error;
  }
};

// Get goals for a user and their linked users
export const getGoalsForUserAndLinked = async (userUid: string, linkedUserUids: string[] = []): Promise<Goal[]> => {
  try {
    // Include current user and all linked users
    const allUids = [userUid, ...linkedUserUids];
    
    const q = query(
      collection(db, 'goals'),
      where('createdBy', 'in', allUids),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const goals: Goal[] = [];
    
    querySnapshot.forEach((doc) => {
      goals.push({ id: doc.id, ...(doc.data() as Omit<Goal, 'id'>) });
    });
    
    return goals;
  } catch (error) {
    console.error('Error getting goals:', error);
    throw error;
  }
};

// Update a goal
export const updateGoal = async (goalId: string, updateData: Partial<Goal>): Promise<boolean> => {
  try {
    const goalRef = doc(db, 'goals', goalId);
    await updateDoc(goalRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating goal:', error);
    throw error;
  }
};

// Soft delete a goal (set status to inactive)
export const deleteGoal = async (goalId: string): Promise<boolean> => {
  try {
    const goalRef = doc(db, 'goals', goalId);
    await updateDoc(goalRef, {
      status: 'inactive',
      updatedAt: Timestamp.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting goal:', error);
    throw error;
  }
};

// Toggle goal completion status
export const toggleGoalCompletion = async (goalId: string, completed: boolean): Promise<boolean> => {
  try {
    const goalRef = doc(db, 'goals', goalId);
    await updateDoc(goalRef, {
      completed: !completed,
      updatedAt: Timestamp.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error toggling goal completion:', error);
    throw error;
  }
};