import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Normalize a hex color to RGB format (#RRGGBB)
 * Handles RGBA (#RRGGBBAA), extra long formats (#RRGGBBAAAA), and lowercase
 */
function normalizeColor(color) {
  if (!color || typeof color !== 'string') return '#FFFFFF';

  let normalized = color.toUpperCase().trim();

  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized;
  }

  // Truncate to RGB only (remove alpha channel)
  if (normalized.length > 7) {
    normalized = normalized.slice(0, 7);
  }

  return normalized;
}

class Database {
  constructor() {
    this.dbPath = './data/database.json';
    this.data = {
      users: {},
      filaments: {},
      amsConfigs: {}
    };
  }

  async load() {
    try {
      const fileContent = await fs.readFile(this.dbPath, 'utf-8');
      this.data = JSON.parse(fileContent);

      // Ensure all structures exist
      if (!this.data.users) this.data.users = {};
      if (!this.data.filaments) this.data.filaments = {};
      if (!this.data.amsConfigs) this.data.amsConfigs = {};

      // Migrate old data if exists
      await this.migrateOldData();
    } catch (e) {
      console.log('No existing database found, creating new one');
      await this.save();
    }
  }

  async migrateOldData() {
    try {
      const oldData = JSON.parse(await fs.readFile('./data/hass-data.json', 'utf-8'));

      // Check if we need to migrate (if admin user doesn't exist)
      const adminUser = Object.values(this.data.users).find(u => u.username === process.env.AUTH_USER);

      if (!adminUser && Object.keys(oldData).length > 0) {
        console.log('Migrating old data to new multi-user system...');

        // Create admin user from environment
        const adminId = await this.createUser({
          username: process.env.AUTH_USER,
          password: process.env.AUTH_PASSWORD,
          email: 'admin@local',
          role: 'admin'
        });

        // Migrate filaments to admin user
        for (const [tag_uid, filament] of Object.entries(oldData)) {
          this.data.filaments[tag_uid] = {
            ...filament,
            userId: adminId,
            serialNumber: filament.tracking ? tag_uid : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }

        // Create default AMS config if HASS sensors exist
        if (process.env.HASS_SENSORS) {
          const sensors = process.env.HASS_SENSORS.split(',');
          this.data.amsConfigs[adminId] = sensors.map((sensor, index) => ({
            id: `ams-${Date.now()}-${index}`,
            name: `AMS ${index + 1}`,
            type: 'ams', // Default to standard AMS
            sensor: sensor.trim(),
            enabled: true
          }));
        }

        await this.save();
        console.log('Migration completed successfully');
      }
    } catch (e) {
      console.log('No old data to migrate');
    }
  }

  async save() {
    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
  }

  // User Management
  async createUser(userData) {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    this.data.users[userId] = {
      id: userId,
      username: userData.username,
      password: hashedPassword,
      email: userData.email,
      role: userData.role || 'user',
      createdAt: new Date().toISOString(),
      hassUrl: userData.hassUrl || process.env.HASS_URL || '',
      hassToken: userData.hassToken || '',
      trayName: userData.trayName || 'tray',
      hassMode: userData.hassMode || 'disabled', // 'polling', 'webhook', 'disabled'
      webhookToken: crypto.randomUUID() // Generate unique webhook token for each user
    };

    await this.save();
    return userId;
  }

  async getUserByUsername(username) {
    return Object.values(this.data.users).find(u => u.username === username);
  }

  async getUserById(userId) {
    return this.data.users[userId];
  }

  async getUserByWebhookToken(token) {
    if (!token) return null;
    return Object.values(this.data.users).find(u => u.webhookToken === token);
  }

  async regenerateWebhookToken(userId) {
    if (this.data.users[userId]) {
      const newToken = crypto.randomUUID();
      this.data.users[userId].webhookToken = newToken;
      this.data.users[userId].updatedAt = new Date().toISOString();
      await this.save();
      return newToken;
    }
    return null;
  }

  getAllUsers() {
    return Object.values(this.data.users);
  }

  async updateUser(userId, updates) {
    if (this.data.users[userId]) {
      // Don't allow password updates through this method
      const { password, ...safeUpdates } = updates;

      this.data.users[userId] = {
        ...this.data.users[userId],
        ...safeUpdates,
        updatedAt: new Date().toISOString()
      };

      await this.save();
      return this.data.users[userId];
    }
    return null;
  }

  async updateUserPassword(userId, newPassword) {
    if (this.data.users[userId]) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      this.data.users[userId].password = hashedPassword;
      this.data.users[userId].updatedAt = new Date().toISOString();
      await this.save();
      return true;
    }
    return false;
  }

  async verifyPassword(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  // Filament Management
  getUserFilaments(userId) {
    const user = this.data.users[userId];
    return Object.values(this.data.filaments)
      .filter(f => f.userId === userId)
      .map(filament => ({
        ...filament,
        username: user ? user.username : 'Unknown'
      }));
  }

  getAllFilaments() {
    return Object.values(this.data.filaments).map(filament => {
      const user = this.data.users[filament.userId];
      return {
        ...filament,
        username: user ? user.username : 'Unknown'
      };
    });
  }

  getFilament(tag_uid) {
    return this.data.filaments[tag_uid];
  }

  async addFilament(userId, filamentData) {
    const tag_uid = filamentData.tag_uid || `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.data.filaments[tag_uid] = {
      tag_uid,
      userId,
      type: filamentData.type || 'Unknown',
      manufacturer: filamentData.manufacturer || 'Unknown',
      name: filamentData.name || 'Unknown',
      variation: filamentData.variation || '',
      color: normalizeColor(filamentData.color),
      colorname: filamentData.colorname || '',
      size: filamentData.size || 1000,
      remain: filamentData.remain || 0,
      empty: filamentData.empty || false,
      tracking: filamentData.tracking || false,
      serialNumber: filamentData.serialNumber || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.save();
    return this.data.filaments[tag_uid];
  }

  async updateFilament(tag_uid, updates) {
    if (this.data.filaments[tag_uid]) {
      this.data.filaments[tag_uid] = {
        ...this.data.filaments[tag_uid],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await this.save();
      return this.data.filaments[tag_uid];
    }
    return null;
  }

  async deleteFilament(tag_uid) {
    if (this.data.filaments[tag_uid]) {
      delete this.data.filaments[tag_uid];
      await this.save();
      return true;
    }
    return false;
  }

  // Find filament by serial number or tag_uid
  findFilamentByCode(userId, code) {
    const filaments = this.getUserFilaments(userId);
    return filaments.find(f => f.tag_uid === code || f.serialNumber === code);
  }

  // Find filament without serial number that matches specifications
  findUnassignedFilament(userId, specifications) {
    const filaments = this.getUserFilaments(userId);
    const specColor = normalizeColor(specifications.color);
    return filaments.find(f =>
      !f.serialNumber &&
      !f.tracking &&
      f.type === specifications.type &&
      f.manufacturer === specifications.manufacturer &&
      f.name === specifications.name &&
      normalizeColor(f.color) === specColor
    );
  }

  // AMS Configuration Management
  getUserAMSConfigs(userId) {
    return this.data.amsConfigs[userId] || [];
  }

  async addAMSConfig(userId, amsData) {
    if (!this.data.amsConfigs[userId]) {
      this.data.amsConfigs[userId] = [];
    }

    const amsConfig = {
      id: `ams-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: amsData.name,
      type: amsData.type, // 'ams', 'ams2pro', 'amsht', 'amslite'
      sensor: amsData.sensor,
      enabled: amsData.enabled !== false,
      createdAt: new Date().toISOString()
    };

    this.data.amsConfigs[userId].push(amsConfig);
    await this.save();
    return amsConfig;
  }

  async updateAMSConfig(userId, amsId, updates) {
    const configs = this.data.amsConfigs[userId];
    if (configs) {
      const index = configs.findIndex(c => c.id === amsId);
      if (index !== -1) {
        configs[index] = {
          ...configs[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        await this.save();
        return configs[index];
      }
    }
    return null;
  }

  async deleteAMSConfig(userId, amsId) {
    const configs = this.data.amsConfigs[userId];
    if (configs) {
      const index = configs.findIndex(c => c.id === amsId);
      if (index !== -1) {
        configs.splice(index, 1);
        await this.save();
        return true;
      }
    }
    return false;
  }

  // Get number of trays based on AMS type
  getAMSTrays(amsType) {
    const trayConfig = {
      'ams': 4,
      'ams2pro': 4,
      'amsht': 1,
      'amslite': 4
    };
    return trayConfig[amsType] || 4;
  }
}

// Singleton instance
const db = new Database();
await db.load();

export default db;
