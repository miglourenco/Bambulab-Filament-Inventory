# BambuLab Filament Inventory

[![Docker Pulls](https://img.shields.io/docker/pulls/azmonsterkill/bambulab-filament-inventory)](https://hub.docker.com/r/azmonsterkill/bambulab-filament-inventory)
[![Docker Image Size](https://img.shields.io/docker/image-size/azmonsterkill/bambulab-filament-inventory/latest)](https://hub.docker.com/r/azmonsterkill/bambulab-filament-inventory)

A web application for managing 3D printing filament inventory with automatic synchronization for BambuLab 3D printers with AMS systems.

![Filament Inventory Screenshot](https://raw.githubusercontent.com/myMartek/Bambulab-Filament-Inventory/main/docs/screenshot.png)

## Features

- **Multi-User Support** - Multiple users can manage their own filament inventory
- **Secure Authentication** - User registration with admin-controlled access
- **Home Assistant Integration** - Two modes available:
  - **Polling Mode** - App connects to Home Assistant
  - **Webhook Mode** - Home Assistant sends data to the app
- **Materials Database** - Comprehensive database of BambuLab materials with colors
- **Barcode/QR Scanner** - Scan EAN codes to auto-fill filament info
- **NFC Tag Reading** - Read NFC tags from filament spools
- **Stock Total View** - See all users' filaments with ownership info
- **Automatic Serial Association** - Manual spools get linked when placed in AMS
- **Mobile Optimized** - Responsive design for all devices

## Installation

### Docker (Recommended)

Create a `docker-compose.yml`:

```yaml
version: "3"
services:
  filamentinventory:
    image: azmonsterkill/bambulab-filament-inventory:latest
    environment:
      PORT: 3000
      ADMIN_REGISTRATION_KEY: your-secure-admin-key-here
    ports:
      - "3000:3000"
    restart: unless-stopped
    volumes:
      - ./data:/usr/src/app/data
```

Run:
```bash
docker-compose up -d
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Application port (default: 3000) |
| `ADMIN_REGISTRATION_KEY` | Yes | Secret key for user registration |
| `JWT_SECRET` | No | JWT token secret (auto-generated if not set) |

## First Time Setup

1. Start the Docker container
2. Open http://localhost:3000
3. Click "Register here"
4. Enter your details and the `ADMIN_REGISTRATION_KEY`
5. After registration, you'll be logged in

## Home Assistant Integration

The app supports two integration modes with Home Assistant:

### Option 1: Polling Mode (App connects to HASS)

Use this when the app can reach your Home Assistant instance.

1. Go to **Settings**
2. Set **Integration Mode** to "Polling"
3. Enter your Home Assistant URL (e.g., `https://homeassistant.local:8123`)
4. Enter your Long-Lived Access Token
5. Configure your AMS units in the AMS Configuration section
6. Click **Save**

The app will poll Home Assistant every 60 seconds for filament updates.

### Option 2: Webhook Mode (HASS sends to App)

Use this when the app can't reach Home Assistant (e.g., Docker with NAT, different networks).

1. Go to **Settings**
2. Set **Integration Mode** to "Webhook"
3. Copy the **Webhook URL** and **Webhook Token**
4. Configure Home Assistant with the provided YAML example
5. Click **Save**

#### Home Assistant Configuration

Add to your Home Assistant `configuration.yaml`:

```yaml
rest_command:
  filament_sync:
    url: "https://your-app-url/api/hass/webhook"
    method: POST
    headers:
      Authorization: "Bearer YOUR_WEBHOOK_TOKEN"
      Content-Type: "application/json"
    payload: >
      {
        "tag_uid": "{{ state_attr(sensor, 'tag_uid') }}",
        "color": "{{ state_attr(sensor, 'color') }}",
        "remain": {{ state_attr(sensor, 'remain') | int }},
        "empty": {{ state_attr(sensor, 'empty') | lower }},
        "name": "{{ state_attr(sensor, 'name') }}"
      }
```

**Note:** The app automatically looks up the manufacturer, material type, and color name from its materials database using the filament name and color.

Add to `automations.yaml` (single automation for all trays):

```yaml
automation:
  - alias: "Sync Filament Inventory"
    description: "Sync all AMS trays to Filament Inventory app"
    mode: parallel
    max: 10
    triggers:
      - trigger: state
        entity_id:
          - sensor.x1c_ams_1_tray_1
        id: "ams_1_1"
      - trigger: state
        entity_id:
          - sensor.x1c_ams_1_tray_2
        id: "ams_1_2"
      # Add more triggers for each tray...
    conditions: []
    actions:
      - if:
          - condition: trigger
            id:
              - "ams_1_1"
        then:
          - action: rest_command.filament_sync
            data:
              sensor: "sensor.x1c_ams_1_tray_1"
      - if:
          - condition: trigger
            id:
              - "ams_1_2"
        then:
          - action: rest_command.filament_sync
            data:
              sensor: "sensor.x1c_ams_1_tray_2"
      # Add more actions for each tray...
```

**Tip:** The app generates the complete YAML configuration automatically based on your AMS configuration. Go to **Settings** → **Webhook Mode** → **Home Assistant Configuration Example** to copy the ready-to-use YAML.

## AMS Configuration

Configure your AMS units to enable automatic syncing:

1. Go to **Settings** → **AMS Configuration**
2. Click **Add AMS**
3. Select AMS type:
   - **AMS** - 4 trays
   - **AMS 2 Pro** - 4 trays
   - **AMS HT** - 1 tray
   - **AMS Lite** - 4 trays
4. Enter the sensor ID (e.g., `sensor.x1c_010101010101_ams_1`)
5. Click **Save**

## Materials Database

The app includes a comprehensive materials database with:

- 400+ BambuLab filament entries
- Material types (PLA, PETG, ABS, TPU, etc.)
- Color names and HEX values
- EAN/barcode codes for scanning
- Variations (Basic, Matte, Silk, HF, etc.)

### Managing Materials

Go to **Materials Database** to:

- View all materials
- Filter by material type
- Filter by "In Stock" (materials you own)
- Add new materials
- Edit existing materials
- Delete materials

## Mobile Features

### Barcode Scanner

1. Tap the scanner button (bottom-right)
2. Point camera at the barcode on filament box
3. The app will:
   - Search local database for matching EAN
   - Fetch from online APIs if not found
   - Auto-fill manufacturer, type, color, and name

**Note:** Camera requires HTTPS or localhost. Use a reverse proxy for HTTPS on local network.

### NFC Tag Reading

Scan NFC tags from BambuLab filament spools to quickly identify and update inventory.

## Stock Total View

View all filaments across all users:

- **Owner badges** - Color-coded user identification
- **Advanced filters** - Filter by owner, type, manufacturer
- **User statistics** - Click owner to see their stats (total spools, kg, types)
- **Detailed view** - Click eye icon for full information
- **Sortable columns** - Sort by any column

## API Endpoints

### Authentication Required

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/me` | Get current user info |
| PUT | `/user/settings` | Update user settings |
| POST | `/user/webhook-token/regenerate` | Regenerate webhook token |
| GET | `/filaments` | Get user's filaments |
| POST | `/update` | Add/update filament |
| POST | `/delete` | Delete filament |
| GET | `/ams-config` | Get AMS configurations |
| POST | `/ams-config` | Add AMS configuration |
| PUT | `/ams-config/:id` | Update AMS configuration |
| DELETE | `/ams-config/:id` | Delete AMS configuration |

### Webhook Endpoints (Token Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/hass/webhook` | Receive single tray data |
| POST | `/api/hass/sync` | Receive bulk tray data |

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone repository
git clone https://github.com/myMartek/Bambulab-Filament-Inventory.git
cd Bambulab-Filament-Inventory

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Running in Development

Terminal 1 (Backend):
```bash
npm start
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Open http://localhost:8080

### Building

```bash
cd frontend
npm run build
```

The built files are placed in `frontend/dist/` and served by the backend.

### Docker Build

```bash
docker build -t bambulab-filament-inventory .
```

## Data Storage

All data is stored in the `./data` directory:

- `database.json` - Users, filaments, and AMS configurations
- `base_dados_completa.json` - Materials database
- `session-secret.txt` - Auto-generated session secret

**Important:** Mount this directory as a volume to persist data.

## Project Structure

```
├── index.js                 # Express server
├── src/
│   ├── database.js          # User/filament database
│   ├── materials-db.js      # Materials database
│   └── hass-sync.js         # Home Assistant sync
├── frontend/
│   ├── src/
│   │   ├── views/           # Vue components
│   │   ├── store/           # Pinia store
│   │   └── router/          # Vue router
│   └── dist/                # Built frontend
├── data/
│   ├── database.json        # Application data
│   └── base_dados_completa.json  # Materials DB
├── scripts/
│   └── init-migrations.cjs  # Database migrations
└── Dockerfile
```

## License

MIT
