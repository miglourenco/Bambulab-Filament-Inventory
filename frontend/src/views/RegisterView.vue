<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card elevation="8" rounded="lg">
          <v-card-title class="text-h5 text-center pa-6 bg-primary">
            <v-icon size="large" class="mr-2" color="white">mdi-account-plus</v-icon>
            <span class="text-white">Create Account</span>
          </v-card-title>

          <v-card-text class="pa-6">
            <v-form v-model="valid" @submit.prevent="registerUser">
              <v-text-field
                v-model="username"
                label="Username"
                :rules="requiredRules"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                class="mb-2"
              ></v-text-field>

              <v-text-field
                v-model="email"
                label="Email"
                :rules="emailRules"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                type="email"
                class="mb-2"
              ></v-text-field>

              <v-text-field
                v-model="adminKey"
                label="Admin Registration Key"
                :rules="requiredRules"
                prepend-inner-icon="mdi-key-variant"
                :type="showAdminKey ? 'text' : 'password'"
                :append-inner-icon="showAdminKey ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showAdminKey = !showAdminKey"
                variant="outlined"
                hint="Contact administrator for registration key"
                persistent-hint
                class="mb-2"
              ></v-text-field>

              <v-text-field
                v-model="password"
                label="Password"
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
                label="Confirm Password"
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
                Register
              </v-btn>

              <v-divider class="my-4"></v-divider>

              <div class="text-center">
                <span class="text-body-2">Already have an account?</span>
                <v-btn
                  variant="text"
                  color="primary"
                  @click="router.push({ name: 'Login' })"
                  class="ml-1"
                >
                  Login
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

const store = useAppStore();
const router = useRouter();

const username = ref('');
const email = ref('');
const adminKey = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const showAdminKey = ref(false);
const valid = ref(false);
const loading = ref(false);
const error = ref('');

const requiredRules = [
  v => !!v || 'This field is required'
];

const emailRules = [
  v => !!v || 'Email is required',
  v => /.+@.+\..+/.test(v) || 'Email must be valid'
];

const passwordRules = [
  v => !!v || 'Password is required',
  v => v.length >= 6 || 'Password must be at least 6 characters'
];

const confirmPasswordRules = [
  v => !!v || 'Please confirm your password',
  v => v === password.value || 'Passwords do not match'
];

const registerUser = async () => {
  error.value = '';
  loading.value = true;

  try {
    await store.register(username.value, password.value, email.value, adminKey.value);
    toast.success('Registration successful! Logging you in...');

    // Auto login after successful registration
    const loginSuccess = await store.checkLogin(username.value, password.value);

    if (loginSuccess) {
      router.push({ name: 'Home' });
    } else {
      router.push({ name: 'Login' });
    }
  } catch (err) {
    if (err.response?.status === 409) {
      error.value = 'Username already exists';
    } else if (err.response?.status === 403) {
      error.value = 'Invalid admin key';
    } else {
      error.value = 'Registration failed. Please try again.';
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
