import fs from 'fs/promises';

async function fixNames() {
  console.log('📦 Loading databases...');

  // Read the current (incorrect) database
  const currentData = JSON.parse(await fs.readFile('./data/base_dados_completa.json', 'utf-8'));

  // Read the backup with original material names (before any changes)
  const backupData = JSON.parse(await fs.readFile('./data/base_dados_completa.json.backup', 'utf-8'));

  console.log(`Found ${currentData.length} entries`);
  console.log('\n🔧 Restoring original name fields...\n');

  let fixedCount = 0;
  const nameChanges = new Map();

  // Create a map of EAN to original material from backup
  const eanToOriginalMaterial = new Map();
  backupData.forEach(entry => {
    eanToOriginalMaterial.set(entry.ean, entry.material);
  });

  // Fix each entry
  const fixedData = currentData.map((entry, index) => {
    const originalMaterial = eanToOriginalMaterial.get(entry.ean);

    if (originalMaterial) {
      const correctName = `Bambu ${originalMaterial}`;

      if (entry.name !== correctName) {
        nameChanges.set(entry.name, correctName);
        fixedCount++;
      }

      return {
        ...entry,
        name: correctName
      };
    }

    // Show progress every 50 entries
    if ((index + 1) % 50 === 0) {
      console.log(`Progress: ${index + 1}/${currentData.length} entries processed`);
    }

    return entry;
  });

  console.log(`\n✅ Fixed ${fixedCount} name entries`);

  // Show what was changed
  if (nameChanges.size > 0) {
    console.log('\n📋 Name corrections (showing first 10):');
    let count = 0;
    for (const [incorrect, correct] of nameChanges.entries()) {
      if (count >= 10) break;
      console.log(`   "${incorrect}" → "${correct}"`);
      count++;
    }
    if (nameChanges.size > 10) {
      console.log(`   ... and ${nameChanges.size - 10} more`);
    }
  }

  // Show sample of fixed data
  console.log('\n📋 Sample of corrected entries:');
  const samplesWithFixes = fixedData.filter((entry, index) => {
    return currentData[index].name !== entry.name;
  }).slice(0, 3);

  console.log(JSON.stringify(samplesWithFixes, null, 2));

  // Create backup of incorrect version
  const backupFile = './data/base_dados_completa.json.backup3-incorrect';
  console.log(`\n💾 Creating backup of incorrect version at ${backupFile}...`);
  await fs.writeFile(backupFile, JSON.stringify(currentData, null, 2));

  // Write fixed data
  console.log('💾 Writing corrected database...');
  await fs.writeFile('./data/base_dados_completa.json', JSON.stringify(fixedData, null, 2));

  console.log('\n✨ Database corrected successfully!');
  console.log(`   - ${fixedCount} name fields restored`);
  console.log(`   - Material field: normalized (kept as is)`);
  console.log(`   - Name field: restored to original full names`);
  console.log(`   - Backup saved to: ${backupFile}`);

  // Show examples
  console.log('\n📋 Examples of final structure:');
  console.log('   Material: "PLA" (normalized)');
  console.log('   Name: "Bambu PLA Matte" (original full name)');
  console.log('   ');
  console.log('   Material: "PETG" (normalized)');
  console.log('   Name: "Bambu PETG HF" (original full name)');
}

fixNames().catch(console.error);
