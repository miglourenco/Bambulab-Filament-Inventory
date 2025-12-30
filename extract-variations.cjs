const fs = require('fs');
const path = require('path');

// Load the materials database
const databasePath = path.join(__dirname, 'data', 'base_dados_completa.json');
const materials = JSON.parse(fs.readFileSync(databasePath, 'utf8'));

console.log(`Loaded ${materials.length} materials from database`);

// Function to extract variation from name
function extractVariation(name, material) {
  // Remove BOM if present
  name = name.replace(/^\uFEFF/, '');

  // Expected format: "Bambu [MATERIAL] [VARIATION]"
  // Examples:
  // "Bambu PLA Matte" -> material: PLA, variation: Matte
  // "Bambu PETG HF" -> material: PETG, variation: HF
  // "Bambu ASA-CF" -> material: ASA-CF, no variation (hyphenated material type)
  // "Bambu ABS" -> material: ABS, no variation

  // First, check if name starts with "Bambu "
  if (!name.startsWith('Bambu ')) {
    return null;
  }

  // Remove "Bambu " prefix
  const afterBambu = name.substring(6).trim();

  // Check if the material type is in the name
  if (!afterBambu.startsWith(material)) {
    return null;
  }

  // Get everything after the material type
  const afterMaterial = afterBambu.substring(material.length).trim();

  // If there's something left, that's the variation
  if (afterMaterial.length > 0) {
    return afterMaterial;
  }

  return null;
}

// Process materials and extract variations
let updatedCount = 0;
let noVariationCount = 0;
const variationsFound = new Set();

materials.forEach((item, index) => {
  // Only process BambuLab materials
  if (item.manufacturer && item.manufacturer.toLowerCase().includes('bambu')) {
    const variation = extractVariation(item.name, item.material);

    if (variation) {
      item.variation = variation;
      updatedCount++;
      variationsFound.add(variation);
      console.log(`[${index}] ${item.name} -> variation: "${variation}"`);
    } else {
      item.variation = '';
      noVariationCount++;
    }
  } else {
    // Non-BambuLab materials have no variation
    item.variation = '';
  }
});

console.log('\n=== Summary ===');
console.log(`Total materials processed: ${materials.length}`);
console.log(`Materials with variation extracted: ${updatedCount}`);
console.log(`Materials without variation: ${noVariationCount}`);
console.log(`\nUnique variations found: ${variationsFound.size}`);
console.log(Array.from(variationsFound).sort().join(', '));

// Save the updated database
const backupPath = path.join(__dirname, 'data', 'base_dados_completa.backup.json');
fs.writeFileSync(backupPath, fs.readFileSync(databasePath, 'utf8'));
console.log(`\nBackup created: ${backupPath}`);

fs.writeFileSync(databasePath, JSON.stringify(materials, null, 2));
console.log(`Updated database saved: ${databasePath}`);
