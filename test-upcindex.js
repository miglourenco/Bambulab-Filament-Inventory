import axios from 'axios';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test free EAN APIs
async function testEANAPIs(ean) {
  console.log(`\n========================================`);
  console.log(`Testing Free EAN APIs for: ${ean}`);
  console.log(`========================================\n`);

  const results = [];

  // Test UPCItemDB
  try {
    console.log('📡 Testing UPCItemDB...');
    const response = await axios.get(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${ean}`,
      { timeout: 10000 }
    );

    if (response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      console.log('✅ UPCItemDB - SUCCESS');
      console.log('   Title:', item.title);
      console.log('   Brand:', item.brand);
      console.log('   Description:', item.description);
      console.log('   Model:', item.model);
      console.log('   Category:', item.category);
      results.push({
        api: 'UPCItemDB',
        success: true,
        data: item
      });
    } else {
      console.log('⚠️  UPCItemDB - No items found');
      results.push({ api: 'UPCItemDB', success: false, error: 'No items found' });
    }
  } catch (error) {
    console.log(`❌ UPCItemDB - ERROR: ${error.message}`);
    results.push({ api: 'UPCItemDB', success: false, error: error.message });
  }

  await delay(1000);

  // Test EAN-Search.org
  try {
    console.log('\n📡 Testing EAN-Search.org...');
    const response = await axios.get(
      `https://api.ean-search.org/api?token=FREE_TIER&op=barcode-lookup&ean=${ean}&format=json`,
      { timeout: 10000 }
    );

    if (response.data && response.data.length > 0) {
      const item = response.data[0];
      console.log('✅ EAN-Search - SUCCESS');
      console.log('   Name:', item.name);
      console.log('   Category:', item.categoryName);
      console.log('   EAN:', item.ean);
      results.push({
        api: 'EAN-Search',
        success: true,
        data: item
      });
    } else {
      console.log('⚠️  EAN-Search - No results found');
      results.push({ api: 'EAN-Search', success: false, error: 'No results found' });
    }
  } catch (error) {
    console.log(`❌ EAN-Search - ERROR: ${error.message}`);
    results.push({ api: 'EAN-Search', success: false, error: error.message });
  }

  await delay(1000);

  // Test OpenFoodFacts
  try {
    console.log('\n📡 Testing OpenFoodFacts...');
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${ean}.json`,
      { timeout: 10000 }
    );

    if (response.data.status === 1) {
      const product = response.data.product;
      console.log('✅ OpenFoodFacts - SUCCESS');
      console.log('   Name:', product.product_name || product.product_name_en);
      console.log('   Brand:', product.brands);
      console.log('   Category:', product.categories);
      results.push({
        api: 'OpenFoodFacts',
        success: true,
        data: product
      });
    } else {
      console.log('⚠️  OpenFoodFacts - Product not found');
      results.push({ api: 'OpenFoodFacts', success: false, error: 'Product not found' });
    }
  } catch (error) {
    console.log(`❌ OpenFoodFacts - ERROR: ${error.message}`);
    results.push({ api: 'OpenFoodFacts', success: false, error: error.message });
  }

  console.log(`\n========================================`);
  console.log(`Summary`);
  console.log(`========================================`);
  console.log(`Total APIs tested: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`========================================\n`);

  return results;
}

// Test local endpoint
async function testLocalEndpoint(ean) {
  console.log(`\n========================================`);
  console.log(`Testing Local Endpoint`);
  console.log(`========================================\n`);

  try {
    console.log(`Calling: http://localhost:3000/product-info/${ean}`);
    const response = await axios.get(`http://localhost:3000/product-info/${ean}`);

    console.log('✅ SUCCESS');
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n📋 Parsed Data:');
    console.log(`   Manufacturer: ${response.data.manufacturer || 'N/A'}`);
    console.log(`   Type: ${response.data.type || 'N/A'}`);
    console.log(`   Name: ${response.data.name || 'N/A'}`);
    console.log(`   Color Name: ${response.data.colorname || 'N/A'}`);
    console.log(`   Color HEX: ${response.data.color || 'N/A'}`);

    if (response.data.source === 'local_database') {
      console.log('\n📦 Source: Local Database');
    } else if (response.data.source) {
      console.log(`\n🌐 Source: ${response.data.source} API`);
    }

    console.log(`\n========================================\n`);
    return response.data;
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data:`, error.response.data);
    }
    console.log(`\n========================================\n`);
    return null;
  }
}

// Main test
(async () => {
  const testEAN = process.argv[2] || '6975337033950';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`EAN LOOKUP TEST SUITE`);
  console.log(`EAN: ${testEAN}`);
  console.log(`${'='.repeat(60)}\n`);

  // Test direct APIs first
  await testEANAPIs(testEAN);

  await delay(2000);

  // Test local endpoint (requires server running)
  await testLocalEndpoint(testEAN);
})();
