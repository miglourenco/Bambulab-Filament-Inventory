const fs = require('fs');
const path = require('path');

// Load the user database
const databasePath = path.join(__dirname, 'data', 'database.json');

if (!fs.existsSync(databasePath)) {
  console.log('❌ User database not found at:', databasePath);
  console.log('This is normal if you haven\'t started using the application yet.');
  process.exit(0);
}

const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));

console.log('Starting migration of user filaments...\n');

// Function to extract variation from name
function extractVariation(name, type) {
  // Remove BOM if present
  name = name.replace(/^\uFEFF/, '');

  // Expected format: "Bambu [TYPE] [VARIATION]"
  // Examples:
  // "Bambu PLA Matte" -> type: PLA, variation: Matte
  // "Bambu PETG HF" -> type: PETG, variation: HF
  // "Bambu ASA-CF" -> type: ASA-CF, no variation (hyphenated type)
  // "Bambu ABS" -> type: ABS, no variation

  // First, check if name starts with "Bambu "
  if (!name.startsWith('Bambu ')) {
    return null;
  }

  // Remove "Bambu " prefix
  const afterBambu = name.substring(6).trim();

  // Check if the type is in the name
  if (!afterBambu.startsWith(type)) {
    return null;
  }

  // Get everything after the type
  const afterType = afterBambu.substring(type.length).trim();

  // If there's something left, that's the variation
  if (afterType.length > 0) {
    return afterType;
  }

  return null;
}

// Process filaments and add variation field
let updatedCount = 0;
let totalFilaments = 0;
let bambuFilaments = 0;
let nonBambuFilaments = 0;
const variationsFound = new Set();

if (database.filaments) {
  const filamentIds = Object.keys(database.filaments);
  totalFilaments = filamentIds.length;

  console.log(`Found ${totalFilaments} filaments in database\n`);

  filamentIds.forEach((tag_uid) => {
    const filament = database.filaments[tag_uid];

    // Check if it's a BambuLab filament
    const isBambu = filament.manufacturer &&
                    filament.manufacturer.toLowerCase().includes('bambu');

    if (isBambu) {
      bambuFilaments++;
      const variation = extractVariation(filament.name, filament.type);

      if (variation) {
        filament.variation = variation;
        updatedCount++;
        variationsFound.add(variation);
        console.log(`[${tag_uid}] ${filament.name} -> variation: "${variation}"`);
      } else {
        filament.variation = '';
      }
    } else {
      nonBambuFilaments++;
      // Non-BambuLab filaments have no variation
      filament.variation = '';
    }
  });
} else {
  console.log('No filaments found in database');
}

console.log('\n=== Migration Summary ===');
console.log(`Total filaments: ${totalFilaments}`);
console.log(`BambuLab filaments: ${bambuFilaments}`);
console.log(`Non-BambuLab filaments: ${nonBambuFilaments}`);
console.log(`Filaments with variation extracted: ${updatedCount}`);
console.log(`Filaments without variation: ${bambuFilaments - updatedCount}`);
console.log(`\nUnique variations found: ${variationsFound.size}`);
if (variationsFound.size > 0) {
  console.log(Array.from(variationsFound).sort().join(', '));
}

// Create backup
const backupPath = path.join(__dirname, 'data', 'database.backup.json');
fs.writeFileSync(backupPath, fs.readFileSync(databasePath, 'utf8'));
console.log(`\n✅ Backup created: ${backupPath}`);

// Save updated database
fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
console.log(`✅ Updated database saved: ${databasePath}`);
console.log('\n✨ Migration completed successfully!');
