import fs from 'fs/promises';
import path from 'path';

const MATERIALS_DB_FILE = './data/base_dados_completa.json';

class MaterialsDB {
  constructor() {
    this.materials = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Load materials from base_dados_completa.json
      const data = await fs.readFile(MATERIALS_DB_FILE, 'utf8');
      this.materials = JSON.parse(data);
      console.log(`Loaded ${this.materials.length} materials from base_dados_completa.json`);
    } catch (error) {
      console.error('ERROR: base_dados_completa.json not found! Please ensure the file exists.');
      this.materials = [];
    }

    this.initialized = true;
  }

  async save() {
    try {
      // Save materials back to base_dados_completa.json
      // This includes any custom materials added by users
      await fs.mkdir('./data', { recursive: true });
      await fs.writeFile(MATERIALS_DB_FILE, JSON.stringify(this.materials, null, 2));
      console.log(`Saved ${this.materials.length} materials to base_dados_completa.json`);
    } catch (error) {
      console.error('Error saving materials database:', error);
    }
  }

  // Get all unique material types
  getMaterialTypes() {
    const types = [...new Set(this.materials.map(m => m.material))];
    return types.sort();
  }

  // Get colors for a specific material type
  getColorsForMaterial(materialType) {
    const colors = this.materials
      .filter(m => m.material === materialType)
      .map(m => ({
        colorname: m.colorname,
        color: m.color,
        note: m.note
      }));

    // Filter duplicates: keep only unique colornames
    const uniqueColors = [];
    const seenColorNames = new Set();

    for (const color of colors) {
      if (!seenColorNames.has(color.colorname)) {
        seenColorNames.add(color.colorname);
        uniqueColors.push(color);
      }
    }

    return uniqueColors;
  }

  // Find color by product name and hex code (for HASS import)
  findColorByNameAndHex(productName, hexColor) {
    // Normalize hex color
    const normalizedHex = hexColor.toUpperCase();

    console.log(`[MaterialsDB] findColorByNameAndHex - Looking for name: "${productName}", color: "${normalizedHex}"`);
    console.log(`[MaterialsDB] Database has ${this.materials.length} materials loaded`);

    // First try exact match by name and color
    let match = this.materials.find(
      m => m.name === productName && m.color.toUpperCase() === normalizedHex
    );

    if (match) {
      console.log(`[MaterialsDB] ✅ Exact match found by name: "${match.colorname}"`);
      return match.colorname;
    }

    console.log(`[MaterialsDB] No exact match by name, trying closest color for this product...`);

    // Try to find closest color by distance calculation for this product name
    const materialsWithName = this.materials.filter(m => m.name === productName);

    console.log(`[MaterialsDB] Found ${materialsWithName.length} materials with name "${productName}"`);

    if (materialsWithName.length === 0) {
      console.log(`[MaterialsDB] ⚠️ No materials with name "${productName}", trying by material type...`);
      // Fallback to old method using material type
      return this.findColorByMaterialType(productName, normalizedHex);
    }

    // Calculate color distance
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const colorDistance = (color1, color2) => {
      const c1 = hexToRgb(color1);
      const c2 = hexToRgb(color2);
      if (!c1 || !c2) return Infinity;

      return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
      );
    };

    // Find closest color (threshold of 30 for similar colors)
    let closest = null;
    let minDistance = 30;

    for (const material of materialsWithName) {
      const distance = colorDistance(normalizedHex, material.color);
      if (distance < minDistance) {
        minDistance = distance;
        closest = material;
      }
    }

    if (closest) {
      console.log(`[MaterialsDB] ✅ Closest match found by name: "${closest.colorname}" (distance: ${minDistance.toFixed(2)})`);
      return closest.colorname;
    } else {
      console.log(`[MaterialsDB] ❌ No close match found by name (all colors had distance > 30)`);
      return null;
    }
  }

  // Find color by material type and hex code (fallback method)
  findColorByMaterialType(materialType, hexColor) {
    // Normalize hex color
    const normalizedHex = hexColor.toUpperCase();

    console.log(`[MaterialsDB] findColorByMaterialType - Looking for material: "${materialType}", color: "${normalizedHex}"`);

    // Extract material type from name if it contains "Bambu"
    let actualMaterialType = materialType;
    if (materialType.includes('Bambu ')) {
      actualMaterialType = materialType.replace('Bambu ', '').split(' ')[0];
      console.log(`[MaterialsDB] Extracted material type: "${actualMaterialType}"`);
    }

    // First try exact match
    let match = this.materials.find(
      m => m.material === actualMaterialType && m.color.toUpperCase() === normalizedHex
    );

    if (match) {
      console.log(`[MaterialsDB] ✅ Exact match found by material type: "${match.colorname}"`);
      return match.colorname;
    }

    console.log(`[MaterialsDB] No exact match, trying closest color...`);

    // Try to find closest color by distance calculation
    const materialsOfType = this.materials.filter(m => m.material === actualMaterialType);

    console.log(`[MaterialsDB] Found ${materialsOfType.length} materials of type "${actualMaterialType}"`);

    if (materialsOfType.length === 0) {
      console.log(`[MaterialsDB] ❌ No materials of type "${actualMaterialType}" in database`);
      return null;
    }

    // Calculate color distance
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const colorDistance = (color1, color2) => {
      const c1 = hexToRgb(color1);
      const c2 = hexToRgb(color2);
      if (!c1 || !c2) return Infinity;

      return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
      );
    };

    // Find closest color (threshold of 30 for similar colors)
    let closest = null;
    let minDistance = 30;

    for (const material of materialsOfType) {
      const distance = colorDistance(normalizedHex, material.color);
      if (distance < minDistance) {
        minDistance = distance;
        closest = material;
      }
    }

    if (closest) {
      console.log(`[MaterialsDB] ✅ Closest match found: "${closest.colorname}" (distance: ${minDistance.toFixed(2)})`);
      return closest.colorname;
    } else {
      console.log(`[MaterialsDB] ❌ No close match found (all colors had distance > 30)`);
      return null;
    }
  }

  // Add new material/color combination
  async addMaterial(materialType, colorname, hexColor) {
    // Check if already exists
    const exists = this.materials.some(
      m => m.material === materialType &&
           m.colorname === colorname &&
           m.color.toUpperCase() === hexColor.toUpperCase()
    );

    if (!exists) {
      // Add with full base_dados_completa.json structure
      this.materials.push({
        manufacturer: "BambuLab",
        material: materialType,
        name: `Bambu ${materialType}`,
        colorname: colorname,
        color: hexColor.toUpperCase(),
        note: "Custom",
        ean: ""  // No EAN for custom materials
      });
      await this.save();
      console.log(`Added new material: ${materialType} - ${colorname}`);
      return true;
    }

    return false;
  }

  // Get all materials (for export/debugging)
  getAllMaterials() {
    return this.materials;
  }

  // Update or create material from filament data
  async updateOrCreateMaterial(filamentData) {
    const { manufacturer, type, name, colorname, color } = filamentData;

    console.log(`[MaterialsDB] updateOrCreateMaterial - Manufacturer: ${manufacturer}, Type: ${type}, Name: ${name}, ColorName: ${colorname}, Color: ${color}`);

    // Check if material already exists by manufacturer + material + name + colorname + color
    const existing = this.materials.find(
      m => m.manufacturer === manufacturer &&
           m.material === type &&
           m.name === name &&
           m.colorname === colorname &&
           m.color.toUpperCase() === color.toUpperCase()
    );

    if (existing) {
      console.log(`[MaterialsDB] Material already exists, no update needed`);
      return { action: 'exists', material: existing };
    }

    // Check if we need to update an existing material (same manufacturer + material + name + colorname but different color)
    const toUpdate = this.materials.find(
      m => m.manufacturer === manufacturer &&
           m.material === type &&
           m.name === name &&
           m.colorname === colorname
    );

    if (toUpdate) {
      // Update the color
      toUpdate.color = color.toUpperCase();
      await this.save();
      console.log(`[MaterialsDB] Updated material color: ${name} - ${colorname}`);
      return { action: 'updated', material: toUpdate };
    }

    // Material doesn't exist, create new entry
    const newMaterial = {
      manufacturer,
      material: type,
      name,
      colorname,
      color: color.toUpperCase(),
      note: "Custom",
      ean: ""
    };

    this.materials.push(newMaterial);
    await this.save();
    console.log(`[MaterialsDB] Created new material: ${name} - ${colorname}`);
    return { action: 'created', material: newMaterial };
  }

  // Update existing material with EAN or add new material with EAN
  async updateOrAddEAN(ean, materialData) {
    const { manufacturer, material, name, colorname, color } = materialData;

    // Check if EAN already exists in database
    const existingByEAN = this.materials.find(m => m.ean && m.ean.split(',').includes(ean));

    if (existingByEAN) {
      // EAN exists, update the entry
      existingByEAN.manufacturer = manufacturer;
      existingByEAN.material = material;
      existingByEAN.name = name;
      existingByEAN.colorname = colorname;
      existingByEAN.color = color.toUpperCase();

      await this.save();
      console.log(`Updated existing material with EAN ${ean}: ${name} - ${colorname}`);
      return { action: 'updated', ean };
    }

    // Check if same material/color combination exists
    const existingByMaterial = this.materials.find(
      m => m.manufacturer === manufacturer &&
           m.material === material &&
           m.name === name &&
           m.colorname === colorname &&
           m.color.toUpperCase() === color.toUpperCase()
    );

    if (existingByMaterial) {
      // Found matching material, add or append EAN to it
      if (existingByMaterial.ean && existingByMaterial.ean !== '') {
        // Append EAN if not already in the list
        const eans = existingByMaterial.ean.split(',');
        if (!eans.includes(ean)) {
          existingByMaterial.ean = [...eans, ean].join(',');
        }
      } else {
        existingByMaterial.ean = ean;
      }
      await this.save();
      console.log(`Added EAN ${ean} to existing material: ${name} - ${colorname}`);
      return { action: 'ean_added', ean };
    }

    // Material doesn't exist, create new entry
    this.materials.push({
      manufacturer,
      material,
      name,
      colorname,
      color: color.toUpperCase(),
      note: "Custom",
      ean
    });

    await this.save();
    console.log(`Added new material with EAN ${ean}: ${name} - ${colorname}`);
    return { action: 'created', ean };
  }
}

const materialsDB = new MaterialsDB();
export default materialsDB;
