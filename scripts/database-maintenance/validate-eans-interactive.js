import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, '../../data/base_dados_completa.json');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.bright}  EAN Validation - Interactive Mode${colors.reset}`);
console.log(`${colors.cyan}========================================${colors.reset}\n`);

// Read database
const materials = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
console.log(`${colors.green}✓${colors.reset} Loaded ${materials.length} materials from database\n`);

// Create backup
const backupFile = DB_FILE + `.backup-before-manual-validation-${Date.now()}`;
fs.writeFileSync(backupFile, JSON.stringify(materials, null, 2));
console.log(`${colors.green}✓${colors.reset} Created backup: ${path.basename(backupFile)}\n`);

// Find all unique EANs and map them to materials
const eanMap = {};
materials.forEach((material, index) => {
  if (material.ean && material.ean !== '') {
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

// Find duplicate EANs
const duplicateEans = {};
for (const [ean, materialsList] of Object.entries(eanMap)) {
  if (materialsList.length > 1) {
    const uniqueMaterials = new Set();
    materialsList.forEach(m => {
      uniqueMaterials.add(`${m.colorname}|${m.color}`);
    });
    if (uniqueMaterials.size > 1) {
      duplicateEans[ean] = materialsList;
    }
  }
}

const duplicateCount = Object.keys(duplicateEans).length;
console.log(`${colors.yellow}⚠${colors.reset} Found ${duplicateCount} duplicate EANs\n`);

if (duplicateCount === 0) {
  console.log(`${colors.green}✓${colors.reset} No duplicate EANs found! Database is clean.`);
  process.exit(0);
}

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to display color with preview
function displayColor(colorname, hexColor, index, isSelected = false) {
  const marker = isSelected ? `${colors.green}→${colors.reset}` : ' ';
  const colorBox = `${colors.reset}[${hexColor}]${colors.reset}`;
  console.log(`  ${marker} ${colors.bright}${index}${colors.reset}. ${colorname} ${colorBox}`);
}

// Function to ask question
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Track changes
const changes = [];
let currentEanIndex = 0;
const eanList = Object.entries(duplicateEans);

// Main validation loop
async function validateNextEan() {
  if (currentEanIndex >= eanList.length) {
    console.log(`\n${colors.cyan}========================================${colors.reset}`);
    console.log(`${colors.bright}  Validation Complete!${colors.reset}`);
    console.log(`${colors.cyan}========================================${colors.reset}\n`);

    if (changes.length === 0) {
      console.log(`${colors.yellow}No changes made.${colors.reset}`);
      rl.close();
      return;
    }

    console.log(`${colors.green}✓${colors.reset} Total changes: ${changes.length}\n`);

    // Show summary
    console.log(`${colors.bright}Summary of changes:${colors.reset}`);
    changes.forEach((change, i) => {
      console.log(`\n${i + 1}. EAN ${change.ean}`);
      console.log(`   ${colors.green}Kept in:${colors.reset} ${change.correctMaterial.colorname} (${change.correctMaterial.color})`);
      console.log(`   ${colors.red}Removed from:${colors.reset}`);
      change.removedFrom.forEach(m => {
        console.log(`     - ${m.colorname} (${m.color})`);
      });
    });

    // Ask for confirmation
    console.log(`\n${colors.yellow}⚠ This will modify the database!${colors.reset}`);
    const confirm = await askQuestion(`\nApply these changes? (yes/no): `);

    if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
      // Apply changes
      changes.forEach(change => {
        change.indicesToUpdate.forEach(index => {
          const material = materials[index];
          const eans = material.ean.split(',').map(e => e.trim());
          const newEans = eans.filter(e => e !== change.ean);
          material.ean = newEans.join(',');
        });
      });

      // Save
      fs.writeFileSync(DB_FILE, JSON.stringify(materials, null, 2));
      console.log(`\n${colors.green}✓${colors.reset} Database updated successfully!`);
      console.log(`${colors.green}✓${colors.reset} Backup saved: ${path.basename(backupFile)}`);
    } else {
      console.log(`\n${colors.yellow}Changes discarded.${colors.reset}`);
    }

    rl.close();
    return;
  }

  const [ean, materialsList] = eanList[currentEanIndex];

  console.clear();
  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bright}  EAN ${currentEanIndex + 1} of ${eanList.length}${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}\n`);

  console.log(`${colors.bright}EAN:${colors.reset} ${colors.yellow}${ean}${colors.reset}\n`);
  console.log(`This EAN appears in ${colors.bright}${materialsList.length}${colors.reset} different materials:\n`);

  // Display all options
  materialsList.forEach((m, i) => {
    displayColor(m.colorname, m.color, i + 1);
  });

  console.log(`\n${colors.bright}Options:${colors.reset}`);
  console.log(`  • Enter ${colors.green}1-${materialsList.length}${colors.reset} to select the correct color`);
  console.log(`  • Enter ${colors.yellow}'s'${colors.reset} to skip this EAN`);
  console.log(`  • Enter ${colors.red}'q'${colors.reset} to quit\n`);

  const answer = await askQuestion(`${colors.bright}Your choice:${colors.reset} `);

  if (answer.toLowerCase() === 'q') {
    console.log(`\n${colors.yellow}Validation cancelled.${colors.reset}`);
    rl.close();
    return;
  }

  if (answer.toLowerCase() === 's') {
    console.log(`\n${colors.yellow}Skipped EAN ${ean}${colors.reset}`);
    currentEanIndex++;
    setTimeout(validateNextEan, 1000);
    return;
  }

  const choice = parseInt(answer);
  if (isNaN(choice) || choice < 1 || choice > materialsList.length) {
    console.log(`\n${colors.red}✗ Invalid choice. Please try again.${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    validateNextEan();
    return;
  }

  const selectedIndex = choice - 1;
  const correctMaterial = materialsList[selectedIndex];
  const removedFrom = materialsList.filter((_, i) => i !== selectedIndex);

  console.log(`\n${colors.green}✓${colors.reset} Selected: ${colors.bright}${correctMaterial.colorname}${colors.reset} (${correctMaterial.color})`);
  console.log(`${colors.red}✗${colors.reset} Will remove EAN from:`);
  removedFrom.forEach(m => {
    console.log(`  - ${m.colorname} (${m.color})`);
  });

  // Store change
  changes.push({
    ean,
    correctMaterial,
    removedFrom,
    indicesToUpdate: removedFrom.map(m => m.index)
  });

  currentEanIndex++;
  await new Promise(resolve => setTimeout(resolve, 1500));
  validateNextEan();
}

// Start validation
console.log(`${colors.bright}Instructions:${colors.reset}`);
console.log(`For each EAN, you'll see all the colors it's associated with.`);
console.log(`Select the ${colors.green}correct${colors.reset} color, and the EAN will be removed from others.\n`);

await askQuestion(`Press ${colors.green}ENTER${colors.reset} to start... `);
validateNextEan();
