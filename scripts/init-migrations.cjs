/**
 * Initialization and Migration Script
 *
 * This script runs automatically on service startup to ensure:
 * 1. Materials database has variation field extracted
 * 2. User filaments have variation field added
 *
 * Safe to run multiple times - idempotent operations
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('Starting Database Migrations...');
console.log('='.repeat(60));
console.log('');

// ========================================
// MIGRATION 1: Materials Database Variations
// ========================================

function extractVariationFromName(name, material) {
  // Remove BOM if present
  name = name.replace(/^\uFEFF/, '');

  // Expected format: "Bambu [MATERIAL] [VARIATION]"
  if (!name.startsWith('Bambu ')) {
    return null;
  }

  const afterBambu = name.substring(6).trim();
  if (!afterBambu.startsWith(material)) {
    return null;
  }

  const afterMaterial = afterBambu.substring(material.length).trim();
  return afterMaterial.length > 0 ? afterMaterial : null;
}

function migrateMaterialsDatabase() {
  console.log('[MIGRATION 1] Materials Database - Adding variation field');
  console.log('-'.repeat(60));

  const materialsDbPath = path.join(__dirname, '..', 'data', 'base_dados_completa.json');

  if (!fs.existsSync(materialsDbPath)) {
    console.log('⚠️  Materials database not found, skipping...\n');
    return;
  }

  const materials = JSON.parse(fs.readFileSync(materialsDbPath, 'utf8'));
  let updated = 0;
  let skipped = 0;

  materials.forEach((item) => {
    // Skip if variation field already exists and is not undefined
    if (item.hasOwnProperty('variation') && item.variation !== undefined) {
      skipped++;
      return;
    }

    // Process BambuLab materials
    if (item.manufacturer && item.manufacturer.toLowerCase().includes('bambu')) {
      const variation = extractVariationFromName(item.name, item.material);
      item.variation = variation || '';
      updated++;
    } else {
      item.variation = '';
      updated++;
    }
  });

  // Save updated database
  fs.writeFileSync(materialsDbPath, JSON.stringify(materials, null, 2));

  console.log(`✅ Materials database migration complete`);
  console.log(`   - Total materials: ${materials.length}`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Already had variation: ${skipped}`);
  console.log('');
}

// ========================================
// MIGRATION 2: User Filaments Variations
// ========================================

function migrateUserFilaments() {
  console.log('[MIGRATION 2] User Filaments - Adding variation field');
  console.log('-'.repeat(60));

  const userDbPath = path.join(__dirname, '..', 'data', 'database.json');

  if (!fs.existsSync(userDbPath)) {
    console.log('ℹ️  User database not found yet (normal on first run)\n');
    return;
  }

  const database = JSON.parse(fs.readFileSync(userDbPath, 'utf8'));

  if (!database.filaments || Object.keys(database.filaments).length === 0) {
    console.log('ℹ️  No filaments in database yet\n');
    return;
  }

  const filamentIds = Object.keys(database.filaments);
  let updated = 0;
  let skipped = 0;

  filamentIds.forEach((tag_uid) => {
    const filament = database.filaments[tag_uid];

    // Skip if variation field already exists and is not undefined
    if (filament.hasOwnProperty('variation') && filament.variation !== undefined) {
      skipped++;
      return;
    }

    const isBambu = filament.manufacturer &&
                    filament.manufacturer.toLowerCase().includes('bambu');

    if (isBambu) {
      const variation = extractVariationFromName(filament.name, filament.type);
      filament.variation = variation || '';
    } else {
      filament.variation = '';
    }

    updated++;
  });

  // Save updated database
  fs.writeFileSync(userDbPath, JSON.stringify(database, null, 2));

  console.log(`✅ User filaments migration complete`);
  console.log(`   - Total filaments: ${filamentIds.length}`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Already had variation: ${skipped}`);
  console.log('');
}

// ========================================
// MIGRATION 3: Normalize Colors (RGBA -> RGB)
// ========================================

function normalizeColors() {
  console.log('[MIGRATION 3] Color Normalization - Converting RGBA to RGB');
  console.log('-'.repeat(60));

  const normalizeColorScript = require('./normalize-colors.cjs');
  const result = normalizeColorScript.run();

  console.log('');
  return result;
}

// ========================================
// RUN ALL MIGRATIONS
// ========================================

try {
  migrateMaterialsDatabase();
  migrateUserFilaments();
  normalizeColors();

  console.log('='.repeat(60));
  console.log('All migrations completed successfully!');
  console.log('='.repeat(60));
  console.log('');
} catch (error) {
  console.error('Migration failed:', error);
  console.error(error.stack);
  process.exit(1);
}
