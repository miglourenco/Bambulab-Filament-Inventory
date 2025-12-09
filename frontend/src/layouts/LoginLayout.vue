<template>
  <v-app class="loginLayout">
    <v-main>
      <default-view />
    </v-main>
  </v-app>
</template>

<script setup>
  import DefaultView from './DefaultView.vue'
</script>

<style lang="css" scoped>
.loginLayout {
  background-color: #e8f7fe;
  min-height: 100vh;
  width: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
