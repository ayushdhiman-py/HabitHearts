import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../../theme/colors';
import { responsiveFontSize, scale, verticalScale, moderateScale } from '../../utils/responsive';

interface SearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, onSearchQueryChange }) => {
  return (
    <View style={styles.searchContainer}>
      <Icon name="search" size={responsiveFontSize(20)} color={colors.textSecondary} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search tasks..."
        value={searchQuery}
        onChangeText={onSearchQueryChange}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: moderateScale(15),
    marginHorizontal: scale(20),
    marginVertical: verticalScale(10),
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: colors.white,
  },
  searchIcon: {
    marginRight: scale(12),
    color: colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    color: colors.text,
    fontWeight: '500',
  },
});

export default SearchBar;