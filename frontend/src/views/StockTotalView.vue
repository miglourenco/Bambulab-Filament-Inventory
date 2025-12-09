<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon size="large" class="mr-2">mdi-archive-check</v-icon>
          {{ t('$vuetify.stockTotal.title') }}
        </h1>
      </v-col>
    </v-row>

    <!-- Filters Card -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" class="mb-4">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2" color="white">mdi-filter</v-icon>
            <span class="text-white">{{ t('$vuetify.stockTotal.filters') }}</span>
          </v-card-title>
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" sm="6" md="3">
                <v-text-field
                  v-model="search"
                  :label="t('$vuetify.homeView.search')"
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
                  :label="t('$vuetify.stockTotal.filterOwner')"
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
                  :label="t('$vuetify.homeView.form.type')"
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
                  :label="t('$vuetify.homeView.form.manufacturer')"
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
            <span class="text-white">{{ t('$vuetify.stockTotal.inventory') }}</span>
            <v-spacer></v-spacer>
            <v-chip color="white" variant="outlined" class="mr-2">
              <v-icon start>mdi-counter</v-icon>
              {{ filteredFilaments.length }} {{ t('$vuetify.stockTotal.items') }}
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
                >
                  <v-icon start size="small">mdi-account</v-icon>
                  {{ item.owner }}
                </v-chip>
              </template>

              <!-- Type Column -->
              <template v-slot:item.type="{ item }">
                <v-chip size="small" color="blue">{{ item.type }}</v-chip>
              </template>

              <!-- Color Column -->
              <template v-slot:item.color="{ item }">
                <div class="d-flex align-center">
                  <v-avatar
                    :style="{ backgroundColor: item.color }"
                    size="24"
                    class="mr-2"
                  ></v-avatar>
                  <span class="text-caption">{{ item.colorname || item.color }}</span>
                </div>
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

              <!-- Serial Number Column -->
              <template v-slot:item.serialNumber="{ item }">
                <v-chip
                  v-if="item.serialNumber"
                  size="small"
                  variant="outlined"
                  color="grey"
                >
                  <v-icon start size="small">mdi-barcode</v-icon>
                  {{ item.serialNumber }}
                </v-chip>
                <v-chip v-else size="small" color="grey" variant="text">
                  {{ t('$vuetify.stockTotal.manual') }}
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
                  {{ t('$vuetify.stockTotal.noData') }}
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
          <span class="text-white">{{ t('$vuetify.filamentDetails.title') }}</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <v-list>
            <v-list-item>
              <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.stockTotal.owner') }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getOwnerColor(selectedFilament.owner)" size="small">
                  {{ selectedFilament.owner }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.homeView.form.manufacturer') }}</v-list-item-title>
              <v-list-item-subtitle class="text-h6">{{ selectedFilament.manufacturer }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.homeView.form.type') }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip color="blue" size="small">{{ selectedFilament.type }}</v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.homeView.form.name') }}</v-list-item-title>
              <v-list-item-subtitle class="text-h6">{{ selectedFilament.name }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.homeView.form.color') }}</v-list-item-title>
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
              <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.homeView.form.size') }}</v-list-item-title>
              <v-list-item-subtitle class="text-h6">{{ selectedFilament.size }}g</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.filamentDetails.remaining') }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getRemainColor(selectedFilament.remain)" size="small">
                  {{ selectedFilament.remain }}% ({{ selectedFilament.weight }}g)
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedFilament.serialNumber">
              <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.stockTotal.serialNumber') }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip size="small" variant="outlined">
                  <v-icon start size="small">mdi-barcode</v-icon>
                  {{ selectedFilament.serialNumber }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.stockTotal.tagUid') }}</v-list-item-title>
              <v-list-item-subtitle>
                <code class="text-caption">{{ selectedFilament.tag_uid }}</code>
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
            {{ t('$vuetify.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '@/store/app';
import { useLocale } from 'vuetify';

const { t } = useLocale();
const store = useAppStore();

const search = ref('');
const filterOwner = ref(null);
const filterType = ref(null);
const filterManufacturer = ref(null);
const detailsDialog = ref(false);
const selectedFilament = ref(null);
const allFilaments = ref([]);

const headers = computed(() => [
  { title: t('$vuetify.stockTotal.owner'), key: 'owner', sortable: true },
  { title: t('$vuetify.homeView.form.manufacturer'), key: 'manufacturer', sortable: true },
  { title: t('$vuetify.homeView.form.type'), key: 'type', sortable: true },
  { title: t('$vuetify.homeView.form.name'), key: 'name', sortable: true },
  { title: t('$vuetify.homeView.form.color'), key: 'color', sortable: false },
  { title: t('$vuetify.homeView.form.remain'), key: 'remain', sortable: true },
  { title: t('$vuetify.stockTotal.weight'), key: 'weight', sortable: true },
  { title: t('$vuetify.stockTotal.serialNumber'), key: 'serialNumber', sortable: true },
  { title: t('$vuetify.homeView.form.actions'), key: 'actions', sortable: false, align: 'center' }
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
  // Set viewAll to true temporarily to fetch all filaments
  const previousViewAll = store.viewAll;
  store.viewAll = true;
  await store.getFilaments();

  // Transform filaments to include owner username and calculated weight
  allFilaments.value = store.filaments.map(f => ({
    ...f,
    owner: f.username || 'Unknown',
    weight: Math.round(f.size * f.remain / 100)
  }));

  // Restore previous viewAll state
  store.viewAll = previousViewAll;
});
</script>

<style scoped>
code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
