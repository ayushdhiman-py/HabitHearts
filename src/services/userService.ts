import { db, auth } from '../../firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

export interface User {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  uniqueCode: string;
  linkedUsers: string[];
  createdAt: Date;
  updatedAt: Date;
  status: string;
}

// Generate a unique 8-character code
export const generateUniqueCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Create or update user document
export const createUserDocument = async (user: any): Promise<string> => {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    // Ensure displayName is a string or null, not undefined
    const displayName = typeof user.displayName === 'string' ? user.displayName : (user.displayName || null);
    
    if (!userDoc.exists()) {
      // Generate unique code for new user
      const uniqueCode = generateUniqueCode();
      
      // Check if code already exists
      const codeQuery = query(collection(db, 'users'), where('uniqueCode', '==', uniqueCode));
      const codeSnapshot = await getDocs(codeQuery);
      
      // If code exists, generate a new one
      let finalCode = uniqueCode;
      if (!codeSnapshot.empty) {
        finalCode = generateUniqueCode();
      }
      
      // Create new user document
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email || null,
        displayName: displayName,
        photoURL: user.photoURL || null,
        uniqueCode: finalCode,
        linkedUsers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      });
      
      return finalCode;
    } else {
      // Update existing user document
      await updateDoc(userDocRef, {
        email: user.email || null,
        displayName: displayName,
        photoURL: user.photoURL || null,
        updatedAt: new Date()
      });
      
      return (userDoc.data() as User).uniqueCode;
    }
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

// Get user by unique code
export const getUserByUniqueCode = async (uniqueCode: string): Promise<User | null> => {
  try {
    const q = query(collection(db, 'users'), where('uniqueCode', '==', uniqueCode), where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { ...(userDoc.data() as any), id: userDoc.id } as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user by unique code:', error);
    throw error;
  }
};

// Link users
export const linkUsers = async (currentUserUid: string, otherUserUid: string): Promise<boolean> => {
  try {
    // Add each user to the other's linkedUsers array
    const currentUserRef = doc(db, 'users', currentUserUid);
    const otherUserRef = doc(db, 'users', otherUserUid);
    
    await updateDoc(currentUserRef, {
      linkedUsers: arrayUnion(otherUserUid),
      updatedAt: new Date()
    });
    
    await updateDoc(otherUserRef, {
      linkedUsers: arrayUnion(currentUserUid),
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error linking users:', error);
    throw error;
  }
};

// Get linked users
export const getLinkedUsers = async (userUid: string): Promise<User[]> => {
  try {
    const userDocRef = doc(db, 'users', userUid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      const linkedUserUids = userData.linkedUsers || [];
      
      // Handle case where linkedUsers is undefined or not an array
      if (!Array.isArray(linkedUserUids) || linkedUserUids.length === 0) {
        return [];
      }
      
      // Get linked user documents
      const linkedUsers: User[] = [];
      for (const uid of linkedUserUids) {
        // Skip any invalid UIDs
        if (!uid) continue;
        
        try {
          const linkedUserDocRef = doc(db, 'users', uid);
          const linkedUserDoc = await getDoc(linkedUserDocRef);
          if (linkedUserDoc.exists() && (linkedUserDoc.data() as User).status === 'active') {
            linkedUsers.push({ ...(linkedUserDoc.data() as any), id: linkedUserDoc.id } as User);
          }
        } catch (userError) {
          console.warn(`Error fetching linked user ${uid}:`, userError);
          // Continue with other users even if one fails
        }
      }
      
      return linkedUsers;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting linked users:', error);
    throw error;
  }
};

// Soft delete user (set status to inactive)
export const deleteUser = async (userUid: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userUid);
    await updateDoc(userDocRef, {
      status: 'inactive',
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Unlink users
export const unlinkUsers = async (currentUserUid: string, otherUserUid: string): Promise<boolean> => {
  try {
    const currentUserRef = doc(db, 'users', currentUserUid);
    const otherUserRef = doc(db, 'users', otherUserUid);
    
    await updateDoc(currentUserRef, {
      linkedUsers: arrayRemove(otherUserUid),
      updatedAt: new Date()
    });
    
    await updateDoc(otherUserRef, {
      linkedUsers: arrayRemove(currentUserUid),
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error unlinking users:', error);
    throw error;
  }
};