import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cryptoRandomString from 'crypto-random-string';
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

// Generate or load session secret
let secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;

if (!secret) {
  try {
    const secretFile = './data/session-secret.txt';
    try {
      secret = await fs.readFile(secretFile, 'utf8');
      console.log('Using existing session secret from file');
    } catch (e) {
      // File doesn't exist, generate new secret
      secret = process.env.DEBUG ? 'unsecure' : cryptoRandomString({ length: 64 });
      try {
        await fs.writeFile(secretFile, secret);
        console.log('Generated new session secret and saved to file');
      } catch (writeError) {
        console.error('Could not save session secret to file:', writeError);
      }
    }
  } catch (e) {
    console.error('Error handling session secret:', e);
    secret = process.env.DEBUG ? 'unsecure' : cryptoRandomString({ length: 64 });
  }
}

// Add json body parser
app.use(express.json());

// Add CORS
app.use(cors());

// Configure express-session
app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: process.env.DEBUG ? 315360000000 : 28800000, // 10 years in debug, 8 hours in production
    sameSite: 'lax'
  }
}));

// Session check middleware
// Skip session validation for public routes
const publicRoutes = [
  '/oauth/token',
  '/logout',
  '/register',
  '/',
  '/login',
  '/favicon.ico'
];

const publicRoutePrefixes = [
  '/assets/',
  '/materials/',
  '/product-info/'
];

const requireAuth = (req, res, next) => {
  const url = req.originalUrl;

  // Check if route is public
  if (publicRoutes.includes(url)) {
    return next();
  }

  // Check if route starts with public prefix
  if (publicRoutePrefixes.some(prefix => url.startsWith(prefix))) {
    return next();
  }

  // Check if user has valid session
  if (req.session && req.session.user) {
    return next();
  }

  // No valid session, return 401
  return res.status(401).json({
    error: 'Authentication required',
    code: 'SESSION_REQUIRED'
  });
};

app.use(requireAuth);

// Login endpoint with session-based authentication
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

    // Create session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    // Return user data (keeping similar structure for frontend compatibility)
    res.json({
      access_token: 'session-based-auth', // Dummy token for compatibility
      token_type: 'Session',
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

// Logout endpoint
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
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
    const userId = req.session.user.id;
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
    const userId = req.session.user.id;
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
    const userId = req.session.user.id;
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
    const userId = req.session.user.id;
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
    const userId = req.session.user.id;
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
      // Add new filament
      await db.addFilament(userId, { tag_uid, ...filamentData });

      // Add material to database if it doesn't exist
      if (filamentData.manufacturer && filamentData.type && filamentData.name &&
          filamentData.colorname && filamentData.color) {

        await materialsDB.initialize();
        const materials = materialsDB.getAllMaterials();

        // Check if material already exists
        const exists = materials.some(
          m => m.manufacturer === filamentData.manufacturer &&
               m.material === filamentData.type &&
               m.name === filamentData.name &&
               m.colorname === filamentData.colorname &&
               m.color.toUpperCase() === filamentData.color.toUpperCase()
        );

        if (!exists) {
          console.log('[Add Filament] Adding new material to database:', {
            manufacturer: filamentData.manufacturer,
            material: filamentData.type,
            name: filamentData.name,
            colorname: filamentData.colorname
          });

          // Add material to database
          materials.push({
            manufacturer: filamentData.manufacturer,
            material: filamentData.type,
            variation: filamentData.variation || '',
            name: filamentData.name,
            colorname: filamentData.colorname,
            color: filamentData.color.toUpperCase(),
            note: '',
            ean: filamentData.ean || ''
          });

          await materialsDB.save();

          // Reload EAN database to include the new material
          await reloadEANDatabase();

          console.log('[Add Filament] Material added to database and EAN database reloaded');
        }
      }
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
    const userId = req.session.user.id;
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
    const userId = req.session.user.id;
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
    const userId = req.session.user.id;
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
    const userId = req.session.user.id;
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
    const userId = req.session.user.id;
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
import eanDatabaseImport from './data/base_dados_completa.json' assert { type: 'json' };
let eanDatabase = eanDatabaseImport;

// Function to reload EAN database from disk
async function reloadEANDatabase() {
  try {
    const eanDbPath = './data/base_dados_completa.json';
    const data = await fs.readFile(eanDbPath, 'utf8');
    eanDatabase = JSON.parse(data);
    console.log('[EAN Database] Reloaded successfully');
  } catch (error) {
    console.error('[EAN Database] Failed to reload:', error);
  }
}

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

// Helper function to normalize material type and find best match in database
function normalizeMaterialType(detectedType) {
  // If no type detected, return empty
  if (!detectedType) return '';

  console.log(`[Type Normalization] Input type: "${detectedType}"`);

  // First, try to find exact match in database
  const exactMatch = eanDatabase.find(item =>
    item.material && item.material.toLowerCase() === detectedType.toLowerCase()
  );

  if (exactMatch) {
    console.log(`[Type Normalization] ✅ Exact match found: "${exactMatch.material}"`);
    return exactMatch.material;
  }

  // Try to find partial match (e.g., "PLA Basic" -> "PLA")
  const partialMatch = eanDatabase.find(item => {
    if (!item.material) return false;

    const itemMaterial = item.material.toLowerCase();
    const detectedLower = detectedType.toLowerCase();

    // Check if detected type contains the database material type
    // e.g., "PLA Basic" contains "PLA"
    return detectedLower.includes(itemMaterial) || itemMaterial.includes(detectedLower);
  });

  if (partialMatch) {
    console.log(`[Type Normalization] ✅ Partial match found: "${partialMatch.material}" (from "${detectedType}")`);
    return partialMatch.material;
  }

  // If no match found, try to extract base material type
  // e.g., "PLA Basic" -> "PLA", "PETG CF" -> "PETG"
  const baseMaterials = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'PA', 'PP', 'PVA', 'HIPS', 'Nylon'];
  for (const baseMat of baseMaterials) {
    if (detectedType.toUpperCase().includes(baseMat)) {
      // Check if this base material exists in database
      const baseMatch = eanDatabase.find(item =>
        item.material && item.material.toLowerCase() === baseMat.toLowerCase()
      );
      if (baseMatch) {
        console.log(`[Type Normalization] ✅ Base material match: "${baseMat}" (from "${detectedType}")`);
        return baseMat;
      }
    }
  }

  // If still no match, return original type
  console.log(`[Type Normalization] ⚠️ No match found, returning original: "${detectedType}"`);
  return detectedType;
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

    let detectedType = '';
    let colorname = '';
    let manufacturer = 'BambuLab';

    // Find material type
    for (const matType of materialTypes) {
      const regex = new RegExp(`\\b${matType.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(titleBeforeComma)) {
        detectedType = matType;
        console.log(`[API Parse] Found material type: ${detectedType}`);
        break;
      }
    }

    // Normalize the detected type to match database
    const type = normalizeMaterialType(detectedType);

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
    if (!colorname && detectedType) {
      const afterType = titleBeforeComma.split(new RegExp(detectedType, 'i'))[1];
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
  let detectedType = '';
  let colorname = '';
  let name = '';

  if (parts.length >= 1) {
    manufacturer = parts[0].trim();
  }
  if (parts.length >= 2) {
    detectedType = parts[1].trim();
  }
  if (parts.length >= 3) {
    colorname = parts[2].trim();
  }

  // Normalize type for generic products too
  const type = normalizeMaterialType(detectedType);
  // For generic products, name = manufacturer + type
  name = manufacturer && type ? `${manufacturer} ${type}` : type;

  console.log(`[API Parse] Generic result - Manufacturer: ${manufacturer}, Type: ${type}, Name: ${name}, Color: ${colorname}`);
  return { manufacturer, type, name, colorname };
}

// Scrape product info from EAN
app.get('/product-info/:ean', async (req, res) => {
  try {
    const { ean } = req.params;
    console.log(`[Product Search] Searching for EAN: ${ean}`);

    // First, try to find in local database
    // Check if EAN matches or is contained in the comma-separated EAN list
    const localProduct = eanDatabase.find(item => {
      if (!item.ean) return false;
      const eans = item.ean.split(',').map(e => e.trim());
      return eans.includes(ean);
    });

    if (localProduct) {
      console.log(`[Product Search] Found in local database:`, localProduct);

      const response = {
        rawTitle: `Bambu Lab ${localProduct.material} - ${localProduct.colorname}`,
        manufacturer: localProduct.manufacturer,
        type: localProduct.material,
        variation: localProduct.variation || '',
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

// Get variations for a specific material type (BambuLab only)
app.get('/materials/:materialType/variations', async (req, res) => {
  try {
    const { materialType } = req.params;

    // Filter BambuLab materials of the specified type
    const bambuMaterials = eanDatabase.filter(item =>
      item.manufacturer && item.manufacturer.toLowerCase().includes('bambu') &&
      item.material === materialType
    );

    // Extract unique variations
    const variations = new Set();
    bambuMaterials.forEach(item => {
      if (item.variation) {
        variations.add(item.variation);
      }
    });

    res.json(Array.from(variations).sort());
  } catch (error) {
    console.error('Get variations error:', error);
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

// Update or add material with EAN to base_dados_completa.json
app.post('/materials/update-ean', async (req, res) => {
  try {
    const { ean, manufacturer, material, name, colorname, color } = req.body;

    if (!ean || !manufacturer || !material || !name || !colorname || !color) {
      return res.status(400).json({
        error: 'EAN, manufacturer, material, name, colorname, and color are required'
      });
    }

    const result = await materialsDB.updateOrAddEAN(ean, {
      manufacturer,
      material,
      name,
      colorname,
      color
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Update EAN error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update or create material from filament edit
app.post('/materials/update-from-filament', async (req, res) => {
  try {
    const { manufacturer, type, name, colorname, color } = req.body;

    if (!manufacturer || !type || !name || !colorname || !color) {
      return res.status(400).json({
        error: 'Manufacturer, type, name, colorname, and color are required'
      });
    }

    const result = await materialsDB.updateOrCreateMaterial({
      manufacturer,
      type,
      name,
      colorname,
      color
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Update material from filament error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all materials for database management
app.get('/materials/all', async (req, res) => {
  try {
    await materialsDB.initialize();
    const materials = materialsDB.getAllMaterials();
    res.json(materials);
  } catch (error) {
    console.error('Get all materials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new material to database
app.post('/materials/add', async (req, res) => {
  try {
    const { manufacturer, material, variation, name, colorname, color, note, ean } = req.body;

    if (!manufacturer || !material || !name || !colorname || !color) {
      return res.status(400).json({
        error: 'Manufacturer, material, name, colorname, and color are required'
      });
    }

    await materialsDB.initialize();

    // Check if material already exists
    const materials = materialsDB.getAllMaterials();
    const exists = materials.some(
      m => m.manufacturer === manufacturer &&
           m.material === material &&
           m.name === name &&
           m.colorname === colorname &&
           m.color.toUpperCase() === color.toUpperCase()
    );

    if (exists) {
      return res.status(400).json({
        error: 'Material already exists with the same properties'
      });
    }

    // Add material
    materials.push({
      manufacturer,
      material,
      variation: variation || '',
      name,
      colorname,
      color: color.toUpperCase(),
      note: note || '',
      ean: ean || ''
    });

    await materialsDB.save();

    // Reload EAN database to include the new material
    await reloadEANDatabase();

    res.json({ success: true, message: 'Material added successfully' });
  } catch (error) {
    console.error('Add material error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update existing material in database
app.put('/materials/update', async (req, res) => {
  try {
    const { manufacturer, material, variation, name, colorname, color, note, ean } = req.body;

    if (!manufacturer || !material || !name || !colorname || !color) {
      return res.status(400).json({
        error: 'Manufacturer, material, name, colorname, and color are required'
      });
    }

    await materialsDB.initialize();

    // Find and update material
    const materials = materialsDB.getAllMaterials();
    const materialIndex = materials.findIndex(
      m => m.manufacturer === manufacturer &&
           m.material === material &&
           m.name === name &&
           m.colorname === colorname
    );

    if (materialIndex === -1) {
      return res.status(404).json({
        error: 'Material not found'
      });
    }

    // Update material
    materials[materialIndex] = {
      manufacturer,
      material,
      variation: variation || materials[materialIndex].variation || '',
      name,
      colorname,
      color: color.toUpperCase(),
      note: note || materials[materialIndex].note,
      ean: ean || materials[materialIndex].ean
    };

    await materialsDB.save();

    // Reload EAN database to include the updated material
    await reloadEANDatabase();

    res.json({ success: true, message: 'Material updated successfully' });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete material from database
app.delete('/materials/delete', async (req, res) => {
  try {
    const { manufacturer, material, name, colorname, color } = req.body;

    if (!manufacturer || !material || !name || !colorname || !color) {
      return res.status(400).json({
        error: 'Manufacturer, material, name, colorname, and color are required'
      });
    }

    await materialsDB.initialize();

    // Find and remove material
    const materials = materialsDB.getAllMaterials();
    const materialIndex = materials.findIndex(
      m => m.manufacturer === manufacturer &&
           m.material === material &&
           m.name === name &&
           m.colorname === colorname &&
           m.color.toUpperCase() === color.toUpperCase()
    );

    if (materialIndex === -1) {
      return res.status(404).json({
        error: 'Material not found'
      });
    }

    // Remove material
    materials.splice(materialIndex, 1);

    await materialsDB.save();

    // Reload EAN database to remove the deleted material
    await reloadEANDatabase();

    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
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
