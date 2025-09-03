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
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(15),
    backgroundColor: 'white',
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  heatmapTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: colors.black,
  },
  dailyCheckButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(20),
  },
  dailyCheckButtonText: {
    color: '#FFFFFF', // Always white
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
  },
  goalHeatmapContainer: {
    width: '100%',
    marginBottom: verticalScale(15),
  },
  goalHeatmap: {
    borderRadius: moderateScale(15),
    padding: scale(10),
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    maxWidth: '65%',
  },
  heatmapCalendar: {
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(10),
    paddingTop: scale(10),
    backgroundColor: '#f8f9fa',
  },
  heatmapWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(2),
    paddingHorizontal: scale(5),
  },
  heatmapWeekDayText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    color: '#FFFFFF', // Always white
    width: '14.28%',
    textAlign: 'center',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: verticalScale(5),
  },
  heatmapDateCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: scale(1),
    borderRadius: moderateScale(8),
    backgroundColor: '#FFFFFF', // Always white
  },
  currentMonthCell: {
    // No additional styling needed
  },
  otherMonthCell: {
    opacity: 0.3,
  },
  heatmapDateText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '500',
    color: '#000000', // Always black
  },
  currentMonthDateText: {
    // No additional styling needed, using default black
  },
  otherMonthDateText: {
    color: '#999999', // Lighter gray for other months
  },
  heatmapDateDefault: {
    backgroundColor: '#e9ecef', // Light grey for unmarked days
  },
  heatmapDateFuture: {
    backgroundColor: '#f8f9fa', // Very light grey for future days
  },
  heatmapDateCompleted: {
    backgroundColor: '#4caf50', // Green for completed
  },
  heatmapDateMissed: {
    backgroundColor: '#f44336', // Red for missed
  },
  todayDateCell: {
    backgroundColor: colors.primary,
    // Removed border styling
  },
  todayDateText: {
    color: colors.white,
    fontWeight: '700',
  },
  noGoalsText: {
    fontSize: responsiveFontSize(14),
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: verticalScale(20),
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: verticalScale(10),
    paddingHorizontal: scale(5),
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white background for better contrast
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(5),
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
    backgroundColor: '#4caf50',
  },
  legendMissed: {
    backgroundColor: '#f44336',
  },
  legendDefault: {
    backgroundColor: '#e9ecef',
  },
  legendText: {
    fontSize: responsiveFontSize(11),
    color: colors.text, // Use theme text color
    fontWeight: '500',
  },
});

export default Heatmap;