<script setup lang="ts">
definePageMeta({
  middleware: [
    async () => {
      const { user, fetchMe } = useAuth();

      if (!user.value) {
        try {
          await fetchMe();
        } catch {
          return navigateTo('/auth/login');
        }
      }

      if (!user.value) {
        return navigateTo('/auth/login');
      }
    },
  ],
});

const { user, logout, updateProfile } = useAuth();
const { enablePushNotifications } = useWebPush();
const router = useRouter();
const toast = useToast();

const isSubscribingPush = ref(false);

// Edit Profile Modal & Form State
const isEditModalOpen = ref(false);
const isSavingProfile = ref(false);
const showNewPassword = ref(false);

const profileForm = ref({
  name: '',
  avatarUrl: '',
  password: '',
});

const sampleAvatars = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Shield',
  'https://api.dicebear.com/7.x/micah/svg?seed=Alex',
];

function openEditModal() {
  profileForm.value = {
    name: user.value?.name || '',
    avatarUrl: user.value?.avatarUrl || '',
    password: '',
  };
  showNewPassword.value = false;
  isEditModalOpen.value = true;
}

function selectPresetAvatar(url: string) {
  profileForm.value.avatarUrl = url;
}

async function handleSaveProfile() {
  if (!profileForm.value.name.trim()) {
    toast.add({
      title: 'Validation Error',
      description: 'Name field cannot be empty.',
      color: 'warning',
      icon: 'i-heroicons-exclamation-circle',
    });
    return;
  }

  if (profileForm.value.password && profileForm.value.password.length < 6) {
    toast.add({
      title: 'Validation Error',
      description: 'Password must be at least 6 characters.',
      color: 'warning',
      icon: 'i-heroicons-exclamation-circle',
    });
    return;
  }

  isSavingProfile.value = true;
  try {
    await updateProfile({
      name: profileForm.value.name.trim(),
      avatarUrl: profileForm.value.avatarUrl.trim() || undefined,
      password: profileForm.value.password.trim() || undefined,
    });

    toast.add({
      title: 'Profile Updated',
      description: 'Your profile information has been saved successfully.',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    });

    isEditModalOpen.value = false;
  } catch (err: any) {
    toast.add({
      title: 'Update Error',
      description: err.message || 'Failed to update profile.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    isSavingProfile.value = false;
  }
}

async function handleEnablePush() {
  isSubscribingPush.value = true;
  try {
    await enablePushNotifications();
    toast.add({
      title: 'Push Notifications Enabled!',
      description: 'You will now receive instant push alerts from site admin on this device.',
      color: 'success',
      icon: 'i-heroicons-bell-alert',
    });
  } catch (err: any) {
    toast.add({
      title: 'Push Notification Error',
      description: err.message || 'Failed to enable push notifications',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    isSubscribingPush.value = false;
  }
}

const formattedDate = computed(() => {
  if (!user.value?.createdAt) return 'Recently';
  return new Date(user.value.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

async function handleLogout() {
  await logout();
  router.push('/auth/login');
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans relative overflow-hidden">
    <!-- Ambient Background Lighting -->
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-primary-600/15 rounded-full blur-3xl pointer-events-none" />
    <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

    <!-- Navbar -->
    <header class="border-b border-gray-800/80 bg-gray-900/60 backdrop-blur-md sticky top-0 z-30">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="flex items-center gap-2 text-lg font-bold text-white tracking-tight hover:opacity-90 transition-opacity">
            <span class="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-500 to-indigo-500 flex items-center justify-center text-white text-sm shadow-md shadow-primary-500/20">
              U
            </span>
            <span>User Portal</span>
          </NuxtLink>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="text-xs text-gray-400 hover:text-gray-200 transition-colors hidden sm:inline-block">
            ← Home
          </NuxtLink>
          <UButton
            to="/user/profile"
            color="primary"
            variant="soft"
            size="sm"
            icon="i-heroicons-pencil-square"
          >
            Edit Profile
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-arrow-right-on-rectangle"
            @click="handleLogout"
          >
            Sign Out
          </UButton>
        </div>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 relative z-10">
      <!-- Welcome Hero Banner -->
      <div class="relative bg-gradient-to-r from-gray-900 via-gray-900/90 to-primary-950/40 border border-gray-800 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <!-- Avatar -->
            <NuxtLink to="/user/profile" class="relative cursor-pointer group" title="Click to view & update profile">
              <img
                v-if="user?.avatarUrl"
                :src="user.avatarUrl"
                :alt="user.name || 'User Avatar'"
                class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-primary-500/40 shadow-lg group-hover:ring-primary-400 transition-all"
              />
              <div
                v-else
                class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center text-2xl font-bold text-white shadow-lg ring-2 ring-primary-500/40 group-hover:ring-primary-400 transition-all"
              >
                {{ user?.name ? user.name.charAt(0).toUpperCase() : 'U' }}
              </div>
              <span class="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-gray-900 rounded-full" title="Active Session" />
            </NuxtLink>

            <!-- User Info Greeting -->
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Welcome, {{ user?.name || 'User' }}!
                </h1>
                <span class="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  {{ user?.role || 'user' }}
                </span>
              </div>
              <p class="text-xs sm:text-sm text-gray-400">
                {{ user?.email }}
              </p>
            </div>
          </div>

          <!-- Quick Actions & Status -->
          <div class="flex items-center gap-3">
            <UButton
              to="/user/profile"
              color="primary"
              variant="solid"
              size="sm"
              icon="i-heroicons-pencil-square"
              class="shadow-md shadow-primary-500/20"
            >
              Update Profile
            </UButton>
            <div class="flex items-center gap-2 text-xs bg-gray-950/60 border border-gray-800/80 px-4 py-2 rounded-xl">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span class="text-gray-400">Status:</span>
              <span class="font-semibold text-emerald-400 capitalize">{{ user?.status || 'active' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Dashboard Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Profile Details Card -->
        <div class="md:col-span-2 bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div class="flex items-center justify-between border-b border-gray-800 pb-4">
            <h2 class="text-base font-semibold text-white flex items-center gap-2">
              <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-primary-400" />
              User Profile Overview
            </h2>
            <UButton
              to="/user/profile"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-pencil-square"
            >
              Edit Details
            </UButton>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div class="bg-gray-950/50 border border-gray-800/60 p-4 rounded-xl space-y-1">
              <span class="text-gray-500 font-medium">Full Name</span>
              <p class="text-sm font-semibold text-gray-200">{{ user?.name || 'Not provided' }}</p>
            </div>

            <div class="bg-gray-950/50 border border-gray-800/60 p-4 rounded-xl space-y-1">
              <span class="text-gray-500 font-medium">Email Address</span>
              <p class="text-sm font-semibold text-gray-200 truncate">{{ user?.email || 'N/A' }}</p>
            </div>

            <div class="bg-gray-950/50 border border-gray-800/60 p-4 rounded-xl space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-gray-500 font-medium">Account Role</span>
                <span class="text-[10px] text-amber-400 font-mono">Managed by Super Admin</span>
              </div>
              <p class="text-sm font-semibold text-primary-400 capitalize">{{ user?.role || 'user' }}</p>
            </div>

            <div class="bg-gray-950/50 border border-gray-800/60 p-4 rounded-xl space-y-1">
              <span class="text-gray-500 font-medium">Member Since</span>
              <p class="text-sm font-semibold text-gray-200">{{ formattedDate }}</p>
            </div>
          </div>

          <!-- Feature Highlights / Info Box -->
          <div class="bg-primary-950/30 border border-primary-800/40 rounded-xl p-4 text-xs text-primary-200 space-y-2">
            <div class="flex items-center gap-2 font-semibold text-primary-300">
              <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
              Authenticated User Access & Security Notice
            </div>
            <p class="text-gray-400 leading-relaxed">
              You are currently logged in with <span class="text-primary-300 font-semibold uppercase">{{ user?.role || 'user' }}</span> privileges. Regular profile updates allow you to change your name, avatar, and password. Account role mutations are strictly blocked on backend and restricted to Super Admin.
            </p>
          </div>
        </div>

        <!-- Sidebar / Actions Card -->
        <div class="space-y-6">
          <div class="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 class="text-base font-semibold text-white flex items-center gap-2">
              <UIcon name="i-heroicons-squares-2x2" class="w-5 h-5 text-indigo-400" />
              Navigation & Actions
            </h2>

            <div class="space-y-2 text-xs">
              <NuxtLink
                to="/user/profile"
                class="w-full flex items-center justify-between p-3 rounded-xl bg-primary-500/10 border border-primary-500/30 hover:bg-primary-500/20 text-primary-300 transition-all group"
              >
                <div class="flex items-center gap-2.5">
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 text-primary-400 group-hover:scale-110 transition-transform" />
                  <span class="font-medium">Update My Profile & Security</span>
                </div>
                <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-primary-400" />
              </NuxtLink>


              <NuxtLink
                to="/"
                class="flex items-center justify-between p-3 rounded-xl bg-gray-950/50 border border-gray-800/60 hover:border-gray-700 hover:bg-gray-800/50 text-gray-300 hover:text-white transition-all group"
              >
                <div class="flex items-center gap-2.5">
                  <UIcon name="i-heroicons-home" class="w-4 h-4 text-gray-400 group-hover:text-primary-400 transition-colors" />
                  <span>Explore Home Page</span>
                </div>
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-600 group-hover:text-gray-300" />
              </NuxtLink>

              <NuxtLink
                to="/pricing"
                class="flex items-center justify-between p-3 rounded-xl bg-gray-950/50 border border-gray-800/60 hover:border-gray-700 hover:bg-gray-800/50 text-gray-300 hover:text-white transition-all group"
              >
                <div class="flex items-center gap-2.5">
                  <UIcon name="i-heroicons-currency-dollar" class="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                  <span>View Pricing & Plans</span>
                </div>
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-600 group-hover:text-gray-300" />
              </NuxtLink>

              <button
                type="button"
                @click="handleEnablePush"
                class="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 transition-all group"
              >
                <div class="flex items-center gap-2.5">
                  <UIcon name="i-heroicons-bell-alert" class="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span class="font-medium">Enable Web Push Notifications</span>
                </div>
                <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Edit Profile Modal -->
    <UModal v-model:open="isEditModalOpen" title="Update Profile">
      <template #content>
        <div class="p-6 space-y-5">
          <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <UIcon name="i-heroicons-pencil-square" class="w-5 h-5 text-primary-500" />
                Update Profile Settings
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Update your account name, avatar URL, and security password.
              </p>
            </div>
          </div>

          <!-- Account Role Warning / Info Pill -->
          <div class="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs">
            <UIcon name="i-heroicons-shield-exclamation" class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p class="font-bold text-amber-600 dark:text-amber-400">Role Security Protection</p>
              <p class="text-gray-600 dark:text-gray-300 mt-0.5">
                Your role is currently set to <span class="font-bold text-primary-400 uppercase font-mono">{{ user?.role || 'user' }}</span>.
                Account roles are managed exclusively by Super Admin and cannot be self-updated.
              </p>
            </div>
          </div>

          <form @submit.prevent="handleSaveProfile" class="space-y-4 text-xs">
            <!-- Full Name -->
            <UFormField label="Full Name" size="sm" required>
              <UInput
                v-model="profileForm.name"
                placeholder="Enter your full name"
                icon="i-heroicons-user"
                class="w-full"
              />
            </UFormField>

            <!-- Email Address (Read-only) -->
            <UFormField label="Email Address (Read-only)" help="Contact Super Admin to modify your login email." size="sm">
              <UInput
                :model-value="user?.email || ''"
                disabled
                icon="i-heroicons-envelope"
                class="w-full opacity-70 cursor-not-allowed"
              />
            </UFormField>

            <!-- Role (Read-only) -->
            <UFormField label="Account Role (Read-only)" help="Configured by Super Admin" size="sm">
              <div class="relative w-full">
                <UInput
                  :model-value="user?.role ? user.role.toUpperCase() : 'USER'"
                  disabled
                  icon="i-heroicons-shield-check"
                  class="w-full opacity-70 cursor-not-allowed font-mono font-bold"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded font-mono font-semibold">
                  Locked
                </span>
              </div>
            </UFormField>

            <!-- Avatar URL & Live Preview -->
            <UFormField label="Avatar Image URL" size="sm">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      v-if="profileForm.avatarUrl"
                      :src="profileForm.avatarUrl"
                      alt="Avatar Preview"
                      class="w-full h-full object-cover"
                    />
                    <UIcon v-else name="i-heroicons-user" class="w-6 h-6 text-gray-500" />
                  </div>
                  <UInput
                    v-model="profileForm.avatarUrl"
                    placeholder="https://example.com/avatar.jpg"
                    icon="i-heroicons-photo"
                    class="w-full"
                  />
                </div>

                <!-- Avatar Presets -->
                <div>
                  <span class="text-[11px] text-gray-400 font-medium block mb-1.5">Or choose a preset avatar:</span>
                  <div class="flex items-center gap-2">
                    <button
                      v-for="(preset, idx) in sampleAvatars"
                      :key="idx"
                      type="button"
                      @click="selectPresetAvatar(preset)"
                      class="w-8 h-8 rounded-lg border border-gray-700 hover:border-primary-500 overflow-hidden transition-all transform hover:scale-105"
                      :class="profileForm.avatarUrl === preset ? 'ring-2 ring-primary-500 border-primary-500' : ''"
                    >
                      <img :src="preset" class="w-full h-full object-cover" />
                    </button>
                    <button
                      type="button"
                      @click="profileForm.avatarUrl = ''"
                      class="px-2 py-1 text-[10px] text-gray-400 hover:text-white border border-gray-800 rounded-lg hover:bg-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </UFormField>

            <!-- New Password -->
            <UFormField label="New Password (Leave blank to keep current)" size="sm">
              <div class="relative w-full">
                <UInput
                  v-model="profileForm.password"
                  :type="showNewPassword ? 'text' : 'password'"
                  placeholder="Enter new password (min. 6 chars)"
                  icon="i-heroicons-key"
                  class="w-full"
                />
                <button
                  type="button"
                  @click="showNewPassword = !showNewPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <UIcon :name="showNewPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" />
                </button>
              </div>
            </UFormField>

            <!-- Modal Action Buttons -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                @click="isEditModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                color="primary"
                size="sm"
                :loading="isSavingProfile"
                icon="i-heroicons-check-circle"
              >
                Save Changes
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Footer -->
    <footer class="border-t border-gray-800/60 py-6 text-center text-xs text-gray-500">
      <p>© 2026 User Portal. All rights reserved.</p>
    </footer>
  </div>
</template>

