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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    marginHorizontal: scale(20),
    marginVertical: verticalScale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: colors.text,
    marginBottom: verticalScale(15),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: moderateScale(12),
    padding: moderateScale(15),
    fontSize: responsiveFontSize(16),
    backgroundColor: colors.surface,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(50),
  },
  buttonText: {
    color: colors.textLight,
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  tertiaryButton: {
    backgroundColor: colors.tertiary,
  },
  purpleButton: {
    backgroundColor: colors.purple,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  outlineButtonText: {
    color: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.border,
  },
  text: {
    fontSize: responsiveFontSize(16),
    color: colors.text,
  },
  textSecondary: {
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
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
  mt10: {
    marginTop: verticalScale(10),
  },
  mt20: {
    marginTop: verticalScale(20),
  },
  mb10: {
    marginBottom: verticalScale(10),
  },
  mb20: {
    marginBottom: verticalScale(20),
  },
  p10: {
    padding: moderateScale(10),
  },
  p20: {
    padding: moderateScale(20),
  },
  flex1: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});