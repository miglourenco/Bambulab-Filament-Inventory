/**
 * Color Normalization Script
 * Converts all RGBA colors to RGB in both database.json and base_dados_completa.json
 * Run automatically on app startup via init-migrations.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATABASE_FILE = path.join(DATA_DIR, 'database.json');
const MATERIALS_FILE = path.join(DATA_DIR, 'base_dados_completa.json');

/**
 * Normalize a hex color to RGB format (#RRGGBB)
 * Handles:
 * - #RRGGBBAA (8 chars after #) -> #RRGGBB
 * - #RRGGBBAAAA (10 chars after #, like #DE4343FFFF) -> #RRGGBB
 * - Already correct #RRGGBB -> unchanged
 * - Lowercase -> uppercase
 */
function normalizeColor(color) {
  if (!color || typeof color !== 'string') return color;

  let normalized = color.toUpperCase().trim();

  // Ensure it starts with #
  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized;
  }

  // If longer than 7 chars (#RRGGBB), truncate to RGB only
  if (normalized.length > 7) {
    normalized = normalized.slice(0, 7);
  }

  return normalized;
}

/**
 * Normalize colors in the materials database
 */
function normalizeMaterialsDB() {
  if (!fs.existsSync(MATERIALS_FILE)) {
    console.log('[Color Normalize] Materials file not found, skipping...');
    return { modified: 0, total: 0 };
  }

  const data = JSON.parse(fs.readFileSync(MATERIALS_FILE, 'utf8'));
  let modified = 0;

  for (const material of data) {
    if (material.color) {
      const originalColor = material.color;
      const normalizedColor = normalizeColor(originalColor);

      if (originalColor !== normalizedColor) {
        material.color = normalizedColor;
        modified++;
        console.log(`[Color Normalize] Material: ${material.name} - ${material.colorname}: ${originalColor} -> ${normalizedColor}`);
      }
    }
  }

  if (modified > 0) {
    fs.writeFileSync(MATERIALS_FILE, JSON.stringify(data, null, 2));
    console.log(`[Color Normalize] Fixed ${modified} colors in materials database`);
  }

  return { modified, total: data.length };
}

/**
 * Normalize colors in the filaments database
 */
function normalizeFilamentsDB() {
  if (!fs.existsSync(DATABASE_FILE)) {
    console.log('[Color Normalize] Database file not found, skipping...');
    return { modified: 0, total: 0 };
  }

  const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
  let modified = 0;
  let total = 0;

  if (data.filaments) {
    for (const [key, filament] of Object.entries(data.filaments)) {
      total++;
      if (filament.color) {
        const originalColor = filament.color;
        const normalizedColor = normalizeColor(originalColor);

        if (originalColor !== normalizedColor) {
          filament.color = normalizedColor;
          modified++;
          console.log(`[Color Normalize] Filament ${key}: ${originalColor} -> ${normalizedColor}`);
        }
      }
    }
  }

  if (modified > 0) {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
    console.log(`[Color Normalize] Fixed ${modified} colors in filaments database`);
  }

  return { modified, total };
}

/**
 * Run the normalization
 */
function run() {
  console.log('[Color Normalize] Starting color normalization...');

  const materialsResult = normalizeMaterialsDB();
  const filamentsResult = normalizeFilamentsDB();

  const totalModified = materialsResult.modified + filamentsResult.modified;

  if (totalModified === 0) {
    console.log('[Color Normalize] All colors are already in RGB format');
  } else {
    console.log(`[Color Normalize] Complete! Fixed ${totalModified} total colors`);
  }

  return totalModified;
}

// Export for use in migrations
module.exports = { run, normalizeColor };

// Run if executed directly
if (require.main === module) {
  run();
}
