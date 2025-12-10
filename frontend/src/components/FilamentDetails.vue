<template>
  <v-dialog width="1400" v-model="show" scrollable>
    <v-card>
      <v-card-title class="bg-primary text-white pa-4">
        <v-icon left class="mr-2">mdi-pencil</v-icon>
        {{ t('$vuetify.filamentDetails.title') }}
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-6">
        <v-table>
          <thead>
            <tr>
              <th class="text-left">
                {{ t('$vuetify.filamentDetails.number') }}
              </th>
              <th class="text-left">
                {{ t('$vuetify.filamentDetails.name') }}
              </th>
              <th class="text-left">
                {{ t('$vuetify.filamentDetails.colorname') }}
              </th>
              <th class="text-left">
                {{ t('$vuetify.filamentDetails.size') }}
              </th>
              <th class="text-left">
                {{ t('$vuetify.filamentDetails.remain') }}
              </th>
              <th class="text-left">
                {{ t('$vuetify.filamentDetails.actions') }}
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
                  :label="t('$vuetify.filamentDetails.name')"
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
                  :label="t('$vuetify.filamentDetails.colorname')"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @update:modelValue="debouncedUpdate(item)"
                ></v-combobox>
              </td>
              <td width="150">
                <v-combobox
                  v-model="item.size"
                  :items="[1000, 500, 250]"
                  :label="t('$vuetify.filamentDetails.size')"
                  variant="outlined"
                  density="compact"
                  suffix="g"
                  hide-details
                  required
                  @update:modelValue="update(item)"
                ></v-combobox>
              </td>
              <td width="350">
                <v-slider
                  v-model="item.remain"
                  type="number"
                  :min="0"
                  :max="100"
                  :disabled="item.tracking"
                  :step="1"
                  :label="t('$vuetify.filamentDetails.remaining')"
                  color="primary"
                  required
                  thumb-label="always"
                  @update:modelValue="debouncedUpdate(item)"
                >
                  <template v-slot:thumb-label>
                    <span style="white-space: nowrap;">{{ item.remain }} %</span>
                  </template>
                </v-slider>
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
          :text="t('$vuetify.close')"
          color="primary"
          variant="elevated"
          size="large"
          @click="show = false"
        >
          <v-icon left>mdi-close</v-icon>
          {{ t('$vuetify.close') }}
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
import { useLocale } from 'vuetify';

const { t } = useLocale();
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

    toast.success(t('$vuetify.filamentDetails.successDelete'));
  } else {
    toast.error(t('$vuetify.filamentDetails.errorDelete'));
  }
};

const update = async (filament) => {
  const result = await store.updateFilament(filament);

  if (result) {
    toast.success(t('$vuetify.filamentDetails.success'));
  } else {
    toast.error(t('$vuetify.filamentDetails.error'));
  }
};

var debouncedUpdate = _.debounce(update, 1000);

defineExpose({ open });
</script>
