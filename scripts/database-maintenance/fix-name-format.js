import fs from 'fs/promises';

async function fixNameFormat() {
  console.log('📦 Loading database...\n');

  const data = JSON.parse(await fs.readFile('./data/base_dados_completa.json', 'utf-8'));

  console.log(`Found ${data.length} entries\n`);

  // Define name corrections
  const nameCorrections = {
    'Bambu ASA Aero': 'Bambu ASA-Aero',
    'Bambu TPU 68D for AMS': 'Bambu TPU for AMS',
    'Bambu PC-FR': 'Bambu PC FR'
  };

  let fixedCount = 0;
  const corrections = [];

  // Fix each entry
  const fixedData = data.map(entry => {
    const correctName = nameCorrections[entry.name];

    if (correctName) {
      corrections.push({
        oldName: entry.name,
        newName: correctName,
        colorname: entry.colorname,
        material: entry.material
      });

      fixedCount++;

      return {
        ...entry,
        name: correctName
      };
    }

    return entry;
  });

  console.log(`📊 Corrections needed: ${fixedCount}\n`);

  if (corrections.length > 0) {
    console.log('📋 Name format corrections:');
    console.log('='.repeat(80));

    const grouped = {};
    corrections.forEach(c => {
      if (!grouped[c.oldName]) {
        grouped[c.oldName] = {
          newName: c.newName,
          count: 0,
          colors: []
        };
      }
      grouped[c.oldName].count++;
      grouped[c.oldName].colors.push(c.colorname);
    });

    Object.entries(grouped).forEach(([oldName, info]) => {
      console.log(`\n"${oldName}" → "${info.newName}"`);
      console.log(`   Affected colors (${info.count}): ${info.colors.slice(0, 5).join(', ')}${info.colors.length > 5 ? '...' : ''}`);
    });

    // Create backup
    const backupFile = './data/base_dados_completa.json.backup-before-name-fix';
    console.log(`\n💾 Creating backup at ${backupFile}...`);
    await fs.writeFile(backupFile, JSON.stringify(data, null, 2));

    // Write fixed data
    console.log('💾 Writing corrected database...');
    await fs.writeFile('./data/base_dados_completa.json', JSON.stringify(fixedData, null, 2));

    console.log('\n✨ Database corrected successfully!');
    console.log(`   - ${fixedCount} names fixed`);
    console.log(`   - Backup saved to: ${backupFile}\n`);

    // Show samples
    console.log('📋 Sample of corrected entries:');
    const samples = fixedData.filter((e, i) => data[i].name !== e.name).slice(0, 3);
    console.log(JSON.stringify(samples, null, 2));
  } else {
    console.log('✅ All names are already correct! No changes needed.\n');
  }
}

fixNameFormat().catch(console.error);
