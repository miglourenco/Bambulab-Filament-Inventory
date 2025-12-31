<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon size="large" class="mr-2">mdi-cog</v-icon>
          Settings
        </h1>
      </v-col>
    </v-row>

    <!-- User Information Card -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card elevation="2">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2" color="white">mdi-account</v-icon>
            <span class="text-white">User Information</span>
          </v-card-title>
          <v-card-text class="pa-4">
            <v-list>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">Username</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ store.user?.username }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">Email</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ store.user?.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">Role</v-list-item-title>
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
            <span class="text-white">Home Assistant Settings</span>
          </v-card-title>
          <v-card-text class="pa-4">
            <v-form v-model="hassValid">
              <!-- Mode Selector -->
              <v-select
                v-model="hassMode"
                label="Integration Mode"
                :items="hassModes"
                item-title="label"
                item-value="value"
                variant="outlined"
                class="mb-4"
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template v-slot:subtitle>
                      <span class="text-caption">{{ item.raw.description }}</span>
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <!-- Polling Mode Fields -->
              <div v-if="hassMode === 'polling'">
                <v-text-field
                  v-model="hassUrl"
                  label="Home Assistant URL"
                  prepend-inner-icon="mdi-web"
                  variant="outlined"
                  placeholder="https://homeassistant.local:8123"
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-model="hassToken"
                  label="Long-Lived Access Token"
                  prepend-inner-icon="mdi-key"
                  variant="outlined"
                  type="password"
                  placeholder="eyJ0eXAi..."
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-model="trayName"
                  label="Tray Name"
                  prepend-inner-icon="mdi-tray"
                  variant="outlined"
                  placeholder="tray"
                  hint="Default: 'tray'. Change if your HASS uses a different name (e.g., 'ams_tray', 'slot')"
                  persistent-hint
                  class="mb-4"
                ></v-text-field>
              </div>

              <!-- Webhook Mode Fields -->
              <div v-if="hassMode === 'webhook'">
                <v-alert type="info" variant="tonal" class="mb-4" density="compact">
                  Configure your Home Assistant to send data to this app via webhook.
                </v-alert>

                <v-text-field
                  :model-value="webhookUrl"
                  label="Webhook URL"
                  prepend-inner-icon="mdi-link"
                  variant="outlined"
                  readonly
                  class="mb-2"
                >
                  <template v-slot:append>
                    <v-btn icon size="small" @click="copyWebhookUrl" variant="text">
                      <v-icon>mdi-content-copy</v-icon>
                    </v-btn>
                  </template>
                </v-text-field>

                <v-text-field
                  :model-value="store.user?.webhookToken || ''"
                  label="Webhook Token"
                  prepend-inner-icon="mdi-key"
                  variant="outlined"
                  readonly
                  class="mb-2"
                >
                  <template v-slot:append>
                    <v-btn icon size="small" @click="copyWebhookToken" variant="text">
                      <v-icon>mdi-content-copy</v-icon>
                    </v-btn>
                    <v-btn icon size="small" @click="regenerateToken" variant="text" color="warning">
                      <v-icon>mdi-refresh</v-icon>
                    </v-btn>
                  </template>
                </v-text-field>

                <v-expansion-panels class="mb-4">
                  <v-expansion-panel title="Home Assistant Configuration Example">
                    <v-expansion-panel-text>
                      <pre class="text-caption bg-grey-lighten-4 pa-2 rounded overflow-auto">{{ yamlExample }}</pre>
                      <v-btn size="small" variant="text" @click="copyYamlExample" class="mt-2">
                        <v-icon start>mdi-content-copy</v-icon>
                        Copy YAML
                      </v-btn>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>

              <!-- Disabled Mode -->
              <div v-if="hassMode === 'disabled'">
                <v-alert type="warning" variant="tonal" class="mb-4">
                  Home Assistant integration is disabled. Select a mode to enable automatic filament syncing.
                </v-alert>
              </div>

              <div class="d-flex gap-2">
                <v-btn
                  color="grey"
                  variant="outlined"
                  @click="resetHassSettings"
                  :disabled="savingHass"
                  class="flex-grow-1"
                >
                  <v-icon start>mdi-cancel</v-icon>
                  Cancel
                </v-btn>
                <v-btn
                  color="primary"
                  @click="saveHassSettings"
                  :loading="savingHass"
                  class="flex-grow-1"
                >
                  <v-icon start>mdi-content-save</v-icon>
                  Save
                </v-btn>
              </div>
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
            <span class="text-white">AMS Configuration</span>
            <v-spacer></v-spacer>
            <v-btn
              color="white"
              variant="outlined"
              @click="openAddAMSDialog"
            >
              <v-icon start>mdi-plus</v-icon>
              Add AMS
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
              No AMS configured
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
          {{ editingAMS ? 'Edit AMS' : 'Add AMS' }}
        </v-card-title>

        <v-card-text>
          <v-form v-model="amsValid">
            <v-text-field
              v-model="amsForm.name"
              label="AMS Name"
              :rules="requiredRules"
              variant="outlined"
              class="mb-2"
            ></v-text-field>

            <v-select
              v-model="amsForm.type"
              label="AMS Type"
              :items="amsTypes"
              item-title="label"
              item-value="value"
              :rules="requiredRules"
              variant="outlined"
              class="mb-2"
            ></v-select>

            <v-text-field
              v-model="amsForm.sensor"
              label="Sensor ID"
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
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!amsValid"
            @click="saveAMS"
          >
            {{ "Save" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '@/store/app';
import { toast } from 'vue3-toastify';

const store = useAppStore();

const hassValid = ref(false);
const hassUrl = ref('');
const hassToken = ref('');
const trayName = ref('tray');
const hassMode = ref('disabled');
const savingHass = ref(false);

const hassModes = [
  { label: 'Disabled', value: 'disabled', description: 'Home Assistant integration is disabled' },
  { label: 'Polling', value: 'polling', description: 'This app connects to Home Assistant' },
  { label: 'Webhook', value: 'webhook', description: 'Home Assistant sends data to this app' }
];

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
  v => !!v || 'This field is required'
];

// Webhook URL based on current location
const webhookUrl = computed(() => {
  return `${window.location.origin}/api/hass/webhook`;
});

// YAML example for Home Assistant configuration
const yamlExample = computed(() => {
  const token = store.user?.webhookToken || 'YOUR_WEBHOOK_TOKEN';
  const url = webhookUrl.value;

  return `# configuration.yaml
rest_command:
  filament_sync:
    url: "${url}"
    method: POST
    headers:
      Authorization: "Bearer ${token}"
      Content-Type: "application/json"
    payload: >
      {
        "tag_uid": "{{ state_attr(sensor, 'tag_uid') }}",
        "type": "{{ state_attr(sensor, 'type') }}",
        "color": "{{ state_attr(sensor, 'color') }}",
        "remain": {{ state_attr(sensor, 'remain') | int }},
        "empty": {{ state_attr(sensor, 'empty') | lower }},
        "name": "{{ state_attr(sensor, 'name') }}",
        "manufacturer": "{{ state_attr(sensor, 'manufacturer') | default('BambuLab') }}"
      }

# automations.yaml
automation:
  - alias: "Sync AMS Tray 1"
    trigger:
      - platform: state
        entity_id: sensor.x1c_ams_1_tray_1
    action:
      - service: rest_command.filament_sync
        data:
          sensor: "sensor.x1c_ams_1_tray_1"`;
});

onMounted(async () => {
  await store.getUserInfo();
  await store.getAMSConfigs();

  hassUrl.value = store.user?.hassUrl || '';
  trayName.value = store.user?.trayName || 'tray';
  hassMode.value = store.user?.hassMode || 'disabled';
  // Token is not returned from API for security, so we keep it empty
  hassToken.value = '';
});

const resetHassSettings = async () => {
  await store.getUserInfo();
  hassUrl.value = store.user?.hassUrl || '';
  trayName.value = store.user?.trayName || 'tray';
  hassMode.value = store.user?.hassMode || 'disabled';
  hassToken.value = '';
  toast.info('Settings reset');
};

const saveHassSettings = async () => {
  savingHass.value = true;

  try {
    const settings = {
      hassMode: hassMode.value
    };

    // Only include polling settings if mode is polling
    if (hassMode.value === 'polling') {
      settings.hassUrl = hassUrl.value;
      settings.trayName = trayName.value || 'tray';

      // Only send token if it's been changed
      if (hassToken.value && hassToken.value.trim() !== '') {
        settings.hassToken = hassToken.value;
      }
    }

    const success = await store.updateSettings(settings);

    if (success) {
      toast.success('Home Assistant settings saved successfully');
      hassToken.value = ''; // Clear the token field after save
    } else {
      toast.error('Error saving settings');
    }
  } catch (error) {
    toast.error('Error saving settings');
  } finally {
    savingHass.value = false;
  }
};

const copyWebhookUrl = async () => {
  try {
    await navigator.clipboard.writeText(webhookUrl.value);
    toast.success('Webhook URL copied to clipboard');
  } catch (error) {
    toast.error('Failed to copy');
  }
};

const copyWebhookToken = async () => {
  try {
    await navigator.clipboard.writeText(store.user?.webhookToken || '');
    toast.success('Webhook token copied to clipboard');
  } catch (error) {
    toast.error('Failed to copy');
  }
};

const copyYamlExample = async () => {
  try {
    await navigator.clipboard.writeText(yamlExample.value);
    toast.success('YAML copied to clipboard');
  } catch (error) {
    toast.error('Failed to copy');
  }
};

const regenerateToken = async () => {
  if (confirm('Are you sure you want to regenerate the webhook token? The old token will stop working.')) {
    const newToken = await store.regenerateWebhookToken();
    if (newToken) {
      toast.success('Webhook token regenerated successfully');
    } else {
      toast.error('Failed to regenerate token');
    }
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
      toast.success('AMS updated successfully');
    } else {
      await store.addAMSConfig(amsForm.value);
      toast.success('AMS added successfully');
    }
    amsDialog.value = false;
  } catch (error) {
    toast.error('Error with AMS operation');
  }
};

const toggleAMS = async (ams) => {
  try {
    await store.updateAMSConfig(ams.id, { enabled: !ams.enabled });
    toast.success('AMS status toggled');
  } catch (error) {
    toast.error('Error with AMS operation');
  }
};

const deleteAMS = async (ams) => {
  if (confirm('Are you sure you want to delete this AMS?')) {
    try {
      await store.deleteAMSConfig(ams.id);
      toast.success('AMS deleted successfully');
    } catch (error) {
      toast.error('Error with AMS operation');
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
