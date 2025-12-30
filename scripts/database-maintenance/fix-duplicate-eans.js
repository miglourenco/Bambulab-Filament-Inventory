import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, '../../data/base_dados_completa.json');

console.log('Starting duplicate EAN detection and validation...\n');

// Read database
const materials = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
console.log(`Loaded ${materials.length} materials from database\n`);

// Create backup
const backupFile = DB_FILE + `.backup-before-ean-fix-${Date.now()}`;
fs.writeFileSync(backupFile, JSON.stringify(materials, null, 2));
console.log(`Created backup: ${path.basename(backupFile)}\n`);

// Find all unique EANs and map them to materials
const eanMap = {};

materials.forEach((material, index) => {
  if (material.ean && material.ean !== '') {
    // Split multiple EANs
    const eans = material.ean.split(',');

    eans.forEach(ean => {
      const trimmedEan = ean.trim();
      if (!eanMap[trimmedEan]) {
        eanMap[trimmedEan] = [];
      }
      eanMap[trimmedEan].push({
        index,
        material: material.material,
        colorname: material.colorname,
        color: material.color,
        name: material.name
      });
    });
  }
});

// Find duplicate EANs (EANs that appear in multiple different materials)
const duplicateEans = {};

for (const [ean, materialsList] of Object.entries(eanMap)) {
  if (materialsList.length > 1) {
    // Check if they are truly different (different colorname or color)
    const uniqueMaterials = new Set();
    materialsList.forEach(m => {
      uniqueMaterials.add(`${m.colorname}|${m.color}`);
    });

    if (uniqueMaterials.size > 1) {
      duplicateEans[ean] = materialsList;
    }
  }
}

console.log(`Found ${Object.keys(duplicateEans).length} duplicate EANs across different materials\n`);

if (Object.keys(duplicateEans).length === 0) {
  console.log('✅ No duplicate EANs found! Database is clean.');
  process.exit(0);
}

// Display duplicate EANs
console.log('Duplicate EANs found:');
console.log('='.repeat(80));
for (const [ean, materialsList] of Object.entries(duplicateEans)) {
  console.log(`\nEAN: ${ean}`);
  console.log(`Appears in ${materialsList.length} different materials:`);
  materialsList.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.name} - ${m.colorname} (${m.color})`);
  });
}
console.log('\n' + '='.repeat(80));

// Function to validate EAN with free APIs
async function validateEAN(ean) {
  console.log(`\n[Validating EAN ${ean}]`);

  // Try UPCItemDB (free tier)
  try {
    const response = await axios.get(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${ean}`,
      { timeout: 10000 }
    );

    if (response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      console.log(`✅ Found in UPCItemDB: ${item.title}`);

      // Extract color from title
      const title = item.title.toLowerCase();
      let detectedColor = null;

      // Common color keywords
      const colors = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'orange',
                      'purple', 'pink', 'grey', 'gray', 'silver', 'navy'];

      for (const color of colors) {
        if (title.includes(color)) {
          detectedColor = color;
          break;
        }
      }

      return {
        found: true,
        title: item.title,
        detectedColor,
        source: 'UPCItemDB'
      };
    }
  } catch (error) {
    console.log(`⚠️ UPCItemDB error: ${error.message}`);
  }

  // Try EAN-Search.org (free)
  try {
    const response = await axios.get(
      `https://api.ean-search.org/api?token=FREE_TIER&op=barcode-lookup&ean=${ean}&format=json`,
      { timeout: 10000 }
    );

    if (response.data && response.data.length > 0) {
      const item = response.data[0];
      console.log(`✅ Found in EAN-Search: ${item.name}`);

      return {
        found: true,
        title: item.name,
        detectedColor: null,
        source: 'EAN-Search'
      };
    }
  } catch (error) {
    console.log(`⚠️ EAN-Search error: ${error.message}`);
  }

  console.log(`❌ EAN ${ean} not found in any API`);
  return { found: false };
}

// Function to find best match
function findBestMatch(validation, materialsList) {
  if (!validation.found) {
    return null;
  }

  const title = validation.title.toLowerCase();

  // Score each material based on how well it matches the API result
  const scores = materialsList.map((material, index) => {
    let score = 0;
    const colorname = material.colorname.toLowerCase();

    // Check if colorname appears in title
    if (title.includes(colorname)) {
      score += 10;
    }

    // Check for partial matches
    const colornameWords = colorname.split(' ');
    colornameWords.forEach(word => {
      if (word.length > 2 && title.includes(word)) {
        score += 5;
      }
    });

    // If API detected a color, check for match
    if (validation.detectedColor) {
      if (colorname.includes(validation.detectedColor)) {
        score += 15;
      }
    }

    return { index, material, score };
  });

  // Sort by score
  scores.sort((a, b) => b.score - a.score);

  console.log('\nMatch scores:');
  scores.forEach(s => {
    console.log(`  ${s.material.colorname} (${s.material.color}): ${s.score} points`);
  });

  // Return best match if score > 0
  if (scores[0].score > 0) {
    return scores[0];
  }

  return null;
}

// Main validation process
async function validateAllDuplicates() {
  const fixes = [];

  for (const [ean, materialsList] of Object.entries(duplicateEans)) {
    console.log('\n' + '='.repeat(80));
    console.log(`Processing EAN: ${ean}`);
    console.log('Found in:');
    materialsList.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} - ${m.colorname} (${m.color})`);
    });

    // Validate with API
    const validation = await validateEAN(ean);

    if (validation.found) {
      // Find best match
      const bestMatch = findBestMatch(validation, materialsList);

      if (bestMatch) {
        console.log(`\n✅ Best match: ${bestMatch.material.colorname} (${bestMatch.material.color})`);
        console.log(`   Score: ${bestMatch.score} points`);

        // Store fix: keep EAN only in best match, remove from others
        fixes.push({
          ean,
          keepInIndex: bestMatch.material.index,
          removeFromIndices: materialsList
            .filter(m => m.index !== bestMatch.material.index)
            .map(m => m.index),
          validation: validation.title
        });
      } else {
        console.log(`\n⚠️ Could not determine best match automatically`);
        console.log(`   API result: ${validation.title}`);
        console.log(`   Manual review required`);
      }
    } else {
      console.log(`\n⚠️ Could not validate EAN ${ean} with API`);
      console.log(`   Manual review required`);
    }

    // Rate limiting - wait 1 second between API calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return fixes;
}

// Apply fixes
function applyFixes(fixes) {
  if (fixes.length === 0) {
    console.log('\n\nNo automatic fixes available. Manual review required.');
    return;
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('FIXES TO APPLY:');
  console.log('='.repeat(80));

  fixes.forEach((fix, i) => {
    console.log(`\n${i + 1}. EAN ${fix.ean}`);
    console.log(`   Validation: ${fix.validation}`);
    console.log(`   Keep in: ${materials[fix.keepInIndex].name} - ${materials[fix.keepInIndex].colorname}`);
    console.log(`   Remove from ${fix.removeFromIndices.length} other material(s)`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\nApplying fixes...\n');

  // Apply fixes to materials array
  fixes.forEach(fix => {
    fix.removeFromIndices.forEach(index => {
      const material = materials[index];

      // Remove this EAN from the material
      const eans = material.ean.split(',').map(e => e.trim());
      const newEans = eans.filter(e => e !== fix.ean);
      material.ean = newEans.join(',');

      console.log(`✅ Removed EAN ${fix.ean} from ${material.name} - ${material.colorname}`);
    });
  });

  // Save fixed database
  fs.writeFileSync(DB_FILE, JSON.stringify(materials, null, 2));
  console.log(`\n✅ Fixed database saved to ${DB_FILE}`);
  console.log(`✅ Applied ${fixes.length} fix(es)`);
}

// Run validation
console.log('\nStarting API validation...');
console.log('This may take a while due to API rate limiting...\n');

validateAllDuplicates()
  .then(fixes => {
    applyFixes(fixes);
    console.log('\n✅ Done!');
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
