import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../../theme/colors';
import { responsiveFontSize, scale, verticalScale, moderateScale } from '../../utils/responsive';

interface DateNavigationProps {
  selectedDate: Date;
  onDateChange: (direction: 'prev' | 'next') => void;
  formatDate: (date: Date) => string;
}

const DateNavigation: React.FC<DateNavigationProps> = ({ selectedDate, onDateChange, formatDate }) => {
  return (
    <View style={styles.dateNavigation}>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => onDateChange('prev')}
      >
        <Icon name="chevron-left" size={responsiveFontSize(24)} color={colors.text} />
      </TouchableOpacity>

      <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>

      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => onDateChange('next')}
      >
        <Icon name="chevron-right" size={responsiveFontSize(24)} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(12),
    marginTop: verticalScale(4),
  },
  dateButton: {
    width: verticalScale(40),
    height: verticalScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
  },
});

export default DateNavigation;