import colors from '../theme/colors';

/**
 * Generate a purple shade based on a seed value.
 * @param seed - A number to use as a seed for color generation.
 * @returns A CSS rgb color string in purple shades.
 */
export const generateVibrantColor = (seed: number): string => {
  // Define purple shades in RGB values
  const purpleShades = [
    [230, 230, 250], // Lavender (light purple) - rgb(230, 230, 250)
    [147, 112, 219], // Medium Purple - rgb(147, 112, 219)
    [75, 0, 130],    // Indigo (dark purple) - rgb(75, 0, 130)
  ];

  // Use the seed to select a shade
  const index = Math.floor(Math.abs(Math.sin(seed * 1000)) * purpleShades.length);
  const [r, g, b] = purpleShades[index % purpleShades.length];

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
 * @param backgroundColor - RGB color string (e.g., "rgb(255, 128, 128)").
 * @returns Appropriate text color (dark text for light backgrounds, white text for dark backgrounds).
 */
/**
 * Determine if text should be dark or light based on background color.
 * Special handling for our purple palette to ensure good contrast.
 * @param backgroundColor - RGB color string (e.g., "rgb(255, 128, 128)").
 * @returns Appropriate text color (dark text for light backgrounds, white text for dark backgrounds).
 */
export const getTextColorForBackground = (backgroundColor: string): string => {
  const match = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) {
    console.log('getTextColorForBackground: No match for', backgroundColor, 'returning default black');
    return colors.text; // Default to black text
  }

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  
  console.log('getTextColorForBackground called with:', backgroundColor, 'rgb values:', r, g, b);

  // Special handling for our purple palette
  // Our colors: rgb(230, 230, 250), rgb(147, 112, 219), rgb(75, 0, 130)
  if (r >= 200 && g >= 200 && b >= 200) {
    // Very light colors (lavender) - use black text
    console.log('getTextColorForBackground: Very light color, returning black text');
    return colors.text; // Black text for very light backgrounds
  } else if (r <= 100 && g <= 50 && b >= 100) {
    // Very dark colors (indigo) - use white text
    console.log('getTextColorForBackground: Very dark color, returning white text');
    return colors.textLight; // White text for very dark backgrounds
  } else {
    // For medium colors, calculate luminance
    const luminance = getLuminance(r, g, b);
    console.log('getTextColorForBackground: Medium color, luminance:', luminance);
    // Use a lower threshold (0.3 instead of 0.5) for better contrast with medium purples
    const textColor = luminance > 0.3 ? colors.text : colors.textLight;
    console.log('getTextColorForBackground: returning', textColor);
    return textColor;
  }
};