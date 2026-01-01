/**
 * Normalize a hex color to RGB format (#RRGGBB)
 * Handles RGBA (#RRGGBBAA), extra long formats (#RRGGBBAAAA), and lowercase
 * @param {string} color - The color string to normalize
 * @returns {string} - Normalized color in #RRGGBB format
 */
export function normalizeColor(color) {
  if (!color || typeof color !== 'string') return '#FFFFFF';

  let normalized = color.toUpperCase().trim();

  // Ensure it starts with #
  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized;
  }

  // If longer than 7 chars (#RRGGBB), truncate to RGB only (remove alpha)
  if (normalized.length > 7) {
    normalized = normalized.slice(0, 7);
  }

  return normalized;
}
