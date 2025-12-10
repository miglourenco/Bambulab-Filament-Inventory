# Database Maintenance Scripts

This folder contains scripts that were used to normalize and validate the `base_dados_completa.json` database.

## Scripts

### `update-database.js`
Adds `manufacturer` and `name` fields to all entries in the database.
- Adds `manufacturer: "BambuLab"` to all entries
- Generates `name` field based on material type
- Creates backup before updating

**Status**: ✅ Completed - Database now has all required fields

### `normalize-materials.js`
Normalizes material field to use only the first word.
- Example: "PLA Matte" → "PLA"
- Example: "PETG HF" → "PETG"
- Preserves composite materials with hyphens (PLA-CF, ABS-GF, etc.)

**Status**: ✅ Completed - 164 entries normalized

### `validate-materials.js`
Validates material types against official printer_data.yaml definitions.
- Matches entries by name field
- Compares material type with official filament_type
- Updates incorrect material types

**Status**: ✅ Completed - All 240 entries validated

### `fix-name-format.js`
Corrects name formats to match printer_data.yaml exactly.
- Fixed hyphenation inconsistencies
- Simplified product names to match official definitions
- Examples:
  - "Bambu ASA Aero" → "Bambu ASA-Aero"
  - "Bambu TPU 68D for AMS" → "Bambu TPU for AMS"

**Status**: ✅ Completed - 11 name formats corrected

### `fix-names.js`
Restores original full material names to the name field.
- Reads from backup to get original material names
- Updates name field while keeping normalized material field

**Status**: ⚠️ This was created to fix an earlier mistake but superseded by restore-correct-structure.js

### `restore-correct-structure.js`
Restores correct structure with:
- Material field: Normalized (first word)
- Name field: Full original material name (e.g., "Bambu PLA Matte")

**Status**: ✅ Completed - Correct structure restored

### `verify-structure.js`
Verifies the database structure is correct.
- Shows examples of material vs name format
- Confirms all required fields are present
- Useful for debugging

**Status**: 🔄 Can be run anytime to verify database integrity

## Database Structure

The final correct structure for each entry in `base_dados_completa.json`:

```json
{
  "manufacturer": "BambuLab",
  "material": "PLA",              // Normalized type (matches printer_data.yaml)
  "name": "Bambu PLA Matte",      // Full original product name
  "colorname": "Charcoal",
  "color": "#000000",
  "distance": 98.4,
  "note": "",
  "productType": "Spool",
  "ean": "6975337031338"
}
```

## Important Notes

- **DO NOT** run these scripts again unless you understand what they do
- Always create backups before running any database modification script
- `base_dados_completa.json` is the single source of truth for the application
- Material types must match `printer_data.yaml` for proper printer integration
- The name field contains the full marketing name, not just "Bambu" + material

## History

1. Initial database had incomplete structure
2. Added manufacturer and name fields with `update-database.js`
3. Accidentally normalized both material and name fields (MISTAKE)
4. Restored correct structure where name keeps full original name
5. Normalized only material field to first word
6. Validated all materials against printer_data.yaml
7. Fixed name format inconsistencies
8. Final validation: ✅ All 240 entries correct

## Usage

To validate the current database:
```bash
node verify-structure.js
```

To validate against printer_data.yaml:
```bash
node validate-materials.js
```

**Warning**: Do not run the other scripts unless you know exactly what you're doing, as they modify the database.
