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

export const syncUserHASS = async (userId) => {
  const user = await db.getUserById(userId);
  if (!user || !user.hassUrl || !user.hassToken) {
    console.log(`User ${userId} has no HASS configuration`);
    return;
  }

  const amsConfigs = db.getUserAMSConfigs(userId);
  if (!amsConfigs || amsConfigs.length === 0) {
    console.log(`User ${userId} has no AMS configurations`);
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

  for (const tray of trays) {
    const tag_uid = tray.tag_uid;
    const key = tray.color + tray.type + tray.name + tray.manufacturer;

    const existingFilament = db.getFilament(tag_uid);

    if (!existingFilament) {
      // Try to find an unassigned filament that matches
      const unassigned = db.findUnassignedFilament(userId, {
        type: tray.type,
        manufacturer: tray.manufacturer,
        name: tray.name,
        color: tray.color
      });

      if (unassigned) {
        // Update the existing unassigned filament with the serial number
        console.log(`Associating serial ${tag_uid} to existing filament ${unassigned.tag_uid}`);
        await db.deleteFilament(unassigned.tag_uid);
        await db.addFilament(userId, {
          ...unassigned,
          tag_uid: tag_uid,
          serialNumber: tag_uid,
          tracking: true,
          remain: tray.remain,
          empty: tray.empty
        });
      } else {
        // Try to identify colorname from materials database
        let colorname = '';

        // First try to find from materials database by hex color and material type
        const identifiedColorName = materialsDB.findColorByHex(tray.type, tray.color);
        if (identifiedColorName) {
          colorname = identifiedColorName;
        } else {
          // Fallback: Find if there's a colorname for this combination in user's existing filaments
          const userFilaments = db.getUserFilaments(userId);
          const withColorname = userFilaments.find(f => {
            const localkey = f.color + f.type + f.name + f.manufacturer;
            return localkey === key && f.colorname;
          });
          colorname = withColorname?.colorname || '';
        }

        await db.addFilament(userId, {
          ...tray,
          colorname,
          userId
        });
      }
    } else {
      // Update existing filament
      await db.updateFilament(tag_uid, {
        remain: tray.remain,
        empty: tray.empty,
        tracking: true
      });
    }

    // Auto-delete if empty
    const current = db.getFilament(tag_uid);
    if (current && (current.empty || (current.remain <= 0 && current.remain !== -1))) {
      console.log(`Auto-deleting empty filament: ${tag_uid}`);
      await db.deleteFilament(tag_uid);
    }
  }

  // Clean up remaining empty filaments
  const userFilaments = db.getUserFilaments(userId);
  for (const filament of userFilaments) {
    if (filament.remain <= 0 && filament.remain !== -1) {
      console.log(`Auto-deleting depleted filament: ${filament.tag_uid}`);
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
