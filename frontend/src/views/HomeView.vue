<template>
  <v-container>
    <div class="d-flex align-center">
      <v-text-field
        v-model="search"
        class="mr-2"
        label="Search"
        prepend-inner-icon="mdi-magnify"
        single-line
        variant="outlined"
        hide-details
      ></v-text-field>

      <v-spacer v-if="!mobile" />

      <v-dialog width="600" v-model="openAddDialog" scrollable>
        <template v-slot:activator="{ props }">
          <v-btn
            color="primary"
            v-bind="props"
            size="large"
            elevation="2"
          >
            <v-icon left>mdi-plus</v-icon>
            {{ "Add Filament" }}
          </v-btn>
        </template>

        <template v-slot:default>
          <v-card>
            <v-card-title class="bg-primary text-white pa-4">
              <v-icon left class="mr-2">mdi-cube-outline</v-icon>
              Add New Filament
            </v-card-title>

            <v-divider></v-divider>

            <v-form v-model="valid" @submit.prevent ref="addForm">
              <v-card-text class="pa-6" style="max-height: 60vh; overflow-y: auto;">
                <v-container>
                  <!-- EAN Code Field -->
                  <v-row>
                    <v-col cols="12">
                      <v-text-field
                        v-model="addModel.ean"
                        label="EAN / Barcode"
                        prepend-inner-icon="mdi-barcode"
                        variant="outlined"
                        density="comfortable"
                        hint="Optional - Product EAN code"
                        persistent-hint
                        :error="eanError"
                        :error-messages="eanErrorMessage"
                        @blur="onEanManualInput"
                      >
                        <template v-slot:append>
                          <v-btn
                            v-if="mobile"
                            icon="mdi-qrcode-scan"
                            size="small"
                            variant="text"
                            @click="scanEAN"
                          ></v-btn>
                        </template>
                      </v-text-field>
                    </v-col>
                  </v-row>

                  <v-divider class="my-4"></v-divider>

                  <!-- Manufacturer and Type Row -->
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-combobox
                        v-model="addModel.manufacturer"
                        :rules="requiredRules"
                        :items="autocomplete('manufacturer')"
                        label="Manufacturer"
                        prepend-inner-icon="mdi-factory"
                        variant="outlined"
                        density="comfortable"
                        required
                        @update:model-value="onManufacturerChange"
                      ></v-combobox>
                    </v-col>

                    <v-col cols="12" md="6">
                      <v-combobox
                        v-model="addModel.type"
                        :rules="requiredRules"
                        :items="isBambuLab ? materialTypes : autocomplete('type')"
                        label="Material Type"
                        prepend-inner-icon="mdi-cog"
                        variant="outlined"
                        density="comfortable"
                        required
                        @update:model-value="onMaterialTypeChange"
                      ></v-combobox>
                    </v-col>
                  </v-row>

                  <!-- Variation Field (for BambuLab) -->
                  <v-row v-if="isBambuLab">
                    <v-col cols="12">
                      <v-combobox
                        v-model="addModel.variation"
                        :items="availableVariations"
                        label="Variation"
                        prepend-inner-icon="mdi-shape"
                        variant="outlined"
                        density="comfortable"
                        hint="e.g., Matte, Basic, Support"
                        persistent-hint
                        @update:model-value="onVariationChange"
                      ></v-combobox>
                    </v-col>
                  </v-row>

                  <!-- Product Name -->
                  <v-row>
                    <v-col cols="12">
                      <v-text-field
                        v-model="addModel.name"
                        :rules="requiredRules"
                        label="Name"
                        prepend-inner-icon="mdi-tag-text"
                        variant="outlined"
                        density="comfortable"
                        required
                        :readonly="isBambuLab"
                      ></v-text-field>
                    </v-col>
                  </v-row>

                  <!-- Size and Remain Row -->
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-combobox
                        v-model="addModel.size"
                        :items="[1000, 500, 250]"
                        :rules="requiredRules"
                        label="Size"
                        prepend-inner-icon="mdi-weight"
                        variant="outlined"
                        density="comfortable"
                        suffix="g"
                        required
                      ></v-combobox>
                    </v-col>

                    <v-col cols="12" md="6" class="d-flex align-center">
                      <div style="width: 100%;">
                        <v-slider
                          v-model="addModel.remain"
                          :rules="requiredRules"
                          type="number"
                          :min="0"
                          :max="100"
                          :step="1"
                          label="Remaining"
                          color="primary"
                          required
                          thumb-label="always"
                          prepend-icon="mdi-gauge"
                        >
                          <template v-slot:thumb-label>
                            <span style="white-space: nowrap;">{{ addModel.remain }} %</span>
                          </template>
                        </v-slider>
                      </div>
                    </v-col>
                  </v-row>

                  <v-divider class="my-4"></v-divider>

                  <!-- Color Section -->
                  <v-row>
                    <v-col cols="12">
                      <v-combobox
                        v-model="addModel.colorname"
                        required
                        :rules="requiredRules"
                        :items="availableColorNames"
                        label="Color Name"
                        prepend-inner-icon="mdi-palette"
                        variant="outlined"
                        density="comfortable"
                        @update:model-value="onColorNameChange"
                      ></v-combobox>
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col cols="12" class="text-center">
                      <div class="text-subtitle-2 mb-2">Color</div>
                      <v-color-picker
                        v-model="addModel.color"
                        required
                        show-swatches
                        hide-details
                        mode="hexa"
                        :modes="['hexa']"
                        width="100%"
                        elevation="2"
                      ></v-color-picker>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-actions class="pa-4">
                <v-btn
                  color="grey"
                  variant="text"
                  @click="closeAddDialog"
                >
                  Cancel
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn
                  color="primary"
                  variant="elevated"
                  :disabled="!valid"
                  @click="addFilament"
                >
                  <v-icon left>mdi-content-save</v-icon>
                  Save
                </v-btn>
              </v-card-actions>
            </v-form>
          </v-card>
        </template>
      </v-dialog>
    </div>

    <v-data-table
      :headers="headers"
      :items="store.filamentList"
      :search="search"
      :items-per-page="-1"
      class="elevation-1 mt-4"
    >
      <template v-slot:item.color="{ item }">
        <div class="d-flex align-center">
          <v-avatar
            :color="item.color"
            size="40"
            class="elevation-2"
          >
            <v-icon v-if="item.color === '#FFFFFFFF'" color="grey-darken-1">mdi-palette</v-icon>
          </v-avatar>
        </div>
      </template>

      <template v-slot:item.manufacturer="{ item }">
        <div class="d-flex align-center">
          <v-chip
            color="primary"
            variant="outlined"
            size="small"
          >
            {{ item.manufacturer }}
          </v-chip>
        </div>
      </template>

      <template v-slot:item.type="{ item }">
        <div class="d-flex align-center">
          <v-chip
            color="secondary"
            variant="tonal"
            size="small"
          >
            <v-icon start>mdi-cube-outline</v-icon>
            {{ item.type }}
          </v-chip>
        </div>
      </template>

      <template v-slot:item.filaments="{ item }">
        <v-chip
          color="info"
          variant="flat"
          size="small"
        >
          <v-icon start>mdi-package-variant</v-icon>
          {{ item.filaments.length }}
        </v-chip>
      </template>

      <template v-slot:item.remain="{ item }">
        <div class="d-flex align-center">
          <v-chip
            :color="item.remain > 500 ? 'success' : item.remain > 200 ? 'warning' : 'error'"
            variant="flat"
            size="small"
          >
            <v-icon start>mdi-weight-gram</v-icon>
            {{ Math.round(item.remain) }} g
          </v-chip>
        </div>
      </template>

      <template v-slot:item.actions="{ item }">
        <div style="white-space: nowrap;">
          <v-btn
            size="small"
            @click="editFilament(item)"
            icon
            variant="text"
            color="orange"
          >
            <v-icon size="small">mdi-pencil</v-icon>
          </v-btn>

          <v-btn
            size="small"
            @click="additionalFilament(item)"
            icon
            variant="text"
            color="primary"
          >
            <v-icon size="small">mdi-plus</v-icon>
          </v-btn>
        </div>
      </template>
    </v-data-table>

    <!-- Botão flutuante para scanner -->
    <v-btn
      v-if="mobile"
      color="primary"
      size="large"
      icon
      elevation="8"
      @click="openScanner"
      style="position: fixed; bottom: 80px; right: 16px; z-index: 1000;"
    >
      <v-icon size="large">mdi-qrcode-scan</v-icon>
    </v-btn>

    <Filament-Details ref="filamentDetails"></Filament-Details>
    <Barcode-Scanner ref="barcodeScanner" @code-scanned="handleCodeScanned"></Barcode-Scanner>
  </v-container>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useAppStore } from '@/store/app';
import { storeToRefs } from 'pinia';
import { toast } from 'vue3-toastify';
import { useLocale, useDisplay } from 'vuetify';
import FilamentDetails from '@/components/FilamentDetails.vue';
import BarcodeScanner from '@/components/BarcodeScanner.vue';
import axios from 'axios';
import { normalizeColor } from '@/utils/color';

const { mobile } = useDisplay()

const requiredRules = [
  v => !!v || "This field is required"
];

const store = useAppStore();

const { autocomplete } = storeToRefs(store);

const search = ref('');
const valid = ref(false);
const openAddDialog = ref(false);
const addForm = ref(null);
const filamentDetails = ref(null);
const barcodeScanner = ref(null);

// Materials database
const materialTypes = ref([]);
const availableColors = ref([]);

const addModel = ref({
  manufacturer: '',
  type: '',
  variation: '',
  name: '',
  color: '#ffffffff',
  colorname: '',
  size: 1000,
  remain: 100,
  empty: false,
  ean: ''
});

const eanError = ref(false);
const eanErrorMessage = ref('');

// Check if manufacturer is BambuLab (case insensitive)
const isBambuLab = computed(() => {
  return addModel.value.manufacturer &&
         addModel.value.manufacturer.toLowerCase().includes('bambu');
});

// Get available color names based on selected material type
const availableColorNames = computed(() => {
  // Only show dropdown options for BambuLab materials
  if (isBambuLab.value && availableColors.value.length > 0) {
    return availableColors.value.map(c => c.colorname);
  }
  // For non-BambuLab, return empty array to allow free text input
  return [];
});

// Available variations from database
const availableVariations = ref([]);

const headers = [
  { title: "Manufacturer", key: 'manufacturer' },
  { title: "Material Type", key: 'type' },
  { title: "Name", key: 'name' },
  { title: "Color", key: 'color' },
  { title: "Color Name", key: 'colorname' },
  { title: "Spools", key: 'filaments' },
  { title: "Remaining", key: 'remain' },
  { title: "Actions", key: 'actions', sortable: false }
];

onMounted(async () => {
  if (store.isLoggedIn) {
    // Ensure we're viewing only user's own filaments
    store.setViewAll(false);
  }

  // Load material types
  try {
    const response = await axios.get('/materials/types');
    materialTypes.value = response.data;
  } catch (error) {
    console.error('Error loading material types:', error);
  }
});

// Load colors when manufacturer or material type changes
const onManufacturerChange = () => {
  // Reset type, variation and colors when manufacturer changes
  addModel.value.type = '';
  addModel.value.variation = '';
  addModel.value.name = '';
  availableColors.value = [];
  addModel.value.colorname = '';
};

const onMaterialTypeChange = async () => {
  // Reset variation, color selection and name
  addModel.value.variation = '';
  addModel.value.colorname = '';
  availableColors.value = [];
  availableVariations.value = [];

  // Update name for BambuLab
  updateBambuLabName();

  // If BambuLab and type selected, load colors and variations
  if (isBambuLab.value && addModel.value.type) {
    try {
      // Load colors
      const colorsResponse = await axios.get(`/materials/${encodeURIComponent(addModel.value.type)}/colors`);
      availableColors.value = colorsResponse.data;

      // Load variations
      const variationsResponse = await axios.get(`/materials/${encodeURIComponent(addModel.value.type)}/variations`);
      availableVariations.value = variationsResponse.data;
    } catch (error) {
      console.error('Error loading colors/variations:', error);
    }
  }
};

const onVariationChange = () => {
  // Update name for BambuLab when variation changes
  if (isBambuLab.value) {
    updateBambuLabName();
  }
};

const updateBambuLabName = () => {
  if (isBambuLab.value && addModel.value.type) {
    let name = `Bambu ${addModel.value.type}`;
    if (addModel.value.variation) {
      name += ` ${addModel.value.variation}`;
    }
    addModel.value.name = name;
  }
};

const onColorNameChange = () => {
  // Auto-fill color when colorname is selected from dropdown
  const selectedColor = availableColors.value.find(c => c.colorname === addModel.value.colorname);

  if (selectedColor) {
    // Convert hex to rgba format for v-color-picker
    addModel.value.color = selectedColor.color + 'ff';
  }
};

const scanEAN = () => {
  barcodeScanner.value.open();
};

const closeAddDialog = () => {
  addForm.value.reset();
  resetAddModel();
  openAddDialog.value = false;
  eanError.value = false;
  eanErrorMessage.value = '';
};

const resetAddModel = () => {
  addModel.value = {
    manufacturer: '',
    type: '',
    variation: '',
    name: '',
    color: '#ffffffff',
    colorname: '',
    size: 1000,
    remain: 100,
    empty: false,
    ean: ''
  };
};

const addFilament = async () => {
  // Normalize color before sending to backend
  const filamentData = {
    ...addModel.value,
    color: normalizeColor(addModel.value.color)
  };
  let success = store.addFilament(filamentData);

  if (success) {
    // If EAN is provided and BambuLab, save to database with EAN
    if (addModel.value.ean && isBambuLab.value) {
      try {
        // Convert color from rgba to hex
        let hexColor = addModel.value.color;
        if (hexColor.length === 9) {
          hexColor = hexColor.substring(0, 7); // Remove alpha channel
        }

        // Save/update material with EAN in base_dados_completa.json
        await axios.post('/materials/update-ean', {
          ean: addModel.value.ean,
          manufacturer: addModel.value.manufacturer,
          material: addModel.value.type,
          name: addModel.value.name,
          colorname: addModel.value.colorname,
          color: hexColor
        });

        toast.success('Material e EAN salvos na base de dados!');
      } catch (error) {
        console.error('Error saving material with EAN to database:', error);
        toast.warning('Filamento adicionado mas EAN não foi salvo na base de dados');
      }
    } else if (isBambuLab.value) {
      // If BambuLab but no EAN, save complete material info
      try {
        let hexColor = addModel.value.color;
        if (hexColor.length === 9) {
          hexColor = hexColor.substring(0, 7);
        }

        await axios.post('/materials/update-from-filament', {
          manufacturer: addModel.value.manufacturer,
          type: addModel.value.type,
          name: addModel.value.name,
          colorname: addModel.value.colorname,
          color: hexColor
        });
      } catch (error) {
        console.error('Error saving material to database:', error);
      }
    }

    closeAddDialog();
    toast.success('Filament erfolgreich hinzugefügt');
  } else {
    toast.error('Fehler beim Hinzufügen des Filaments');
  }
};

const additionalFilament = async (item) => {
  let success = store.addFilament({
    manufacturer: item.manufacturer,
    type: item.type,
    name: item.name,
    color: normalizeColor(item.color),
    colorname: item.colorname,
    size: 1000,
    remain: 100,
    empty: false
  });

  if (success) {
    toast.success('Filament erfolgreich hinzugefügt');
  } else {
    toast.error('Fehler beim Hinzufügen des Filaments');
  }
};

const editFilament = async (item) => {
  filamentDetails.value.open(item.filaments);
};

const openScanner = () => {
  barcodeScanner.value.open();
};

const onEanManualInput = async () => {
  const code = addModel.value.ean;

  // Only search if EAN has at least 8 digits
  if (!code || code.length < 8) {
    return;
  }

  // Search for product info
  try {
    const response = await axios.get(`/product-info/${code}`);

    if (response.data) {
      // Auto-fill the form with scraped data (only if fields are empty)
      if (!addModel.value.manufacturer) addModel.value.manufacturer = response.data.manufacturer || '';
      if (!addModel.value.type) addModel.value.type = response.data.type || '';
      if (!addModel.value.colorname) addModel.value.colorname = response.data.colorname || '';
      if (!addModel.value.name) addModel.value.name = response.data.name || response.data.type || '';

      // If color is provided directly from local database, use it
      if (response.data.color && !addModel.value.color) {
        // Convert HEX to rgba format for v-color-picker
        const hexColor = response.data.color.startsWith('#') ? response.data.color : '#' + response.data.color;
        addModel.value.color = hexColor + 'ff';
      }

      // If BambuLab manufacturer and type, load colors
      if (isBambuLab.value && addModel.value.type) {
        await onMaterialTypeChange();

        // If colorname was found and no color was set from database, try to auto-fill the color hex
        if (addModel.value.colorname && !response.data.color) {
          await onColorNameChange();
        }
      }

      toast.success('Product found in database!');
      eanError.value = false;
      eanErrorMessage.value = '';
    }
  } catch (error) {
    // EAN not found - this is OK, user can fill manually
    console.log('EAN not found in database, user can fill manually');
    eanError.value = false;
    eanErrorMessage.value = '';
  }
};

const handleCodeScanned = async (code) => {
  // Search for filament with scanned code
  const result = await store.searchFilamentByCode(code);

  if (result) {
    toast.success('Filament found!');
    filamentDetails.value.open(result.filaments);
  } else {
    // Filament not found, try to fetch product info from barcode
    try {
      toast.info('Searching product info...');
      const response = await axios.get(`/product-info/${code}`);

      if (response.data) {
        // Pre-fill EAN code
        addModel.value.ean = code;
        eanError.value = false;
        eanErrorMessage.value = '';

        // Auto-fill the form with scraped data
        addModel.value.manufacturer = response.data.manufacturer || '';
        addModel.value.type = response.data.type || '';
        addModel.value.variation = response.data.variation || '';
        addModel.value.colorname = response.data.colorname || '';
        addModel.value.name = response.data.name || response.data.type || '';

        // If color is provided directly from local database, use it
        if (response.data.color) {
          // Convert HEX to rgba format for v-color-picker
          const hexColor = response.data.color.startsWith('#') ? response.data.color : '#' + response.data.color;
          addModel.value.color = hexColor + 'ff';
          console.log('Color set from database:', addModel.value.color);
        }

        // If BambuLab manufacturer and type, load colors
        if (isBambuLab.value && addModel.value.type) {
          // Preserve colorname and variation before calling onMaterialTypeChange (which resets them)
          const preservedColorname = addModel.value.colorname;
          const preservedVariation = addModel.value.variation;
          const preservedName = addModel.value.name;

          await onMaterialTypeChange();

          // Restore colorname, variation and name after onMaterialTypeChange
          if (preservedColorname) {
            addModel.value.colorname = preservedColorname;
          }
          if (preservedVariation) {
            addModel.value.variation = preservedVariation;
          }
          if (preservedName) {
            addModel.value.name = preservedName;
          }

          // If colorname was found and no color was set from database, try to auto-fill the color hex
          if (addModel.value.colorname && !response.data.color) {
            await onColorNameChange();
          }
        }

        // Check if all required fields are filled (from local database)
        const allFieldsFilled = addModel.value.manufacturer &&
                                addModel.value.type &&
                                addModel.value.name &&
                                addModel.value.colorname &&
                                addModel.value.color;

        if (allFieldsFilled && response.data.source === 'local_database') {
          // All fields filled from local database, auto-save
          toast.success('Material found in database! Adding to inventory...');
          await addFilament();
        } else {
          // Some fields missing, let user complete
          toast.success('Product identified! Complete the data.');
          openAddDialog.value = true;
        }
      }
    } catch (error) {
      console.error('Error fetching product info:', error);

      // Pre-fill EAN even on error
      addModel.value.ean = code;
      eanError.value = false;  // Changed to false - allow user to save manually
      eanErrorMessage.value = '';

      toast.warning('EAN not found. Fill data manually.');
      openAddDialog.value = true;
    }
  }
};
</script>
