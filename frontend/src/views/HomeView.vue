<template>
  <v-container>
    <div class="d-flex align-center">
      <v-text-field
        v-model="search"
        class="mr-2"
        :label="t('$vuetify.homeView.search')"
        prepend-inner-icon="mdi-magnify"
        single-line
        variant="outlined"
        hide-details
      ></v-text-field>

      <v-spacer v-if="!mobile" />

      <v-dialog width="500" v-model="openAddDialog">
        <template v-slot:activator="{ props }">
          <v-btn
            color="primary"
            v-bind="props"
          >
            <v-icon left>mdi-plus</v-icon>
            {{ t('$vuetify.homeView.form.button') }}
          </v-btn>
        </template>

        <template v-slot:default>
          <v-card :title="t('$vuetify.homeView.form.title')">
            <v-form v-model="valid" @submit.prevent ref="addForm">
              <v-card-text>
                <v-container>
                  <v-row>
                    <v-col
                      cols="12"
                    >
                      <v-combobox
                        v-model="addModel.manufacturer"
                        :rules="requiredRules"
                        :items="autocomplete('manufacturer')"
                        :label="t('$vuetify.homeView.form.manufacturer')"
                        required
                        @update:model-value="onManufacturerChange"
                      ></v-combobox>
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col
                      cols="12"
                    >
                      <v-combobox
                        v-model="addModel.type"
                        :rules="requiredRules"
                        :items="isBambuLab ? materialTypes : autocomplete('type')"
                        :label="t('$vuetify.homeView.form.type')"
                        required
                        @update:model-value="onMaterialTypeChange"
                      ></v-combobox>
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col
                      cols="12"
                    >
                      <v-text-field
                        v-model="addModel.name"
                        :rules="requiredRules"
                        :label="t('$vuetify.homeView.form.name')"
                        required
                      ></v-text-field>
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col
                      cols="12"
                    >
                      <v-combobox
                        v-model="addModel.size"
                        :items="[1000, 500, 250]"
                        :rules="requiredRules"
                        :label="t('$vuetify.homeView.form.size')"
                        required
                      ></v-combobox>
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col
                      cols="12"
                    >
                      <v-slider
                        v-model="addModel.remain"
                        :rules="requiredRules"
                        type="number"
                        :min="0"
                        :max="100"
                        :step="1"
                        :label="t('$vuetify.homeView.form.remain')"
                        required
                        thumb-label="always"
                      >
                        <template v-slot:thumb-label>
                          <span style="white-space: nowrap;">{{ addModel.remain }} %</span>
                        </template>
                      </v-slider>
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col
                      cols="12"
                    >
                      <v-combobox
                        v-model="addModel.colorname"
                        required
                        :rules="requiredRules"
                        :items="availableColorNames"
                        :label="t('$vuetify.homeView.form.colorname')"
                        @update:model-value="onColorNameChange"
                      ></v-combobox>
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col
                      cols="12"
                    >
                      <v-color-picker
                        v-model="addModel.color"
                        :label="t('$vuetify.homeView.form.color')"
                        required
                        show-swatches
                        hide-details
                        mode="hexa"
                        :modes="['hexa']"
                      ></v-color-picker>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card-text>

              <v-card-actions>
                <v-spacer></v-spacer>

                <v-btn
                  :text="t('$vuetify.confirmEdit.cancel')"
                  color="red darken-2"
                  @click="openAddDialog = false"
                ></v-btn>

                <v-btn
                  :text="t('$vuetify.general.save')"
                  color="green darken-2"
                  type="submit"
                  :disabled="!valid"
                  @click="addFilament"
                ></v-btn>
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
import FilamentDetails from '@/components/FilamentDetails.vue';
import BarcodeScanner from '@/components/BarcodeScanner.vue';
import { useLocale, useDisplay } from 'vuetify';
import axios from 'axios';

const { t } = useLocale();
const { mobile } = useDisplay()

const requiredRules = [
  v => !!v || t('$vuetify.general.required')
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
  name: '',
  color: '#ffffffff',
  colorname: '',
  size: 1000,
  remain: 100,
  empty: false
});

// Check if manufacturer is BambuLab (case insensitive)
const isBambuLab = computed(() => {
  return addModel.value.manufacturer &&
         addModel.value.manufacturer.toLowerCase().includes('bambu');
});

// Get available color names based on selected material type
const availableColorNames = computed(() => {
  return availableColors.value.map(c => c.colorname);
});

const headers = [
  { title: t('$vuetify.homeView.form.manufacturer'), key: 'manufacturer' },
  { title: t('$vuetify.homeView.form.type'), key: 'type' },
  { title: t('$vuetify.homeView.form.name'), key: 'name' },
  { title: t('$vuetify.homeView.form.color'), key: 'color' },
  { title: t('$vuetify.homeView.form.colorname'), key: 'colorname' },
  { title: t('$vuetify.homeView.form.spools'), key: 'filaments' },
  { title: t('$vuetify.homeView.form.remain'), key: 'remain' },
  { title: t('$vuetify.homeView.form.actions'), key: 'actions', sortable: false }
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
  // Reset type and colors when manufacturer changes
  addModel.value.type = '';
  availableColors.value = [];
  addModel.value.colorname = '';
};

const onMaterialTypeChange = async () => {
  // Reset color selection
  addModel.value.colorname = '';
  availableColors.value = [];

  // If BambuLab and type selected, load colors
  if (isBambuLab.value && addModel.value.type) {
    try {
      const response = await axios.get(`/materials/${encodeURIComponent(addModel.value.type)}/colors`);
      availableColors.value = response.data;
    } catch (error) {
      console.error('Error loading colors:', error);
    }
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

const addFilament = async () => {
  let success = store.addFilament(addModel.value);

  if (success) {
    // If BambuLab and new material/color combination, save to database
    if (isBambuLab.value) {
      try {
        // Convert color from rgba to hex
        let hexColor = addModel.value.color;
        if (hexColor.length === 9) {
          hexColor = hexColor.substring(0, 7); // Remove alpha channel
        }

        await axios.post('/materials', {
          material: addModel.value.type,
          colorname: addModel.value.colorname,
          color: hexColor
        });
      } catch (error) {
        console.error('Error saving material to database:', error);
      }
    }

    addForm.value.reset();
    addModel.value = {
      manufacturer: '',
      type: '',
      name: '',
      color: '#ffffffff',
      colorname: '',
      size: 1000,
      remain: 100,
      empty: false
    };

    openAddDialog.value = false;
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
    color: item.color,
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

const handleCodeScanned = async (code) => {
  // Procura por um filamento com o código escaneado
  const result = await store.searchFilamentByCode(code);

  if (result) {
    toast.success('Filamento encontrado!');
    filamentDetails.value.open(result.filaments);
  } else {
    // Filament not found, try to fetch product info from barcode
    try {
      toast.info('Buscando informações do produto...');
      const response = await axios.get(`/product-info/${code}`);

      if (response.data) {
        // Auto-fill the form with scraped data
        addModel.value.manufacturer = response.data.manufacturer || '';
        addModel.value.type = response.data.type || '';
        addModel.value.colorname = response.data.colorname || '';
        addModel.value.name = response.data.type || '';

        // If color is provided directly from local database, use it
        if (response.data.color) {
          // Convert HEX to rgba format for v-color-picker
          const hexColor = response.data.color.startsWith('#') ? response.data.color : '#' + response.data.color;
          addModel.value.color = hexColor + 'ff';
          console.log('Color set from database:', addModel.value.color);
        }

        // If BambuLab manufacturer and type, load colors
        if (isBambuLab.value && addModel.value.type) {
          await onMaterialTypeChange();

          // If colorname was found and no color was set from database, try to auto-fill the color hex
          if (addModel.value.colorname && !response.data.color) {
            await onColorNameChange();
          }
        }

        toast.success('Produto identificado! Complete os dados.');
        openAddDialog.value = true;
      }
    } catch (error) {
      console.error('Error fetching product info:', error);
      toast.info('Filamento não encontrado. Adicione um novo.');
      openAddDialog.value = true;
    }
  }
};
</script>
