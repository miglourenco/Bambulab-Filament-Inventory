<template>
  <v-dialog v-model="show" scrollable :fullscreen="mobile" :max-width="mobile ? undefined : 1200">
    <v-card>
      <v-card-title class="bg-primary text-white pa-4">
        <v-icon left class="mr-2">mdi-pencil</v-icon>
        Filament Details
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <!-- Mobile: Cards layout -->
        <div v-if="mobile">
          <v-card
            v-for="(item, i) in filamentList"
            :key="item.tag_uid"
            class="mb-4"
            variant="outlined"
          >
            <v-card-title class="text-subtitle-1 pb-0">
              <div class="d-flex align-center justify-space-between w-100">
                <span>#{{ i + 1 }} - {{ item.name }}</span>
                <v-btn size="small" icon variant="text" color="error" @click="remove(item)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </div>
            </v-card-title>
            <v-card-text class="pt-2">
              <v-text-field
                v-model="item.name"
                label="Name"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-3"
                @update:modelValue="debouncedUpdate(item)"
              ></v-text-field>

              <v-combobox
                v-model="item.colorname"
                :items="getAvailableColorsForFilament(item)"
                label="Color"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-3"
                @update:modelValue="debouncedUpdate(item)"
              >
                <template v-slot:prepend-inner>
                  <div
                    :style="{
                      width: '24px',
                      height: '24px',
                      backgroundColor: item.color || '#FFFFFF',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }"
                  ></div>
                </template>
              </v-combobox>

              <v-combobox
                v-model="item.size"
                :items="[1000, 500, 250]"
                label="Size"
                variant="outlined"
                density="compact"
                suffix="g"
                hide-details
                class="mb-3"
                @update:modelValue="onSizeChange(item)"
              ></v-combobox>

              <div class="text-caption text-grey mb-1">Remaining: {{ item.remain }}%</div>
              <v-slider
                v-model="item.remain"
                :min="0"
                :max="100"
                :disabled="item.tracking"
                :step="1"
                color="primary"
                hide-details
                class="mb-2"
                @update:modelValue="onPercentageChange(item)"
              ></v-slider>

              <v-text-field
                v-model="item.grams"
                label="Grams"
                variant="outlined"
                density="compact"
                suffix="g"
                type="number"
                hide-details
                :disabled="item.tracking"
                @update:modelValue="onGramsInput(item)"
              ></v-text-field>
            </v-card-text>
          </v-card>
        </div>

        <!-- Desktop: Table layout -->
        <v-table v-else>
          <thead>
            <tr>
              <th class="text-left">#</th>
              <th class="text-left">Name</th>
              <th class="text-left">Color</th>
              <th class="text-left">Size</th>
              <th class="text-left">Remaining</th>
              <th class="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, i) in filamentList"
              :key="item.tag_uid"
            >
              <td>
                <v-tooltip :text="item.tag_uid">
                  <template v-slot:activator="{ props }">
                    <div v-bind="props">#{{ i + 1 }}</div>
                  </template>
                </v-tooltip>
              </td>
              <td>
                <v-text-field
                  v-model="item.name"
                  label="Name"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="min-width: 200px"
                  @update:modelValue="debouncedUpdate(item)"
                ></v-text-field>
              </td>
              <td>
                <v-combobox
                  v-model="item.colorname"
                  :items="getAvailableColorsForFilament(item)"
                  label="Color"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="min-width: 150px"
                  @update:modelValue="debouncedUpdate(item)"
                >
                  <template v-slot:prepend-inner>
                    <div
                      :style="{
                        width: '24px',
                        height: '24px',
                        backgroundColor: item.color || '#FFFFFF',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }"
                    ></div>
                  </template>
                </v-combobox>
              </td>
              <td>
                <v-combobox
                  v-model="item.size"
                  :items="[1000, 500, 250]"
                  label="Size"
                  variant="outlined"
                  density="compact"
                  suffix="g"
                  hide-details
                  style="min-width: 100px"
                  @update:modelValue="onSizeChange(item)"
                ></v-combobox>
              </td>
              <td style="min-width: 300px">
                <div class="d-flex align-center gap-2">
                  <v-slider
                    v-model="item.remain"
                    :min="0"
                    :max="100"
                    :disabled="item.tracking"
                    :step="1"
                    color="primary"
                    hide-details
                    thumb-label
                    style="min-width: 150px"
                    @update:modelValue="onPercentageChange(item)"
                  ></v-slider>
                  <v-text-field
                    v-model="item.grams"
                    label="g"
                    variant="outlined"
                    density="compact"
                    type="number"
                    hide-details
                    :disabled="item.tracking"
                    style="max-width: 100px"
                    @update:modelValue="onGramsInput(item)"
                  ></v-text-field>
                </div>
              </td>
              <td>
                <v-btn size="small" icon variant="text" color="error" @click="remove(item)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="elevated"
          @click="show = false"
        >
          <v-icon left>mdi-close</v-icon>
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue';
import _ from 'lodash';
import axios from 'axios';
import { useAppStore } from '@/store/app';
import { useDisplay } from 'vuetify';
import { toast } from 'vue3-toastify';
import { normalizeColor } from '@/utils/color';

const store = useAppStore();
const { mobile } = useDisplay();

// Store para cores disponíveis por tipo de material
const availableColorsByType = ref({});

const filamentList = ref([]);
const show = ref(false);

const open = async (list) => {
  // Clone list and add grams property for each item
  filamentList.value = _.cloneDeep(list).map(item => ({
    ...item,
    grams: Math.round((item.size * item.remain) / 100)
  }));
  show.value = true;

  // Carregar cores disponíveis para cada tipo de material único na lista
  const uniqueTypes = [...new Set(list.map(item => item.type))];
  for (const type of uniqueTypes) {
    await loadColorsForType(type);
  }
};

// Carregar cores disponíveis para um tipo de material
const loadColorsForType = async (materialType) => {
  if (!materialType || availableColorsByType.value[materialType]) {
    return; // Já carregado ou tipo vazio
  }

  try {
    const response = await axios.get(`/materials/${encodeURIComponent(materialType)}/colors`);
    availableColorsByType.value[materialType] = response.data.map(c => c.colorname);
  } catch (error) {
    console.error(`Error loading colors for ${materialType}:`, error);
    availableColorsByType.value[materialType] = [];
  }
};

// Obter cores disponíveis para um filamento específico
const getAvailableColorsForFilament = (filament) => {
  // Se for BambuLab e temos cores carregadas, retornar só as cores disponíveis
  if (filament.manufacturer && filament.manufacturer.toLowerCase().includes('bambu')) {
    const colors = availableColorsByType.value[filament.type];
    if (colors && colors.length > 0) {
      return colors;
    }
  }

  // Fallback: permitir qualquer valor (combobox livre)
  return [];
};

const remove = (item) => {
  const result = store.deleteFilament(item.tag_uid);

  if (result) {
    const index = filamentList.value.indexOf(item);
    if (index > -1) {
      filamentList.value.splice(index, 1);
    }

    if (filamentList.value.length === 0) {
      show.value = false;
    }

    toast.success('Filament deleted successfully');
  } else {
    toast.error('Error deleting filament');
  }
};

const update = async (filament) => {
  // Normalize color before sending to backend
  const normalizedFilament = {
    ...filament,
    color: normalizeColor(filament.color)
  };
  // Remove the grams property before sending (it's only for UI)
  delete normalizedFilament.grams;

  const result = await store.updateFilament(normalizedFilament);

  if (result) {
    // Se for BambuLab, também atualizar/criar na base de dados de materiais
    if (filament.manufacturer && filament.manufacturer.toLowerCase().includes('bambu')) {
      try {
        await axios.post('/materials/update-from-filament', {
          manufacturer: filament.manufacturer,
          type: filament.type,
          name: filament.name,
          colorname: filament.colorname,
          color: normalizeColor(filament.color)
        });
        console.log('Material updated/created in database');
      } catch (error) {
        console.error('Error updating material in database:', error);
      }
    }

    toast.success('Changes saved successfully');
  } else {
    toast.error('Error saving changes');
  }
};

// When size changes, recalculate grams
const onSizeChange = (item) => {
  item.grams = Math.round((item.size * item.remain) / 100);
  update(item);
};

// When percentage changes via slider, update grams
const onPercentageChange = (item) => {
  item.grams = Math.round((item.size * item.remain) / 100);
  debouncedUpdate(item);
};

// When grams input changes, update percentage
const onGramsInput = (item) => {
  const gramsValue = parseInt(item.grams) || 0;
  if (!item.size || item.size === 0) return;

  // Calculate new percentage from grams
  const newPercentage = Math.round((gramsValue / item.size) * 100);

  // Limit to 0-100%
  item.remain = Math.max(0, Math.min(100, newPercentage));

  debouncedUpdate(item);
};

var debouncedUpdate = _.debounce(update, 1000);

defineExpose({ open });
</script>
