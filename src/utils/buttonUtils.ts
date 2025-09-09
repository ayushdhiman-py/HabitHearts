/**
 * Reduces the intensity of a hex color by a given percentage.
 * @param hex - The hex color string (e.g., "#RRGGBB").
 * @param percent - The percentage to reduce the color intensity (0-100).
 * @returns The reduced intensity hex color string.
 */
function reduceColorIntensity(hex: string, percent: number): string {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');

  // Parse the r, g, b values
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Calculate the reduction amount (90% means we keep 90% of the original intensity)
  const reductionFactor = percent / 100;

  // Reduce the intensity
  r = Math.round(r * reductionFactor);
  g = Math.round(g * reductionFactor);
  b = Math.round(b * reductionFactor);

  // Convert back to hex
  const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates a consistent button color based on the theme color with 90% intensity
 * @param themeColor - The base theme color
 * @returns A color with 90% intensity of the theme color
 */
export function getButtonColor(themeColor: string): string {
  // Use 90% intensity of the original color
  return reduceColorIntensity(themeColor, 90);
}