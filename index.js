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

    return false;
  })
);

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

// Scrape product info from product-search.net
app.get('/product-info/:ean', async (req, res) => {
  try {
    const { ean } = req.params;

    // Fetch the product page
    const { data: html } = await axios.get(`https://pt.product-search.net/?q=${ean}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Load HTML into cheerio
    const $ = cheerio.load(html);

    // Try to find the product title - adjust selector based on actual HTML structure
    // Common selectors for product titles
    let productTitle = $('h1.product-title').text().trim() ||
                      $('h1[itemprop="name"]').text().trim() ||
                      $('h1').first().text().trim() ||
                      $('title').text().trim();

    if (!productTitle) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Parse the title to extract manufacturer, type, and colorname
    // Example format: "Bambu Lab ASA - Grey - 1.75mm"
    const parseProductTitle = (title) => {
      // Remove extra info in parentheses and after commas
      title = title.split('(')[0].trim();
      title = title.split(',')[0].trim();

      // Split by " - " or similar delimiters
      const parts = title.split(/\s*-\s*/);

      let manufacturer = '';
      let type = '';
      let colorname = '';

      if (parts.length >= 1) {
        // First part usually contains manufacturer and material type
        const firstPart = parts[0].trim();

        // Try to extract manufacturer and type
        // Look for common material types
        const materialTypes = ['PLA', 'ABS', 'PETG', 'TPU', 'ASA', 'PC', 'PA', 'PP', 'PVA', 'HIPS', 'Nylon', 'PLA Basic', 'PLA Matte', 'PLA Silk'];

        let foundType = null;
        for (const matType of materialTypes) {
          const regex = new RegExp(`\\b${matType}\\b`, 'i');
          if (regex.test(firstPart)) {
            foundType = matType;
            type = matType;
            // Extract manufacturer (everything before the material type)
            const manufacturerMatch = firstPart.match(new RegExp(`(.+?)\\s+${matType}`, 'i'));
            if (manufacturerMatch) {
              manufacturer = manufacturerMatch[1].trim();
            }
            break;
          }
        }

        // If no type found in first part, use the whole first part as manufacturer
        if (!foundType && parts.length > 1) {
          manufacturer = firstPart;
        }
      }

      // Second part is usually the colorname
      if (parts.length >= 2) {
        colorname = parts[1].trim();
        // Remove size info like "1.75mm"
        colorname = colorname.replace(/\d+(\.\d+)?\s*mm/gi, '').trim();
      }

      return { manufacturer, type, colorname };
    };

    const productInfo = parseProductTitle(productTitle);

    res.json({
      rawTitle: productTitle,
      manufacturer: productInfo.manufacturer || '',
      type: productInfo.type || '',
      colorname: productInfo.colorname || ''
    });
  } catch (error) {
    console.error('Product info scraping error:', error);
    if (error.response) {
      return res.status(error.response.status).json({ error: 'Failed to fetch product page' });
    }
    res.status(500).json({ error: 'Internal server error' });
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
