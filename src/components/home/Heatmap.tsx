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
          console.log('Heatmap: Generated background color for goal', index, ':', backgroundColor);
          
          // Generate a darker version of the background color for the title
          const getDarkerColor = (rgbStr: string, factor: number = 0.7): string => {
            const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (!match) return '#000000';
            
            const r = Math.max(0, Math.floor(parseInt(match[1]) * factor));
            const g = Math.max(0, Math.floor(parseInt(match[2]) * factor));
            const b = Math.max(0, Math.floor(parseInt(match[3]) * factor));
            
            return `rgb(${r}, ${g}, ${b})`;
          };
          
          const titleColor = getDarkerColor(backgroundColor);
          const weekDaysBackgroundColor = getDarkerColor(backgroundColor, 0.5); // Even darker for weekdays
          // Calculate text color for the title background
          const titleTextColor = getTextColorForBackground(backgroundColor);
          console.log('Heatmap: Calculated title text color for goal', index, ':', titleTextColor);
          // Calculate text color for the week days background
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
                                // Mark today as missed for this goal
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
                                // Mark today as completed for this goal
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
                      
                      // Get the color style for this cell
                      const colorStyle = getHeatmapDateColor(day.date, goal.id);
                      
                      // Extract the background color from the style to determine text color
                      let backgroundColor = '#FFFFFF'; // default
                      if (colorStyle && colorStyle.backgroundColor) {
                        backgroundColor = colorStyle.backgroundColor;
                      }
                      
                      // Calculate text color based on background
                      const textColor = getTextColorForBackground(backgroundColor);
                      
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
                            // Handle cell press - would mark goal progress for this day
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
    marginBottom: verticalScale(12),
  },
  heatmapTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
  },
  dailyCheckButton: {
    backgroundColor: colors.primary,
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
    padding: scale(12),
    borderWidth: 1,
    borderColor: colors.border,
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
    maxWidth: '65%',
  },
  heatmapCalendar: {
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(8),
    paddingTop: scale(8),
    backgroundColor: colors.grey100,
  },
  heatmapWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(4),
    paddingHorizontal: scale(4),
  },
  heatmapWeekDayText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
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
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: scale(1),
    borderRadius: moderateScale(4),
    backgroundColor: colors.surface,
  },
  currentMonthCell: {
    // No additional styling needed
  },
  otherMonthCell: {
    opacity: 0.4,
  },
  heatmapDateText: {
    fontSize: responsiveFontSize(10),
    fontWeight: '500',
    color: colors.text,
  },
  currentMonthDateText: {
    // No additional styling needed
  },
  otherMonthDateText: {
    color: colors.textSecondary,
  },
  heatmapDateDefault: {
    backgroundColor: colors.grey200,
  },
  heatmapDateFuture: {
    backgroundColor: colors.grey100,
  },
  heatmapDateCompleted: {
    backgroundColor: colors.success,
  },
  heatmapDateMissed: {
    backgroundColor: colors.error,
  },
  todayDateCell: {
    backgroundColor: colors.primary,
  },
  todayDateText: {
    color: colors.textLight,
    fontWeight: '600',
  },
  noGoalsText: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: verticalScale(16),
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: verticalScale(12),
    paddingHorizontal: scale(8),
    backgroundColor: colors.grey100,
    borderRadius: moderateScale(6),
    paddingVertical: verticalScale(6),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorBox: {
    width: scale(10),
    height: scale(10),
    borderRadius: moderateScale(2),
    marginRight: scale(5),
  },
  legendCompleted: {
    backgroundColor: colors.success,
  },
  legendMissed: {
    backgroundColor: colors.error,
  },
  legendDefault: {
    backgroundColor: colors.grey200,
  },
  legendText: {
    fontSize: responsiveFontSize(11),
    color: colors.text,
    fontWeight: '500',
  },
});

export default Heatmap;