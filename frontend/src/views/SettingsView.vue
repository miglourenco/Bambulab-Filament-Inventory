<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon size="large" class="mr-2">mdi-cog</v-icon>
          {{ t('$vuetify.settings.title') }}
        </h1>
      </v-col>
    </v-row>

    <!-- User Information Card -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card elevation="2">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2" color="white">mdi-account</v-icon>
            <span class="text-white">{{ t('$vuetify.settings.userInfo') }}</span>
          </v-card-title>
          <v-card-text class="pa-4">
            <v-list>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.settings.username') }}</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ store.user?.username }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.settings.email') }}</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ store.user?.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">{{ t('$vuetify.settings.role') }}</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip :color="store.user?.role === 'admin' ? 'error' : 'primary'" size="small">
                    {{ store.user?.role }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Home Assistant Settings -->
      <v-col cols="12" md="6">
        <v-card elevation="2">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2" color="white">mdi-home-assistant</v-icon>
            <span class="text-white">{{ t('$vuetify.settings.hassSettings') }}</span>
          </v-card-title>
          <v-card-text class="pa-4">
            <v-form v-model="hassValid" @submit.prevent="saveHassSettings">
              <v-text-field
                v-model="hassUrl"
                :label="t('$vuetify.settings.hassUrl')"
                prepend-inner-icon="mdi-web"
                variant="outlined"
                placeholder="https://homeassistant.local:8123"
                class="mb-2"
              ></v-text-field>

              <v-text-field
                v-model="hassToken"
                :label="t('$vuetify.settings.hassToken')"
                prepend-inner-icon="mdi-key"
                variant="outlined"
                type="password"
                placeholder="eyJ0eXAi..."
                class="mb-4"
              ></v-text-field>

              <v-btn
                type="submit"
                color="primary"
                :loading="savingHass"
                block
              >
                <v-icon start>mdi-content-save</v-icon>
                {{ t('$vuetify.general.save') }}
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- AMS Configuration -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2" color="white">mdi-printer-3d</v-icon>
            <span class="text-white">{{ t('$vuetify.settings.amsConfig') }}</span>
            <v-spacer></v-spacer>
            <v-btn
              color="white"
              variant="outlined"
              @click="openAddAMSDialog"
            >
              <v-icon start>mdi-plus</v-icon>
              {{ t('$vuetify.settings.addAMS') }}
            </v-btn>
          </v-card-title>

          <v-card-text class="pa-4">
            <v-list v-if="store.amsConfigs.length > 0">
              <v-list-item
                v-for="ams in store.amsConfigs"
                :key="ams.id"
                class="border mb-2"
              >
                <template v-slot:prepend>
                  <v-icon :color="ams.enabled ? 'success' : 'grey'">
                    {{ ams.enabled ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                  </v-icon>
                </template>

                <v-list-item-title>{{ ams.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip size="x-small" class="mr-2">{{ amsTypeLabel(ams.type) }}</v-chip>
                  <span class="text-caption">{{ ams.sensor }}</span>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    icon
                    size="small"
                    @click="toggleAMS(ams)"
                    variant="text"
                  >
                    <v-icon>{{ ams.enabled ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    @click="editAMS(ams)"
                    variant="text"
                    color="orange"
                  >
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    @click="deleteAMS(ams)"
                    variant="text"
                    color="error"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>

            <v-alert v-else type="info" variant="tonal">
              {{ t('$vuetify.settings.noAMS') }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add/Edit AMS Dialog -->
    <v-dialog v-model="amsDialog" max-width="600">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-printer-3d</v-icon>
          {{ editingAMS ? t('$vuetify.settings.editAMS') : t('$vuetify.settings.addAMS') }}
        </v-card-title>

        <v-card-text>
          <v-form v-model="amsValid">
            <v-text-field
              v-model="amsForm.name"
              :label="t('$vuetify.settings.amsName')"
              :rules="requiredRules"
              variant="outlined"
              class="mb-2"
            ></v-text-field>

            <v-select
              v-model="amsForm.type"
              :label="t('$vuetify.settings.amsType')"
              :items="amsTypes"
              item-title="label"
              item-value="value"
              :rules="requiredRules"
              variant="outlined"
              class="mb-2"
            ></v-select>

            <v-text-field
              v-model="amsForm.sensor"
              :label="t('$vuetify.settings.amsSensor')"
              :rules="requiredRules"
              variant="outlined"
              placeholder="sensor.x1c_010101010101_ams_1"
              hint="Ex: sensor.x1c_010101010101_ams_1"
              persistent-hint
            ></v-text-field>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="amsDialog = false"
          >
            {{ t('$vuetify.confirmEdit.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!amsValid"
            @click="saveAMS"
          >
            {{ t('$vuetify.general.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAppStore } from '@/store/app';
import { toast } from 'vue3-toastify';
import { useLocale } from 'vuetify';

const { t } = useLocale();
const store = useAppStore();

const hassValid = ref(false);
const hassUrl = ref('');
const hassToken = ref('');
const savingHass = ref(false);

const amsDialog = ref(false);
const amsValid = ref(false);
const editingAMS = ref(null);
const amsForm = ref({
  name: '',
  type: 'ams',
  sensor: ''
});

const amsTypes = [
  { label: 'AMS (4 trays)', value: 'ams' },
  { label: 'AMS 2 Pro (4 trays)', value: 'ams2pro' },
  { label: 'AMS HT (1 tray)', value: 'amsht' },
  { label: 'AMS Lite (4 trays)', value: 'amslite' }
];

const requiredRules = [
  v => !!v || t('$vuetify.general.required')
];

onMounted(async () => {
  await store.getUserInfo();
  await store.getAMSConfigs();

  hassUrl.value = store.user?.hassUrl || '';
});

const saveHassSettings = async () => {
  savingHass.value = true;

  try {
    await store.updateSettings({
      hassUrl: hassUrl.value,
      hassToken: hassToken.value
    });
    toast.success(t('$vuetify.settings.hassSaved'));
  } catch (error) {
    toast.error(t('$vuetify.settings.hassError'));
  } finally {
    savingHass.value = false;
  }
};

const amsTypeLabel = (type) => {
  const found = amsTypes.find(t => t.value === type);
  return found ? found.label : type;
};

const openAddAMSDialog = () => {
  editingAMS.value = null;
  amsForm.value = {
    name: '',
    type: 'ams',
    sensor: ''
  };
  amsDialog.value = true;
};

const editAMS = (ams) => {
  editingAMS.value = ams;
  amsForm.value = {
    name: ams.name,
    type: ams.type,
    sensor: ams.sensor
  };
  amsDialog.value = true;
};

const saveAMS = async () => {
  try {
    if (editingAMS.value) {
      await store.updateAMSConfig(editingAMS.value.id, amsForm.value);
      toast.success(t('$vuetify.settings.amsUpdated'));
    } else {
      await store.addAMSConfig(amsForm.value);
      toast.success(t('$vuetify.settings.amsAdded'));
    }
    amsDialog.value = false;
  } catch (error) {
    toast.error(t('$vuetify.settings.amsError'));
  }
};

const toggleAMS = async (ams) => {
  try {
    await store.updateAMSConfig(ams.id, { enabled: !ams.enabled });
    toast.success(t('$vuetify.settings.amsToggled'));
  } catch (error) {
    toast.error(t('$vuetify.settings.amsError'));
  }
};

const deleteAMS = async (ams) => {
  if (confirm(t('$vuetify.settings.confirmDeleteAMS'))) {
    try {
      await store.deleteAMSConfig(ams.id);
      toast.success(t('$vuetify.settings.amsDeleted'));
    } catch (error) {
      toast.error(t('$vuetify.settings.amsError'));
    }
  }
};
</script>

<style scoped>
.border {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}
</style>
