import { db } from '../../firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { notificationService } from './notificationService';

export interface Task {
  id: string;
  text: string;
  description?: string;
  dueDate?: Timestamp;
  completed: boolean;
  createdBy: string;
  creatorName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: string;
  emoji?: string;
  startTime?: string;
  endTime?: string;
}

// Create a new task
export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Task> => {
  try {
    const taskId = doc(collection(db, 'tasks')).id;
    const taskRef = doc(db, 'tasks', taskId);
    
    const task: Task = {
      id: taskId,
      ...taskData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    };
    
    await setDoc(taskRef, task);
    
    // Notify subscribers of task change
    notificationService.notifyTaskChange();
    
    return task;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// Get tasks for a user and their linked users with real-time listener
export const subscribeToTasksForUserAndLinked = (
  userUid: string, 
  linkedUserUids: string[] = [],
  callback: (tasks: Task[]) => void
): () => void => {
  try {
    // Include current user and all linked users
    const allUids = [userUid, ...linkedUserUids];
    
    const q = query(
      collection(db, 'tasks'),
      where('createdBy', 'in', allUids),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasks: Task[] = [];
      
      querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...(doc.data() as Omit<Task, 'id'>) });
      });
      
      callback(tasks);
    }, (error) => {
      console.error('Error listening to tasks:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up task listener:', error);
    throw error;
  }
};

// Update a task
export const updateTask = async (taskId: string, updateData: Partial<Task>): Promise<boolean> => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
    
    // Notify subscribers of task change
    notificationService.notifyTaskChange();
    
    return true;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

// Soft delete a task (set status to inactive)
export const deleteTask = async (taskId: string): Promise<boolean> => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      status: 'inactive',
      updatedAt: Timestamp.now()
    });
    
    // Notify subscribers of task change
    notificationService.notifyTaskChange();
    
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

// Toggle task completion status
export const toggleTaskCompletion = async (taskId: string, completed: boolean): Promise<boolean> => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      completed: !completed,
      updatedAt: Timestamp.now()
    });
    
    // Notify subscribers of task change
    notificationService.notifyTaskChange();
    
    return true;
  } catch (error) {
    console.error('Error toggling task completion:', error);
    throw error;
  }
};