import 'dotenv/config';
import express from 'express';
import { expressjwt } from 'express-jwt';
import cryptoRandomString from 'crypto-random-string';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import db from './src/database.js';
import materialsDB from './src/materials-db.js';
import './src/hass-sync.js';

// Initialize materials database
await materialsDB.initialize();

const app = express();

// Generate or load JWT secret
let secret = process.env.JWT_SECRET;

if (!secret) {
  try {
    const secretFile = './data/jwt-secret.txt';
    try {
      secret = await fs.readFile(secretFile, 'utf8');
      console.log('Using existing JWT secret from file');
    } catch (e) {
      // File doesn't exist, generate new secret
      secret = process.env.DEBUG ? 'unsecure' : cryptoRandomString({ length: 64 });
      try {
        await fs.writeFile(secretFile, secret);
        console.log('Generated new JWT secret and saved to file');
      } catch (writeError) {
        console.error('Could not save JWT secret to file:', writeError);
      }
    }
  } catch (e) {
    console.error('Error handling JWT secret:', e);
    secret = process.env.DEBUG ? 'unsecure' : cryptoRandomString({ length: 64 });
  }
}

// Add json body parser
app.use(express.json());

// Add CORS
app.use(cors());

// Use Express JWT to validate JWT tokens
// Disable JWT validation for /oauth/token, /register and all static files
app.use(
  expressjwt({
    secret,
    algorithms: ['HS256'],
  }).unless((path) => {
    var url = path.originalUrl;

    if (url === '/oauth/token' || url === '/register') {
      return true;
    }

    if (url === '/') {
      return true;
    }

    if (url.startsWith('/assets/')) {
      return true;
    }

    if (url.startsWith('/favicon.ico')) {
      return true;
    }

    if (url === '/login') {
      return true;
    }

    // Allow access to materials endpoints (needed for barcode scanner)
    if (url.startsWith('/materials/')) {
      return true;
    }

    // Allow access to product info endpoint (needed for barcode scanner)
    if (url.startsWith('/product-info/')) {
      return true;
    }

    return false;
  })
);

// Error handler for JWT authentication
app.use((err, _req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    // JWT token is invalid or missing
    // For API requests, return 401
    // For page requests, the frontend will handle redirect to login
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'TOKEN_EXPIRED'
    });
  }
  next(err);
});

// Implement OAuth 2.0 password grant with database
app.post('/oauth/token', async (req, res) => {
  try {
    if (req.body.grant_type !== 'password') {
      res.status(400).send('Invalid grant type');
      return;
    }

    const user = await db.verifyPassword(req.body.username, req.body.password);

    if (!user) {
      res.status(401).send('Invalid credentials');
      return;
    }

    const tokenData = {
      sub: user.id,
      username: user.username,
      role: user.role
    };

    res.json({
      access_token: jwt.sign(tokenData, secret, {
        algorithm: 'HS256',
        expiresIn: process.env.DEBUG ? '10y' : '8h',
      }),
      token_type: 'Bearer',
      expires_in: process.env.DEBUG ? 315360000 : 28800,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Internal server error');
  }
});

// Register new user (admin only)
app.post('/register', async (req, res) => {
  try {
    const { username, password, email, adminKey } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check admin key for registration
    const validAdminKey = process.env.ADMIN_REGISTRATION_KEY || 'change-this-key';
    if (adminKey !== validAdminKey) {
      return res.status(403).json({ error: 'Invalid admin key. Only administrators can create new users.' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const userId = await db.createUser({
      username,
      password,
      email,
      role: 'user'
    });

    const user = await db.getUserById(userId);

    res.json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
app.get('/user/me', async (req, res) => {
  try {
    const userId = req.auth.sub;
    const user = await db.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      hassUrl: user.hassUrl || '',
      trayName: user.trayName || 'tray',
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
app.put('/user/settings', async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { hassUrl, hassToken, email, trayName } = req.body;

    const updates = {};
    if (hassUrl !== undefined) updates.hassUrl = hassUrl;
    if (hassToken !== undefined) updates.hassToken = hassToken;
    if (email !== undefined) updates.email = email;
    if (trayName !== undefined) updates.trayName = trayName;

    const user = await db.updateUser(userId, updates);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      hassUrl: user.hassUrl || '',
      trayName: user.trayName || 'tray'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's filaments
app.get('/filaments', async (req, res) => {
  try {
    const userId = req.auth.sub;
    const user = await db.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let filaments;
    // All users can see all filaments, but viewAll parameter controls the view
    if (req.query.viewAll === 'true') {
      filaments = db.getAllFilaments();
    } else {
      filaments = db.getUserFilaments(userId);
    }

    res.json(filaments);
  } catch (error) {
    console.error('Get filaments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search filament by code
app.get('/filaments/search/:code', async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { code } = req.params;

    const filament = db.findFilamentByCode(userId, code);

    if (filament) {
      res.json(filament);
    } else {
      res.status(404).json({ error: 'Filament not found' });
    }
  } catch (error) {
    console.error('Search filament error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add or update filament
app.post('/update', async (req, res) => {
  try {
    const userId = req.auth.sub;
    let { tag_uid, ...filamentData } = req.body;

    // Normalize color
    if (filamentData.color?.length === 7) {
      filamentData.color = filamentData.color + 'FF';
    }
    if (filamentData.color) {
      filamentData.color = filamentData.color.toUpperCase();
    }

    if (tag_uid && db.getFilament(tag_uid)) {
      // Update existing
      await db.updateFilament(tag_uid, filamentData);
    } else {
      // Add new
      await db.addFilament(userId, { tag_uid, ...filamentData });
    }

    const userFilaments = db.getUserFilaments(userId);
    res.json(userFilaments);
  } catch (error) {
    console.error('Update filament error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete filament
app.post('/delete', async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { tag_uid } = req.body;

    const filament = db.getFilament(tag_uid);
    if (!filament) {
      return res.status(404).json({ error: 'Filament not found' });
    }

    // Check ownership or admin
    const user = await db.getUserById(userId);
    if (filament.userId !== userId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.deleteFilament(tag_uid);

    const userFilaments = db.getUserFilaments(userId);
    res.json(userFilaments);
  } catch (error) {
    console.error('Delete filament error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AMS Configuration endpoints

// Get user's AMS configurations
app.get('/ams-config', async (req, res) => {
  try {
    const userId = req.auth.sub;
    const configs = db.getUserAMSConfigs(userId);
    res.json(configs);
  } catch (error) {
    console.error('Get AMS configs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add AMS configuration
app.post('/ams-config', async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { name, type, sensor } = req.body;

    if (!name || !type || !sensor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validTypes = ['ams', 'ams2pro', 'amsht', 'amslite'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid AMS type' });
    }

    const config = await db.addAMSConfig(userId, { name, type, sensor, enabled: true });
    res.json(config);
  } catch (error) {
    console.error('Add AMS config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update AMS configuration
app.put('/ams-config/:amsId', async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { amsId } = req.params;
    const { name, type, sensor, enabled } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (sensor !== undefined) updates.sensor = sensor;
    if (enabled !== undefined) updates.enabled = enabled;

    const config = await db.updateAMSConfig(userId, amsId, updates);

    if (!config) {
      return res.status(404).json({ error: 'AMS configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Update AMS config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete AMS configuration
app.delete('/ams-config/:amsId', async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { amsId } = req.params;

    const success = await db.deleteAMSConfig(userId, amsId);

    if (!success) {
      return res.status(404).json({ error: 'AMS configuration not found' });
    }

    res.json({ message: 'AMS configuration deleted successfully' });
  } catch (error) {
    console.error('Delete AMS config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Load EAN database
import eanDatabase from './data/base_dados_completa.json' assert { type: 'json' };

// Helper function to delay between API calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to search EAN in free APIs
async function searchEANInAPIs(ean) {
  console.log(`[API Search] Trying free APIs for EAN: ${ean}`);

  // Try API 1: UPCItemDB (100 requests/day on trial)
  try {
    console.log('[API Search] Trying UPCItemDB...');
    const response = await axios.get(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${ean}`,
      { timeout: 10000 }
    );

    if (response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      console.log('[API Search] ✅ Found in UPCItemDB:', item.title);

      return {
        rawTitle: item.title,
        manufacturer: item.brand || '',
        description: item.description || '',
        model: item.model || '',
        source: 'UPCItemDB',
        found: true
      };
    }
  } catch (error) {
    console.log(`[API Search] UPCItemDB error: ${error.message}`);
  }

  await delay(500);

  // Try API 2: EAN-Search.org (free)
  try {
    console.log('[API Search] Trying EAN-Search.org...');
    const response = await axios.get(
      `https://api.ean-search.org/api?token=FREE_TIER&op=barcode-lookup&ean=${ean}&format=json`,
      { timeout: 10000 }
    );

    if (response.data && response.data.length > 0) {
      const item = response.data[0];
      console.log('[API Search] ✅ Found in EAN-Search:', item.name);

      return {
        rawTitle: item.name,
        manufacturer: '',
        description: item.categoryName || '',
        source: 'EAN-Search',
        found: true
      };
    }
  } catch (error) {
    console.log(`[API Search] EAN-Search error: ${error.message}`);
  }

  await delay(500);

  // Try API 3: OpenFoodFacts (mainly for food, but worth trying)
  try {
    console.log('[API Search] Trying OpenFoodFacts...');
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${ean}.json`,
      { timeout: 10000 }
    );

    if (response.data.status === 1) {
      const product = response.data.product;
      console.log('[API Search] ✅ Found in OpenFoodFacts:', product.product_name);

      return {
        rawTitle: product.product_name || product.product_name_en || '',
        manufacturer: product.brands || '',
        description: product.generic_name || product.categories || '',
        source: 'OpenFoodFacts',
        found: true
      };
    }
  } catch (error) {
    console.log(`[API Search] OpenFoodFacts error: ${error.message}`);
  }

  console.log('[API Search] ❌ EAN not found in any API');
  return { found: false };
}

// Helper function to parse product title from API results
function parseAPIProductTitle(apiResult) {
  const title = apiResult.rawTitle || '';
  console.log(`[API Parse] Parsing title: ${title}`);

  // Try to extract Bambu Lab specific information
  if (title.toLowerCase().includes('bambu lab') || title.toLowerCase().includes('bambulab')) {
    console.log('[API Parse] Detected Bambu Lab product');

    // Remove extra info after comma
    const titleBeforeComma = title.split(',')[0].trim();

    // Material types to search for (with priority for composite types)
    const materialTypes = [
      'PETG CF', 'PLA CF', 'ABS CF', 'PA CF', 'PC CF', 'PLA Glow',
      'PLA Basic', 'PLA Matte', 'PLA Silk', 'PLA Metal', 'PLA Marble',
      'PETG', 'PLA', 'ABS', 'TPU', 'ASA', 'PC', 'PA', 'PP', 'PVA', 'HIPS', 'Nylon'
    ];

    let type = '';
    let colorname = '';
    let manufacturer = 'BambuLab';

    // Find material type
    for (const matType of materialTypes) {
      const regex = new RegExp(`\\b${matType.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(titleBeforeComma)) {
        type = matType;
        console.log(`[API Parse] Found material type: ${type}`);
        break;
      }
    }

    // Extract color name
    // Format: "Bambu Lab - 1.75mm PLA Glow Filament - Glow Blue"
    const parts = titleBeforeComma.split(/\s*-\s*/);

    if (parts.length >= 2) {
      // Last part usually contains color
      const lastPart = parts[parts.length - 1].trim();
      colorname = lastPart.replace(/\d+(\.\d+)?\s*mm/gi, '').replace(/filament/gi, '').trim();
      console.log(`[API Parse] Found color name: ${colorname}`);
    }

    // If no color found in parts, try to extract from title after material type
    if (!colorname && type) {
      const afterType = titleBeforeComma.split(new RegExp(type, 'i'))[1];
      if (afterType) {
        colorname = afterType.replace(/\d+(\.\d+)?\s*mm/gi, '')
          .replace(/filament/gi, '')
          .replace(/[-,]/g, '')
          .trim();
        console.log(`[API Parse] Extracted color from after type: ${colorname}`);
      }
    }

    const name = type ? `Bambu ${type}` : '';
    console.log(`[API Parse] Result - Manufacturer: ${manufacturer}, Type: ${type}, Name: ${name}, Color: ${colorname}`);
    return { manufacturer, type, name, colorname };
  }

  // Generic parsing for non-Bambu Lab products
  const parts = title.split(/\s*-\s*/);
  let manufacturer = '';
  let type = '';
  let colorname = '';
  let name = '';

  if (parts.length >= 1) {
    manufacturer = parts[0].trim();
  }
  if (parts.length >= 2) {
    type = parts[1].trim();
    // For generic products, name = manufacturer + type
    name = manufacturer && type ? `${manufacturer} ${type}` : type;
  }
  if (parts.length >= 3) {
    colorname = parts[2].trim();
  }

  console.log(`[API Parse] Generic result - Manufacturer: ${manufacturer}, Type: ${type}, Name: ${name}, Color: ${colorname}`);
  return { manufacturer, type, name, colorname };
}

// Scrape product info from EAN
app.get('/product-info/:ean', async (req, res) => {
  try {
    const { ean } = req.params;
    console.log(`[Product Search] Searching for EAN: ${ean}`);

    // First, try to find in local database
    const localProduct = eanDatabase.find(item => item.ean === ean);

    if (localProduct) {
      console.log(`[Product Search] Found in local database:`, localProduct);

      const response = {
        rawTitle: `Bambu Lab ${localProduct.material} - ${localProduct.colorname}`,
        manufacturer: localProduct.manufacturer,
        type: localProduct.material,
        name: localProduct.name,
        colorname: localProduct.colorname,
        color: localProduct.color,
        source: 'local_database'
      };

      console.log(`[Product Search] Returning result from local DB: ${JSON.stringify(response)}`);
      return res.json(response);
    }

    console.log(`[Product Search] EAN not found in local database, trying free APIs...`);

    // Try free APIs
    const apiResult = await searchEANInAPIs(ean);

    if (apiResult.found) {
      console.log(`[Product Search] Found in API: ${apiResult.source}`);

      // Parse the API result
      const productInfo = parseAPIProductTitle(apiResult);

      const response = {
        rawTitle: apiResult.rawTitle,
        manufacturer: productInfo.manufacturer || apiResult.manufacturer || '',
        type: productInfo.type || '',
        name: productInfo.name || '',
        colorname: productInfo.colorname || '',
        source: apiResult.source
      };

      console.log(`[Product Search] Returning result from ${apiResult.source}: ${JSON.stringify(response)}`);
      return res.json(response);
    }

    console.log(`[Product Search] EAN not found in APIs, trying web scraping...`);

    // Fetch the product page
    const url = `https://pt.product-search.net/?q=${ean}`;
    console.log(`[Product Search] Fetching URL: ${url}`);

    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log(`[Product Search] HTML received, length: ${html.length} bytes`);

    // Load HTML into cheerio
    const $ = cheerio.load(html);

    // Find the link with href="/ext/{EAN}"
    // Example: <a href="/ext/6975337032243" rel="nofollow" target="_blank">Bambu Lab PETG CF - Black - 1.75mm, 3D printer filament</a>
    const productLink = $(`a[href="/ext/${ean}"]`);

    console.log(`[Product Search] Found ${productLink.length} links matching EAN`);

    let productTitle = '';

    if (productLink.length > 0) {
      productTitle = productLink.text().trim();
      console.log(`[Product Search] Product found via link: ${productTitle}`);
    } else {
      // Fallback: try to find any link containing the EAN
      console.log(`[Product Search] Exact match not found, searching for links containing EAN...`);

      $('a').each((_i, elem) => {
        const href = $(elem).attr('href');
        if (href && href.includes(ean)) {
          productTitle = $(elem).text().trim();
          console.log(`[Product Search] Found via fallback search: ${productTitle} (href: ${href})`);
          return false; // break the loop
        }
      });
    }

    if (!productTitle) {
      console.log(`[Product Search] Product not found for EAN: ${ean}`);
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log(`[Product Search] Parsing title: ${productTitle}`);

    // Parse the title to extract manufacturer, type, and colorname
    // Example format: "Bambu Lab PETG CF - Black - 1.75mm, 3D printer filament"
    const parseProductTitle = (title) => {
      // Remove extra info after comma
      const titleBeforeComma = title.split(',')[0].trim();
      console.log(`[Product Search] Title before comma: ${titleBeforeComma}`);

      // Split by " - " or similar delimiters
      const parts = titleBeforeComma.split(/\s*-\s*/);
      console.log(`[Product Search] Title parts: ${JSON.stringify(parts)}`);

      let manufacturer = '';
      let type = '';
      let colorname = '';

      if (parts.length >= 1) {
        // First part usually contains manufacturer and material type
        const firstPart = parts[0].trim();

        // Try to extract manufacturer and type
        // Look for common material types (including composite types like PETG CF)
        const materialTypes = [
          'PETG CF', 'PLA CF', 'ABS CF', 'PA CF', 'PC CF', // Carbon Fiber variants first
          'PLA Basic', 'PLA Matte', 'PLA Silk', 'PLA Metal', 'PLA Marble',
          'PETG', 'PLA', 'ABS', 'TPU', 'ASA', 'PC', 'PA', 'PP', 'PVA', 'HIPS', 'Nylon'
        ];

        let foundType = null;
        for (const matType of materialTypes) {
          const regex = new RegExp(`\\b${matType.replace(/\s+/g, '\\s+')}\\b`, 'i');
          if (regex.test(firstPart)) {
            foundType = matType;
            type = matType;
            // Extract manufacturer (everything before the material type)
            const manufacturerMatch = firstPart.match(new RegExp(`(.+?)\\s+${matType.replace(/\s+/g, '\\s+')}`, 'i'));
            if (manufacturerMatch) {
              manufacturer = manufacturerMatch[1].trim();
              // Normalize Bambu Lab to BambuLab
              if (manufacturer.toLowerCase() === 'bambu lab') {
                manufacturer = 'BambuLab';
              }
            }
            console.log(`[Product Search] Matched material type: ${matType}, manufacturer: ${manufacturer}`);
            break;
          }
        }

        // If no type found in first part, use the whole first part as manufacturer
        if (!foundType && parts.length > 1) {
          manufacturer = firstPart;
          // Normalize Bambu Lab to BambuLab
          if (manufacturer.toLowerCase() === 'bambu lab') {
            manufacturer = 'BambuLab';
          }
          console.log(`[Product Search] No material type found, using first part as manufacturer: ${manufacturer}`);
        }
      }

      // Second part is usually the colorname
      if (parts.length >= 2) {
        colorname = parts[1].trim();
        // Remove size info like "1.75mm"
        colorname = colorname.replace(/\d+(\.\d+)?\s*mm/gi, '').trim();
        console.log(`[Product Search] Color name: ${colorname}`);
      }

      // Third part might have additional color info if needed
      if (parts.length >= 3 && !colorname) {
        const thirdPart = parts[2].trim();
        colorname = thirdPart.replace(/\d+(\.\d+)?\s*mm/gi, '').trim();
        console.log(`[Product Search] Color name from third part: ${colorname}`);
      }

      console.log(`[Product Search] Parsed result - Manufacturer: ${manufacturer}, Type: ${type}, Color: ${colorname}`);
      return { manufacturer, type, colorname };
    };

    const productInfo = parseProductTitle(productTitle);

    const response = {
      rawTitle: productTitle,
      manufacturer: productInfo.manufacturer || '',
      type: productInfo.type || '',
      colorname: productInfo.colorname || ''
    };

    console.log(`[Product Search] Returning result: ${JSON.stringify(response)}`);
    res.json(response);
  } catch (error) {
    console.error('[Product Search] Error:', error.message);
    console.error('[Product Search] Stack:', error.stack);
    if (error.response) {
      console.error(`[Product Search] HTTP Error: ${error.response.status} - ${error.response.statusText}`);
      return res.status(error.response.status).json({ error: 'Failed to fetch product page' });
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get all material types
app.get('/materials/types', async (_req, res) => {
  try {
    const types = materialsDB.getMaterialTypes();
    res.json(types);
  } catch (error) {
    console.error('Get material types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get colors for a specific material type
app.get('/materials/:materialType/colors', async (req, res) => {
  try {
    const { materialType } = req.params;
    const colors = materialsDB.getColorsForMaterial(materialType);
    res.json(colors);
  } catch (error) {
    console.error('Get colors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new material/color combination
app.post('/materials', async (req, res) => {
  try {
    const { material, colorname, color } = req.body;

    if (!material || !colorname || !color) {
      return res.status(400).json({ error: 'Material, colorname, and color are required' });
    }

    const added = await materialsDB.addMaterial(material, colorname, color);
    res.json({ success: true, added });
  } catch (error) {
    console.error('Add material error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// deliver static files from frontend/dist
app.use(express.static('frontend/dist'));

// for vue-router we need to redirect all unknown routes to index.html
app.get('*', async (_req, res) => {
  let content = await fs.readFile('./frontend/dist/index.html', 'utf-8');
  res.send(content);
});

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}!`);
});
