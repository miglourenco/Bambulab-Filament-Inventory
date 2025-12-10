# Database Migration - Single Source of Truth

**Date**: 2025-12-10
**Status**: ✅ Completed

## Summary

Migrated the application to use `base_dados_completa.json` as the single source of truth for all material data, replacing the old `materials.json` file.

## Changes Made

### 1. Updated `src/materials-db.js`

**Before:**
- Loaded from `./data/materials.json`
- Had hardcoded `DEFAULT_MATERIALS` array (193 lines of code)
- Created `materials.json` with defaults if file didn't exist

**After:**
- Loads from `./data/base_dados_completa.json`
- Removed hardcoded `DEFAULT_MATERIALS` array
- Shows error if `base_dados_completa.json` doesn't exist
- Updated `addMaterial()` to include all required fields:
  - `manufacturer: "BambuLab"`
  - `name: "Bambu {material}"`
  - `productType: "Spool"`
  - `ean: ""`
  - `note: "Custom"`

**Lines changed**: ~200 lines removed, cleaner implementation

### 2. Updated Documentation

#### `EAN_LOOKUP_SYSTEM.md`
- Added note that `base_dados_completa.json` is the single source of truth
- Updated database field descriptions to reflect normalized material types
- Updated maintenance section with correct field structure
- Removed reference to `update-database.js` automated script
- Added validation instructions using `validate-materials.js`

#### `README.md`
- Updated EAN Lookup System section
- Added details about 240+ BambuLab entries
- Mentioned normalized material types matching printer_data.yaml
- Added link to EAN_LOOKUP_SYSTEM.md

### 3. Cleaned Up Old Files

**Renamed:**
- `data/materials.json` → `data/materials.json.old` (backup, no custom entries)

**Organized:**
- Moved database maintenance scripts to `scripts/database-maintenance/`:
  - `update-database.js`
  - `normalize-materials.js`
  - `validate-materials.js`
  - `fix-names.js`
  - `fix-name-format.js`
  - `restore-correct-structure.js`
  - `verify-structure.js`
- Created `scripts/database-maintenance/README.md` documenting all scripts

### 4. Database Structure

**Final Structure** (`base_dados_completa.json` - 240 entries):
```json
{
  "manufacturer": "BambuLab",           // Always "BambuLab"
  "material": "PLA",                    // Normalized (official printer type)
  "name": "Bambu PLA Matte",            // Full product name
  "colorname": "Charcoal",              // Color name
  "color": "#000000",                   // HEX color code
  "distance": 98.4,                     // Color distance value
  "note": "",                           // Empty or "Custom"
  "productType": "Spool",               // "Spool" or "Refill"
  "ean": "6975337031338"                // EAN barcode (empty for custom)
}
```

**Key Points:**
- `material` field is normalized to match `printer_data.yaml` filament types
- `name` field contains full product name (e.g., "Bambu PLA Matte", not just "Bambu PLA")
- All entries validated against official printer definitions

## Files Affected

### Modified
- [src/materials-db.js](src/materials-db.js) - Updated to use base_dados_completa.json
- [EAN_LOOKUP_SYSTEM.md](EAN_LOOKUP_SYSTEM.md) - Updated documentation
- [README.md](README.md) - Updated EAN lookup section

### Created
- [scripts/database-maintenance/README.md](scripts/database-maintenance/README.md) - Documentation for maintenance scripts

### Renamed/Moved
- `data/materials.json` → `data/materials.json.old`
- 7 database maintenance scripts → `scripts/database-maintenance/`

## Testing

✅ Server starts successfully
✅ Loads 240 materials from base_dados_completa.json
✅ materials-db.js initializes correctly
✅ Color identification works (tested with PLA Black)
✅ Material types list correctly (19 unique types)
✅ No custom entries lost (materials.json had 0 custom entries)

## Impact

### User-Facing
- ✅ No impact - seamless migration
- ✅ All existing functionality preserved
- ✅ Custom materials will be saved to base_dados_completa.json
- ✅ Better integration with printer_data.yaml

### Developer-Facing
- ✅ Simpler codebase (removed 193 lines of hardcoded data)
- ✅ Single source of truth for all material data
- ✅ Easier to maintain and update materials
- ✅ Consistent with EAN lookup system

## Migration Notes

1. **No data loss**: Old `materials.json` was backed up to `materials.json.old`
2. **No custom entries lost**: Verified that materials.json had 0 custom entries before migration
3. **Backwards compatible**: All existing API endpoints work the same
4. **Database integrity**: All 240 entries validated against printer_data.yaml

## Future Maintenance

### Adding New Materials
Edit `data/base_dados_completa.json` directly and ensure:
- `material` field matches printer_data.yaml filament_type
- `name` field contains full product name
- All required fields are present

### Validating Database
Run validation script:
```bash
node scripts/database-maintenance/validate-materials.js
```

### Custom User Materials
Users can still add custom materials via the API endpoint `/materials`, which will:
- Add to base_dados_completa.json
- Include all required fields
- Mark with `note: "Custom"`

## Rollback Plan

If issues arise, rollback by:
1. Restore `data/materials.json.old` to `data/materials.json`
2. Revert `src/materials-db.js` to use `materials.json`
3. Restart server

Note: This is unlikely to be needed as all testing passed successfully.

## Conclusion

The migration to `base_dados_completa.json` as the single source of truth was completed successfully with:
- ✅ No data loss
- ✅ Improved code maintainability
- ✅ Better documentation
- ✅ Consistent database structure
- ✅ All tests passing

The application now has a cleaner architecture with a single source of truth for material data that integrates seamlessly with the EAN lookup system and printer definitions.
