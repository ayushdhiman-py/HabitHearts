
import { StyleSheet } from 'react-native';
import { responsiveFontSize, scale, verticalScale, moderateScale } from '../utils/responsive';

export const premiumColors = {
  deepTeal: '#00CC99',
  warmCream: '#FFFFFF',
  punchyCoral: '#FF3838',
  deepNavy: '#1A1A1A',
  softLavender: '#9932CC',
  goldenAccent: '#FFD700',

  // Assigning to theme roles
  primary: '#FF3838', // Electric Red for CTAs
  secondary: '#9932CC', // Bold Purple for secondary actions
  background: '#FFFFFF', // Clean White for backgrounds
  surface: '#FFFFFF',
  text: '#1A1A1A', // Deep Charcoal for primary text
  textSecondary: '#00CC99', // Electric Teal for secondary text
  accent: '#FFD700', // Golden Accent for highlights

  // Standard colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Status and utility colors
  success: '#00CC66', // Electric Green
  error: '#FF3838', // Electric Red
  warning: '#FFD700', // Golden Accent
};

export const premiumStyles = StyleSheet.create({
  // Global styles
  container: {
    flex: 1,
    backgroundColor: premiumColors.background,
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
    backgroundColor: premiumColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: premiumColors.deepTeal,
  },
  headerTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '600',
    color: premiumColors.text,
  },
  card: {
    backgroundColor: premiumColors.surface,
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginHorizontal: scale(16),
    marginVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: premiumColors.deepTeal,
    shadowColor: premiumColors.deepNavy,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: premiumColors.text,
    marginBottom: verticalScale(12),
  },
  input: {
    borderWidth: 1,
    borderColor: premiumColors.deepTeal,
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    fontSize: responsiveFontSize(16),
    backgroundColor: premiumColors.surface,
    color: premiumColors.text,
  },
  button: {
    backgroundColor: premiumColors.primary,
    borderRadius: moderateScale(25),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(50),
    shadowColor: premiumColors.punchyCoral,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: premiumColors.white,
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: premiumColors.secondary,
    shadowColor: premiumColors.softLavender,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: premiumColors.primary,
  },
  outlineButtonText: {
    color: premiumColors.primary,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
    elevation: 0,
    shadowOpacity: 0,
  },
  text: {
    fontSize: responsiveFontSize(16),
    color: premiumColors.text,
    lineHeight: responsiveFontSize(24),
  },
  textSecondary: {
    fontSize: responsiveFontSize(14),
    color: premiumColors.textSecondary,
    lineHeight: responsiveFontSize(20),
  },
  // Spacing and layout
  flex1: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
});
