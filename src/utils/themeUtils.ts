import { lightenColor, hexToRgb, getTextColorForBackground, darkenColor } from './colorUtils';
import colors from '../theme/colors';
import { getButtonColor } from './buttonUtils';

/**
 * Generates different shades of a base color for consistent UI theming
 * @param baseColor - The base hex color string (e.g., "#FF2B9D")
 * @returns Object containing different shades for various UI components
 */
export function generateColorShades(baseColor: string) {
  return {
    // Primary color (used for accents, highlights)
    primary: baseColor,
    
    // Status bar color (actual theme color)
    statusBar: baseColor,
    
    // Bottom tab navigator (30% lighter)
    bottomTab: lightenColor(baseColor, 30),
    
    // Screen background (80% lighter)
    screenBackground: lightenColor(baseColor, 80),
    
    // Card surfaces (70% lighter)
    surface: lightenColor(baseColor, 70),
    
    // Subtle highlights (50% lighter)
    highlight: lightenColor(baseColor, 50),
    
    // Borders and dividers (40% lighter)
    border: lightenColor(baseColor, 40),
    
    // Progress bars and indicators (20% lighter)
    progress: lightenColor(baseColor, 20),
    
    // Text colors based on background contrast
    textOnPrimary: getTextColorForBackground(hexToRgb(baseColor)),
    textOnBottomTab: getTextColorForBackground(hexToRgb(lightenColor(baseColor, 30))),
    textOnSurface: getTextColorForBackground(hexToRgb(lightenColor(baseColor, 70))),
    textOnBackground: getTextColorForBackground(hexToRgb(lightenColor(baseColor, 80))),
  };
}

/**
 * Determines appropriate text color based on background color for optimal contrast
 * @param backgroundColor - Hex color string of the background
 * @returns Appropriate text color (either dark or light)
 */
export function getTextContrastColor(backgroundColor: string): string {
  return getTextColorForBackground(hexToRgb(backgroundColor));
}

/**
 * Creates a consistent color palette for UI components
 * @param themeColor - The selected theme color
 * @returns Complete color palette with proper contrast
 */
export function createThemePalette(themeColor: string) {
  const shades = generateColorShades(themeColor);
  
  return {
    // Main theme colors
    primary: shades.primary,
    statusBar: shades.statusBar,
    bottomTab: shades.bottomTab,
    screenBackground: shades.screenBackground,
    surface: shades.surface,
    highlight: shades.highlight,
    border: shades.border,
    progress: shades.progress,
    
    // Text colors with proper contrast
    textOnPrimary: shades.textOnPrimary,
    textOnBottomTab: shades.textOnBottomTab,
    textOnSurface: shades.textOnSurface,
    textOnBackground: shades.textOnBackground,
    
    // Standard text colors
    text: colors.text,
    textLight: colors.textLight,
    textSecondary: colors.textSecondary,
    
    // Standard colors
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,

    button: getButtonColor(themeColor), // 90% intensity
    
    // Backgrounds
    background: colors.background,
    white: colors.white,
    black: colors.black,
  };
}