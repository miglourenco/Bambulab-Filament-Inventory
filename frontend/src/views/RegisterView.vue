<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card elevation="8" rounded="lg">
          <v-card-title class="text-h5 text-center pa-6 bg-primary">
            <v-icon size="large" class="mr-2" color="white">mdi-account-plus</v-icon>
            <span class="text-white">{{ t('$vuetify.registerPage.title') }}</span>
          </v-card-title>

          <v-card-text class="pa-6">
            <v-form v-model="valid" @submit.prevent="registerUser">
              <v-text-field
                v-model="username"
                :label="t('$vuetify.registerPage.username')"
                :rules="requiredRules"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                class="mb-2"
              ></v-text-field>

              <v-text-field
                v-model="email"
                :label="t('$vuetify.registerPage.email')"
                :rules="emailRules"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                type="email"
                class="mb-2"
              ></v-text-field>

              <v-text-field
                v-model="password"
                :label="t('$vuetify.registerPage.password')"
                :rules="passwordRules"
                prepend-inner-icon="mdi-lock"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                class="mb-2"
              ></v-text-field>

              <v-text-field
                v-model="confirmPassword"
                :label="t('$vuetify.registerPage.confirmPassword')"
                :rules="confirmPasswordRules"
                prepend-inner-icon="mdi-lock-check"
                :type="showConfirmPassword ? 'text' : 'password'"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
                variant="outlined"
                class="mb-4"
              ></v-text-field>

              <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
                {{ error }}
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :disabled="!valid"
                :loading="loading"
              >
                <v-icon start>mdi-account-plus</v-icon>
                {{ t('$vuetify.registerPage.register') }}
              </v-btn>

              <v-divider class="my-4"></v-divider>

              <div class="text-center">
                <span class="text-body-2">{{ t('$vuetify.registerPage.haveAccount') }}</span>
                <v-btn
                  variant="text"
                  color="primary"
                  @click="router.push({ name: 'Login' })"
                  class="ml-1"
                >
                  {{ t('$vuetify.registerPage.loginLink') }}
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '@/store/app';
import { useRouter } from 'vue-router';
import { toast } from 'vue3-toastify';
import { useLocale } from 'vuetify';

const { t } = useLocale();
const store = useAppStore();
const router = useRouter();

const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const valid = ref(false);
const loading = ref(false);
const error = ref('');

const requiredRules = [
  v => !!v || t('$vuetify.general.required')
];

const emailRules = [
  v => !!v || t('$vuetify.general.required'),
  v => /.+@.+\..+/.test(v) || t('$vuetify.registerPage.invalidEmail')
];

const passwordRules = [
  v => !!v || t('$vuetify.general.required'),
  v => v.length >= 6 || t('$vuetify.registerPage.passwordLength')
];

const confirmPasswordRules = [
  v => !!v || t('$vuetify.general.required'),
  v => v === password.value || t('$vuetify.registerPage.passwordMismatch')
];

const registerUser = async () => {
  error.value = '';
  loading.value = true;

  try {
    await store.register(username.value, password.value, email.value);
    toast.success(t('$vuetify.registerPage.success'));

    // Auto login after successful registration
    const loginSuccess = await store.checkLogin(username.value, password.value);

    if (loginSuccess) {
      router.push({ name: 'Home' });
    } else {
      router.push({ name: 'Login' });
    }
  } catch (err) {
    if (err.response?.status === 409) {
      error.value = t('$vuetify.registerPage.usernameExists');
    } else {
      error.value = t('$vuetify.registerPage.error');
    }
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
  display: flex;
  align-items: center;
}
</style>
