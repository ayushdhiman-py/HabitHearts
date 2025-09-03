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
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(15),
    marginTop: verticalScale(5),
  },
  dateButton: {
    width: verticalScale(45),
    height: verticalScale(45),
    borderRadius: moderateScale(22.5),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: responsiveFontSize(19),
    fontWeight: '700',
    color: colors.black,
  },
});

export default DateNavigation;