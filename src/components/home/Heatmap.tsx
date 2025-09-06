import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import colors from '../../theme/colors';
import { responsiveFontSize, scale, verticalScale, moderateScale, widthPercentage } from '../../utils/responsive';
import { GoalProgress } from '../../services/goalProgressService';
import { getTextColorForBackground } from '../../utils/colorUtils';

interface HeatmapProps {
  goals: any[];
  goalsProgress: Record<string, GoalProgress[]>;
  user: any;
  heatmapDaysRef: React.MutableRefObject<any[]>;
  onMarkGoalProgress: (goalId: string, date: Date, completed: boolean) => Promise<void>;
  onDatePress: (date: Date, goalId: string) => void;
  isToday: (date: Date) => boolean;
  getHeatmapDateColor: (date: Date, goalId: string) => any;
  generateVibrantColor: (seed: number) => string;
}

// Function to generate a random bright color from our palette
const getRandomBrightColor = (): { light: string; dark: string } => {
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

const getDarkerColor = (rgbStr: string, factor: number = 0.7): string => {
  const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#000000';
  
  const r = Math.max(0, Math.floor(parseInt(match[1]) * factor));
  const g = Math.max(0, Math.floor(parseInt(match[2]) * factor));
  const b = Math.max(0, Math.floor(parseInt(match[3]) * factor));
  
  return `rgb(${r}, ${g}, ${b})`;
};

const Heatmap: React.FC<HeatmapProps> = ({
  goals,
  goalsProgress,
  user,
  heatmapDaysRef,
  onMarkGoalProgress,
  onDatePress,
  isToday,
  getHeatmapDateColor,
  generateVibrantColor,
}) => {
  // State to store colors for each heatmap
  const [heatmapColors, setHeatmapColors] = useState<Record<string, { light: string; dark: string }>>({});

  // Initialize colors for each goal
  useEffect(() => {
    const newColors: Record<string, { light: string; dark: string }> = {};
    goals.forEach(goal => {
      if (!heatmapColors[goal.id]) {
        newColors[goal.id] = getRandomBrightColor();
      }
    });
    if (Object.keys(newColors).length > 0) {
      setHeatmapColors(prev => ({ ...prev, ...newColors }));
    }
  }, [goals]);

  return (
    <View style={styles.heatmapContainer}>
      <View style={styles.heatmapHeader}>
        <Text style={styles.heatmapTitle}>Your Goals Progress</Text>
      </View>
      
      {goals.length > 0 ? (
        goals.map((goal, index) => {
          // Get the bright color for this heatmap
          const { light: backgroundColor, dark: darkColor } = heatmapColors[goal.id] || { light: colors.electricBlueLight, dark: colors.electricBlueDark };
          
          // Use darker version for title and progress bar
          const titleColor = darkColor;
          const weekDaysBackgroundColor = getDarkerColor(backgroundColor, 0.5); // Even darker for weekdays
          const titleTextColor = getTextColorForBackground(backgroundColor);
          const weekDaysTextColor = getTextColorForBackground(weekDaysBackgroundColor);
          
          return (
            <View key={goal.id} style={styles.goalHeatmapContainer}>
              <View style={[styles.goalHeatmap, { backgroundColor }]}>
                <View style={styles.goalHeader}>
                  <Text style={[styles.goalName, { color: titleColor }]} numberOfLines={1}>
                    {goal.text}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.dailyCheckButton, { 
                      backgroundColor: `${darkColor}33`, // Glass effect with dark color
                      borderColor: darkColor,
                      borderWidth: 1
                    }]}
                    onPress={() => {
                      if (user) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); // Normalize the time
                        Alert.alert(
                          'Daily Check-in',
                          `Did you complete "${goal.text}" today?`,
                          [
                            {
                              text: 'No', 
                              onPress: async () => {
                                try {
                                  await onMarkGoalProgress(goal.id, today, false);
                                } catch (error) {
                                  console.error('Error marking goal as missed:', error);
                                }
                              }
                            },
                            {
                              text: 'Yes', 
                              onPress: async () => {
                                try {
                                  await onMarkGoalProgress(goal.id, today, true);
                                } catch (error) {
                                  console.error('Error marking goal as completed:', error);
                                }
                              }
                            }
                          ]
                        );
                      }
                    }}
                  >
                    <Text style={[styles.dailyCheckButtonText, { color: titleColor }]}>Done Today?</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.heatmapCalendar, { backgroundColor: `${backgroundColor}80` }]}>
                  {/* Days of week header */}
                  <View style={[styles.heatmapWeekDays, { backgroundColor: darkColor }]}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <Text key={index} style={[styles.heatmapWeekDayText, { color: colors.textLight }]}>
                        {day}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.heatmapGrid}>
                    {heatmapDaysRef.current.map((day, dayIndex) => {
                      const dateStr = day.date.toISOString().split('T')[0];
                      const goalProgress = goalsProgress[goal.id] || [];
                      const progressRecord = goalProgress.find(p => p.date === dateStr);
                      
                      // Determine cell color based on progress
                      let cellBackgroundColor = `${backgroundColor}60`; // Default light background
                      let cellTextColor = getTextColorForBackground(cellBackgroundColor);
                      
                      if (progressRecord) {
                        if (progressRecord.completed) {
                          // Completed day - use dark background color
                          cellBackgroundColor = darkColor;
                          cellTextColor = colors.textLight;
                        } else {
                          // Missed day - use error color
                          cellBackgroundColor = colors.error;
                          cellTextColor = colors.textLight;
                        }
                      } else {
                        // Future or unmarked date
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const checkDate = new Date(day.date);
                        checkDate.setHours(0, 0, 0, 0);
                        
                        if (checkDate > today) {
                          // Future date - lighter background
                          cellBackgroundColor = `${backgroundColor}40`;
                        } else {
                          // Past unmarked date - default light background
                          cellBackgroundColor = `${backgroundColor}60`;
                        }
                      }
                      
                      // Special handling for today
                      const isTodayDate = isToday(day.date);
                      if (isTodayDate) {
                        cellBackgroundColor = darkColor;
                        cellTextColor = colors.textLight;
                      }
                      
                      // Special handling for streak days (highlight with yellow)
                      const isStreakDay = false; // We'll implement this logic properly in MainHomeScreen
                      
                      return (
                        <TouchableOpacity
                          key={`${goal.id}-${dateStr}-${dayIndex}`}
                          style={[
                            styles.heatmapDateCell,
                            day.isCurrentMonth ? styles.currentMonthCell : styles.otherMonthCell,
                            isTodayDate && styles.todayDateCell,
                            {
                              backgroundColor: isStreakDay ? colors.streakHighlight : cellBackgroundColor,
                              borderColor: isStreakDay ? colors.streakHighlight : darkColor,
                            }
                          ]}
                          onPress={() => {
                            onDatePress(day.date, goal.id);
                          }}
                          disabled={!day.isCurrentMonth}
                        >
                          <Text style={[
                            styles.heatmapDateText,
                            { color: isStreakDay ? colors.text : cellTextColor },
                            day.isCurrentMonth ? styles.currentMonthDateText : styles.otherMonthDateText,
                            isTodayDate && styles.todayDateText
                          ]}>
                            {day.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                {/* Heatmap Legend */}
                <View style={styles.heatmapLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColorBox, { backgroundColor: darkColor }]} />
                    <Text style={styles.legendText}>Completed</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColorBox, styles.legendMissed]} />
                    <Text style={styles.legendText}>Missed</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColorBox, styles.legendDefault]} />
                    <Text style={styles.legendText}>Not Marked</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.noGoalsText}>No goals yet. Add goals to see your progress heatmap.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  heatmapContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: colors.surface,
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  heatmapTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
  },
  dailyCheckButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(16),
    // Glass effect with no shadow
  },
  dailyCheckButtonText: {
    color: colors.textLight,
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
  },
  goalHeatmapContainer: {
    width: '100%',
    marginBottom: verticalScale(12),
  },
  goalHeatmap: {
    borderRadius: moderateScale(12),
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    height: '100%',
    // Flat surface with no shadow
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  goalName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.text,
    maxWidth: '65%',
    lineHeight: responsiveFontSize(22),
  },
  heatmapCalendar: {
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(8),
    paddingTop: scale(8),
  },
  heatmapWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(4),
    paddingHorizontal: scale(4),
    borderRadius: moderateScale(6),
    paddingVertical: verticalScale(4),
  },
  heatmapWeekDayText: {
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
    color: colors.textLight,
    width: '14.28%',
    textAlign: 'center',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: verticalScale(4),
  },
  heatmapDateCell: {
    width: '12%', // Reduced width to prevent overflow
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: scale(1),
    borderRadius: moderateScale(6),
    borderWidth: 1,
    // Flat surface with no shadow
  },
  currentMonthCell: {
    // No additional styling needed
  },
  otherMonthCell: {
    opacity: 0.3,
  },
  heatmapDateText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
  },
  currentMonthDateText: {
    // No additional styling needed
  },
  otherMonthDateText: {
    color: colors.textSecondary,
  },
  todayDateCell: {
    // No shadow for today cell
  },
  todayDateText: {
    color: colors.textLight,
    fontWeight: '700',
  },
  noGoalsText: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: verticalScale(20),
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: scale(12),
    marginTop: verticalScale(16),
    borderRadius: moderateScale(10),
    paddingVertical: verticalScale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorBox: {
    width: scale(14),
    height: scale(14),
    borderRadius: moderateScale(3),
    marginRight: scale(6),
  },
  legendMissed: {
    backgroundColor: colors.error,
  },
  legendDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  legendText: {
    fontSize: responsiveFontSize(12),
    color: colors.text,
    fontWeight: '600',
  },
});

export default Heatmap;