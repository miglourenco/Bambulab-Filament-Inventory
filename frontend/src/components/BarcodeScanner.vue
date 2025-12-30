<template>
  <v-dialog v-model="show" fullscreen transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar color="primary">
        <v-btn icon @click="close">
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="text-white">Barcode Scanner</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="toggleCamera">
          <v-icon color="white">mdi-camera-flip</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-0">
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
              Position the barcode within the frame
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onUnmounted, watch } from 'vue';
import { BrowserMultiFormatReader } from '@zxing/library';
import { toast } from 'vue3-toastify';
const emit = defineEmits(['code-scanned']);

const show = ref(false);
const videoElement = ref(null);
const canvasElement = ref(null);
const cameraReady = ref(false);

let codeReader = null;
let currentDeviceId = null;
let videoDevices = [];

const open = async () => {
  show.value = true;

  // Check if we're in a secure context (HTTPS or localhost)
  if (!window.isSecureContext) {
    toast.error('Camera requires HTTPS. Please access via HTTPS or localhost.', {
      autoClose: 5000
    });
    close();
    return;
  }

  // Check if getUserMedia is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast.error('Your browser does not support camera access.', {
      autoClose: 5000
    });
    close();
    return;
  }

  await startCamera();
};

const close = () => {
  stopCamera();
  show.value = false;
};

const startCamera = async () => {
  try {
    cameraReady.value = false;

    // First request camera permission explicitly
    // This is required for Android and iOS to prompt for permission
    try {
      // Request permission with preference for back camera on mobile
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' } // 'environment' = back camera, 'user' = front camera
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Stop the permission stream immediately, we'll use ZXing's own stream
      stream.getTracks().forEach(track => track.stop());
    } catch (permError) {
      console.error('Permission error:', permError);
      if (permError.name === 'NotAllowedError' || permError.name === 'PermissionDeniedError') {
        toast.error('Camera permission denied. Please allow camera access in browser settings.');
        return;
      }
      throw permError;
    }

    codeReader = new BrowserMultiFormatReader();

    // Now enumerate devices after permission is granted
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices = devices.filter(device => device.kind === 'videoinput');

    // Prefer back camera on mobile
    const backCamera = videoDevices.find(device =>
      device.label.toLowerCase().includes('back') ||
      device.label.toLowerCase().includes('rear') ||
      device.label.toLowerCase().includes('traseira')
    );

    currentDeviceId = backCamera ? backCamera.deviceId : videoDevices[0]?.deviceId;

    if (!currentDeviceId) {
      toast.error('No camera available');
      return;
    }

    // Start decoding with explicit constraints
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
    console.error('Error starting camera:', error);
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      toast.error('Camera permission denied');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      toast.error('No camera found');
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      toast.error('Camera in use by another application');
    } else {
      toast.error('Error accessing camera: ' + error.message);
    }
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
    toast.info('Only one camera available');
    return;
  }

  stopCamera();

  const currentIndex = videoDevices.findIndex(d => d.deviceId === currentDeviceId);
  const nextIndex = (currentIndex + 1) % videoDevices.length;
  currentDeviceId = videoDevices[nextIndex].deviceId;

  await startCamera();
};

const handleScan = (code) => {
  if (code) {
    toast.success('Code detected: ' + code);
    emit('code-scanned', code);
    close();
  }
};

watch(show, (newValue) => {
  if (!newValue) {
    stopCamera();
  }
});

onUnmounted(() => {
  stopCamera();
});

defineExpose({ open, close });
</script>

<style scoped>
.scanner-container {
  position: relative;
  width: 100%;
  height: calc(100vh - 64px);
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
</style>
