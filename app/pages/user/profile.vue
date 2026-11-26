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
const router = useRouter();
const toast = useToast();

const isSavingProfile = ref(false);
const showNewPassword = ref(false);

const profileForm = ref({
  name: user.value?.name || '',
  avatarUrl: user.value?.avatarUrl || '',
  password: '',
});

// Keep form synced if user state refreshes
watch(
  () => user.value,
  (newUser) => {
    if (newUser) {
      profileForm.value.name = newUser.name || '';
      profileForm.value.avatarUrl = newUser.avatarUrl || '';
    }
  },
  { immediate: true }
);

const sampleAvatars = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Shield',
  'https://api.dicebear.com/7.x/micah/svg?seed=Alex',
];

function selectPresetAvatar(url: string) {
  profileForm.value.avatarUrl = url;
}

async function handleSaveProfile() {
  if (!profileForm.value.name.trim()) {
    toast.add({
      title: 'Validation Error',
      description: 'Full name field cannot be empty.',
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

    profileForm.value.password = '';
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

    <!-- Navigation Header -->
    <header class="border-b border-gray-800/80 bg-gray-900/60 backdrop-blur-md sticky top-0 z-30">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/user"
            class="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors bg-gray-800/60 hover:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700/60"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
            <span>User Portal</span>
          </NuxtLink>
          <span class="text-gray-600">/</span>
          <span class="text-sm font-bold text-white">Update Profile</span>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="text-xs text-gray-400 hover:text-gray-200 transition-colors hidden sm:inline-block">
            Home
          </NuxtLink>
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

    <!-- Main Container -->
    <main class="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 relative z-10">
      <!-- Page Title & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <UIcon name="i-heroicons-pencil-square" class="w-8 h-8 text-primary-400" />
            Update Account Profile
          </h1>
          <p class="text-xs sm:text-sm text-gray-400 mt-1">
            Manage your personal profile details, display avatar, and security login password.
          </p>
        </div>

        <div class="flex items-center gap-2 text-xs bg-gray-900 border border-gray-800 px-3.5 py-2 rounded-xl">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span class="text-gray-400">Role:</span>
          <span class="font-bold text-primary-400 uppercase font-mono">{{ user?.role || 'user' }}</span>
        </div>
      </div>

      <!-- Account Role Protection Alert Banner -->
      <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-4 text-xs">
        <div class="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
          <UIcon name="i-heroicons-shield-exclamation" class="w-6 h-6" />
        </div>
        <div class="space-y-1">
          <h2 class="font-bold text-sm text-amber-400">Account Role Security Policy</h2>
          <p class="text-gray-300 leading-relaxed">
            Your current assigned role is <span class="font-bold text-primary-300 font-mono uppercase">{{ user?.role || 'user' }}</span>. Account roles are strictly managed by Super Admin configuration and cannot be altered via self-service profile updates.
          </p>
        </div>
      </div>

      <!-- Profile Update Form Card -->
      <div class="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <form @submit.prevent="handleSaveProfile" class="space-y-6 text-xs">
          <!-- User Avatar & Live Preview Header -->
          <div class="flex flex-col sm:flex-row items-center gap-6 p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl">
            <!-- Avatar Image / Placeholder -->
            <div class="relative group shrink-0">
              <img
                v-if="profileForm.avatarUrl"
                :src="profileForm.avatarUrl"
                alt="Avatar Preview"
                class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-primary-500/50 shadow-xl"
                @error="profileForm.avatarUrl = ''"
              />
              <div
                v-else
                class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl ring-2 ring-primary-500/50"
              >
                {{ profileForm.name ? profileForm.name.charAt(0).toUpperCase() : 'U' }}
              </div>
            </div>

            <div class="space-y-2 text-center sm:text-left flex-1">
              <h2 class="text-base font-bold text-white">{{ profileForm.name || 'User Profile' }}</h2>
              <p class="text-gray-400 text-xs">{{ user?.email }}</p>

              <!-- Preset Avatar Selectors -->
              <div class="pt-1">
                <span class="text-[11px] text-gray-500 font-medium block mb-1.5">Quick Select Avatar Preset:</span>
                <div class="flex items-center justify-center sm:justify-start gap-2">
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
                    class="px-2.5 py-1 text-[10px] text-gray-400 hover:text-white border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Clear Avatar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Form Fields Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <!-- Full Name Input -->
            <UFormField label="Full Name" size="sm" required class="sm:col-span-2">
              <UInput
                v-model="profileForm.name"
                placeholder="Enter your full name"
                icon="i-heroicons-user"
                class="w-full"
              />
            </UFormField>

            <!-- Read-only Email Address -->
            <UFormField label="Email Address (Read-only)" help="Primary authentication email address" size="sm">
              <div class="relative w-full">
                <UInput
                  :model-value="user?.email || ''"
                  disabled
                  icon="i-heroicons-envelope"
                  class="w-full opacity-70 cursor-not-allowed"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
                  Verified
                </span>
              </div>
            </UFormField>

            <!-- Read-only Role -->
            <UFormField label="Account Role (Read-only)" help="Configured by Super Admin" size="sm">
              <div class="relative w-full">
                <UInput
                  :model-value="user?.role ? user.role.toUpperCase() : 'USER'"
                  disabled
                  icon="i-heroicons-shield-check"
                  class="w-full opacity-70 cursor-not-allowed font-mono font-bold text-primary-400"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded font-mono font-semibold">
                  Locked
                </span>
              </div>
            </UFormField>

            <!-- Custom Avatar URL -->
            <UFormField label="Custom Avatar Image URL" size="sm" class="sm:col-span-2">
              <UInput
                v-model="profileForm.avatarUrl"
                placeholder="https://example.com/my-avatar.png"
                icon="i-heroicons-photo"
                class="w-full"
              />
            </UFormField>

            <!-- New Password -->
            <UFormField label="New Password (Leave blank to keep current)" help="Minimum 6 characters" size="sm" class="sm:col-span-2">
              <div class="relative w-full">
                <UInput
                  v-model="profileForm.password"
                  :type="showNewPassword ? 'text' : 'password'"
                  placeholder="Enter new password..."
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
          </div>

          <!-- Submit Buttons -->
          <div class="flex items-center justify-end gap-3 pt-6 border-t border-gray-800">
            <NuxtLink to="/user">
              <UButton color="neutral" variant="ghost" size="sm">
                Cancel
              </UButton>
            </NuxtLink>
            <UButton
              type="submit"
              color="primary"
              size="sm"
              :loading="isSavingProfile"
              icon="i-heroicons-check-circle"
              class="font-semibold shadow-lg shadow-primary-500/20 px-6"
            >
              Save Profile Changes
            </UButton>
          </div>
        </form>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-800/60 py-6 text-center text-xs text-gray-500">
      <p>© 2026 User Portal. All rights reserved.</p>
    </footer>
  </div>
</template>
