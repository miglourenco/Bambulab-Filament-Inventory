<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <v-card class="mb-6" elevation="2">
      <v-card-title class="bg-primary text-white pa-4">
        <v-icon left class="mr-2">mdi-database-edit</v-icon>
        Materials Database Management
      </v-card-title>
      <v-card-text class="pa-4">
        <v-row align="center">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search materials..."
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filterMaterial"
              :items="materialTypes"
              label="Filter by Material"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            ></v-select>
          </v-col>
          <v-col cols="12" md="2">
            <v-switch
              v-model="showOnlyInStock"
              label="In Stock Only"
              color="success"
              hide-details
              density="comfortable"
            ></v-switch>
          </v-col>
          <v-col cols="12" md="2" class="text-right">
            <v-btn
              color="success"
              size="large"
              prepend-icon="mdi-plus"
              @click="openAddDialog"
            >
              Add Material
            </v-btn>
          </v-col>
        </v-row>

        <!-- Statistics -->
        <v-row class="mt-4">
          <v-col cols="6" md="3">
            <v-card color="blue-lighten-5" elevation="0">
              <v-card-text class="text-center">
                <div class="text-h4 text-blue">{{ materials.length }}</div>
                <div class="text-caption">Total Materials</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card color="green-lighten-5" elevation="0">
              <v-card-text class="text-center">
                <div class="text-h4 text-green">{{ materialTypes.length }}</div>
                <div class="text-caption">Material Types</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card color="orange-lighten-5" elevation="0">
              <v-card-text class="text-center">
                <div class="text-h4 text-orange">{{ materialsWithEAN }}</div>
                <div class="text-caption">With EAN</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card color="red-lighten-5" elevation="0">
              <v-card-text class="text-center">
                <div class="text-h4 text-red">{{ duplicateEANs }}</div>
                <div class="text-caption">Duplicate EANs</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-card elevation="2">
      <v-data-table
        :headers="headers"
        :items="filteredMaterials"
        :search="search"
        :items-per-page="15"
        class="elevation-1"
      >
        <!-- Color preview -->
        <template v-slot:item.color="{ item }">
          <div class="d-flex align-center">
            <div
              :style="{
                width: '40px',
                height: '40px',
                backgroundColor: item.color,
                border: '2px solid #ccc',
                borderRadius: '8px',
                marginRight: '12px'
              }"
            ></div>
            <span>{{ item.color }}</span>
          </div>
        </template>

        <!-- EAN with badge -->
        <template v-slot:item.ean="{ item }">
          <div v-if="item.ean">
            <v-chip
              v-for="(ean, index) in item.ean.split(',')"
              :key="index"
              size="small"
              class="mr-1 mb-1"
              color="primary"
            >
              {{ ean.trim() }}
            </v-chip>
          </div>
          <span v-else class="text-grey">No EAN</span>
        </template>

        <!-- Actions -->
        <template v-slot:item.actions="{ item }">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            color="primary"
            @click="openEditDialog(item)"
          ></v-btn>
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click="confirmDelete(item)"
          ></v-btn>
          <v-btn
            icon="mdi-content-copy"
            size="small"
            variant="text"
            color="info"
            @click="duplicateMaterial(item)"
          ></v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialog" width="800" scrollable>
      <v-card>
        <v-card-title class="bg-primary text-white pa-4">
          <v-icon left class="mr-2">{{ editMode ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ editMode ? 'Edit Material' : 'Add New Material' }}
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-6">
          <v-form ref="form" v-model="valid">
            <v-row>
              <!-- Manufacturer -->
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editedMaterial.manufacturer"
                  label="Manufacturer"
                  prepend-inner-icon="mdi-factory"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                ></v-text-field>
              </v-col>

              <!-- Material Type -->
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="editedMaterial.material"
                  :items="materialTypes"
                  label="Material Type"
                  prepend-inner-icon="mdi-cube-outline"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                ></v-combobox>
              </v-col>

              <!-- Variation (for BambuLab) -->
              <v-col cols="12" v-if="isBambuLab">
                <v-combobox
                  v-model="editedMaterial.variation"
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

              <!-- Name -->
              <v-col cols="12">
                <v-text-field
                  v-model="editedMaterial.name"
                  label="Product Name"
                  prepend-inner-icon="mdi-tag"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                  hint="e.g., Bambu PLA Basic"
                  persistent-hint
                  :readonly="isBambuLab"
                ></v-text-field>
              </v-col>

              <!-- Color Name -->
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editedMaterial.colorname"
                  label="Color Name"
                  prepend-inner-icon="mdi-palette"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                ></v-text-field>
              </v-col>

              <!-- Color HEX -->
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editedMaterial.color"
                  label="Color HEX"
                  prepend-inner-icon="mdi-eyedropper"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required, rules.hexColor]"
                  placeholder="#000000"
                >
                  <template v-slot:append-inner>
                    <div
                      :style="{
                        width: '32px',
                        height: '32px',
                        backgroundColor: editedMaterial.color || '#FFFFFF',
                        border: '2px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }"
                      @click="openColorPicker"
                    ></div>
                  </template>
                </v-text-field>
              </v-col>

              <!-- EAN Codes -->
              <v-col cols="12">
                <v-text-field
                  v-model="editedMaterial.ean"
                  label="EAN Codes"
                  prepend-inner-icon="mdi-barcode"
                  variant="outlined"
                  density="comfortable"
                  hint="Separate multiple EANs with comma: 1234567890123, 9876543210987"
                  persistent-hint
                ></v-text-field>
              </v-col>

              <!-- Note -->
              <v-col cols="12" md="6">
                <v-select
                  v-model="editedMaterial.note"
                  :items="['', 'Custom', 'Official', 'Verified', 'Unverified']"
                  label="Note/Status"
                  prepend-inner-icon="mdi-note"
                  variant="outlined"
                  density="comfortable"
                ></v-select>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-btn
            color="grey"
            variant="text"
            @click="closeDialog"
          >
            Cancel
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="!valid"
            @click="saveMaterial"
          >
            <v-icon left>mdi-content-save</v-icon>
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-error text-white pa-4">
          <v-icon left class="mr-2">mdi-alert</v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text class="pa-6">
          <p>Are you sure you want to delete this material?</p>
          <v-alert type="warning" variant="tonal" class="mt-4">
            <strong>{{ materialToDelete?.name }} - {{ materialToDelete?.colorname }}</strong>
            <br>
            <small>This action cannot be undone!</small>
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn color="grey" variant="text" @click="deleteDialog = false">
            Cancel
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="error" variant="elevated" @click="deleteMaterial">
            <v-icon left>mdi-delete</v-icon>
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Color Picker Dialog -->
    <v-dialog v-model="colorPickerDialog" max-width="400">
      <v-card>
        <v-card-title class="bg-primary text-white pa-4">
          <v-icon left class="mr-2">mdi-palette</v-icon>
          Pick Color
        </v-card-title>
        <v-card-text class="pa-6">
          <v-color-picker
            v-model="editedMaterial.color"
            mode="hex"
            hide-inputs
            width="100%"
          ></v-color-picker>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="elevated" @click="colorPickerDialog = false">
            Done
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import { toast } from 'vue3-toastify';
import { useAppStore } from '@/store/app';

const store = useAppStore();

// Data
const materials = ref([]);
const search = ref('');
const filterMaterial = ref(null);
const showOnlyInStock = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const colorPickerDialog = ref(false);
const editMode = ref(false);
const valid = ref(false);
const form = ref(null);

const materialToDelete = ref(null);

const defaultMaterial = {
  manufacturer: 'BambuLab',
  material: '',
  variation: '',
  name: '',
  colorname: '',
  color: '#000000',
  note: '',
  ean: ''
};

const editedMaterial = ref({ ...defaultMaterial });
const editedIndex = ref(-1);

// Table headers
const headers = [
  { title: 'Manufacturer', key: 'manufacturer', sortable: true },
  { title: 'Material', key: 'material', sortable: true },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Color Name', key: 'colorname', sortable: true },
  { title: 'Color', key: 'color', sortable: false },
  { title: 'EAN', key: 'ean', sortable: false },
  { title: 'Note', key: 'note', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '150' }
];

// Validation rules
const rules = {
  required: value => !!value || 'Required field',
  hexColor: value => {
    if (!value) return true;
    return /^#[0-9A-F]{6}$/i.test(value) || 'Must be a valid HEX color (e.g., #FF0000)';
  }
};

// Computed
const materialTypes = computed(() => {
  const types = [...new Set(materials.value.map(m => m.material))];
  return types.sort();
});

const filteredMaterials = computed(() => {
  let filtered = materials.value;

  if (filterMaterial.value) {
    filtered = filtered.filter(m => m.material === filterMaterial.value);
  }

  // Filter by "In Stock" - only show materials that exist in user's filaments
  if (showOnlyInStock.value) {
    const userFilaments = store.filamentList || [];

    filtered = filtered.filter(material => {
      return userFilaments.some(filament => {
        const manufacturerMatch = filament.manufacturer === material.manufacturer;
        const typeMatch = filament.type === material.material;
        const nameMatch = filament.name === material.name;
        const colorMatch = filament.colorname === material.colorname;

        return manufacturerMatch && typeMatch && nameMatch && colorMatch;
      });
    });
  }

  return filtered;
});

const materialsWithEAN = computed(() => {
  return materials.value.filter(m => m.ean && m.ean !== '').length;
});

const duplicateEANs = computed(() => {
  const eanMap = {};
  materials.value.forEach(m => {
    if (m.ean && m.ean !== '') {
      const eans = m.ean.split(',');
      eans.forEach(ean => {
        const trimmed = ean.trim();
        if (!eanMap[trimmed]) {
          eanMap[trimmed] = [];
        }
        eanMap[trimmed].push(m);
      });
    }
  });

  let duplicates = 0;
  for (const [ean, mats] of Object.entries(eanMap)) {
    if (mats.length > 1) {
      const unique = new Set(mats.map(m => `${m.colorname}|${m.color}`));
      if (unique.size > 1) {
        duplicates++;
      }
    }
  }
  return duplicates;
});

const isBambuLab = computed(() => {
  return editedMaterial.value.manufacturer &&
         editedMaterial.value.manufacturer.toLowerCase().includes('bambu');
});

const availableVariations = ref([]);

// Methods
const onVariationChange = () => {
  if (isBambuLab.value) {
    updateBambuLabName();
  }
};

const updateBambuLabName = () => {
  if (isBambuLab.value && editedMaterial.value.material) {
    let name = `Bambu ${editedMaterial.value.material}`;
    if (editedMaterial.value.variation) {
      name += ` ${editedMaterial.value.variation}`;
    }
    editedMaterial.value.name = name;
  }
};

const loadMaterials = async () => {
  try {
    const response = await axios.get('/materials/all');
    materials.value = response.data;
    toast.success(`Loaded ${materials.value.length} materials`);
  } catch (error) {
    console.error('Error loading materials:', error);
    toast.error('Failed to load materials');
  }
};

const openAddDialog = () => {
  editMode.value = false;
  editedMaterial.value = { ...defaultMaterial };
  editedIndex.value = -1;
  dialog.value = true;
};

const openEditDialog = (item) => {
  editMode.value = true;
  editedIndex.value = materials.value.indexOf(item);
  editedMaterial.value = { ...item };
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  setTimeout(() => {
    editedMaterial.value = { ...defaultMaterial };
    editedIndex.value = -1;
    if (form.value) {
      form.value.reset();
    }
  }, 300);
};

const saveMaterial = async () => {
  if (!form.value.validate()) return;

  try {
    // Normalize color to uppercase
    editedMaterial.value.color = editedMaterial.value.color.toUpperCase();

    if (editMode.value) {
      // Update existing
      const response = await axios.put('/materials/update', editedMaterial.value);
      if (response.data.success) {
        Object.assign(materials.value[editedIndex.value], editedMaterial.value);
        toast.success('Material updated successfully');
      }
    } else {
      // Add new
      const response = await axios.post('/materials/add', editedMaterial.value);
      if (response.data.success) {
        materials.value.push(editedMaterial.value);
        toast.success('Material added successfully');
      }
    }

    closeDialog();
    await loadMaterials(); // Reload to get fresh data
  } catch (error) {
    console.error('Error saving material:', error);
    toast.error('Failed to save material');
  }
};

const confirmDelete = (item) => {
  materialToDelete.value = item;
  deleteDialog.value = true;
};

const deleteMaterial = async () => {
  try {
    const response = await axios.delete('/materials/delete', {
      data: {
        manufacturer: materialToDelete.value.manufacturer,
        material: materialToDelete.value.material,
        name: materialToDelete.value.name,
        colorname: materialToDelete.value.colorname,
        color: materialToDelete.value.color
      }
    });

    if (response.data.success) {
      const index = materials.value.indexOf(materialToDelete.value);
      materials.value.splice(index, 1);
      toast.success('Material deleted successfully');
    }

    deleteDialog.value = false;
    materialToDelete.value = null;
  } catch (error) {
    console.error('Error deleting material:', error);
    toast.error('Failed to delete material');
  }
};

const duplicateMaterial = (item) => {
  editMode.value = false;
  editedMaterial.value = {
    ...item,
    colorname: `${item.colorname} (Copy)`,
    ean: '' // Clear EAN for duplicate
  };
  editedIndex.value = -1;
  dialog.value = true;
};

const openColorPicker = () => {
  colorPickerDialog.value = true;
};

// Watchers
watch(() => editedMaterial.value.material, async (newVal, oldVal) => {
  if (newVal !== oldVal) {
    editedMaterial.value.variation = '';
    availableVariations.value = [];
    updateBambuLabName();

    // Load variations for BambuLab materials
    if (isBambuLab.value && newVal) {
      try {
        const response = await axios.get(`/materials/${encodeURIComponent(newVal)}/variations`);
        availableVariations.value = response.data;
      } catch (error) {
        console.error('Error loading variations:', error);
      }
    }
  }
});

// Lifecycle
onMounted(() => {
  loadMaterials();
});
</script>

<style scoped>
.v-data-table {
  font-size: 14px;
}
</style>
