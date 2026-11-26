<script setup lang="ts">
import type { SiteSettings } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

interface SiteSettingsForm {
  id?: string;
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  siteLogoUrl: string;
  siteFaviconUrl: string;
  supportEmail: string;
  telegramToken: string;
  telegramGroupId: string;
  telegramEnabled: boolean;
  resendApiKey: string;
  mailFrom: string;
  mailFromName: string;
  resendEnabled: boolean;
  notificationToken: string;
  vapidPublicKey: string;
  googleClientId: string;
  googleClientSecret: string;
  googleAuthEnabled: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  googleAnalyticsId: string;
}

const { $api } = useApi();
const { data: initialSettings, status, refresh: fetchSettings } = await useApiData<Partial<SiteSettings>>(
  'admin-site-settings',
  '/api/settings'
);

const settings = ref<SiteSettingsForm>({
  siteName: 'My Site',
  siteDescription: '',
  siteUrl: '',
  siteLogoUrl: '',
  siteFaviconUrl: '',
  supportEmail: '',
  telegramToken: '',
  telegramGroupId: '',
  telegramEnabled: false,
  resendApiKey: '',
  mailFrom: '',
  mailFromName: 'System Notification',
  resendEnabled: false,
  notificationToken: '',
  vapidPublicKey: '',
  googleClientId: '',
  googleClientSecret: '',
  googleAuthEnabled: false,
  allowRegistration: true,
  requireEmailVerification: false,
  maintenanceMode: false,
  maintenanceMessage: 'We are currently under scheduled maintenance. Please check back soon.',
  googleAnalyticsId: '',
});

/**
 * Reusable helper to map & sanitize Partial<SiteSettings> API payload into non-null SiteSettingsForm
 */
function mapToSettingsForm(data?: Partial<SiteSettings> | null): SiteSettingsForm {
  if (!data) return settings.value;
  return {
    id: data.id || settings.value.id,
    siteName: data.siteName || 'My Site',
    siteDescription: data.siteDescription || '',
    siteUrl: data.siteUrl || '',
    siteLogoUrl: data.siteLogoUrl || '',
    siteFaviconUrl: data.siteFaviconUrl || '',
    supportEmail: data.supportEmail || '',
    telegramToken: data.telegramToken || '',
    telegramGroupId: data.telegramGroupId || '',
    telegramEnabled: Boolean(data.telegramEnabled),
    resendApiKey: data.resendApiKey || '',
    mailFrom: data.mailFrom || '',
    mailFromName: data.mailFromName || 'System Notification',
    resendEnabled: Boolean(data.resendEnabled),
    notificationToken: data.notificationToken || '',
    vapidPublicKey: data.vapidPublicKey || '',
    googleClientId: data.googleClientId || '',
    googleClientSecret: data.googleClientSecret || '',
    googleAuthEnabled: Boolean(data.googleAuthEnabled),
    allowRegistration: data.allowRegistration ?? true,
    requireEmailVerification: Boolean(data.requireEmailVerification),
    maintenanceMode: Boolean(data.maintenanceMode),
    maintenanceMessage: data.maintenanceMessage || 'We are currently under scheduled maintenance. Please check back soon.',
    googleAnalyticsId: data.googleAnalyticsId || '',
  };
}

watchEffect(() => {
  if (initialSettings.value) {
    settings.value = mapToSettingsForm(initialSettings.value);
  }
});

const isLoading = computed(() => status.value === 'pending');
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// Password Mask Toggles
const showTelegramToken = ref(false);
const showResendKey = ref(false);
const showGoogleSecret = ref(false);
const showNotificationToken = ref(false);

// Test Telegram Modal State
const isTestTelegramModalOpen = ref(false);
const isTestingTelegram = ref(false);
const testTelegramMsg = ref('🔔 Test notification from Super Admin Settings');

// Test Email Modal State
const isTestEmailModalOpen = ref(false);
const isTestingEmail = ref(false);
const testEmailTo = ref('');
const testEmailSubject = ref('Test Email from Super Admin Settings');
const testEmailMessage = ref('<p>This is a test email sent from Resend integration!</p>');

// Test Push Broadcast Modal State
const isTestPushModalOpen = ref(false);
const isBroadcastingPush = ref(false);
const testPushTitle = ref('📢 System Alert Update');
const testPushMessage = ref('Hello Viewer! A new update has been published on our platform.');
const testPushUrl = ref('/');

const toast = useToast();

async function handleBroadcastPush() {
  isBroadcastingPush.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const res = await $api<{ message: string }>('/api/push/broadcast', {
      method: 'POST',
      body: {
        title: testPushTitle.value,
        message: testPushMessage.value,
        url: testPushUrl.value,
      },
    });
    const msg = res.message || 'Push notification broadcast sent successfully!';
    successMessage.value = msg;
    toast.add({
      title: 'Push Broadcast Sent',
      description: msg,
      color: 'success',
      icon: 'i-heroicons-megaphone',
    });
    isTestPushModalOpen.value = false;
  } catch (err: any) {
    const msg = err.message || 'Push broadcast failed.';
    errorMessage.value = msg;
    toast.add({
      title: 'Push Broadcast Failed',
      description: msg,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    isBroadcastingPush.value = false;
  }
}

async function handleSaveSettings() {
  isSaving.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const updated = await $api<Partial<SiteSettings>>('/api/settings', {
      method: 'PUT',
      body: settings.value,
    });
    if (updated) {
      settings.value = mapToSettingsForm(updated);
    }
    const msg = 'Site settings updated successfully!';
    successMessage.value = msg;
    toast.add({
      title: 'Settings Saved',
      description: msg,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    });
  } catch (err: any) {
    const msg = err.message || 'Failed to save site settings.';
    errorMessage.value = msg;
    toast.add({
      title: 'Save Error',
      description: msg,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    isSaving.value = false;
  }
}

async function handleTestTelegram() {
  isTestingTelegram.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const res = await $api<{ message: string }>('/api/settings/test-telegram', {
      method: 'POST',
      body: {
        message: testTelegramMsg.value,
        telegramToken: settings.value.telegramToken,
        telegramGroupId: settings.value.telegramGroupId,
      },
    });
    const msg = res.message || 'Telegram test message sent successfully!';
    successMessage.value = msg;
    toast.add({
      title: 'Telegram Sent',
      description: msg,
      color: 'success',
      icon: 'i-heroicons-paper-airplane',
    });
    isTestTelegramModalOpen.value = false;
  } catch (err: any) {
    const msg = err.message || 'Telegram test message failed.';
    errorMessage.value = msg;
    toast.add({
      title: 'Telegram Failed',
      description: msg,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    isTestingTelegram.value = false;
  }
}

async function handleTestEmail() {
  if (!testEmailTo.value) {
    const msg = 'Recipient email address is required.';
    errorMessage.value = msg;
    toast.add({
      title: 'Validation Error',
      description: msg,
      color: 'warning',
      icon: 'i-heroicons-exclamation-circle',
    });
    return;
  }

  isTestingEmail.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const res = await $api<{ message: string }>('/api/settings/test-email', {
      method: 'POST',
      body: {
        to: testEmailTo.value,
        subject: testEmailSubject.value,
        message: testEmailMessage.value,
        resendApiKey: settings.value.resendApiKey,
        mailFrom: settings.value.mailFrom,
        mailFromName: settings.value.mailFromName,
      },
    });
    const msg = res.message || 'Test email sent successfully via Resend!';
    successMessage.value = msg;
    toast.add({
      title: 'Email Sent',
      description: msg,
      color: 'success',
      icon: 'i-heroicons-envelope',
    });
    isTestEmailModalOpen.value = false;
  } catch (err: any) {
    const msg = err.message || 'Failed to send test email.';
    errorMessage.value = msg;
    toast.add({
      title: 'Email Failed',
      description: msg,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    isTestingEmail.value = false;
  }
}


</script>

<template>
  <div class="space-y-6 text-gray-900 dark:text-gray-100 font-sans">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight">System Configuration & Integrations</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Manage platform branding, Telegram alerts, Resend email gateway, and maintenance controls.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-path" color="neutral" variant="outline" size="sm" :loading="isLoading"
          @click="fetchSettings()">
          Reload
        </UButton>

        <UButton icon="i-heroicons-check" color="primary" size="sm" :loading="isSaving" class="font-medium shadow-sm"
          @click="handleSaveSettings">
          Save All Settings
        </UButton>
      </div>
    </div>
    <!-- Maintenance Banner Alert (if active) -->
    <div v-if="settings.maintenanceMode"
      class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 text-xs">
        <UIcon name="i-heroicons-wrench-screwdriver" class="w-6 h-6 shrink-0" />
        <div>
          <p class="font-bold text-sm">System Maintenance Mode is Currently Enabled</p>
          <p class="text-amber-600 dark:text-amber-400">{{ settings.maintenanceMessage }}</p>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="p-12 text-center text-gray-400 space-y-3">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
      <p class="text-sm">Loading site configuration from D1...</p>
    </div>

    <!-- Settings Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 1. General & Branding -->
      <div
        class="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-4">
        <div class="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
          <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-primary-500" />
          <h2 class="text-lg font-bold">General & Branding</h2>
        </div>

        <div class="space-y-4">
          <UFormField label="Application Name" size="sm">
            <UInput v-model="settings.siteName" placeholder="My SaaS Platform" icon="i-heroicons-building-office"
              class="w-full" />
          </UFormField>

          <UFormField label="Site Description" size="sm">
            <UInput v-model="settings.siteDescription" placeholder="Production-ready fullstack app..."
              icon="i-heroicons-document-text" class="w-full" />
          </UFormField>

          <UFormField label="Production Site URL" size="sm">
            <UInput v-model="settings.siteUrl" placeholder="https://example.com" icon="i-heroicons-link"
              class="w-full" />
          </UFormField>

          <UFormField label="Support Email" size="sm">
            <UInput v-model="settings.supportEmail" type="email" placeholder="support@example.com"
              icon="i-heroicons-envelope" class="w-full" />
          </UFormField>
        </div>
      </div>

      <!-- 2. Security & Auth Options -->
      <div
        class="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-4">
        <div class="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
          <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-emerald-500" />
          <h2 class="text-lg font-bold">Security & Auth Access</h2>
        </div>

        <div class="space-y-5 pt-1">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-sm">Allow Public Registration</p>
              <p class="text-xs text-gray-500">Enable or disable new user signups on the frontend.</p>
            </div>
            <UCheckbox v-model="settings.allowRegistration" />
          </div>

          <div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 pt-4">
            <div>
              <p class="font-semibold text-sm">Require Email Verification</p>
              <p class="text-xs text-gray-500">Mandate users to verify email before granting access.</p>
            </div>
            <UCheckbox v-model="settings.requireEmailVerification" />
          </div>

          <div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 pt-4">
            <div>
              <p class="font-semibold text-sm text-amber-600 dark:text-amber-400">Enable Maintenance Mode</p>
              <p class="text-xs text-gray-500">Restrict user access with a scheduled maintenance banner.</p>
            </div>
            <UCheckbox v-model="settings.maintenanceMode" />
          </div>

          <UFormField v-if="settings.maintenanceMode" label="Maintenance Notice Message" size="sm">
            <UInput v-model="settings.maintenanceMessage" placeholder="Under scheduled maintenance..." class="w-full" />
          </UFormField>
        </div>
      </div>

      <!-- 3. Telegram Integration -->
      <div
        class="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-paper-airplane" class="w-5 h-5 text-sky-500" />
            <h2 class="text-lg font-bold">Telegram Integration</h2>
          </div>

          <div class="flex items-center gap-2 text-xs">
            <span class="text-gray-500">Status:</span>
            <UBadge :color="settings.telegramEnabled ? 'success' : 'neutral'" variant="soft">
              {{ settings.telegramEnabled ? 'Active' : 'Disabled' }}
            </UBadge>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between bg-sky-500/10 p-3 rounded-lg border border-sky-500/20 text-xs">
            <span class="text-sky-600 dark:text-sky-400 font-medium">Enable Telegram Alerts</span>
            <UCheckbox v-model="settings.telegramEnabled" />
          </div>

          <UFormField label="Telegram Bot Token" size="sm">
            <div class="relative w-full">
              <UInput v-model="settings.telegramToken" :type="showTelegramToken ? 'text' : 'password'"
                placeholder="123456789:ABCDefgh..." icon="i-heroicons-key" class="w-full" />
              <button type="button" @click="showTelegramToken = !showTelegramToken"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <UIcon :name="showTelegramToken ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" />
              </button>
            </div>
          </UFormField>

          <UFormField label="Telegram Group Chat ID" size="sm">
            <UInput v-model="settings.telegramGroupId" placeholder="-100123456789"
              icon="i-heroicons-chat-bubble-left-right" class="w-full" />
          </UFormField>

          <div class="pt-2">
            <UButton color="neutral" variant="outline" size="xs" block icon="i-heroicons-paper-airplane"
              @click="isTestTelegramModalOpen = true">
              Test Telegram Notification
            </UButton>
          </div>
        </div>
      </div>

      <!-- 4. Resend Mail Integration -->
      <div
        class="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-envelope" class="w-5 h-5 text-purple-500" />
            <h2 class="text-lg font-bold">Resend Mail Integration</h2>
          </div>

          <div class="flex items-center gap-2 text-xs">
            <span class="text-gray-500">Status:</span>
            <UBadge :color="settings.resendEnabled ? 'success' : 'neutral'" variant="soft">
              {{ settings.resendEnabled ? 'Active' : 'Disabled' }}
            </UBadge>
          </div>
        </div>

        <div class="space-y-4">
          <div
            class="flex items-center justify-between bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 text-xs">
            <span class="text-purple-600 dark:text-purple-400 font-medium">Enable Resend Email Gateway</span>
            <UCheckbox v-model="settings.resendEnabled" />
          </div>

          <UFormField label="Resend API Secret Key" size="sm">
            <div class="relative w-full">
              <UInput v-model="settings.resendApiKey" :type="showResendKey ? 'text' : 'password'"
                placeholder="re_123456789..." icon="i-heroicons-key" class="w-full" />
              <button type="button" @click="showResendKey = !showResendKey"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <UIcon :name="showResendKey ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" />
              </button>
            </div>
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Sender Email (From)" size="sm">
              <UInput v-model="settings.mailFrom" placeholder="noreply@domain.com" class="w-full" />
            </UFormField>

            <UFormField label="Sender Name" size="sm">
              <UInput v-model="settings.mailFromName" placeholder="System" class="w-full" />
            </UFormField>
          </div>

          <div class="pt-2">
            <UButton color="neutral" variant="outline" size="xs" block icon="i-heroicons-paper-airplane"
              @click="isTestEmailModalOpen = true">
              Test Resend Email Gateway
            </UButton>
          </div>
        </div>
      </div>

      <!-- 5. Google OAuth Integration -->
      <div
        class="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <h2 class="text-lg font-bold">Google OAuth Single Sign-On</h2>
          </div>

          <div class="flex items-center gap-2 text-xs">
            <span class="text-gray-500">Status:</span>
            <UBadge :color="settings.googleAuthEnabled ? 'success' : 'neutral'" variant="soft">
              {{ settings.googleAuthEnabled ? 'Active' : 'Disabled' }}
            </UBadge>
          </div>
        </div>

        <div class="space-y-4">
          <div
            class="flex items-center justify-between bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 text-xs">
            <span class="text-blue-600 dark:text-blue-400 font-medium">Enable Google Login for Admin</span>
            <UCheckbox v-model="settings.googleAuthEnabled" />
          </div>

          <UFormField label="Google OAuth Client ID" size="sm">
            <UInput v-model="settings.googleClientId" placeholder="123456789-abc.apps.googleusercontent.com"
              icon="i-heroicons-key" class="w-full" />
          </UFormField>

          <UFormField label="Google OAuth Client Secret" size="sm">
            <div class="relative w-full">
              <UInput v-model="settings.googleClientSecret" :type="showGoogleSecret ? 'text' : 'password'"
                placeholder="GOCSPX-••••••••••••" icon="i-heroicons-lock-closed" class="w-full" />
              <button type="button" @click="showGoogleSecret = !showGoogleSecret"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <UIcon :name="showGoogleSecret ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" />
              </button>
            </div>
          </UFormField>
        </div>
      </div>

      <!-- 6. Notification Secret Key & Push VAPID -->
      <div
        class="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-bell-alert" class="w-5 h-5 text-amber-500" />
            <h2 class="text-lg font-bold">Notification Keys & Web Push</h2>
          </div>
          <UBadge color="neutral" variant="soft" size="xs">Security Token</UBadge>
        </div>

        <div class="space-y-4">
          <UFormField label="Web Push VAPID Public Key" help="Paste your generated VAPID Public Key here (e.g. BDCPLSU...)" size="sm">
            <UInput v-model="settings.vapidPublicKey" placeholder="BDCPLSUUSYyZzI40AKPS8MC68Aq3EFbRqnAw5..."
              icon="i-heroicons-qr-code" class="w-full font-mono text-xs" />
          </UFormField>

          <UFormField label="Notification Secret Key / Access Token" help="Custom secret API token to protect server webhook endpoints" size="sm">
            <div class="relative w-full">
              <UInput v-model="settings.notificationToken" :type="showNotificationToken ? 'text' : 'password'"
                placeholder="ntf_sec_key_123456789..." icon="i-heroicons-key" class="w-full font-mono text-xs" />
              <button type="button" @click="showNotificationToken = !showNotificationToken"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <UIcon :name="showNotificationToken ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" />
              </button>
            </div>
          </UFormField>

          <div class="pt-2">
            <UButton color="amber" variant="soft" size="xs" block icon="i-heroicons-megaphone"
              @click="isTestPushModalOpen = true">
              Broadcast Push Notification to Viewers / App Users
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Test Telegram Modal -->
    <UModal v-model:open="isTestTelegramModalOpen" title="Send Test Telegram Notification">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">Test Telegram Message</h3>
          <p class="text-xs text-gray-500">Sends a test alert message to configured Telegram Group ID.</p>

          <UFormField label="Test Message Content" size="sm">
            <UInput v-model="testTelegramMsg" placeholder="Enter message text..." class="w-full" />
          </UFormField>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton color="neutral" variant="ghost" size="sm" @click="isTestTelegramModalOpen = false">
              Cancel
            </UButton>
            <UButton color="primary" size="sm" :loading="isTestingTelegram" icon="i-heroicons-paper-airplane"
              @click="handleTestTelegram">
              Send Alert
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Test Email Modal -->
    <UModal v-model:open="isTestEmailModalOpen" title="Send Test Email via Resend">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">Test Resend Email Gateway</h3>

          <UFormField label="Recipient Email Address" size="sm">
            <UInput v-model="testEmailTo" type="email" placeholder="your_email@example.com" icon="i-heroicons-envelope"
              class="w-full" />
          </UFormField>

          <UFormField label="Email Subject" size="sm">
            <UInput v-model="testEmailSubject" placeholder="Subject line..." class="w-full" />
          </UFormField>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton color="neutral" variant="ghost" size="sm" @click="isTestEmailModalOpen = false">
              Cancel
            </UButton>
            <UButton color="primary" size="sm" :loading="isTestingEmail" icon="i-heroicons-paper-airplane"
              @click="handleTestEmail">
              Send Test Email
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Test Web Push Broadcast Modal -->
    <UModal v-model:open="isTestPushModalOpen" title="Broadcast Web Push Notification">
      <template #content>
        <div class="p-6 space-y-4">
          <div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">Broadcast Web Push Alert</h3>
            <p class="text-xs text-gray-500 mt-1">
              Sends an alert notification to all users/viewers who have enabled notifications or added your website to their Home Screen.
            </p>
          </div>

          <UFormField label="Notification Title" size="sm">
            <UInput v-model="testPushTitle" placeholder="📢 System Update" class="w-full" />
          </UFormField>

          <UFormField label="Notification Message Body" size="sm">
            <UInput v-model="testPushMessage" placeholder="Hello Viewer! A new update is available..." class="w-full" />
          </UFormField>

          <UFormField label="Target Destination URL" size="sm">
            <UInput v-model="testPushUrl" placeholder="/" class="w-full font-mono text-xs" />
          </UFormField>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton color="neutral" variant="ghost" size="sm" @click="isTestPushModalOpen = false">
              Cancel
            </UButton>
            <UButton color="warning" size="sm" :loading="isBroadcastingPush" icon="i-heroicons-megaphone"
              @click="handleBroadcastPush">
              Send Broadcast Push
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
