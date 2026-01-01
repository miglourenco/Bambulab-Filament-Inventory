<template>
  <v-app id="inspire">
    <v-app-bar
      color="primary"
      elevation="2"
      prominent
    >
      <v-container class="mx-auto d-flex align-center justify-center">
        <v-btn
          icon
          @click="toggleDrawer"
          v-if="mobile"
        >
          <v-icon color="white">mdi-menu</v-icon>
        </v-btn>
        <v-spacer />

        <div class="d-flex align-center">
          <v-icon color="white" size="32" class="mr-2">mdi-printer-3d-nozzle</v-icon>
          <span class="text-h5 font-weight-bold text-white">Filament Inventory</span>
        </div>

        <v-spacer />
        <v-btn
          icon
          @click="$router.push({ name: 'Settings' })"
          v-if="!mobile"
        >
          <v-icon color="white">mdi-cog</v-icon>
        </v-btn>
        <v-btn
          variant="outlined"
          color="white"
          @click="store.logout"
        >
          <v-icon left>mdi-logout</v-icon> Logout
        </v-btn>
      </v-container>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      location="left"
      temporary
    >
    <v-list rounded="lg">
      <v-list-item
        color="primary"
        class="mb-2"
      >
        <v-list-item-title class="text-h6 font-weight-bold">
          Filter by Type
        </v-list-item-title>
      </v-list-item>

      <v-divider class="my-2"></v-divider>

      <v-list-item
        color="primary"
        @click="setFilter(null)"
        title="All Types"
        :class="{ 'bg-primary-lighten': store.filter === null, textBold: store.filter === null }"
      >
        <template v-slot:prepend>
          <v-icon>mdi-all-inclusive</v-icon>
        </template>
      </v-list-item>

      <v-list-item
        v-for="(type) in autocomplete('type')"
        :key="type"
        @click="setFilter(type)"
        :title="type"
        color="primary"
        :class="{ 'bg-primary-lighten': store.filter === type, textBold: store.filter === type}"
      >
        <template v-slot:prepend>
          <v-icon>mdi-cube-outline</v-icon>
        </template>
      </v-list-item>

      <v-divider class="my-4"></v-divider>

      <v-list-item
        @click="goToMyInventory"
        prepend-icon="mdi-home"
        title="My Inventory"
      ></v-list-item>

      <v-list-item
        @click="goToStockTotal"
        prepend-icon="mdi-archive-check"
        title="Stock Total"
      ></v-list-item>

      <v-list-item
        @click="goToMaterialsDatabase"
        prepend-icon="mdi-database-edit"
        title="Materials Database"
      ></v-list-item>

      <v-list-item
        @click="goToSettings"
        prepend-icon="mdi-cog"
        title="Settings"
      ></v-list-item>
    </v-list>
    </v-navigation-drawer>

    <v-main class="bg-grey-lighten-4">
      <v-container :fluid="mobile">
        <!-- Tabs Navigation -->
        <v-row v-if="showTabs">
          <v-col cols="12">
            <v-tabs
              v-model="currentTab"
              color="primary"
              align-tabs="center"
              grow
            >
              <v-tab value="inventory" @click="$router.push({ name: 'Home' })">
                <v-icon start>mdi-home</v-icon>
                My Inventory
              </v-tab>
              <v-tab value="stock-total" @click="$router.push({ name: 'StockTotal' })">
                <v-icon start>mdi-archive-check</v-icon>
                Stock Total
              </v-tab>
              <v-tab value="materials-database" @click="$router.push({ name: 'MaterialsDatabase' })">
                <v-icon start>mdi-database-edit</v-icon>
                Materials DB
              </v-tab>
              <v-tab value="settings" @click="$router.push({ name: 'Settings' })">
                <v-icon start>mdi-cog</v-icon>
                Settings
              </v-tab>
            </v-tabs>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="2" v-if="!mobile && showSidebar">
            <v-sheet rounded="lg" elevation="1" class="pa-2">
              <v-list rounded="lg">
                <v-list-item
                  color="primary"
                  class="mb-2"
                >
                  <v-list-item-title class="text-subtitle-1 font-weight-bold">
                    Filter by Type
                  </v-list-item-title>
                </v-list-item>

                <v-divider class="my-2"></v-divider>

                <v-list-item
                  color="primary"
                  @click="setFilter(null)"
                  title="All Types"
                  :class="{ 'bg-primary-lighten': store.filter === null, textBold: store.filter === null }"
                >
                  <template v-slot:prepend>
                    <v-icon>mdi-all-inclusive</v-icon>
                  </template>
                </v-list-item>

                <v-list-item
                  v-for="(type) in autocomplete('type')"
                  :key="type"
                  @click="setFilter(type)"
                  :title="type"
                  color="primary"
                  :class="{ 'bg-primary-lighten': store.filter === type, textBold: store.filter === type}"
                >
                  <template v-slot:prepend>
                    <v-icon>mdi-cube-outline</v-icon>
                  </template>
                </v-list-item>
              </v-list>
            </v-sheet>
          </v-col>

          <v-col cols="12" :md="showSidebar && !mobile ? 10 : 12">
            <v-sheet
              min-height="70vh"
              rounded="lg"
              elevation="1"
            >
              <default-view />
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import DefaultView from './DefaultView.vue';
import { storeToRefs } from 'pinia';
import { useAppStore } from '@/store/app';
import { useLocale, useDisplay } from 'vuetify';
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

const { t } = useLocale();
const { mobile } = useDisplay();
const route = useRoute();

const store = useAppStore();

const { autocomplete } = storeToRefs(store);
const drawer = ref(false);

// Compute current tab based on route
const currentTab = computed(() => {
  if (route.name === 'Home') return 'inventory';
  if (route.name === 'StockTotal') return 'stock-total';
  if (route.name === 'MaterialsDatabase') return 'materials-database';
  if (route.name === 'Settings') return 'settings';
  return 'inventory';
});

// Show tabs on all pages
const showTabs = computed(() => true);

// Show sidebar only on Home page
const showSidebar = computed(() => route.name === 'Home');

const toggleDrawer = () => {
  drawer.value = !drawer.value;
};

const setFilter = (filter) => {
  store.setFilter(filter);
  drawer.value = false;
};

const goToMyInventory = () => {
  drawer.value = false;
  window.location.hash = '#/';
};

const goToStockTotal = () => {
  drawer.value = false;
  window.location.hash = '#/stock-total';
};

const goToMaterialsDatabase = () => {
  drawer.value = false;
  window.location.hash = '#/materials-database';
};

const goToSettings = () => {
  drawer.value = false;
  window.location.hash = '#/settings';
};
</script>

<style lang="css">
.textBold .v-list-item-title {
  font-weight: bold !important;
}
</style>
