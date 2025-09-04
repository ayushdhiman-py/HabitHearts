import colors from '../theme/colors';

/**
 * Generate a vibrant color from our rainbow palette based on a seed value.
 * @param seed - A number to use as a seed for color generation.
 * @returns A CSS rgb color string from our rainbow palette.
 */
export const generateVibrantColor = (seed: number): string => {
  // Define our rainbow palette in RGB values
  const rainbowColors = [
    [255, 107, 107], // Coral red - rgb(255, 107, 107)
    [255, 160, 122], // Light salmon - rgb(255, 160, 122)
    [255, 209, 102], // Warm yellow - rgb(255, 209, 102)
    [6, 214, 160],   // Mint green - rgb(6, 214, 160)
    [17, 138, 178],  // Sky blue - rgb(17, 138, 178)
    [7, 59, 76],     // Deep blue - rgb(7, 59, 76)
    [131, 56, 236],  // Vibrant purple - rgb(131, 56, 236)
  ];

  // Use the seed to select a color
  const index = Math.floor(Math.abs(Math.sin(seed * 1000)) * rainbowColors.length);
  const [r, g, b] = rainbowColors[index % rainbowColors.length];

  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Calculate the luminance of an RGB color.
 * @param r - Red component (0-255).
 * @param g - Green component (0-255).
 * @param b - Blue component (0-255).
 * @returns Luminance value (0-1).
 */
const getLuminance = (r: number, g: number, b: number): number => {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

/**
 * Determine if text should be dark or light based on background color.
 * Special handling for our rainbow palette to ensure good contrast.
 * @param backgroundColor - RGB color string (e.g., "rgb(255, 128, 128)").
 * @returns Appropriate text color (dark text for light backgrounds, white text for dark backgrounds).
 */
export const getTextColorForBackground = (backgroundColor: string): string => {
  const match = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) {
    return colors.text; // Default to black text
  }

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  // Special handling for our rainbow palette
  // Light colors - use dark text
  if (r >= 200 && g >= 200) {
    // Very light colors (yellow, coral, salmon) - use dark text
    return colors.text; // Black text for very light backgrounds
  } else if (r <= 50 && g <= 50 && b <= 50) {
    // Very dark colors (deep blue, dark purple) - use white text
    return colors.textLight; // White text for very dark backgrounds
  } else {
    // For medium colors, calculate luminance
    const luminance = getLuminance(r, g, b);
    // Use a threshold of 0.4 for better contrast with our vibrant colors
    return luminance > 0.4 ? colors.text : colors.textLight;
  }
};