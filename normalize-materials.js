import fs from 'fs/promises';

async function normalizeMaterials() {
  console.log('📦 Loading database...');

  // Read the current database
  const data = JSON.parse(await fs.readFile('./data/base_dados_completa.json', 'utf-8'));

  console.log(`Found ${data.length} entries`);
  console.log('\n🔧 Normalizing material names...\n');

  let updatedCount = 0;
  const changes = new Map();

  // Update each entry
  const updatedData = data.map((entry, index) => {
    const originalMaterial = entry.material;

    // Split by space and take only the first word
    const normalizedMaterial = originalMaterial.split(' ')[0];

    // Track changes
    if (originalMaterial !== normalizedMaterial) {
      if (!changes.has(originalMaterial)) {
        changes.set(originalMaterial, normalizedMaterial);
      }
      updatedCount++;
    }

    const updated = {
      ...entry,
      material: normalizedMaterial,
      name: `Bambu ${normalizedMaterial}` // Update name to match new material
    };

    // Show progress every 50 entries
    if ((index + 1) % 50 === 0) {
      console.log(`Progress: ${index + 1}/${data.length} entries processed`);
    }

    return updated;
  });

  console.log(`\n✅ Updated ${updatedCount} entries`);

  // Show what was changed
  if (changes.size > 0) {
    console.log('\n📋 Material changes:');
    for (const [original, normalized] of changes.entries()) {
      console.log(`   "${original}" → "${normalized}"`);
    }
  }

  // Show sample of updated data
  console.log('\n📋 Sample of updated entries:');
  const samplesWithChanges = updatedData.filter((entry, index) => {
    const original = data[index].material;
    return original !== entry.material;
  }).slice(0, 3);

  console.log(JSON.stringify(samplesWithChanges, null, 2));

  // Create backup
  const backupFile = './data/base_dados_completa.json.backup2';
  console.log(`\n💾 Creating backup at ${backupFile}...`);
  await fs.writeFile(backupFile, JSON.stringify(data, null, 2));

  // Write updated data
  console.log('💾 Writing updated database...');
  await fs.writeFile('./data/base_dados_completa.json', JSON.stringify(updatedData, null, 2));

  console.log('\n✨ Database normalized successfully!');
  console.log(`   - ${updatedCount} materials normalized`);
  console.log(`   - ${changes.size} unique material types affected`);
  console.log(`   - Backup saved to: ${backupFile}`);

  // Show summary by material type
  console.log('\n📊 Material distribution after normalization:');
  const materialCounts = new Map();
  updatedData.forEach(entry => {
    const count = materialCounts.get(entry.material) || 0;
    materialCounts.set(entry.material, count + 1);
  });

  const sortedMaterials = Array.from(materialCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  sortedMaterials.forEach(([material, count]) => {
    console.log(`   ${material}: ${count} entries`);
  });
}

normalizeMaterials().catch(console.error);
