<template>
  <v-dialog v-model="show" fullscreen transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar color="primary">
        <v-btn icon @click="close">
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="text-white">{{ t('$vuetify.scanner.title') || 'Scanner de Código' }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="toggleCamera" v-if="!nfcActive">
          <v-icon color="white">mdi-camera-flip</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-0">
        <v-tabs v-model="tab" color="primary" grow>
          <v-tab value="camera">
            <v-icon start>mdi-qrcode-scan</v-icon>
            QR / Barcode
          </v-tab>
          <v-tab value="nfc">
            <v-icon start>mdi-nfc-variant</v-icon>
            NFC
          </v-tab>
        </v-tabs>

        <v-window v-model="tab" style="height: calc(100vh - 112px);">
          <v-window-item value="camera">
            <div class="scanner-container">
              <div v-if="!cameraReady" class="d-flex align-center justify-center" style="height: 100%;">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
              </div>
              <video
                ref="videoElement"
                autoplay
                playsinline
                style="width: 100%; height: 100%; object-fit: cover;"
                v-show="cameraReady"
              ></video>
              <canvas ref="canvasElement" style="display: none;"></canvas>

              <div class="scan-overlay">
                <div class="scan-frame"></div>
                <div class="scan-instructions">
                  {{ t('$vuetify.scanner.instructions') || 'Posicione o código dentro da área' }}
                </div>
              </div>
            </div>
          </v-window-item>

          <v-window-item value="nfc">
            <div class="nfc-container d-flex flex-column align-center justify-center pa-6">
              <v-icon size="120" :color="nfcActive ? 'primary' : 'grey'" class="mb-6">
                mdi-nfc-variant
              </v-icon>

              <v-btn
                v-if="!nfcActive"
                color="primary"
                size="x-large"
                @click="startNFCScanning"
                :disabled="!nfcSupported"
              >
                <v-icon start>mdi-nfc-search-variant</v-icon>
                {{ t('$vuetify.scanner.startNFC') || 'Iniciar Leitura NFC' }}
              </v-btn>

              <v-alert
                v-if="nfcActive"
                type="info"
                variant="tonal"
                class="mt-4"
              >
                {{ t('$vuetify.scanner.nfcReading') || 'Aproxime a tag NFC do dispositivo' }}
              </v-alert>

              <v-alert
                v-if="!nfcSupported"
                type="warning"
                variant="tonal"
                class="mt-4"
              >
                {{ t('$vuetify.scanner.nfcNotSupported') || 'NFC não suportado neste dispositivo' }}
              </v-alert>

              <v-btn
                v-if="nfcActive"
                color="error"
                variant="outlined"
                @click="stopNFCScanning"
                class="mt-4"
              >
                <v-icon start>mdi-stop</v-icon>
                {{ t('$vuetify.scanner.stopNFC') || 'Parar Leitura' }}
              </v-btn>
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onUnmounted, watch } from 'vue';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useLocale } from 'vuetify';
import { toast } from 'vue3-toastify';

const { t } = useLocale();
const emit = defineEmits(['code-scanned']);

const show = ref(false);
const tab = ref('camera');
const videoElement = ref(null);
const canvasElement = ref(null);
const cameraReady = ref(false);
const nfcActive = ref(false);
const nfcSupported = ref(false);

let codeReader = null;
let stream = null;
let currentDeviceId = null;
let videoDevices = [];
let nfcAbortController = null;

const open = async () => {
  show.value = true;
  checkNFCSupport();
  if (tab.value === 'camera') {
    await startCamera();
  }
};

const close = () => {
  stopCamera();
  stopNFCScanning();
  show.value = false;
};

const checkNFCSupport = () => {
  nfcSupported.value = 'NDEFReader' in window;
};

const startCamera = async () => {
  try {
    cameraReady.value = false;
    codeReader = new BrowserMultiFormatReader();

    // Get available video devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices = devices.filter(device => device.kind === 'videoinput');

    // Prefer back camera on mobile
    const backCamera = videoDevices.find(device =>
      device.label.toLowerCase().includes('back') ||
      device.label.toLowerCase().includes('rear')
    );

    currentDeviceId = backCamera ? backCamera.deviceId : videoDevices[0]?.deviceId;

    if (!currentDeviceId) {
      toast.error('Nenhuma câmera disponível');
      return;
    }

    // Start decoding
    await codeReader.decodeFromVideoDevice(
      currentDeviceId,
      videoElement.value,
      (result, error) => {
        if (result) {
          handleScan(result.getText());
        }
      }
    );

    cameraReady.value = true;
  } catch (error) {
    console.error('Erro ao iniciar câmera:', error);
    toast.error('Erro ao acessar a câmera');
  }
};

const stopCamera = () => {
  if (codeReader) {
    codeReader.reset();
    codeReader = null;
  }
  cameraReady.value = false;
};

const toggleCamera = async () => {
  if (videoDevices.length < 2) {
    toast.info('Apenas uma câmera disponível');
    return;
  }

  stopCamera();

  const currentIndex = videoDevices.findIndex(d => d.deviceId === currentDeviceId);
  const nextIndex = (currentIndex + 1) % videoDevices.length;
  currentDeviceId = videoDevices[nextIndex].deviceId;

  await startCamera();
};

const startNFCScanning = async () => {
  if (!nfcSupported.value) {
    toast.error('NFC não suportado neste dispositivo');
    return;
  }

  try {
    nfcAbortController = new AbortController();
    const ndef = new NDEFReader();

    await ndef.scan({ signal: nfcAbortController.signal });

    nfcActive.value = true;
    toast.info('Aproxime a tag NFC');

    ndef.addEventListener('reading', ({ message, serialNumber }) => {
      nfcActive.value = false;
      handleScan(serialNumber);
    }, { signal: nfcAbortController.signal });

    ndef.addEventListener('readingerror', () => {
      toast.error('Erro ao ler tag NFC');
      nfcActive.value = false;
    }, { signal: nfcAbortController.signal });

  } catch (error) {
    console.error('Erro ao iniciar NFC:', error);
    toast.error('Erro ao iniciar leitura NFC: ' + error.message);
    nfcActive.value = false;
  }
};

const stopNFCScanning = () => {
  if (nfcAbortController) {
    nfcAbortController.abort();
    nfcAbortController = null;
  }
  nfcActive.value = false;
};

const handleScan = (code) => {
  if (code) {
    toast.success('Código detectado: ' + code);
    emit('code-scanned', code);
    close();
  }
};

watch(tab, (newTab) => {
  if (newTab === 'camera') {
    stopNFCScanning();
    startCamera();
  } else {
    stopCamera();
  }
});

watch(show, (newValue) => {
  if (!newValue) {
    stopCamera();
    stopNFCScanning();
  }
});

onUnmounted(() => {
  stopCamera();
  stopNFCScanning();
});

defineExpose({ open, close });
</script>

<style scoped>
.scanner-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
}

.scan-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.scan-frame {
  width: 280px;
  height: 280px;
  border: 3px solid rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  position: relative;
}

.scan-frame::before,
.scan-frame::after {
  content: '';
  position: absolute;
  width: 30px;
  height: 30px;
  border: 3px solid #fff;
}

.scan-frame::before {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
}

.scan-frame::after {
  top: -3px;
  right: -3px;
  border-left: none;
  border-bottom: none;
}

.scan-instructions {
  color: white;
  font-size: 16px;
  font-weight: 500;
  margin-top: 32px;
  text-align: center;
  padding: 0 24px;
  background: rgba(0, 0, 0, 0.7);
  padding: 12px 24px;
  border-radius: 24px;
}

.nfc-container {
  height: 100%;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
}
</style>
