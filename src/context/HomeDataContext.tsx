import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { Task, subscribeToTasksForUserAndLinked } from '../services/taskService';
import { subscribeToGoalsForUserAndLinked } from '../services/goalService';
import { getGoalsProgress, GoalProgress } from '../services/goalProgressService';
import { getLinkedUsers } from '../services/userService';
import colors from '../theme/colors';

// Helper function to get a random bright color for heatmap
const getRandomBrightColor = () => {
    const brightColors = [
      { light: colors.electricBlueLight, dark: colors.electricBlueDark },
      { light: colors.hotPinkLight, dark: colors.hotPinkDark },
      { light: colors.electricGreenLight, dark: colors.electricGreenDark },
      { light: colors.vibrantOrangeLight, dark: colors.vibrantOrangeDark },
      { light: colors.brightPurpleLight, dark: colors.brightPurpleDark },
      { light: colors.sunnyYellowLight, dark: colors.sunnyYellowDark },
      { light: colors.brightRedLight, dark: colors.brightRedDark },
      { light: colors.mintLight, dark: colors.mintDark }
    ];
    return brightColors[Math.floor(Math.random() * brightColors.length)];
};


interface HomeDataContextType {
  tasks: Task[];
  goals: any[];
  goalsProgress: Record<string, GoalProgress[]>;
  heatmapColors: Record<string, {light: string, dark: string}>;
  loading: boolean;
  updateGoalProgress: (goalId: string, newProgress: GoalProgress[]) => void;
}

const HomeDataContext = createContext<HomeDataContextType | undefined>(undefined);

export const HomeDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [goalsProgress, setGoalsProgress] = useState<Record<string, GoalProgress[]>>({});
  const [heatmapColors, setHeatmapColors] = useState<Record<string, {light: string, dark: string}>>({});

  const fetchLinkedUsers = useCallback(async () => {
    if (user?.uid) {
      try {
        const linkedUsers = await getLinkedUsers(user.uid);
        return linkedUsers.map((u: any) => u.uid);
      } catch (error) {
        console.error('Error fetching linked users:', error);
        return [];
      }
    }
    return [];
  }, [user?.uid]);

  // Function to update goal progress
  const updateGoalProgress = useCallback((goalId: string, newProgress: GoalProgress[]) => {
    setGoalsProgress(prev => ({
      ...prev,
      [goalId]: newProgress
    }));
  }, []);

  // Memoize the value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    tasks,
    goals,
    goalsProgress,
    heatmapColors,
    loading,
    updateGoalProgress
  }), [tasks, goals, goalsProgress, heatmapColors, loading, updateGoalProgress]);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setGoals([]);
      setGoalsProgress({});
      setLoading(false);
      return;
    }

    let isMounted = true;
    let tasksUnsubscribe: (() => void) | null = null;
    let goalsUnsubscribe: (() => void) | null = null;

    const setupListeners = async () => {
      setLoading(true);
      const linkedUids = await fetchLinkedUsers();

      if (!isMounted) return;

      tasksUnsubscribe = subscribeToTasksForUserAndLinked(user.uid, linkedUids, (fetchedTasks) => {
        if (isMounted) {
          // Only update if the tasks have actually changed
          setTasks(prevTasks => {
            // Simple equality check - in a real app, you might want a deeper comparison
            if (JSON.stringify(prevTasks) === JSON.stringify(fetchedTasks)) {
              return prevTasks;
            }
            return fetchedTasks;
          });
        }
      });

      goalsUnsubscribe = subscribeToGoalsForUserAndLinked(user.uid, linkedUids, (fetchedGoals) => {
        if (isMounted) {
          // Only update if the goals have actually changed
          setGoals(prevGoals => {
            // Simple equality check - in a real app, you might want a deeper comparison
            if (JSON.stringify(prevGoals) === JSON.stringify(fetchedGoals)) {
              return prevGoals;
            }
            return fetchedGoals;
          });
          
          // Only fetch progress for goals if there are new goals or if progress data is empty
          if (fetchedGoals.length > 0) {
            // Get the IDs of goals we don't have progress data for yet
            const goalsNeedingProgress = fetchedGoals.filter(
              (goal: any) => !goalsProgress[goal.id] || goalsProgress[goal.id].length === 0
            );
            
            if (goalsNeedingProgress.length > 0) {
              const goalIds = goalsNeedingProgress.map((g: any) => g.id);
              getGoalsProgress(goalIds, user.uid).then(progressData => {
                if (isMounted) {
                  // Merge new progress data with existing progress data
                  setGoalsProgress(prevProgress => {
                    const updatedProgress = { ...prevProgress };
                    let hasChanges = false;
                    
                    progressData.forEach(p => {
                      if (!updatedProgress[p.goalId]) {
                        updatedProgress[p.goalId] = [];
                        hasChanges = true;
                      }
                      // Avoid duplicates by checking if the progress entry already exists
                      const exists = updatedProgress[p.goalId].some(
                        existing => existing.date === p.date
                      );
                      if (!exists) {
                        updatedProgress[p.goalId].push(p);
                        hasChanges = true;
                      }
                    });
                    
                    // Only update state if there are actual changes
                    if (hasChanges) {
                      return updatedProgress;
                    }
                    return prevProgress;
                  });
                }
              }).catch(error => {
                console.error('Error fetching goals progress:', error);
              });
            }
          } else {
            setGoalsProgress(prevProgress => {
              // Only update if not already empty
              if (Object.keys(prevProgress).length > 0) {
                return {};
              }
              return prevProgress;
            });
          }
        }
      });
      
      // Only set loading to false after both listeners are set up
      if (isMounted) {
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
      if (tasksUnsubscribe) tasksUnsubscribe();
      if (goalsUnsubscribe) goalsUnsubscribe();
    };
  }, [user, fetchLinkedUsers]); // Removed goalsProgress from dependencies to prevent infinite loop

  // Separate effect for heatmap colors to avoid unnecessary re-renders
  useEffect(() => {
    if (goals.length === 0) return;
    
    setHeatmapColors(prevColors => {
      const newHeatmapColors: Record<string, {light: string, dark: string}> = {};
      let hasNewColors = false;
      
      goals.forEach(goal => {
        if (!prevColors[goal.id]) {
          newHeatmapColors[goal.id] = getRandomBrightColor();
          hasNewColors = true;
        }
      });
      
      if (hasNewColors) {
        return { ...prevColors, ...newHeatmapColors };
      }
      return prevColors;
    });
  }, [goals]); // Only depend on goals


  return (
    <HomeDataContext.Provider value={value}>
      {children}
    </HomeDataContext.Provider>
  );
};

export const useHomeData = () => {
  const context = useContext(HomeDataContext);
  if (context === undefined) {
    throw new Error('useHomeData must be used within a HomeDataProvider');
  }
  return context;
};