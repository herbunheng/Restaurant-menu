<script setup lang="ts">
import type { User, AuditLog, MenuItem, Category } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

// Fetch restaurant data asynchronously
const { data: usersData } = await useApiData<User[]>('admin-overview-users', '/api/users');
const { data: logsData } = await useApiData<AuditLog[]>('admin-overview-logs', '/api/audit-logs?limit=5');
const { data: menuData } = await useApiData<MenuItem[]>('admin-overview-menu', '/api/menu');
const { data: categoriesData } = await useApiData<Category[]>('admin-overview-categories', '/api/categories');

const totalUsersCount = computed(() => usersData.value?.length || 0);
const activeUsersCount = computed(() => usersData.value?.filter((u) => u.status === 'active').length || 0);
const totalDishes = computed(() => menuData.value?.length || 0);
const availableDishes = computed(() => menuData.value?.filter((m) => m.isAvailable).length || 0);
const totalCategories = computed(() => categoriesData.value?.length || 0);
const recentLogs = computed(() => logsData.value?.slice(0, 5) || []);
const recentDishes = computed(() => menuData.value?.slice(0, 6) || []);
const successLogsCount = computed(() => logsData.value?.filter((l) => l.status === 'SUCCESS').length || 0);

function formatRiel(usd: number): string {
  return Math.round(usd * 4000).toLocaleString('en-US');
}
</script>

<template>
  <div class="space-y-8 text-gray-900 dark:text-gray-100 max-w-7xl mx-auto pb-12">
    <!-- Top Welcome Banner -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
          <UIcon name="i-heroicons-building-storefront" class="w-7 h-7 text-primary-600 dark:text-primary-400" />
          <span>Restaurant Overview</span>
        </h1>
        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          ផ្ទាំងគ្រប់គ្រងទូទៅនៃភោជនីយដ្ឋាន បញ្ជីមុខម្ហូប និងសកម្មភាពប្រព័ន្ធ
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          to="/admin/pos"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all hover:scale-[1.02]"
        >
          <UIcon name="i-heroicons-calculator" class="w-4 h-4" />
          <span>Cashier POS (កត់ Order)</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/reports"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-primary-600 hover:bg-primary-500 text-white shadow-xs transition-all hover:scale-[1.02]"
        >
          <UIcon name="i-heroicons-chart-bar-square" class="w-4 h-4" />
          <span>Daily Reports (បិទហាង)</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/menu"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all"
        >
          <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
          <span>Menu</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Key Performance Metrics Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <!-- Total Dishes -->
      <div
        class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Dishes
          </span>
          <div class="p-2.5 rounded-xl bg-primary-500/10 text-primary-600 group-hover:scale-110 transition-transform">
            <UIcon name="i-heroicons-book-open" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline justify-between">
          <span class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {{ totalDishes }}
          </span>
          <span class="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
            <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5" />
            {{ availableDishes }} in stock
          </span>
        </div>
        <div class="mt-2 w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div
            class="bg-primary-500 h-full rounded-full"
            :style="{ width: `${totalDishes ? Math.min(100, (availableDishes / totalDishes) * 100) : 100}%` }"
          />
        </div>
      </div>

      <!-- Categories -->
      <div
        class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Categories
          </span>
          <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
            <UIcon name="i-heroicons-rectangle-stack" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline justify-between">
          <span class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {{ totalCategories }}
          </span>
          <span class="text-xs font-semibold text-amber-500 flex items-center gap-0.5">
            <UIcon name="i-heroicons-tag" class="w-3.5 h-3.5" />
            Active categories
          </span>
        </div>
        <div class="mt-2 w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div class="bg-amber-500 h-full rounded-full w-4/5" />
        </div>
      </div>

      <!-- Total Users -->
      <div
        class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Users & Staff
          </span>
          <div class="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
            <UIcon name="i-heroicons-users" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline justify-between">
          <span class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {{ totalUsersCount }}
          </span>
          <span class="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5" />
            {{ activeUsersCount }} active
          </span>
        </div>
        <div class="mt-2 w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div
            class="bg-blue-500 h-full rounded-full"
            :style="{ width: `${totalUsersCount ? Math.min(100, (activeUsersCount / totalUsersCount) * 100) : 100}%` }"
          />
        </div>
      </div>

      <!-- Audit Activity Card -->
      <div
        class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            System Activity
          </span>
          <div class="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
            <UIcon name="i-heroicons-shield-check" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline justify-between">
          <span class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {{ logsData?.length || 0 }}
          </span>
          <span class="text-xs font-semibold text-purple-500 flex items-center gap-0.5">
            <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5" />
            {{ successLogsCount }} success
          </span>
        </div>
        <div class="mt-2 w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div
            class="bg-purple-500 h-full rounded-full"
            :style="{ width: `${logsData?.length ? Math.min(100, (successLogsCount / logsData.length) * 100) : 100}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Main Content Section: Recent Dishes & Audit Logs -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent Menu Dishes Card -->
      <div class="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-cake" class="w-5 h-5 text-primary-500" />
            <h2 class="font-bold text-base text-gray-900 dark:text-gray-100">Featured Menu Dishes</h2>
          </div>
          <NuxtLink to="/admin/menu" class="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
            View All →
          </NuxtLink>
        </div>

        <div v-if="recentDishes.length === 0" class="text-xs text-gray-500 py-8 text-center">
          No menu items available yet.
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="dish in recentDishes"
            :key="dish.id"
            class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
          >
            <img
              v-if="dish.imageUrl"
              :src="dish.imageUrl"
              :alt="dish.name"
              class="w-12 h-12 rounded-xl object-cover shrink-0"
            />
            <div v-else class="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-400">
              <UIcon name="i-heroicons-photo" class="w-5 h-5" />
            </div>

            <div class="min-w-0 flex-1">
              <p class="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                {{ dish.name }}
              </p>
              <p class="text-[11px] text-gray-400">
                {{ dish.categoryName || 'Uncategorized' }}
              </p>
            </div>

            <div class="text-right shrink-0">
              <p class="font-bold text-sm text-primary-600 dark:text-primary-400">
                ${{ Number(dish.price).toFixed(2) }}
              </p>
              <p class="text-[10px] text-gray-400 font-mono">
                {{ formatRiel(Number(dish.price)) }} ៛
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent System Audit Activity -->
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="w-5 h-5 text-purple-500" />
            <h2 class="font-bold text-base text-gray-900 dark:text-gray-100">Audit Logs</h2>
          </div>
          <NuxtLink to="/admin/logs" class="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
            View All
          </NuxtLink>
        </div>

        <div v-if="recentLogs.length === 0" class="text-xs text-gray-500 py-8 text-center">
          No audit logs recorded yet.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="log in recentLogs"
            :key="log.id"
            class="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-xs"
          >
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">{{ log.action }}</p>
              <p class="text-[11px] text-gray-500 truncate max-w-[180px]">{{ log.userEmail || 'System' }}</p>
            </div>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              :class="[log.status === 'SUCCESS' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600']"
            >
              {{ log.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
