## What this is for
This code generates a readme.md Markdown file for the project. The project aims to present a list of 3D print filaments for BambuLab 3D printers with AMS systems. It also includes functionality to automatically update the remaining amount if BambuLab RFID compatible filaments are used.

## Features
- 📊 Modern and responsive UI with improved design
- 👥 **Multi-User Support** - Multiple users can manage their own filament inventory
- 🔐 **Secure Authentication** - User registration and login with admin-controlled access
- 🏠 **Per-User Home Assistant Integration** - Each user can configure their own HASS connection
- 🎨 Color-coded inventory with visual indicators
- 📱 Mobile-optimized interface
- 📷 **QR Code and Barcode Scanner** - Scan filament codes directly from your mobile device
- 🔖 **NFC Tag Reading** - Read NFC tags from filament spools for quick inventory updates
- 🔍 Quick search and filtering by filament type
- 📈 **Stock Total View** - See all users' filaments with ownership information
- ✨ Automatic sync with BambuLab AMS systems (per-user configuration)
- 📦 Manual filament management for non-BambuLab spools
- 🔄 **Automatic Serial Number Association** - Manual spools get automatically linked when placed in AMS

## Installation:
The recommended way to install this software is Docker using a docker compose.

This is a sample `docker-compose.yml`:
```yaml
version: "3"
services:
  filamentinventory:
    image: mymartek/bambulab-filament-inventory:latest
    environment:
      PORT=3000
      # Admin registration key - required for creating new users
      ADMIN_REGISTRATION_KEY=your-secure-admin-key-here
      # JWT secret for authentication (will be auto-generated if not provided)
      JWT_SECRET=your-secure-jwt-secret-here
    ports:
      - '3000:3000'
    restart: unless-stopped
    volumes:
      - ./data:/usr/src/app/data
```

### Environment Variables

- `PORT` - Port to run the application (default: 3000)
- `ADMIN_REGISTRATION_KEY` - **Required** - Secret key needed for user registration (prevents unauthorized access)
- `JWT_SECRET` - Secret key for JWT token generation (recommended for production). If not provided, a secret will be automatically generated and saved to `./data/jwt-secret.txt` to persist across restarts

### First Time Setup

1. Start the Docker container
2. Open your browser at http://localhost:3000
3. Click "Register here" on the login page
4. Enter your details and the `ADMIN_REGISTRATION_KEY` you set in docker-compose
5. After registration, you'll be automatically logged in

### User Configuration

Each user can configure their own settings:

1. **Home Assistant Integration**
   - Go to Settings → Home Assistant Settings
   - Enter your Home Assistant URL (e.g., https://homeassistant.local:8123)
   - Enter your Long-Lived Access Token
   - Click Save

2. **AMS Configuration**
   - Go to Settings → AMS Configuration
   - Click "Add AMS"
   - Choose AMS type (AMS, AMS 2 Pro, AMS HT, or AMS Lite)
   - Enter the HASS sensor name (e.g., sensor.x1c_010101010101_ams_1)
   - Click Save

The system will automatically sync BambuLab filaments with colors and remaining amounts from your configured AMS units.

For non-BambuLab filaments, you can manually add and manage them in your inventory.

## Mobile Features
When accessing from a mobile device, you'll have additional features:

### QR Code / Barcode Scanner
- Tap the floating scanner button (bottom-right corner)
- Point your camera at the QR code or barcode on your filament box
- The app will automatically:
  - Search for existing filament in your inventory
  - If not found, fetch product information from the barcode
  - Auto-fill manufacturer, material type, and color name
  - Open the add dialog with pre-filled data for you to complete

**Important:** Camera access requires HTTPS or localhost. When accessing from Android or iOS devices on your local network, you must use HTTPS (not HTTP). This is a browser security requirement for accessing the camera on mobile devices.

**Setting up HTTPS for local network access:**
- Use a reverse proxy like Nginx or Caddy with SSL certificates
- Or use a service like ngrok or Cloudflare Tunnel
- Or access via localhost if running directly on the mobile device

## Stock Total View
The Stock Total tab provides a comprehensive view of all filaments across all users:

- **Owner Information** - See which user owns each filament with color-coded badges
- **Advanced Filters** - Filter by owner, type, manufacturer, or search by name
- **Serial Number Tracking** - View which spools are tracked via RFID vs manually added
- **Calculated Weight** - See actual remaining weight in grams
- **Detailed View** - Click the eye icon to see complete filament information
- **Sortable Columns** - Sort by any column for easy organization
- **Responsive Design** - Works perfectly on mobile and desktop

This view is perfect for workshops, makerspaces, or households with multiple 3D printer users who want to see the complete inventory at a glance.

## Contribution
When you want to run this locally:

```
git clone git@github.com:myMartek/Bambulab-Filament-Inventory.git
cd Bambulab-Filament-Inventory
npm install
node .
```
and in a second terminal:
```
cd Bambulab-Filament-Inventory/frontend
npm install
npm run dev
```
Now open http://localhost:8080

