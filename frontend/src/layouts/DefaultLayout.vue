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
          <span class="text-h5 font-weight-bold text-white">{{ t('$vuetify.defaultLayout.title') }}</span>
        </div>

        <v-spacer />
        <v-btn
          variant="outlined"
          color="white"
          @click="store.logout"
        >
          <v-icon left>mdi-logout</v-icon> {{ t('$vuetify.defaultLayout.logout') }}
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
          {{ t('$vuetify.defaultLayout.filamentFilter') }}
        </v-list-item-title>
      </v-list-item>

      <v-divider class="my-2"></v-divider>

      <v-list-item
        color="primary"
        @click="setFilter(null)"
        :title="t('$vuetify.defaultLayout.filamentFilterAll')"
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
    </v-navigation-drawer>

    <v-main class="bg-grey-lighten-4">
      <v-container :fluid="mobile">
        <v-row>
          <v-col cols="12" md="2" v-if="!mobile">
            <v-sheet rounded="lg" elevation="1" class="pa-2">
              <v-list rounded="lg">
                <v-list-item
                  color="primary"
                  class="mb-2"
                >
                  <v-list-item-title class="text-subtitle-1 font-weight-bold">
                    {{ t('$vuetify.defaultLayout.filamentFilter') }}
                  </v-list-item-title>
                </v-list-item>

                <v-divider class="my-2"></v-divider>

                <v-list-item
                  color="primary"
                  @click="setFilter(null)"
                  :title="t('$vuetify.defaultLayout.filamentFilterAll')"
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

          <v-col cols="12" md="10">
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
import { ref } from 'vue';

const { t } = useLocale();
const { mobile } = useDisplay()

const store = useAppStore();

const { autocomplete } = storeToRefs(store);
const drawer = ref(false);

const toggleDrawer = () => {
  drawer.value = !drawer.value;
};

const setFilter = (filter) => {
  store.setFilter(filter);
  drawer.value = false;
};
</script>

<style lang="css">
.textBold .v-list-item-title {
  font-weight: bold !important;
}
</style>
