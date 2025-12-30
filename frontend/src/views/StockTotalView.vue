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
                <v-chip
                  :color="getOwnerColor(item.owner)"
                  size="small"
                  class="font-weight-medium"
                  @click="showUserStats(item.owner)"
                  style="cursor: pointer;"
                >
                  <v-icon start size="small">mdi-account</v-icon>
                  {{ item.owner }}
                </v-chip>
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
                ></v-avatar>
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
          <v-list>
            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Owner</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getOwnerColor(selectedFilament.owner)" size="small">
                  {{ selectedFilament.owner }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Manufacturer</v-list-item-title>
              <v-list-item-subtitle class="text-h6">{{ selectedFilament.manufacturer }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Material Type</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip color="blue" size="small">{{ selectedFilament.type }}</v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Name</v-list-item-title>
              <v-list-item-subtitle class="text-h6">{{ selectedFilament.name }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Color</v-list-item-title>
              <v-list-item-subtitle>
                <div class="d-flex align-center">
                  <v-avatar
                    :style="{ backgroundColor: selectedFilament.color }"
                    size="32"
                    class="mr-2"
                  ></v-avatar>
                  <span>{{ selectedFilament.colorname || selectedFilament.color }}</span>
                </div>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Size</v-list-item-title>
              <v-list-item-subtitle class="text-h6">{{ selectedFilament.size }}g</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Spools</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip color="indigo" size="small" variant="outlined">
                  <v-icon start size="small">mdi-album</v-icon>
                  {{ selectedFilament.spoolCount }} {{ selectedFilament.spoolCount === 1 ? 'spool' : 'spools' }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Total Weight</v-list-item-title>
              <v-list-item-subtitle class="text-h6">{{ selectedFilament.weight }}g</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Avg. Remaining</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getRemainColor(selectedFilament.remain)" size="small">
                  {{ selectedFilament.remain }}%
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider class="my-3"></v-divider>

            <v-list-item>
              <v-list-item-title class="text-subtitle-2 font-weight-bold mb-2">
                Spool Details
              </v-list-item-title>
            </v-list-item>

            <v-list-item
              v-for="(spool, index) in selectedFilament.spools"
              :key="spool.tag_uid"
              class="border-t"
            >
              <v-list-item-subtitle>
                <div class="d-flex flex-column gap-1">
                  <div class="d-flex align-center gap-2">
                    <v-chip size="x-small" color="grey">Spool {{ index + 1 }}</v-chip>
                    <span v-if="spool.serialNumber" class="text-caption">
                      <v-icon size="x-small">mdi-barcode</v-icon>
                      {{ spool.serialNumber }}
                    </span>
                    <span v-else class="text-caption text-grey">Manual</span>
                  </div>
                  <div class="text-caption">
                    {{ spool.remain }}% remaining • {{ Math.round(spool.size * spool.remain / 100) }}g
                  </div>
                </div>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
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
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '@/store/app';

const store = useAppStore();

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

// Get unique owners from filaments
const ownerOptions = computed(() => {
  const owners = [...new Set(allFilaments.value.map(f => f.owner))];
  return owners.sort();
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
    filtered = filtered.filter(f => f.owner === filterOwner.value);
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

  const userFilaments = allFilaments.value.filter(f => f.owner === selectedUser.value);

  // Total spools
  const totalSpools = userFilaments.reduce((sum, f) => sum + f.spoolCount, 0);

  // Total weight in kg (weight is in grams)
  const totalGrams = userFilaments.reduce((sum, f) => sum + f.weight, 0);
  const totalKg = (totalGrams / 1000).toFixed(2);

  // Different types
  const types = [...new Set(userFilaments.map(f => f.type))];

  return {
    totalSpools,
    totalKg,
    differentTypes: types.length,
    typesList: types.sort()
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

// Load all filaments with viewAll flag
onMounted(async () => {
  // Force viewAll and fetch all filaments
  store.setViewAll(true);

  // Group filaments by owner + type + manufacturer + name + color + colorname + size
  const grouped = {};

  store.filaments.forEach(f => {
    const key = `${f.userId}_${f.type}_${f.manufacturer}_${f.name}_${f.color}_${f.colorname}_${f.size}`;

    if (!grouped[key]) {
      grouped[key] = {
        ...f,
        owner: f.username || 'Unknown',
        spools: [f],
        spoolCount: 1,
        totalWeight: Math.round(f.size * f.remain / 100),
        weight: Math.round(f.size * f.remain / 100)
      };
    } else {
      grouped[key].spools.push(f);
      grouped[key].spoolCount++;
      grouped[key].totalWeight += Math.round(f.size * f.remain / 100);
      grouped[key].weight = grouped[key].totalWeight;

      // Update remain to average
      const totalRemain = grouped[key].spools.reduce((sum, spool) => sum + spool.remain, 0);
      grouped[key].remain = Math.round(totalRemain / grouped[key].spoolCount);

      // If any spool has serial number, show the first one
      if (f.serialNumber && !grouped[key].serialNumber) {
        grouped[key].serialNumber = f.serialNumber;
      }
    }
  });

  allFilaments.value = Object.values(grouped);
});
</script>

<style scoped>
code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
