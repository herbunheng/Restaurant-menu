<script setup lang="ts">
import pkg from '../../../package.json';

definePageMeta({
  layout: false,
});

const { login, loginWithGoogle, isLoading } = useAuth();
const toast = useToast();
const router = useRouter();
const config = useRuntimeConfig();
const { $api } = useApi();
const { publicConfig, fetchPublicConfig } = usePublicConfig();

const email = ref('');
const password = ref('');
const rememberMe = ref(true);
const showPassword = ref(false);
const isGoogleLoading = ref(false);

const errorMessage = ref('');
const successMessage = ref('');

// Computed appName with fallback from decrypted backend siteSettings -> runtimeConfig -> package.json
const appName = computed(() => publicConfig.value?.siteName || (config.public as any).siteName || (config.public as any).appName || pkg.appName || 'Restaurant Menu');

// Dynamically load Google Identity Services SDK (GIS) and fetch public settings
onMounted(async () => {
  await fetchPublicConfig();

  if (import.meta.client && !(window as any).google?.accounts) {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
});

async function handleLogin() {
  toast.clear();
  errorMessage.value = '';
  successMessage.value = '';

  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter both your admin email and password.';
    toast.add({
      title: 'Validation Error',
      description: errorMessage.value,
      color: 'warning',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  try {
    const res = await login(email.value, password.value);
    const targetRoute = (res.user.role === 'super_admin' || res.user.role === 'admin') ? '/admin' : '/user';
    const msg = `Welcome back, ${res.user.name || 'User'}! Redirecting...`;
    successMessage.value = msg;
    toast.add({
      title: 'Authentication Successful',
      description: msg,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    });
    setTimeout(() => {
      navigateTo(targetRoute);
    }, 500);
  } catch (err: any) {
    errorMessage.value = err.message || 'Invalid credentials or connection error.';
    toast.add({
      title: 'Authentication Failed',
      description: errorMessage.value,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  }
}

async function handleGoogleLogin() {
  toast.clear();
  isGoogleLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  // Get Google Client ID dynamically from encrypted backend public API config
  const { fetchPublicConfig } = usePublicConfig();
  const publicConfig = await fetchPublicConfig();
  let googleClientId = publicConfig?.googleClientId || (config.public.googleClientId as string) || '';

  if (!googleClientId) {
    isGoogleLoading.value = false;
    const msg = 'Google Client ID is missing. Please configure Google OAuth Client ID in Super Admin Settings.';
    errorMessage.value = msg;
    toast.add({
      title: 'Google Client ID Required',
      description: msg,
      color: 'warning',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  // 1. Trigger official Google OAuth2 Sign-In Popup window
  if (import.meta.client && (window as any).google?.accounts?.oauth2) {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.access_token) {
            try {
              const res = await loginWithGoogle({ accessToken: tokenResponse.access_token });
              const targetRoute = (res.user.role === 'super_admin' || res.user.role === 'admin') ? '/admin' : '/user';
              const roleText = res.user.role === 'super_admin' ? 'Super Admin' : 'User';
              const msg = `Welcome back, ${res.user.name || 'User'}! Logged in via Google as ${roleText}.`;
              successMessage.value = msg;
              toast.add({
                title: 'Google Login Successful',
                description: msg,
                color: 'success',
                icon: 'i-heroicons-check-circle',
              });
              setTimeout(() => {
                navigateTo(targetRoute);
              }, 500);
            } catch (err: any) {
              errorMessage.value = err.message || 'Google authentication failed.';
            } finally {
              isGoogleLoading.value = false;
            }
          } else {
            isGoogleLoading.value = false;
          }
        },
        error_callback: () => {
          isGoogleLoading.value = false;
          errorMessage.value = 'Google Login popup was closed or cancelled.';
        },
      });

      client.requestAccessToken();
      return;
    } catch (err: any) {
      console.error('Failed to initialize Google token client:', err);
    }
  }

  isGoogleLoading.value = false;
}

</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 p-4 relative overflow-hidden font-sans">
    <!-- Ambient Background Glows -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

    <div class="w-full max-w-md space-y-6 relative z-10">
      <!-- Header Branding -->
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-extrabold tracking-tight text-white">{{ appName }} </h1>
        <p class="text-xs text-gray-400">Restricted Access. Please authenticate with elevated credentials.</p>
      </div>

      <!-- Main Login Card -->
      <div class="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">

        <!-- Google OAuth Quick Button -->
        <div class="space-y-3">
          <UButton block color="neutral" variant="outline" size="lg" :loading="isGoogleLoading"
            @click="handleGoogleLogin"
            class="w-full bg-gray-950/50 border-gray-800 hover:bg-gray-800 text-gray-200 font-medium flex items-center justify-center gap-2">
            <IconsGoogle class="w-5 h-5 shrink-0" />
            Continue with Google
          </UButton>

          <div class="relative flex items-center justify-center py-1">
            <div class="w-full border-t border-gray-800"></div>
            <span class="absolute bg-gray-900 px-3 text-[11px] text-gray-500 uppercase font-mono">Or Credentials</span>
          </div>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <UFormField label="Super Admin Email" size="sm">
            <UInput v-model="email" type="email" placeholder="admin@example.com" icon="i-heroicons-envelope"
              autocomplete="username" class="w-full" />
          </UFormField>

          <UFormField label="Master Password" size="sm">
            <div class="relative w-full">
              <UInput v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••••••"
                icon="i-heroicons-lock-closed" autocomplete="current-password" class="w-full" />
              <button type="button" @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                title="Toggle password visibility">
                <UIcon :name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" />
              </button>
            </div>
          </UFormField>

          <div class="flex items-center justify-between text-xs pt-1">
            <UCheckbox v-model="rememberMe" label="Remember session" />
            <a href="#"
              @click.prevent="errorMessage = 'Please contact your system security administrator to reset root master credentials.'"
              class="text-primary-400 hover:underline">Forgot password?</a>
          </div>

          <UButton type="submit" color="primary" size="lg" block :loading="isLoading"
            icon="i-heroicons-arrow-right-on-rectangle" class="w-full font-semibold shadow-lg shadow-primary-600/20">
            Authenticate & Access Panel
          </UButton>
        </form>
      </div>

      <!-- Footer Info -->
      <div class="text-center text-xs text-gray-500 space-y-1">
        <p>© 2026 Admin Control Engine. All audit trails logged.</p>
        <NuxtLink to="/" class="hover:underline text-gray-400">← Back to Main Application</NuxtLink>
      </div>
    </div>
  </div>
</template>
