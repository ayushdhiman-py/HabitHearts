import React from 'react';
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

const getDarkerColor = (rgbStr: string, factor: number = 0.7): string => {
  const match = rgbStr.match(/rgb\((\\d+),\s*(\\d+),\s*(\\d+)\)/);
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
  return (
    <View style={styles.heatmapContainer}>
      <View style={styles.heatmapHeader}>
        <Text style={styles.heatmapTitle}>Your Goals Progress</Text>
      </View>
      
      {goals.length > 0 ? (
        goals.map((goal, index) => {
          const backgroundColor = generateVibrantColor(index);
          
          const titleColor = getDarkerColor(backgroundColor);
          const weekDaysBackgroundColor = getDarkerColor(backgroundColor, 0.5); // Even darker for weekdays
          const titleTextColor = getTextColorForBackground(backgroundColor);
          const weekDaysTextColor = getTextColorForBackground(weekDaysBackgroundColor);
          
          return (
            <View key={goal.id} style={styles.goalHeatmapContainer}>
              <View style={[styles.goalHeatmap, { backgroundColor }]}>
                <View style={styles.goalHeader}>
                  <Text style={[styles.goalName, { color: titleTextColor }]} numberOfLines={1}>
                    {goal.text}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.dailyCheckButton, { backgroundColor: titleColor }]}
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
                    <Text style={styles.dailyCheckButtonText}>Done Today?</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.heatmapCalendar, { backgroundColor: titleColor }]}>
                  {/* Days of week header */}
                  <View style={[styles.heatmapWeekDays, { backgroundColor: weekDaysBackgroundColor }]}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <Text key={index} style={[styles.heatmapWeekDayText, { color: weekDaysTextColor }]}>
                        {day}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.heatmapGrid}>
                    {heatmapDaysRef.current.map((day, dayIndex) => {
                      const dateStr = day.date.toISOString().split('T')[0];
                      const goalProgress = goalsProgress[goal.id] || [];
                      const progressRecord = goalProgress.find(p => p.date === dateStr);
                      
                      const colorStyle = getHeatmapDateColor(day.date, goal.id);
                      
                      let cellBackgroundColor = '#FFFFFF'; // default
                      if (colorStyle && colorStyle.backgroundColor) {
                        cellBackgroundColor = colorStyle.backgroundColor;
                      }
                      
                      const textColor = getTextColorForBackground(cellBackgroundColor);
                      
                      return (
                        <TouchableOpacity
                          key={`${goal.id}-${dateStr}-${dayIndex}`}
                          style={[
                            styles.heatmapDateCell,
                            day.isCurrentMonth ? styles.currentMonthCell : styles.otherMonthCell,
                            isToday(day.date) && styles.todayDateCell,
                            colorStyle
                          ]}
                          onPress={() => {
                            onDatePress(day.date, goal.id);
                          }}
                          disabled={!day.isCurrentMonth}
                        >
                          <Text style={[
                            styles.heatmapDateText,
                            { color: textColor },
                            day.isCurrentMonth ? styles.currentMonthDateText : styles.otherMonthDateText,
                            isToday(day.date) && styles.todayDateText
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
                    <View style={[styles.legendColorBox, styles.legendCompleted]} />
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
      )})
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
    backgroundColor: colors.secondary,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(16),
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.gray100,
  },
  heatmapWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(4),
    paddingHorizontal: scale(4),
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gray200,
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
    color: colors.text,
  },
  currentMonthDateText: {
    // No additional styling needed
  },
  otherMonthDateText: {
    color: colors.textSecondary,
  },
  heatmapDateDefault: {
    backgroundColor: colors.gray200,
    borderColor: colors.gray300,
  },
  heatmapDateFuture: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray200,
  },
  heatmapDateCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.successDark,
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  heatmapDateMissed: {
    backgroundColor: colors.error,
    borderColor: colors.errorDark,
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  todayDateCell: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    // Add glow effect for today
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  todayDateText: {
    color: colors.textLight,
    fontWeight: '700',
  },
  // Removed tick mark styles
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
    backgroundColor: colors.gray50,
    borderRadius: moderateScale(10),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: colors.border,
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
  legendCompleted: {
    backgroundColor: colors.success,
  },
  legendMissed: {
    backgroundColor: colors.error,
  },
  legendDefault: {
    backgroundColor: colors.gray200,
  },
  legendText: {
    fontSize: responsiveFontSize(12),
    color: colors.text,
    fontWeight: '600',
  },
});

export default Heatmap;
