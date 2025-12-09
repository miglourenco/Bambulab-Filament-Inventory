## What this is for
This code generates a readme.md Markdown file for the project. The project aims to present a list of 3D print filaments for BambuLab 3D printers with AMS systems. It also includes functionality to automatically update the remaining amount if BambuLab RFID compatible filaments are used.

## Features
- 📊 Modern and responsive UI with improved design
- 🎨 Color-coded inventory with visual indicators
- 📱 Mobile-optimized interface
- 📷 **QR Code and Barcode Scanner** - Scan filament codes directly from your mobile device
- 🔖 **NFC Tag Reading** - Read NFC tags from filament spools for quick inventory updates
- 🔍 Quick search and filtering by filament type
- ✨ Automatic sync with BambuLab AMS systems
- 📦 Manual filament management for non-BambuLab spools

## Installation:
The recommended way to install this software is Docker using a docker compose.

This is a sample `docker-compose.yml`:
```
version: "3"
services:
  filamentinventory:
    image: mymartek/bambulab-filament-inventory:latest
    environment:
      HASS_URL=https://home.exmaple.com
      HASS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiI5MjQ2MjIyMjIyIiwiaWF0IjoxNTkxNjQwNjY4LCJleHAiOjE1
      HASS_SENSORS=sensor.x1c_010101010101_ams_1,sensor.x1c_010101010101_ams_2
      PORT=3000
      AUTH_USER=User
      AUTH_PASSWORD=Password!
      TRAY_NAME=tray
    ports:
      - '3000:3000'
    restart: unless-stopped
    volumes:
      - ./data:/usr/src/app/data
```

When executed you can open your Browser at http://localhost:3000 and login using `User` and `Password!`

The interface will automatically sync all BambuLab filaments with colors and remaining amount from AMS.

For Non-BambuLab Filaments you can manually add and manage filaments.

## Mobile Features
When accessing from a mobile device, you'll have additional features:

### QR Code / Barcode Scanner
- Tap the floating scanner button (bottom-right corner)
- Point your camera at the QR code or barcode on your filament box
- The app will automatically find the filament in your inventory or prompt you to add it

### NFC Tag Reading
- Switch to the NFC tab in the scanner
- Tap "Start NFC Reading"
- Bring your phone close to the NFC tag on your filament spool
- The app will instantly identify and display the filament details

**Note:** NFC reading requires a device with NFC hardware and HTTPS connection or localhost.

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

