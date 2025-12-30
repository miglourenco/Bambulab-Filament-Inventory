import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, '../../data/base_dados_completa.json');

console.log('Starting product aggregation...\n');

// Read database
const materials = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
console.log(`Loaded ${materials.length} materials from database`);

// Create backup
const backupFile = DB_FILE + `.backup-before-aggregation-${Date.now()}`;
fs.writeFileSync(backupFile, JSON.stringify(materials, null, 2));
console.log(`Created backup: ${path.basename(backupFile)}\n`);

// IMPORTANTE: Só agregar se manufacturer + material + name + colorname + color forem EXATAMENTE iguais
// Isso permite agregar Spool e Refill do mesmo produto, mas mantém produtos diferentes separados
// Exemplo: "Bambu ABS Black Spool" + "Bambu ABS Black Refill" = 1 entrada com 2 EANs
//          "Bambu ABS Blue" + "Bambu ABS Navy Blue" = 2 entradas separadas (cores diferentes)

const groups = {};

materials.forEach(material => {
  // Chave única por produto EXATO (manufacturer + material + name + colorname + color)
  const key = `${material.manufacturer}|${material.material}|${material.name}|${material.colorname}|${material.color}`;

  if (!groups[key]) {
    groups[key] = {
      material: {
        manufacturer: material.manufacturer,
        material: material.material,
        name: material.name,
        colorname: material.colorname,
        color: material.color,
        distance: material.distance,
        note: material.note,
        ean: []
      },
      count: 0,
      productTypes: []
    };
  }

  // Collect all EANs (sem duplicatas)
  if (material.ean && material.ean !== '') {
    if (!groups[key].material.ean.includes(material.ean)) {
      groups[key].material.ean.push(material.ean);
    }
  }

  // Track productTypes para logging
  if (material.productType && !groups[key].productTypes.includes(material.productType)) {
    groups[key].productTypes.push(material.productType);
  }

  groups[key].count++;
});

console.log('Aggregation results:');
console.log(`- Found ${Object.keys(groups).length} unique products`);
console.log(`- Reduced from ${materials.length} to ${Object.keys(groups).length} materials`);
console.log(`- Removed ${materials.length - Object.keys(groups).length} duplicates\n`);

// Show some examples of aggregated products
console.log('\nExamples of aggregated products (Spool + Refill):');
let exampleCount = 0;
for (const key in groups) {
  if (groups[key].count > 1) {
    const g = groups[key];
    console.log(`- ${g.material.name} - ${g.material.colorname}:`);
    console.log(`  Merged ${g.productTypes.join(' + ')} → ${g.material.ean.length} EAN(s): ${g.material.ean.join(', ')}`);
    exampleCount++;
    if (exampleCount >= 5) break;
  }
}
console.log('');

// Convert to final array
const aggregatedMaterials = Object.values(groups).map(g => {
  const m = g.material;

  // IMPORTANTE: EAN é uma string separada por vírgulas (não array!)
  // Múltiplos EANs: "6975337030331,6975337032878"
  // Nenhum EAN: ""
  const eanString = m.ean.length > 0 ? m.ean.join(',') : '';

  return {
    manufacturer: m.manufacturer,
    material: m.material,
    name: m.name,
    colorname: m.colorname,
    color: m.color,
    distance: m.distance,
    note: m.note,
    ean: eanString
  };
});

// Sort by material, then colorname
aggregatedMaterials.sort((a, b) => {
  if (a.material !== b.material) {
    return a.material.localeCompare(b.material);
  }
  return a.colorname.localeCompare(b.colorname);
});

// Save aggregated database
fs.writeFileSync(DB_FILE, JSON.stringify(aggregatedMaterials, null, 2));
console.log(`✅ Saved ${aggregatedMaterials.length} aggregated materials to database`);
console.log('✅ Removed productType field from all materials');
console.log('\nDone!');
