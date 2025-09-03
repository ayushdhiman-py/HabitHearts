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
    backgroundColor: colors.surface,
    borderRadius: moderateScale(8),
    marginHorizontal: scale(16),
    marginVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: scale(8),
    color: colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    color: colors.text,
  },
});

export default SearchBar;