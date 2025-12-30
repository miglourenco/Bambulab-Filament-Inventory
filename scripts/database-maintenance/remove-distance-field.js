import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, '../../data/base_dados_completa.json');

console.log('🔧 Removing distance field from materials database...\n');

// Read database
const materials = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
console.log(`✓ Loaded ${materials.length} materials from database`);

// Create backup
const backupFile = DB_FILE + `.backup-before-remove-distance-${Date.now()}`;
fs.writeFileSync(backupFile, JSON.stringify(materials, null, 2));
console.log(`✓ Created backup: ${path.basename(backupFile)}`);

// Count materials with distance field
let materialsWithDistance = 0;
materials.forEach(material => {
  if (material.hasOwnProperty('distance')) {
    materialsWithDistance++;
  }
});

console.log(`\n📊 Found ${materialsWithDistance} materials with distance field`);

// Remove distance field from all materials
materials.forEach(material => {
  if (material.hasOwnProperty('distance')) {
    delete material.distance;
  }
});

// Save updated database
fs.writeFileSync(DB_FILE, JSON.stringify(materials, null, 2));

console.log(`\n✅ Successfully removed distance field from all materials`);
console.log(`✓ Updated database saved: ${path.basename(DB_FILE)}`);
console.log(`✓ Backup available: ${path.basename(backupFile)}`);
