<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon size="large" class="mr-2">mdi-archive-check</v-icon>
          Stock Total
        </h1>
      </v-col>
    </v-row>

    <!-- Filters Card -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" class="mb-4">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2" color="white">mdi-filter</v-icon>
            <span class="text-white">Filters</span>
          </v-card-title>
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" sm="6" md="3">
                <v-text-field
                  v-model="search"
                  label="Search"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="filterOwner"
                  label="Owner"
                  :items="ownerOptions"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="filterType"
                  label="Material Type"
                  :items="typeOptions"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="filterManufacturer"
                  label="Manufacturer"
                  :items="manufacturerOptions"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                ></v-select>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Stock Table -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2" color="white">mdi-package-variant-closed</v-icon>
            <span class="text-white">Inventory</span>
            <v-spacer></v-spacer>
            <v-chip color="white" variant="outlined" class="mr-2">
              <v-icon start>mdi-counter</v-icon>
              {{ filteredFilaments.length }} items
            </v-chip>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-data-table
              :headers="headers"
              :items="filteredFilaments"
              :search="search"
              :items-per-page="25"
              :items-per-page-options="[10, 25, 50, 100, -1]"
              class="elevation-0"
            >
              <!-- Owner Column -->
              <template v-slot:item.owner="{ item }">
                <!-- Single owner: show chip -->
                <v-chip
                  v-if="item.ownersList.length === 1"
                  :color="getOwnerColor(item.ownersList[0])"
                  size="small"
                  class="font-weight-medium"
                  @click="showUserStats(item.ownersList[0])"
                  style="cursor: pointer;"
                >
                  <v-icon start size="small">mdi-account</v-icon>
                  {{ item.ownersList[0] }}
                </v-chip>
                <!-- Multiple owners: show stacked avatars -->
                <div v-else class="d-flex align-center" style="cursor: pointer;" @click="viewDetails(item)">
                  <v-avatar
                    v-for="(owner, idx) in item.ownersList.slice(0, 3)"
                    :key="owner"
                    :color="getOwnerColor(owner)"
                    size="28"
                    :style="{ marginLeft: idx > 0 ? '-8px' : '0', zIndex: 3 - idx }"
                  >
                    <span class="text-caption text-white font-weight-bold">{{ owner.charAt(0).toUpperCase() }}</span>
                  </v-avatar>
                  <v-chip
                    v-if="item.ownersList.length > 3"
                    size="x-small"
                    color="grey"
                    class="ml-1"
                  >
                    +{{ item.ownersList.length - 3 }}
                  </v-chip>
                  <span class="ml-2 text-caption text-grey">{{ item.ownersList.length }} owners</span>
                </div>
              </template>

              <!-- Type Column -->
              <template v-slot:item.type="{ item }">
                <v-chip size="small" color="blue">{{ item.type }}</v-chip>
              </template>

              <!-- Colorname Column -->
              <template v-slot:item.colorname="{ item }">
                <span>{{ item.colorname || '-' }}</span>
              </template>

              <!-- Color Column -->
              <template v-slot:item.color="{ item }">
                <v-avatar
                  :style="{ backgroundColor: item.color }"
                  size="32"
                  class="elevation-2"
                >
                  <v-icon v-if="item.color === '#FFFFFF' || item.color === '#FFFFFFFF'" color="grey-darken-1" size="small">mdi-palette</v-icon>
                </v-avatar>
              </template>

              <!-- Size Column -->
              <template v-slot:item.size="{ item }">
                <span>{{ item.size }}g</span>
              </template>

              <!-- Remaining Column -->
              <template v-slot:item.remain="{ item }">
                <v-chip
                  :color="getRemainColor(item.remain)"
                  size="small"
                  class="font-weight-bold"
                >
                  {{ item.remain }}%
                </v-chip>
              </template>

              <!-- Weight Column -->
              <template v-slot:item.weight="{ item }">
                <span class="font-weight-medium">{{ item.weight }}g</span>
              </template>

              <!-- Spool Count Column -->
              <template v-slot:item.spoolCount="{ item }">
                <v-chip size="small" color="indigo" variant="outlined">
                  <v-icon start size="small">mdi-album</v-icon>
                  {{ item.spoolCount }}
                </v-chip>
              </template>

              <!-- Actions Column -->
              <template v-slot:item.actions="{ item }">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  @click="viewDetails(item)"
                >
                  <v-icon>mdi-eye</v-icon>
                </v-btn>
              </template>

              <!-- No data -->
              <template v-slot:no-data>
                <v-alert type="info" variant="tonal" class="ma-4">
                  No filaments found
                </v-alert>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card v-if="selectedFilament">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2" color="white">mdi-information</v-icon>
          <span class="text-white">Filament Details</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="mb-3">
            <div class="text-caption text-grey">Owner(s)</div>
            <div class="d-flex flex-wrap gap-1 mt-1">
              <v-chip
                v-for="owner in selectedFilament.ownersList"
                :key="owner"
                :color="getOwnerColor(owner)"
                size="small"
                @click="showUserStats(owner)"
                style="cursor: pointer;"
              >
                <v-icon start size="small">mdi-account</v-icon>
                {{ owner }}
              </v-chip>
            </div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey">Manufacturer</div>
            <div class="text-h6">{{ selectedFilament.manufacturer }}</div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey">Material Type</div>
            <v-chip color="blue" size="small" class="mt-1">{{ selectedFilament.type }}</v-chip>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey">Name</div>
            <div class="text-h6">{{ selectedFilament.name }}</div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey">Color</div>
            <div class="d-flex align-center mt-1">
              <v-avatar
                :style="{ backgroundColor: selectedFilament.color }"
                size="32"
                class="mr-2 elevation-2"
              >
                <v-icon v-if="selectedFilament.color === '#FFFFFF' || selectedFilament.color === '#FFFFFFFF'" color="grey-darken-1" size="small">mdi-palette</v-icon>
              </v-avatar>
              <span>{{ selectedFilament.colorname || selectedFilament.color }}</span>
            </div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey">Size</div>
            <div class="text-h6">{{ selectedFilament.size }}g</div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey">Spools</div>
            <v-chip color="indigo" size="small" variant="outlined" class="mt-1">
              <v-icon start size="small">mdi-album</v-icon>
              {{ selectedFilament.spoolCount }} {{ selectedFilament.spoolCount === 1 ? 'spool' : 'spools' }}
            </v-chip>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey">Total Weight</div>
            <div class="text-h6">{{ selectedFilament.weight }}g</div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey">Avg. Remaining</div>
            <v-chip :color="getRemainColor(selectedFilament.remain)" size="small" class="mt-1">
              {{ selectedFilament.remain }}%
            </v-chip>
          </div>

          <v-divider class="my-3"></v-divider>

          <div class="text-subtitle-2 font-weight-bold mb-2">Spool Details</div>

          <div
            v-for="(spool, index) in selectedFilament.spools"
            :key="spool.tag_uid"
            class="border-t py-2"
          >
            <div class="d-flex flex-column gap-1">
              <div class="d-flex align-center gap-2 flex-wrap">
                <v-chip size="x-small" color="grey">Spool {{ index + 1 }}</v-chip>
                <v-chip size="x-small" :color="getOwnerColor(spool.owner)">
                  <v-icon start size="x-small">mdi-account</v-icon>
                  {{ spool.owner }}
                </v-chip>
                <span v-if="spool.serialNumber" class="text-caption">
                  <v-icon size="x-small">mdi-barcode</v-icon>
                  {{ spool.serialNumber }}
                </span>
                <span v-else class="text-caption text-grey">Manual</span>
              </div>
              <div class="text-body-2">
                {{ spool.remain }}% remaining • {{ Math.round(spool.size * spool.remain / 100) }}g
              </div>
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="text"
            @click="detailsDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- User Stats Dialog -->
    <v-dialog v-model="userStatsDialog" max-width="500">
      <v-card v-if="selectedUser">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2" color="white">mdi-account-details</v-icon>
          <span class="text-white">{{ selectedUser }} - Statistics</span>
        </v-card-title>

        <v-card-text class="pa-6">
          <v-row>
            <!-- Total Spools -->
            <v-col cols="12" sm="4">
              <v-card elevation="2" class="pa-4 text-center">
                <v-icon size="48" color="indigo" class="mb-2">mdi-album</v-icon>
                <div class="text-h4 font-weight-bold">{{ userStats.totalSpools }}</div>
                <div class="text-caption text-grey">Total Spools</div>
              </v-card>
            </v-col>

            <!-- Total Weight (kg) -->
            <v-col cols="12" sm="4">
              <v-card elevation="2" class="pa-4 text-center">
                <v-icon size="48" color="success" class="mb-2">mdi-weight-kilogram</v-icon>
                <div class="text-h4 font-weight-bold">{{ userStats.totalKg }}</div>
                <div class="text-caption text-grey">Total Kg</div>
              </v-card>
            </v-col>

            <!-- Different Types -->
            <v-col cols="12" sm="4">
              <v-card elevation="2" class="pa-4 text-center">
                <v-icon size="48" color="orange" class="mb-2">mdi-shape</v-icon>
                <div class="text-h4 font-weight-bold">{{ userStats.differentTypes }}</div>
                <div class="text-caption text-grey">Different Types</div>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <!-- Material Types Breakdown -->
          <div class="mb-3">
            <div class="text-subtitle-2 font-weight-bold mb-3">Material Types Breakdown:</div>
            <v-chip
              v-for="type in userStats.typesList"
              :key="type"
              size="small"
              color="blue"
              class="ma-1"
            >
              {{ type }}
            </v-chip>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="text"
            @click="userStatsDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAppStore } from '@/store/app';
import { normalizeColor } from '@/utils/color';

const store = useAppStore();

// Process filaments from store into grouped format
// Groups by filament type across ALL users (not per user)
const processFilaments = () => {
  const grouped = {};

  store.filaments.forEach(f => {
    // Group by filament properties only (not by userId)
    // Note: colorname is NOT included in key because it may vary between spools
    // (e.g., one added manually without colorname, another synced from HASS with colorname)
    // Normalize color to ensure consistent grouping (RGB format)
    const key = `${f.type}_${f.manufacturer}_${f.name}_${normalizeColor(f.color)}_${f.size}`;

    if (!grouped[key]) {
      grouped[key] = {
        ...f,
        spools: [{
          ...f,
          owner: f.username || 'Unknown'
        }],
        spoolCount: 1,
        totalWeight: Math.round(f.size * f.remain / 100),
        weight: Math.round(f.size * f.remain / 100),
        owners: new Set([f.username || 'Unknown'])
      };
    } else {
      grouped[key].spools.push({
        ...f,
        owner: f.username || 'Unknown'
      });
      grouped[key].spoolCount++;
      grouped[key].totalWeight += Math.round(f.size * f.remain / 100);
      grouped[key].weight = grouped[key].totalWeight;
      grouped[key].owners.add(f.username || 'Unknown');

      // Update remain to average
      const totalRemain = grouped[key].spools.reduce((sum, spool) => sum + spool.remain, 0);
      grouped[key].remain = Math.round(totalRemain / grouped[key].spoolCount);

      // If any spool has serial number, show the first one
      if (f.serialNumber && !grouped[key].serialNumber) {
        grouped[key].serialNumber = f.serialNumber;
      }

      // If colorname is empty and this spool has one, use it
      if (!grouped[key].colorname && f.colorname) {
        grouped[key].colorname = f.colorname;
      }
    }
  });

  // Convert owners Set to Array for display
  Object.values(grouped).forEach(item => {
    item.ownersList = Array.from(item.owners).sort();
    item.owner = item.ownersList.length === 1 ? item.ownersList[0] : `${item.ownersList.length} owners`;
    delete item.owners;
  });

  allFilaments.value = Object.values(grouped);
};

const search = ref('');
const filterOwner = ref(null);
const filterType = ref(null);
const filterManufacturer = ref(null);
const detailsDialog = ref(false);
const selectedFilament = ref(null);
const allFilaments = ref([]);
const userStatsDialog = ref(false);
const selectedUser = ref(null);

const headers = computed(() => [
  { title: "Owner", key: 'owner', sortable: true },
  { title: "Manufacturer", key: 'manufacturer', sortable: true },
  { title: "Material Type", key: 'type', sortable: true },
  { title: "Name", key: 'name', sortable: true },
  { title: "Color Name", key: 'colorname', sortable: true },
  { title: "Color", key: 'color', sortable: false },
  { title: "Size", key: 'size', sortable: true },
  { title: "Remaining", key: 'remain', sortable: true },
  { title: "Weight", key: 'weight', sortable: true },
  { title: "Spools", key: 'spoolCount', sortable: true },
  { title: "Actions", key: 'actions', sortable: false, align: 'center' }
]);

// Get unique owners from filaments (flatten all ownersList arrays)
const ownerOptions = computed(() => {
  const owners = new Set();
  allFilaments.value.forEach(f => {
    f.ownersList.forEach(owner => owners.add(owner));
  });
  return Array.from(owners).sort();
});

// Get unique types
const typeOptions = computed(() => {
  const types = [...new Set(allFilaments.value.map(f => f.type))];
  return types.sort();
});

// Get unique manufacturers
const manufacturerOptions = computed(() => {
  const manufacturers = [...new Set(allFilaments.value.map(f => f.manufacturer))];
  return manufacturers.sort();
});

// Filtered filaments
const filteredFilaments = computed(() => {
  let filtered = allFilaments.value;

  if (filterOwner.value) {
    // Filter filaments that have the selected owner in their ownersList
    filtered = filtered.filter(f => f.ownersList.includes(filterOwner.value));
  }

  if (filterType.value) {
    filtered = filtered.filter(f => f.type === filterType.value);
  }

  if (filterManufacturer.value) {
    filtered = filtered.filter(f => f.manufacturer === filterManufacturer.value);
  }

  return filtered;
});

// User statistics
const userStats = computed(() => {
  if (!selectedUser.value) {
    return {
      totalSpools: 0,
      totalKg: 0,
      differentTypes: 0,
      typesList: []
    };
  }

  // Filter spools belonging to the selected user
  let totalSpools = 0;
  let totalGrams = 0;
  const types = new Set();

  allFilaments.value.forEach(f => {
    // Count spools that belong to this user
    const userSpools = f.spools.filter(s => s.owner === selectedUser.value);
    totalSpools += userSpools.length;

    // Calculate weight for user's spools only
    userSpools.forEach(s => {
      totalGrams += Math.round(s.size * s.remain / 100);
      types.add(f.type);
    });
  });

  const totalKg = (totalGrams / 1000).toFixed(2);

  return {
    totalSpools,
    totalKg,
    differentTypes: types.size,
    typesList: Array.from(types).sort()
  };
});

// Show user statistics
const showUserStats = (username) => {
  selectedUser.value = username;
  userStatsDialog.value = true;
};

// Get owner color for chips
const getOwnerColor = (owner) => {
  const colors = ['purple', 'indigo', 'teal', 'orange', 'pink', 'cyan'];
  const hash = owner.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Get color based on remaining percentage
const getRemainColor = (remain) => {
  if (remain >= 70) return 'success';
  if (remain >= 30) return 'warning';
  return 'error';
};

// View filament details
const viewDetails = (filament) => {
  selectedFilament.value = filament;
  detailsDialog.value = true;
};

// Watch for filaments changes and reprocess
watch(() => store.filaments, () => {
  processFilaments();
}, { immediate: true });

// Load all filaments with viewAll flag
onMounted(() => {
  // Force viewAll and fetch all filaments
  store.setViewAll(true);
});
</script>

<style scoped>
code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
