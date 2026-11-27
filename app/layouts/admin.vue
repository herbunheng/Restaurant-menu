<script setup lang="ts">
const { user, logout } = useAuth();
const route = useRoute();

// Navigation states
const isMobileMenuOpen = ref(false);
const isSidebarCollapsed = ref(false);

// Desktop sidebar functions
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

// Mobile navigation functions
const openMenu = () => {
  isMobileMenuOpen.value = true;
};

const closeMenu = () => {
  isMobileMenuOpen.value = false;
};

const toggleMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

// Detect POS and full-screen admin pages
const isPosPage = computed(() =>
  route.path === '/admin/pos' ||
  route.path.startsWith('/admin/pos/') ||
  route.path === '/admin/menu' ||
  route.path.startsWith('/admin/menu/') ||
  route.path === '/admin/reports' ||
  route.path === '/admin'
);

// Admin navigation
const adminNav = [
  { label: 'ផ្ទាំងទូទៅ', icon: 'i-heroicons-chart-pie', to: '/admin' },
  { label: 'កន្លែងគិតលុយ (POS)', icon: 'i-heroicons-calculator', to: '/admin/pos' },
  { label: 'មុខម្ហូប និងភេសជ្ជៈ', icon: 'i-heroicons-book-open', to: '/admin/menu' },
  { label: 'របាយការណ៍ប្រចាំថ្ងៃ', icon: 'i-heroicons-chart-bar-square', to: '/admin/reports' },
  { label: 'វិធីសាស្ត្រទូទាត់', icon: 'i-heroicons-credit-card', to: '/admin/payments' },
  { label: 'បុគ្គលិក', icon: 'i-heroicons-user-group', to: '/admin/staff' },
  { label: 'អ្នកប្រើប្រាស់', icon: 'i-heroicons-users', to: '/admin/users' },
  { label: 'កំណត់ត្រាប្រព័ន្ធ', icon: 'i-heroicons-document-text', to: '/admin/logs' },
  { label: 'ការកំណត់', icon: 'i-heroicons-adjustments-horizontal', to: '/admin/settings' },
];

// Close mobile navigation after route changes
watch(
  () => route.path,
  () => closeMenu()
);

// Close mobile navigation with Escape
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMenu();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors font-sans flex flex-col">

    <!-- ========================================== -->
    <!-- DESKTOP SIDEBAR                            -->
    <!-- ========================================== -->

    <aside
      class="hidden md:flex md:flex-col md:fixed md:inset-y-0 z-30 border-r border-gray-200 dark:border-gray-800/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-3 transition-all duration-300 justify-between shadow-sm overflow-x-hidden"
      :class="isSidebarCollapsed ? 'md:w-20' : 'md:w-64'">

      <div class="space-y-6">

        <!-- Logo & Branding -->
        <div class="flex items-center justify-between gap-2 min-h-12" :class="isSidebarCollapsed ? 'flex-col' : ''">

          <NuxtLink to="/admin" class="flex items-center gap-3 px-2 py-1 group min-w-0"
            :class="isSidebarCollapsed ? 'justify-center' : ''"
            :title="isSidebarCollapsed ? 'ផ្ទាំងគ្រប់គ្រង' : undefined">
            <div
              class="p-2.5 shrink-0 rounded-xl bg-primary-600/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 group-hover:scale-105 transition-transform">
              <UIcon name="i-heroicons-shield-check" class="w-6 h-6" />
            </div>

            <div v-if="!isSidebarCollapsed" class="min-w-0">
              <span
                class="font-extrabold text-base tracking-tight text-gray-900 dark:text-white block leading-none whitespace-nowrap">
                ផ្ទាំងគ្រប់គ្រង
              </span>

              <span class="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-wider whitespace-nowrap">
                ប្រព័ន្ធគ្រប់គ្រងភោជនីយដ្ឋាន
              </span>
            </div>
          </NuxtLink>

          <!-- Collapse / Expand Button -->
          <UButton :icon="isSidebarCollapsed
            ? 'i-heroicons-chevron-double-right'
            : 'i-heroicons-chevron-double-left'" color="neutral" variant="ghost" size="sm" class="shrink-0"
            :title="isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'"
            :aria-label="isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'" @click="toggleSidebar" />

        </div>

        <!-- Desktop Navigation -->
        <nav class="space-y-1.5">

          <template v-for="item in adminNav" :key="item.to">

            <!-- Expanded Navigation -->
            <UTooltip :text="item.label" :disabled="!isSidebarCollapsed" :delay-duration="200"
              :content="{ side: 'right', sideOffset: 10 }">
              <NuxtLink :to="item.to"
                class="flex items-center gap-3 py-2.5 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white transition-all group"
                :class="isSidebarCollapsed
                  ? 'justify-center px-2'
                  : 'px-3.5'"
                active-class="bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold border-l-4 border-primary-600 dark:border-primary-500 shadow-sm">
                <UIcon :name="item.icon"
                  class="w-5 h-5 shrink-0 text-gray-400 group-hover:text-primary-500 transition-colors" />

                <span v-if="!isSidebarCollapsed" class="truncate">
                  {{ item.label }}
                </span>
              </NuxtLink>
            </UTooltip>

          </template>

        </nav>
      </div>

      <!-- Desktop Footer -->
      <div class="border-t border-gray-200 dark:border-gray-800 pt-4 px-1 space-y-4">

        <!-- Home & Theme -->
        <div class="flex items-center text-xs text-gray-500 dark:text-gray-400" :class="isSidebarCollapsed
          ? 'flex-col gap-3'
          : 'justify-between'">

          <UTooltip text="ត្រឡប់ទៅទំព័រដើម" :disabled="!isSidebarCollapsed" :content="{ side: 'right' }">
            <NuxtLink to="/"
              class="hover:underline text-gray-600 dark:text-gray-400 flex items-center gap-1 font-medium">
              <UIcon name="i-heroicons-arrow-left" class="w-4 h-4 shrink-0" />

              <span v-if="!isSidebarCollapsed">
                ត្រឡប់ទៅទំព័រដើម
              </span>
            </NuxtLink>
          </UTooltip>

          <UColorModeButton />
        </div>

        <!-- Logout -->
        <UTooltip text="ចាកចេញ" :disabled="!isSidebarCollapsed" :content="{ side: 'right' }">
          <UButton color="error" variant="soft" size="xs" block icon="i-heroicons-arrow-right-on-rectangle"
            @click="logout" class="font-medium" :class="isSidebarCollapsed ? 'justify-center px-0' : 'w-full'">
            <span v-if="!isSidebarCollapsed">
              ចាកចេញ
            </span>
          </UButton>
        </UTooltip>

      </div>
    </aside>


    <!-- ========================================== -->
    <!-- MOBILE SLIDE-OVER DRAWER                   -->
    <!-- ========================================== -->

    <Teleport to="body">
      <div v-if="isMobileMenuOpen" class="fixed inset-0 z-50 md:hidden flex">

        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-950/60 backdrop-blur-sm" @click="closeMenu" />

        <!-- Drawer Content -->
        <div
          class="relative w-4/5 max-w-xs bg-white dark:bg-gray-900 p-5 flex flex-col justify-between shadow-2xl z-10 border-r border-gray-200 dark:border-gray-800"
          role="dialog" aria-modal="true" aria-label="Admin navigation">

          <div class="space-y-6">

            <!-- Drawer Header -->
            <div class="flex items-center justify-between">

              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-primary-500" />

                <span class="font-extrabold text-base tracking-tight">
                  ផ្ទាំងគ្រប់គ្រង
                </span>
              </div>

              <!-- Close Drawer -->
              <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="xs" aria-label="Close navigation"
                @click="closeMenu" />

            </div>

            <!-- Mobile Navigation -->
            <nav class="space-y-1">

              <NuxtLink v-for="item in adminNav" :key="item.to" :to="item.to" @click="closeMenu"
                class="flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                active-class="bg-primary-500/10 text-primary-500 font-semibold border-l-4 border-primary-500">
                <UIcon :name="item.icon" class="w-5 h-5 shrink-0" />

                {{ item.label }}
              </NuxtLink>

            </nav>

          </div>

          <!-- Mobile Footer -->
          <div class="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">

            <NuxtLink to="/" @click="closeMenu" class="block text-xs text-gray-500 hover:underline">
              ← ត្រឡប់ទៅទំព័រដើម
            </NuxtLink>

            <UButton color="error" variant="soft" size="sm" block icon="i-heroicons-arrow-right-on-rectangle"
              @click="logout">
              ចាកចេញ
            </UButton>

          </div>

        </div>
      </div>
    </Teleport>


    <!-- ========================================== -->
    <!-- MAIN CONTENT                               -->
    <!-- ========================================== -->

    <div class="flex-1 flex flex-col min-w-0 transition-all duration-300"
      :class="isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'">

      <!-- Header -->
      <header v-if="!isPosPage"
        class="sticky top-0 z-20 h-16 border-b border-gray-200 dark:border-gray-800/80 px-4 sm:px-6 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-colors">

        <!-- Left: Mobile Menu & User -->
        <div class="flex items-center gap-3">

          <!-- Mobile Menu Trigger -->
          <button @click="toggleMenu"
            class="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
            aria-label="Toggle Navigation Menu" :aria-expanded="isMobileMenuOpen">
            <UIcon name="i-heroicons-bars-3" class="w-6 h-6" />
          </button>

          <UBadge color="primary" variant="subtle" size="sm" class="hidden sm:inline-flex font-mono text-[11px]">
            {{ user?.name }}
          </UBadge>

        </div>

        <!-- Right: Actions & User Info -->
        <div class="flex items-center gap-3 sm:gap-4">

          <UColorModeButton size="sm" />

          <UButton icon="i-heroicons-cog-8-tooth" color="neutral" variant="ghost" size="sm" to="/admin/settings"
            title="System Settings" />

          <!-- Profile -->
          <NuxtLink to="/user/profile"
            class="flex items-center gap-2.5 border-l border-gray-200 dark:border-gray-800 pl-3 sm:pl-4 hover:opacity-85 transition-opacity group"
            title="Click to view & update profile">
            <UAvatar :src="user?.avatarUrl || undefined" :alt="user?.name || 'Super Admin'" size="sm"
              class="ring-2 ring-primary-500/40 group-hover:ring-primary-500 transition-all" />

            <div class="text-left hidden sm:block">
              <p
                class="font-semibold text-xs text-gray-900 dark:text-gray-100 leading-tight group-hover:text-primary-500 transition-colors">
                {{ user?.name || 'Super Admin' }}
              </p>

              <p class="text-gray-500 dark:text-gray-400 text-[10px] leading-tight font-mono truncate max-w-[140px]">
                {{ user?.email || 'admin@domain.com' }}
              </p>
            </div>

          </NuxtLink>

        </div>
      </header>


      <!-- POS Mobile Menu Trigger -->
      <button v-if="isPosPage" @click="toggleMenu"
        class="md:hidden fixed bottom-4 left-4 z-30 p-2.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
        aria-label="Toggle Navigation Menu" :aria-expanded="isMobileMenuOpen">
        <UIcon name="i-heroicons-bars-3" class="w-5 h-5" />
      </button>


      <!-- Page Slot -->
      <main class="flex-1 bg-gray-50 dark:bg-gray-950 transition-colors"
        :class="isPosPage ? 'p-3 sm:p-4 md:p-5' : 'p-4 sm:p-6 md:p-8'">
        <slot />
      </main>

    </div>

  </div>
</template>