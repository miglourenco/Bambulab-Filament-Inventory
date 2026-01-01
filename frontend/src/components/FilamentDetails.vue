<template>
  <v-dialog width="1400" v-model="show" scrollable>
    <v-card>
      <v-card-title class="bg-primary text-white pa-4">
        <v-icon left class="mr-2">mdi-pencil</v-icon>
        Filament Details
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-6">
        <v-table>
          <thead>
            <tr>
              <th class="text-left">
                Number
              </th>
              <th class="text-left">
                Name
              </th>
              <th class="text-left">
                Color
              </th>
              <th class="text-left">
                Size
              </th>
              <th class="text-left">
                Remaining
              </th>
              <th class="text-left">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, i) in filamentList"
              :key="item.tag_uid"
            >
              <td width="10">
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
                  required
                  @update:modelValue="debouncedUpdate(item)"
                ></v-text-field>
              </td>
              <td width="150">
                <v-combobox
                  v-model="item.colorname"
                  :items="getAvailableColorsForFilament(item)"
                  label="Color"
                  variant="outlined"
                  density="compact"
                  hide-details
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
              <td width="150">
                <v-combobox
                  v-model="item.size"
                  :items="[1000, 500, 250]"
                  label="Size"
                  variant="outlined"
                  density="compact"
                  suffix="g"
                  hide-details
                  required
                  @update:modelValue="update(item)"
                ></v-combobox>
              </td>
              <td width="450">
                <div class="d-flex flex-column gap-2">
                  <v-slider
                    v-model="item.remain"
                    type="number"
                    :min="0"
                    :max="100"
                    :disabled="item.tracking"
                    :step="1"
                    label="Remaining"
                    color="primary"
                    required
                    thumb-label="always"
                    @update:modelValue="onPercentageChange(item)"
                  >
                    <template v-slot:thumb-label>
                      <span style="white-space: nowrap;">{{ item.remain }} %</span>
                    </template>
                  </v-slider>
                  <v-text-field
                    :model-value="calculateGrams(item)"
                    @update:model-value="(val) => onGramsChange(item, val)"
                    label="Grams"
                    variant="outlined"
                    density="compact"
                    suffix="g"
                    type="number"
                    hide-details
                    :disabled="item.tracking"
                  ></v-text-field>
                </div>
              </td>
              <td width="150">
                <v-btn size="x-small" flat icon @click="remove(item)">
                  <v-icon color="red">mdi-delete</v-icon>
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
          text="Close"
          color="primary"
          variant="elevated"
          size="large"
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
import { toast } from 'vue3-toastify';
import { normalizeColor } from '@/utils/color';

const store = useAppStore();

// Store para cores disponíveis por tipo de material
const availableColorsByType = ref({});

const filamentList = ref([]);
const show = ref(false);

const open = async (list) => {
  filamentList.value = _.cloneDeep(list);
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

// Calculate grams from percentage
const calculateGrams = (item) => {
  if (!item.size || !item.remain) return 0;
  return Math.round((item.size * item.remain) / 100);
};

// When percentage changes via slider
const onPercentageChange = (item) => {
  debouncedUpdate(item);
};

// When grams value changes
const onGramsChange = (item, grams) => {
  const gramsValue = parseInt(grams) || 0;
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
