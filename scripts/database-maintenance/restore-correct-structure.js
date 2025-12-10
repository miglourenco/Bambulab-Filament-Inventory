import fs from 'fs/promises';

async function restoreCorrectStructure() {
  console.log('📦 Loading original database...');

  // Read the original backup (before any modifications)
  const originalData = JSON.parse(await fs.readFile('./data/base_dados_completa.json.backup', 'utf-8'));

  console.log(`Found ${originalData.length} entries`);
  console.log('\n🔧 Creating correct structure...\n');

  let processedCount = 0;

  // Create correct structure
  const correctedData = originalData.map((entry, index) => {
    const corrected = {
      manufacturer: 'BambuLab',
      material: entry.material.split(' ')[0], // Normalize: take first word only
      name: `Bambu ${entry.material}`, // Keep ORIGINAL full material name
      colorname: entry.colorname,
      color: entry.color,
      distance: entry.distance,
      note: entry.note,
      productType: entry.productType,
      ean: entry.ean
    };

    processedCount++;

    // Show progress every 50 entries
    if ((index + 1) % 50 === 0) {
      console.log(`Progress: ${index + 1}/${originalData.length} entries processed`);
    }

    return corrected;
  });

  console.log(`\n✅ Processed ${processedCount} entries`);

  // Show samples
  console.log('\n📋 Sample entries with correct structure:');
  console.log(JSON.stringify(correctedData.slice(0, 5), null, 2));

  // Show examples of normalized vs full name
  console.log('\n📊 Examples of material normalization:');
  const examples = correctedData.filter(e => e.material !== e.name.replace('Bambu ', '')).slice(0, 5);
  examples.forEach(e => {
    console.log(`   Material: "${e.material}" (normalized)`);
    console.log(`   Name: "${e.name}" (full original name)`);
    console.log('');
  });

  // Create backup of current incorrect version
  const currentData = JSON.parse(await fs.readFile('./data/base_dados_completa.json', 'utf-8'));
  const backupFile = './data/base_dados_completa.json.backup-incorrect-final';
  console.log(`💾 Creating backup of current incorrect version at ${backupFile}...`);
  await fs.writeFile(backupFile, JSON.stringify(currentData, null, 2));

  // Write corrected data
  console.log('💾 Writing corrected database...');
  await fs.writeFile('./data/base_dados_completa.json', JSON.stringify(correctedData, null, 2));

  console.log('\n✨ Database restored with correct structure!');
  console.log(`   ✅ Material field: Normalized (first word only)`);
  console.log(`   ✅ Name field: Full original material name`);
  console.log(`   ✅ All entries have manufacturer: "BambuLab"`);

  // Show material distribution
  console.log('\n📊 Material distribution (normalized):');
  const materialCounts = new Map();
  correctedData.forEach(entry => {
    const count = materialCounts.get(entry.material) || 0;
    materialCounts.set(entry.material, count + 1);
  });

  const sortedMaterials = Array.from(materialCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  sortedMaterials.forEach(([material, count]) => {
    console.log(`   ${material}: ${count} entries`);
  });
}

restoreCorrectStructure().catch(console.error);
