# EAN Lookup System

## Overview
The EAN lookup system uses a multi-tier approach to identify products from barcodes, prioritizing speed and accuracy while minimizing external API dependencies.

## Architecture

### Tier 1: Local Database
**File:** `data/base_dados_completa.json`
**Priority:** Highest (executed first)
**Speed:** Instant (<1ms)
**Note:** This is the single source of truth for all material data in the application

Contains 240+ BambuLab filament EAN codes with complete product information:
```json
{
  "manufacturer": "BambuLab",
  "material": "PLA GLOW",
  "name": "Bambu PLA GLOW",
  "colorname": "Glow Blue",
  "color": "#3B8FD8",
  "distance": 98.4,
  "note": "",
  "productType": "Spool",
  "ean": "6975337033950"
}
```

**Database Fields:**
- `manufacturer` - Always "BambuLab"
- `material` - Normalized material type (PLA, PLA-AERO, PETG, TPU-AMS, etc.)
- `name` - Full product name (e.g., "Bambu PLA Matte", "Bambu TPU for AMS")
- `colorname` - Color name (Black, White, Glow Blue, etc.)
- `color` - HEX color code
- `distance` - Distance value for color matching
- `note` - Additional notes (empty for regular products, "Custom" for user-added)
- `productType` - "Spool" or "Refill"
- `ean` - EAN barcode number (empty string for custom materials)

**Advantages:**
- Instant response (no network latency)
- Complete product data including HEX color codes
- 100% reliable (no API rate limits)
- Works offline

**Response Format:**
```json
{
  "rawTitle": "Bambu Lab PLA GLOW - Glow Blue",
  "manufacturer": "BambuLab",
  "type": "PLA GLOW",
  "name": "Bambu PLA GLOW",
  "colorname": "Glow Blue",
  "color": "#3B8FD8",
  "source": "local_database"
}
```

### Tier 2: Free Public APIs
**Priority:** Medium (executed if Tier 1 fails)
**Speed:** 1-3 seconds per API

#### API 1: UPCItemDB (Primary Fallback)
- **URL:** `https://api.upcitemdb.com/prod/trial/lookup`
- **Tier:** Trial (100 requests/day)
- **Best for:** General consumer products, electronics, filaments
- **Response Example:**
  ```json
  {
    "title": "Bambu Lab - 1.75mm PLA Glow Filament - Glow Blue",
    "brand": "Bambu Lab",
    "model": "PLA GLOW - GLOW BLUE",
    "description": "3D printer filament"
  }
  ```

#### API 2: EAN-Search.org
- **URL:** `https://api.ean-search.org/api`
- **Tier:** Free (with token=FREE_TIER)
- **Best for:** International products
- **Note:** May return 401 if free tier is exhausted
- **Response Example:**
  ```json
  {
    "name": "Bambu Lab PLA Filament",
    "categoryName": "3D Printing Supplies",
    "ean": "6975337033950"
  }
  ```

#### API 3: OpenFoodFacts
- **URL:** `https://world.openfoodfacts.org/api/v0/product/`
- **Tier:** Completely free
- **Best for:** Food products (rarely useful for filaments)
- **Response Example:**
  ```json
  {
    "product_name": "Product Name",
    "brands": "Brand Name",
    "categories": "Category"
  }
  ```

**API Search Strategy:**
1. Try UPCItemDB first (most likely to have filament data)
2. Wait 500ms between requests (rate limiting courtesy)
3. Try EAN-Search.org second
4. Try OpenFoodFacts last (unlikely but free)
5. Return first successful result

### Tier 3: Web Scraping
**Priority:** Lowest (last resort)
**Speed:** 2-5 seconds
**URL:** `https://pt.product-search.net/?q={EAN}`

**Method:**
- Uses Cheerio to parse HTML
- Searches for links containing EAN code
- Extracts product title from link text

**Limitations:**
- Subject to website changes
- May be blocked by Cloudflare
- Slowest method

## Product Title Parsing

### BambuLab Products
Detects BambuLab products and applies specialized parsing:

**Format:** `Bambu Lab - 1.75mm [MATERIAL TYPE] Filament - [COLOR NAME]`

**Extraction Logic:**
1. Detect "Bambu Lab" or "BambuLab" in title
2. Search for material types (prioritizing composite types):
   - Carbon Fiber variants: `PETG CF`, `PLA CF`, `ABS CF`, `PA CF`, `PC CF`
   - Special types: `PLA Glow`, `PLA Matte`, `PLA Silk`, etc.
   - Standard types: `PETG`, `PLA`, `ABS`, `TPU`, `ASA`, etc.
3. Extract color name from last part (after material type)
4. Clean up size info (`1.75mm`) and filler words (`filament`)

**Example:**
```
Input:  "Bambu Lab - 1.75mm PLA Glow Filament - Glow Blue"
Output: {
  manufacturer: "BambuLab",
  type: "PLA Glow",
  colorname: "Glow Blue"
}
```

### Generic Products
For non-BambuLab products:
1. Split by " - " delimiter
2. First part = manufacturer
3. Second part = type
4. Third part = colorname

## Testing

### Test Script
**File:** `test-upcindex.js`

**Usage:**
```bash
node test-upcindex.js [EAN_CODE]
```

**Features:**
- Tests all three APIs independently
- Shows response data from each API
- Tests local endpoint (requires server running)
- Displays success/failure summary

**Example Output:**
```
============================================================
EAN LOOKUP TEST SUITE
EAN: 6975337033950
============================================================

📡 Testing UPCItemDB...
✅ UPCItemDB - SUCCESS
   Title: Bambu Lab - 1.75mm PLA Glow Filament - Glow Blue
   Brand: Bambu Lab
   Model: PLA GLOW - GLOW BLUE

📡 Testing EAN-Search.org...
❌ EAN-Search - ERROR: Request failed with status code 401

📡 Testing OpenFoodFacts...
⚠️  OpenFoodFacts - Product not found

========================================
Summary
========================================
Total APIs tested: 3
Successful: 1
Failed: 2
========================================
```

## Performance Considerations

### Typical Response Times
- **Local Database:** <1ms (instant)
- **UPCItemDB API:** 500-1500ms
- **EAN-Search.org:** 500-2000ms
- **OpenFoodFacts:** 300-1000ms
- **Web Scraping:** 2000-5000ms

### Best Practices
1. Always try local database first
2. Add 500ms delay between API calls (rate limiting)
3. Use 10-second timeout for each API call
4. Cache successful API results in local database for future use
5. Log all lookup attempts for debugging

### Rate Limits
- **UPCItemDB Trial:** 100 requests/day
- **EAN-Search.org Free:** Varies (may return 401)
- **OpenFoodFacts:** Unlimited
- **Local Database:** Unlimited

## Error Handling

### Common Errors
1. **Network timeout:** API took too long to respond
2. **401 Unauthorized:** API key missing or free tier exhausted
3. **404 Not Found:** Product not in database
4. **500 Server Error:** API service issue
5. **403 Forbidden:** Blocked by Cloudflare (web scraping)

### Fallback Strategy
```
Try Local DB
  ↓ (not found)
Try UPCItemDB
  ↓ (error/not found)
Try EAN-Search
  ↓ (error/not found)
Try OpenFoodFacts
  ↓ (error/not found)
Try Web Scraping
  ↓ (error/not found)
Return 404 to user
```

## Future Improvements

### Potential Enhancements
1. **Cache API Results:** Store successful API lookups in local database
2. **Paid API Tiers:** Upgrade to paid UPCItemDB for higher limits
3. **Additional APIs:** Add more free/paid barcode APIs
4. **Machine Learning:** Train model to parse product titles more accurately
5. **User Contributions:** Allow users to submit EAN corrections
6. **Image Recognition:** OCR to extract info from product images

### Database Expansion
- Add more BambuLab EAN codes as they're discovered
- Include other filament brands (Polymaker, Prusa, etc.)
- Community-sourced EAN database

## Maintenance

### Adding New EANs to Local Database
1. Edit `data/base_dados_completa.json`
2. Add new entry with format:
   ```json
   {
     "manufacturer": "BambuLab",
     "material": "MATERIAL_TYPE",
     "name": "Bambu PRODUCT_NAME",
     "colorname": "COLOR_NAME",
     "color": "#HEXCODE",
     "distance": 98.4,
     "note": "",
     "productType": "Spool",
     "ean": "EAN_CODE"
   }
   ```
3. Restart server (Docker will auto-restart)

**Important Notes:**
- `material` field must be normalized (first word or official printer type from printer_data.yaml)
- `name` field contains the full product name (e.g., "Bambu PLA Matte", not just "Bambu PLA")
- Validate against `printer_data.yaml` using `validate-materials.js` after adding entries
- `base_dados_completa.json` is the single source of truth - don't create separate materials.json

### Monitoring API Health
Check logs for:
- `[API Search] ✅ Found in [API_NAME]` - Success
- `[API Search] ❌ [API_NAME] error:` - Failure
- `[API Search] ⚠️ [API_NAME] - No results found` - Empty result

### Testing New APIs
1. Add API call function in `index.js`
2. Add to `searchEANInAPIs()` function
3. Test with `node test-upcindex.js [EAN]`
4. Update documentation

## API Endpoints

### GET /product-info/:ean
**Description:** Lookup product information by EAN code

**Parameters:**
- `ean` (path): EAN/barcode number (13 digits)

**Response:**
```json
{
  "rawTitle": "Full product title",
  "manufacturer": "Manufacturer name",
  "type": "Material type",
  "name": "Product name",
  "colorname": "Color name",
  "color": "#HEXCODE (optional)",
  "source": "local_database|UPCItemDB|EAN-Search|OpenFoodFacts|product-search"
}
```

**Status Codes:**
- `200` - Product found
- `404` - Product not found in any source
- `500` - Internal server error

**Example:**
```bash
curl http://localhost:3000/product-info/6975337033950
```

## Logs

### Log Format
All logs are prefixed with source:
- `[Product Search]` - Main endpoint activity
- `[API Search]` - API lookup attempts
- `[API Parse]` - Product title parsing

### Example Log Sequence
```
[Product Search] Searching for EAN: 6975337033950
[Product Search] EAN not found in local database, trying free APIs...
[API Search] Trying free APIs for EAN: 6975337033950
[API Search] Trying UPCItemDB...
[API Search] ✅ Found in UPCItemDB: Bambu Lab - 1.75mm PLA Glow Filament - Glow Blue
[Product Search] Found in API: UPCItemDB
[API Parse] Parsing title: Bambu Lab - 1.75mm PLA Glow Filament - Glow Blue
[API Parse] Detected Bambu Lab product
[API Parse] Found material type: PLA Glow
[API Parse] Found color name: Glow Blue
[API Parse] Result - Manufacturer: BambuLab, Type: PLA Glow, Color: Glow Blue
[Product Search] Returning result from UPCItemDB: {...}
```
