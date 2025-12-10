import axios from 'axios';
import * as cheerio from 'cheerio';

async function testUPCIndex(ean) {
  try {
    console.log(`\n========================================`);
    console.log(`Testing UPCIndex for EAN: ${ean}`);
    console.log(`========================================\n`);

    const url = `https://www.upcindex.com/${ean}`;
    console.log(`Fetching URL: ${url}`);

    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    console.log(`HTML received, length: ${html.length} bytes\n`);

    const $ = cheerio.load(html);

    // Let's explore the HTML structure
    console.log('=== Looking for product title ===');
    const title = $('h1').first().text().trim();
    console.log('H1:', title);

    console.log('\n=== Looking for product details ===');

    // Try different selectors
    const metaDescription = $('meta[name="description"]').attr('content');
    console.log('Meta description:', metaDescription);

    const ogTitle = $('meta[property="og:title"]').attr('content');
    console.log('OG Title:', ogTitle);

    console.log('\n=== Looking for detail tables ===');
    $('table').each((i, table) => {
      console.log(`\nTable ${i + 1}:`);
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('td, th');
        if (cells.length > 0) {
          const text = cells.map((k, cell) => $(cell).text().trim()).get().join(' | ');
          console.log(`  ${text}`);
        }
      });
    });

    console.log('\n=== Looking for product info divs ===');
    $('div.product-info, div.details, div.description').each((i, div) => {
      console.log(`Div ${i + 1}:`, $(div).text().trim().substring(0, 200));
    });

    console.log('\n=== Looking for all text content ===');
    const bodyText = $('body').text();

    // Search for "Bambu" in the text
    const bambuIndex = bodyText.toLowerCase().indexOf('bambu');
    if (bambuIndex !== -1) {
      console.log('\nFound "Bambu" at position', bambuIndex);
      console.log('Context:', bodyText.substring(Math.max(0, bambuIndex - 50), bambuIndex + 150));
    }

    // Look for common product info patterns
    console.log('\n=== Searching for key patterns ===');

    // Brand
    const brandMatch = bodyText.match(/Brand[\s:]+([^\n]+)/i);
    if (brandMatch) console.log('Brand found:', brandMatch[1].trim());

    // Product name/description
    const productMatch = bodyText.match(/Product[\s:]+(Name|Description)[\s:]+([^\n]+)/i);
    if (productMatch) console.log('Product:', productMatch[2].trim());

    // Category
    const categoryMatch = bodyText.match(/Category[\s:]+([^\n]+)/i);
    if (categoryMatch) console.log('Category:', categoryMatch[1].trim());

    console.log('\n========================================');
    console.log('Test completed');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

// Test with the EAN provided
const testEAN = process.argv[2] || '6975337033950';
testUPCIndex(testEAN);
