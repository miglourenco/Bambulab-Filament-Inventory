import fs from 'fs/promises';
import yaml from 'js-yaml';

async function validateAndFixMaterials() {
  console.log('📦 Loading databases...\n');

  // Read the EAN database
  const eanData = JSON.parse(await fs.readFile('./data/base_dados_completa.json', 'utf-8'));

  // Read and parse the printer data YAML
  const printerYaml = await fs.readFile('./data/printer_data.yaml', 'utf-8');
  const printerData = yaml.load(printerYaml);

  // Create a map of name -> filament_type from printer data
  const printerMaterials = new Map();
  for (const [key, value] of Object.entries(printerData)) {
    if (value.name && value.filament_type) {
      printerMaterials.set(value.name, value.filament_type);
    }
  }

  console.log(`✅ Loaded ${eanData.length} EAN entries`);
  console.log(`✅ Loaded ${printerMaterials.size} printer material definitions\n`);

  let fixedCount = 0;
  const corrections = [];

  // Validate and fix each entry
  const fixedData = eanData.map(entry => {
    const printerMaterial = printerMaterials.get(entry.name);

    if (printerMaterial) {
      // Found matching name in printer data
      if (entry.material !== printerMaterial) {
        // Material doesn't match, needs correction
        corrections.push({
          name: entry.name,
          currentMaterial: entry.material,
          correctMaterial: printerMaterial,
          colorname: entry.colorname
        });

        fixedCount++;

        return {
          ...entry,
          material: printerMaterial
        };
      }
    }

    return entry;
  });

  console.log(`\n📊 Validation Results:`);
  console.log(`   Total entries: ${eanData.length}`);
  console.log(`   Corrections needed: ${fixedCount}`);
  console.log(`   Already correct: ${eanData.length - fixedCount}\n`);

  if (corrections.length > 0) {
    console.log('📋 Material corrections:');
    console.log('='.repeat(80));
    corrections.forEach((correction, index) => {
      console.log(`${index + 1}. ${correction.name} (${correction.colorname})`);
      console.log(`   Current:  ${correction.currentMaterial}`);
      console.log(`   Correct:  ${correction.correctMaterial}`);
      console.log('');
    });

    // Create backup
    const backupFile = './data/base_dados_completa.json.backup-before-material-fix';
    console.log(`💾 Creating backup at ${backupFile}...`);
    await fs.writeFile(backupFile, JSON.stringify(eanData, null, 2));

    // Write fixed data
    console.log('💾 Writing corrected database...');
    await fs.writeFile('./data/base_dados_completa.json', JSON.stringify(fixedData, null, 2));

    console.log('\n✨ Database corrected successfully!');
    console.log(`   - ${fixedCount} materials fixed`);
    console.log(`   - Backup saved to: ${backupFile}\n`);

    // Show summary by material type
    console.log('📊 Material distribution after correction:');
    const materialCounts = new Map();
    fixedData.forEach(entry => {
      const count = materialCounts.get(entry.material) || 0;
      materialCounts.set(entry.material, count + 1);
    });

    const sortedMaterials = Array.from(materialCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedMaterials.forEach(([material, count]) => {
      console.log(`   ${material}: ${count} entries`);
    });
  } else {
    console.log('✅ All materials are already correct! No changes needed.\n');
  }

  // Show entries that don't have a match in printer data
  const unmatchedEntries = eanData.filter(entry => !printerMaterials.has(entry.name));
  if (unmatchedEntries.length > 0) {
    console.log(`\n⚠️  Warning: ${unmatchedEntries.length} entries not found in printer_data.yaml:`);
    const uniqueNames = [...new Set(unmatchedEntries.map(e => e.name))];
    uniqueNames.slice(0, 10).forEach(name => {
      console.log(`   - ${name}`);
    });
    if (uniqueNames.length > 10) {
      console.log(`   ... and ${uniqueNames.length - 10} more`);
    }
  }
}

validateAndFixMaterials().catch(console.error);
