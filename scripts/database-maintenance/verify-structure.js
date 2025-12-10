import data from './data/base_dados_completa.json' assert { type: 'json' };

console.log('Verificando estrutura correta...\n');

const examples = data.filter(e => e.material !== e.name.replace('Bambu ', '')).slice(0, 10);

console.log('✅ Materiais normalizados vs Nome completo:');
examples.forEach(e => {
  console.log(`   Material: "${e.material}" | Name: "${e.name}" | Color: ${e.colorname}`);
});

console.log('\n✅ Total de entradas:', data.length);

// Verify all have the correct structure
const hasAllFields = data.every(e =>
  e.manufacturer &&
  e.material &&
  e.name &&
  e.colorname !== undefined &&
  e.color !== undefined
);

console.log('✅ Todas as entradas têm os campos obrigatórios:', hasAllFields);

// Show a PLA Matte example
const plaMatte = data.find(e => e.name.includes('PLA Matte'));
if (plaMatte) {
  console.log('\n📋 Exemplo de PLA Matte:');
  console.log(JSON.stringify(plaMatte, null, 2));
}

// Show a PETG HF example
const petgHF = data.find(e => e.name.includes('PETG HF'));
if (petgHF) {
  console.log('\n📋 Exemplo de PETG HF:');
  console.log(JSON.stringify(petgHF, null, 2));
}
