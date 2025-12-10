/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins';

// Components
import App from './App.vue';

// Composables
import { createApp } from 'vue';

// Store
import { useAppStore } from '@/store/app';

const app = createApp(App);

registerPlugins(app);

app.mount('#app');

// Initialize store and setup axios interceptor
const store = useAppStore();
store.init();
