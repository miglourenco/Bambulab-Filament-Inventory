import fs from 'fs/promises';

async function updateDatabase() {
  console.log('📦 Loading database...');

  // Read the current database
  const data = JSON.parse(await fs.readFile('./data/base_dados_completa.json', 'utf-8'));

  console.log(`Found ${data.length} entries`);
  console.log('\n🔧 Adding manufacturer and name fields...\n');

  let updatedCount = 0;

  // Update each entry
  const updatedData = data.map((entry, index) => {
    const updated = {
      manufacturer: 'BambuLab',
      material: entry.material,
      name: `Bambu ${entry.material}`,
      colorname: entry.colorname,
      color: entry.color,
      distance: entry.distance,
      note: entry.note,
      productType: entry.productType,
      ean: entry.ean
    };

    updatedCount++;

    // Show progress every 50 entries
    if ((index + 1) % 50 === 0) {
      console.log(`Progress: ${index + 1}/${data.length} entries processed`);
    }

    return updated;
  });

  console.log(`\n✅ Updated ${updatedCount} entries`);

  // Show sample of updated data
  console.log('\n📋 Sample of updated entries:');
  console.log(JSON.stringify(updatedData.slice(0, 3), null, 2));

  // Create backup
  const backupFile = './data/base_dados_completa.json.backup';
  console.log(`\n💾 Creating backup at ${backupFile}...`);
  await fs.writeFile(backupFile, JSON.stringify(data, null, 2));

  // Write updated data
  console.log('💾 Writing updated database...');
  await fs.writeFile('./data/base_dados_completa.json', JSON.stringify(updatedData, null, 2));

  console.log('\n✨ Database updated successfully!');
  console.log(`   - Manufacturer: "BambuLab" added to all entries`);
  console.log(`   - Name: "Bambu [material]" added to all entries`);
  console.log(`   - Backup saved to: ${backupFile}`);
}

updateDatabase().catch(console.error);
