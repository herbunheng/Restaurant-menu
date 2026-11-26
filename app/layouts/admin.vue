<script setup lang="ts">
const { user, logout } = useAuth();
const route = useRoute();

const isMobileMenuOpen = ref(false);

const adminNav = [
  { label: 'Overview', icon: 'i-heroicons-chart-pie', to: '/admin' },
  { label: 'Menu & Categories', icon: 'i-heroicons-book-open', to: '/admin/menu' },
  { label: 'Users & Roles', icon: 'i-heroicons-users', to: '/admin/users' },
  { label: 'System Logs', icon: 'i-heroicons-document-text', to: '/admin/logs' },
  { label: 'Settings', icon: 'i-heroicons-adjustments-horizontal', to: '/admin/settings' },
];

// Close mobile drawer on route navigation
watch(() => route.path, () => {
  isMobileMenuOpen.value = false;
});
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors font-sans flex flex-col">
    <!-- Desktop Sidebar (Fixed) -->
    <aside
      class="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-gray-200 dark:border-gray-800/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-4 transition-colors justify-between shadow-sm">
      <div class="space-y-6">
        <!-- Logo & Branding -->
        <NuxtLink to="/admin" class="flex items-center gap-3 px-2 py-1 group">
          <div
            class="p-2.5 rounded-xl bg-primary-600/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 group-hover:scale-105 transition-transform">
            <UIcon name="i-heroicons-shield-check" class="w-6 h-6" />
          </div>
          <div>
            <span class="font-extrabold text-base tracking-tight text-gray-900 dark:text-white block leading-none">Admin
              Control</span>
            <span class="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-wider">CLOUDFLARE D1
              PLATFORM</span>
          </div>
        </NuxtLink>

        <!-- Navigation Links -->
        <nav class="space-y-1.5">
          <NuxtLink v-for="item in adminNav" :key="item.to" :to="item.to"
            class="flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white transition-all group"
            active-class="bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold border-l-4 border-primary-600 dark:border-primary-500 shadow-sm">
            <UIcon :name="item.icon" class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </div>

      <!-- Footer Info & User Action -->
      <div class="border-t border-gray-200 dark:border-gray-800 pt-4 px-1 space-y-4">

        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <NuxtLink to="/" class="hover:underline text-gray-600 dark:text-gray-400 flex items-center gap-1 font-medium">
            <UIcon name="i-heroicons-arrow-left" class="w-3.5 h-3.5" /> Back to Home
          </NuxtLink>
          <UColorModeButton />
        </div>

        <UButton color="error" variant="soft" size="xs" block icon="i-heroicons-arrow-right-on-rectangle"
          @click="logout" class="w-full font-medium">
          Logout Admin
        </UButton>
      </div>
    </aside>

    <!-- Mobile Slide-over Drawer -->
    <div v-if="isMobileMenuOpen" class="fixed inset-0 z-50 md:hidden flex">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-gray-950/60 backdrop-blur-sm" @click="isMobileMenuOpen = false" />

      <!-- Drawer Content -->
      <div
        class="relative w-4/5 max-w-xs bg-white dark:bg-gray-900 p-5 flex flex-col justify-between shadow-2xl z-10 border-r border-gray-800">
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-primary-500" />
              <span class="font-extrabold text-base tracking-tight">Admin Control</span>
            </div>
            <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="xs"
              @click="isMobileMenuOpen = false" />
          </div>

          <nav class="space-y-1">
            <NuxtLink v-for="item in adminNav" :key="item.to" :to="item.to"
              class="flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              active-class="bg-primary-500/10 text-primary-500 font-semibold border-l-4 border-primary-500">
              <UIcon :name="item.icon" class="w-5 h-5" />
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
          <NuxtLink to="/" class="block text-xs text-gray-500 hover:underline">← Exit to Main App</NuxtLink>
          <UButton color="error" variant="soft" size="sm" block icon="i-heroicons-arrow-right-on-rectangle"
            @click="logout">
            Logout
          </UButton>
        </div>
      </div>
    </div>

    <!-- Main Content Container (Offset by Sidebar on Desktop) -->
    <div class="md:pl-64 flex-1 flex flex-col min-w-0">
      <!-- Top Header Navigation Bar -->
      <header
        class="sticky top-0 z-20 h-16 border-b border-gray-200 dark:border-gray-800/80 px-4 sm:px-6 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-colors">

        <!-- Left: Mobile Menu Trigger & Title -->
        <div class="flex items-center gap-3">
          <button @click="isMobileMenuOpen = true"
            class="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
            aria-label="Open Navigation Menu">
            <UIcon name="i-heroicons-bars-3" class="w-6 h-6" />
          </button>

          <div class="flex items-center gap-2">
            <UBadge color="primary" variant="subtle" size="sm" class="hidden sm:inline-flex font-mono text-[11px]">
              {{ user?.name }}
            </UBadge>
          </div>
        </div>

        <!-- Right: Actions & User Info -->
        <div class="flex items-center gap-3 sm:gap-4">
          <UColorModeButton size="sm" />
          <UButton icon="i-heroicons-cog-8-tooth" color="neutral" variant="ghost" size="sm" to="/admin/settings"
            title="System Settings" />

          <!-- Profile Badge -->
          <NuxtLink to="/user/profile" class="flex items-center gap-2.5 border-l border-gray-200 dark:border-gray-800 pl-3 sm:pl-4 hover:opacity-85 transition-opacity group" title="Click to view & update profile">
            <UAvatar :src="user?.avatarUrl || undefined" :alt="user?.name || 'Super Admin'" size="sm" class="ring-2 ring-primary-500/40 group-hover:ring-primary-500 transition-all" />
            <div class="text-left hidden sm:block">
              <p class="font-semibold text-xs text-gray-900 dark:text-gray-100 leading-tight group-hover:text-primary-500 transition-colors">{{ user?.name || 'Super Admin' }}</p>
              <p class="text-gray-500 dark:text-gray-400 text-[10px] leading-tight font-mono truncate max-w-[140px]">{{
                user?.email || 'admin@domain.com' }}</p>
            </div>
          </NuxtLink>

        </div>
      </header>

      <!-- Main Page Slot -->
      <main class="flex-1 p-4 sm:p-6 md:p-8 bg-gray-50 dark:bg-gray-950 transition-colors">
        <slot />
      </main>
    </div>
  </div>
</template>
