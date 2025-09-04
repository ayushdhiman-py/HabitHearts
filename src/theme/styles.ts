import { StyleSheet } from 'react-native';
import colors from './colors';
import { responsiveFontSize, scale, verticalScale, moderateScale } from '../utils/responsive';

export default StyleSheet.create({
  // Global styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '600',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginHorizontal: scale(16),
    marginVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
    marginBottom: verticalScale(12),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    fontSize: responsiveFontSize(16),
    backgroundColor: colors.surface,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(48),
  },
  buttonText: {
    color: colors.textLight,
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  tertiaryButton: {
    backgroundColor: colors.gray200,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlineButtonText: {
    color: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.gray300,
  },
  text: {
    fontSize: responsiveFontSize(16),
    color: colors.text,
    lineHeight: responsiveFontSize(24),
  },
  textSecondary: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    lineHeight: responsiveFontSize(20),
  },
  textCenter: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  alignItemsCenter: {
    alignItems: 'center',
  },
  mt8: {
    marginTop: verticalScale(8),
  },
  mt16: {
    marginTop: verticalScale(16),
  },
  mb8: {
    marginBottom: verticalScale(8),
  },
  mb16: {
    marginBottom: verticalScale(16),
  },
  p8: {
    padding: moderateScale(8),
  },
  p16: {
    padding: moderateScale(16),
  },
  flex1: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});