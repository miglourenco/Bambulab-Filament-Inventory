import axios from 'axios';
import db from './database.js';
import materialsDB from './materials-db.js';

const getAMSTrays = async (hassUrl, hassToken, sensor, trayNumber, trayName = 'tray') => {
  try {
    const { data } = await axios.get(`${hassUrl}/api/states/${sensor}_${trayName}_${trayNumber}`, {
      headers: {
        Authorization: `Bearer ${hassToken}`,
      },
    });

    if (data?.attributes && data?.attributes?.tag_uid !== '0000000000000000' && data?.attributes?.remain !== -1) {
      return {
        type: data.attributes.type,
        manufacturer: 'BambuLab',
        tracking: true,
        size: 1000,
        tag_uid: data.attributes.tag_uid,
        remain: data.attributes.remain,
        color: data.attributes.color,
        colorname: '',
        empty: data.attributes.empty,
        name: data.attributes.name,
        serialNumber: data.attributes.tag_uid
      };
    }
  } catch (error) {
    console.log(`Error reading tray ${trayNumber} from ${sensor}:`, error.message);
  }

  return null;
};

/**
 * Process a single tray data and update the database
 * This function is used both by polling (syncUserHASS) and webhook endpoints
 * @param {string} userId - The user ID
 * @param {object} tray - The tray data with tag_uid, color, name, remain, empty (manufacturer and type are fetched from materials DB)
 * @returns {object} - Result of the operation
 */
export const processTrayData = async (userId, tray) => {
  // Validate required fields
  if (!tray.tag_uid || tray.tag_uid === '0000000000000000') {
    return { success: false, message: 'Invalid or empty tag_uid' };
  }

  // Ensure materialsDB is initialized
  await materialsDB.initialize();

  // Look up material info from database using name and color
  const trayName = tray.name || '';
  const trayColor = tray.color || '#FFFFFFFF';

  console.log(`[HASS] Processing tray - Name: "${trayName}", Color: "${trayColor}"`);

  // Fetch material data from database (ignores manufacturer/type sent by HASS)
  const materialInfo = materialsDB.findMaterialByNameAndColor(trayName, trayColor);

  // Use database info if found, otherwise use fallbacks
  const manufacturer = materialInfo?.manufacturer || 'BambuLab';
  const type = materialInfo?.type || tray.type || 'Unknown';
  const colorname = materialInfo?.colorname || '';

  console.log(`[HASS] Material info - Manufacturer: "${manufacturer}", Type: "${type}", ColorName: "${colorname}"`);

  // Normalize tray data with database-sourced info
  const normalizedTray = {
    tag_uid: tray.tag_uid,
    type: type,
    manufacturer: manufacturer,
    tracking: true,
    size: tray.size || 1000,
    remain: typeof tray.remain === 'number' ? tray.remain : 0,
    color: trayColor,
    colorname: colorname,
    empty: tray.empty || false,
    name: trayName,
    serialNumber: tray.tag_uid
  };

  const tag_uid = normalizedTray.tag_uid;
  const key = normalizedTray.color + normalizedTray.type + normalizedTray.name + normalizedTray.manufacturer;

  // Check if should auto-delete (empty or depleted)
  if (normalizedTray.empty || (normalizedTray.remain <= 0 && normalizedTray.remain !== -1)) {
    const existing = db.getFilament(tag_uid);
    if (existing) {
      console.log(`[HASS] Auto-deleting empty/depleted filament: ${tag_uid}`);
      await db.deleteFilament(tag_uid);
      return { success: true, action: 'deleted', tag_uid };
    }
    return { success: true, action: 'skipped', message: 'Empty tray, nothing to delete' };
  }

  const existingFilament = db.getFilament(tag_uid);

  if (!existingFilament) {
    // Try to find an unassigned filament that matches
    const unassigned = db.findUnassignedFilament(userId, {
      type: normalizedTray.type,
      manufacturer: normalizedTray.manufacturer,
      name: normalizedTray.name,
      color: normalizedTray.color
    });

    if (unassigned) {
      // Update the existing unassigned filament with the serial number
      console.log(`[HASS] Associating serial ${tag_uid} to existing filament ${unassigned.tag_uid}`);
      await db.deleteFilament(unassigned.tag_uid);
      await db.addFilament(userId, {
        ...unassigned,
        tag_uid: tag_uid,
        serialNumber: tag_uid,
        tracking: true,
        remain: normalizedTray.remain,
        empty: normalizedTray.empty
      });
      return { success: true, action: 'associated', tag_uid };
    } else {
      // Fallback: Find if there's a colorname for this combination in user's existing filaments
      let finalColorname = normalizedTray.colorname;

      if (!finalColorname) {
        const userFilaments = db.getUserFilaments(userId);
        const withColorname = userFilaments.find(f => {
          const localkey = f.color + f.type + f.name + f.manufacturer;
          return localkey === key && f.colorname;
        });
        finalColorname = withColorname?.colorname || '';

        if (finalColorname) {
          console.log(`[HASS] ✅ Found colorname in user filaments: "${finalColorname}"`);
        }
      }

      await db.addFilament(userId, {
        ...normalizedTray,
        colorname: finalColorname,
        userId
      });
      return { success: true, action: 'created', tag_uid };
    }
  } else {
    // Update existing filament
    await db.updateFilament(tag_uid, {
      remain: normalizedTray.remain,
      empty: normalizedTray.empty,
      tracking: true
    });
    return { success: true, action: 'updated', tag_uid };
  }
};

export const syncUserHASS = async (userId) => {
  const user = await db.getUserById(userId);

  // Check if user has polling mode enabled
  if (!user || user.hassMode !== 'polling') {
    // Skip users that don't have polling mode or have webhook/disabled mode
    return;
  }

  if (!user.hassUrl || !user.hassToken) {
    console.log(`[HASS Polling] User ${userId} has no HASS URL/Token configuration`);
    return;
  }

  const amsConfigs = db.getUserAMSConfigs(userId);
  if (!amsConfigs || amsConfigs.length === 0) {
    console.log(`[HASS Polling] User ${userId} has no AMS configurations`);
    return;
  }

  let promises = [];
  const userTrayName = user.trayName || 'tray';

  for (const ams of amsConfigs) {
    if (!ams.enabled) continue;

    const numTrays = db.getAMSTrays(ams.type);

    for (let j = 1; j <= numTrays; j++) {
      promises.push(getAMSTrays(user.hassUrl, user.hassToken, ams.sensor, j, userTrayName));
    }
  }

  const trays = (await Promise.all(promises)).filter(e => e !== null);

  // Process each tray using the shared function
  for (const tray of trays) {
    await processTrayData(userId, tray);
  }

  // Clean up remaining empty filaments
  const userFilaments = db.getUserFilaments(userId);
  for (const filament of userFilaments) {
    if (filament.remain <= 0 && filament.remain !== -1) {
      console.log(`[HASS Polling] Auto-deleting depleted filament: ${filament.tag_uid}`);
      await db.deleteFilament(filament.tag_uid);
    }
  }
};

export const syncAllUsers = async () => {
  const allUsers = Object.values(db.data.users);

  for (const user of allUsers) {
    try {
      await syncUserHASS(user.id);
    } catch (error) {
      console.log(`Error syncing user ${user.username}:`, error.message);
    }
  }
};

// Initial sync
syncAllUsers();

// Sync every minute
setInterval(syncAllUsers, 1000 * 60);

export default {
  syncUserHASS,
  syncAllUsers
};
