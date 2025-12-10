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
    return this.materials
      .filter(m => m.material === materialType)
      .map(m => ({
        colorname: m.colorname,
        color: m.color,
        distance: m.distance,
        note: m.note
      }));
  }

  // Find color by material type and hex code (for HASS import)
  findColorByHex(materialType, hexColor) {
    // Normalize hex color
    const normalizedHex = hexColor.toUpperCase();

    // First try exact match
    let match = this.materials.find(
      m => m.material === materialType && m.color.toUpperCase() === normalizedHex
    );

    if (match) {
      return match.colorname;
    }

    // Try to find closest color by distance calculation
    const materialsOfType = this.materials.filter(m => m.material === materialType);

    if (materialsOfType.length === 0) return null;

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

    return closest ? closest.colorname : null;
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
        distance: 0,
        note: "Custom",
        productType: "Spool",
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
}

const materialsDB = new MaterialsDB();
export default materialsDB;
