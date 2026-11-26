<script setup lang="ts">
import type { User, AuditLog, VisitorAnalyticsSummary } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

// Fetch metrics & analytics asynchronously
const { data: usersData } = await useApiData<User[]>('admin-overview-users', '/api/users');
const { data: logsData } = await useApiData<AuditLog[]>('admin-overview-logs', '/api/audit-logs?limit=5');
const { data: analyticsData } = await useApiData<VisitorAnalyticsSummary>('admin-overview-analytics', '/api/metrics/summary');

const totalUsersCount = computed(() => usersData.value?.length || 0);
const activeUsersCount = computed(() => usersData.value?.filter((u) => u.status === 'active').length || 0);
const totalPageViews = computed(() => analyticsData.value?.totalVisits || 0);
const recentLogs = computed(() => logsData.value?.slice(0, 5) || []);

const topPages = computed(() => analyticsData.value?.topPaths?.slice(0, 5) || []);
const deviceStats = computed(() => analyticsData.value?.devices || []);
const topCountry = computed(() => analyticsData.value?.topCountries?.[0] || null);
const osStats = computed(() => analyticsData.value?.osBreakdown?.slice(0, 5) || []);
const successLogsCount = computed(() => logsData.value?.filter((l) => l.status === 'SUCCESS').length || 0);
</script>

<template>
  <div class="space-y-8 text-gray-900 dark:text-gray-100 max-w-7xl mx-auto">
    <!-- Key Performance Metrics Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <!-- Total Users -->
      <div
        class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total
            Users</span>
          <div class="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
            <UIcon name="i-heroicons-users" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline justify-between">
          <span class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">{{ totalUsersCount
          }}</span>
          <span class="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5" />
            {{ activeUsersCount }} active
          </span>
        </div>
        <div class="mt-2 w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div class="bg-blue-500 h-full rounded-full"
            :style="{ width: `${totalUsersCount ? Math.min(100, (activeUsersCount / totalUsersCount) * 100) : 100}%` }" />
        </div>
      </div>

      <!-- Total Page Views -->
      <div
        class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Page
            Views</span>
          <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
            <UIcon name="i-heroicons-cursor-arrow-rays" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline justify-between">
          <span class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">{{ totalPageViews }}</span>
          <span class="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5" />
            Live edge analytics
          </span>
        </div>
        <div class="mt-2 w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div class="bg-emerald-500 h-full rounded-full w-4/5" />
        </div>
      </div>

      <!-- Geographic Reach Card -->
      <div
        class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Location</span>
          <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
            <UIcon name="i-heroicons-globe-alt" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white truncate">
            {{ topCountry?.country || 'Global' }}
          </span>
          <span class="text-xs font-semibold text-amber-500 flex items-center gap-0.5 shrink-0">
            <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5" />
            {{ topCountry ? `${topCountry.count} hits` : '0 hits' }}
          </span>
        </div>
        <div class="mt-2 w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div class="bg-amber-500 h-full rounded-full"
            :style="{ width: `${topCountry && totalPageViews ? Math.min(100, (topCountry.count / totalPageViews) * 100) : 100}%` }" />
        </div>
      </div>

      <!-- Audit Activity Status Card -->
      <div
        class="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Audit Activity</span>
          <div class="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
            <UIcon name="i-heroicons-shield-check" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline justify-between">
          <span class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">{{ logsData?.length || 0 }}</span>
          <span class="text-xs font-semibold text-purple-500 flex items-center gap-0.5">
            <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5" />
            {{ successLogsCount }} success
          </span>
        </div>
        <div class="mt-2 w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div class="bg-purple-500 h-full rounded-full"
            :style="{ width: `${logsData?.length ? Math.min(100, (successLogsCount / logsData.length) * 100) : 100}%` }" />
        </div>
      </div>
    </div>

    <!-- Analytics Breakdown Row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Popular Pages Breakdown -->
      <div
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-fire" class="w-5 h-5 text-orange-500" />
            <h2 class="font-bold text-base text-gray-900 dark:text-gray-100">Top Visited Routes</h2>
          </div>
          <UBadge color="neutral" variant="soft" size="xs">Live</UBadge>
        </div>

        <div v-if="topPages.length === 0" class="text-xs text-gray-500 py-4 text-center">
          No traffic logs recorded yet.
        </div>

        <div v-else class="space-y-3">
          <div v-for="item in topPages" :key="item.path"
            class="flex items-center justify-between text-xs p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div class="flex items-center gap-2 truncate">
              <UIcon name="i-heroicons-link" class="w-4 h-4 text-gray-400 shrink-0" />
              <span class="font-mono font-medium text-gray-800 dark:text-gray-200 truncate">{{ item.path }}</span>
            </div>
            <span
              class="font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full text-[11px] shrink-0">
              {{ item.count }} hits
            </span>
          </div>
        </div>
      </div>

      <!-- Devices Breakdown -->
      <div
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-computer-desktop" class="w-5 h-5 text-blue-500" />
            <h2 class="font-bold text-base text-gray-900 dark:text-gray-100">Traffic Devices</h2>
          </div>
          <UBadge color="neutral" variant="soft" size="xs">Distribution</UBadge>
        </div>

        <div v-if="deviceStats.length === 0" class="text-xs text-gray-500 py-4 text-center">
          No device metrics captured.
        </div>

        <div v-else class="space-y-3">
          <div v-for="item in deviceStats" :key="item.device" class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="capitalize font-medium text-gray-700 dark:text-gray-300">{{ item.device || 'Desktop'
              }}</span>
              <span class="font-mono text-gray-500">{{ item.count }} requests</span>
            </div>
            <div class="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
              <div class="bg-blue-500 h-full rounded-full"
                :style="{ width: `${Math.min(100, (item.count / (totalPageViews || 1)) * 100)}%` }" />
            </div>
          </div>
        </div>
      </div>

      <!-- Operating System (OS) Breakdown Card -->
      <div
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-command-line" class="w-5 h-5 text-purple-500" />
            <h2 class="font-bold text-base text-gray-900 dark:text-gray-100">Operating Systems</h2>
          </div>
          <UBadge color="neutral" variant="soft" size="xs">OS Systems</UBadge>
        </div>

        <div v-if="osStats.length === 0" class="text-xs text-gray-500 py-4 text-center">
          No OS metrics captured.
        </div>

        <div v-else class="space-y-3">
          <div v-for="item in osStats" :key="item.os" class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="capitalize font-medium text-gray-700 dark:text-gray-300">{{ item.os || 'Unknown OS' }}</span>
              <span class="font-mono text-gray-500">{{ item.count }} requests</span>
            </div>
            <div class="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
              <div class="bg-purple-500 h-full rounded-full"
                :style="{ width: `${Math.min(100, (item.count / (totalPageViews || 1)) * 100)}%` }" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Audit Logs Table -->
    <div
      class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/90 rounded-2xl p-6 shadow-sm space-y-4">
      <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h2 class="font-bold text-lg text-gray-900 dark:text-gray-100">Recent Audit Log Stream</h2>
          <p class="text-xs text-gray-500">Latest security & administrative actions recorded in system</p>
        </div>
        <UButton to="/admin/logs" color="neutral" variant="ghost" size="xs" icon="i-heroicons-arrow-right">
          View All Logs
        </UButton>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800 text-gray-400 font-mono uppercase tracking-wider">
              <th class="py-3 px-3">Action</th>
              <th class="py-3 px-3">Entity</th>
              <th class="py-3 px-3">User</th>
              <th class="py-3 px-3">Status</th>
              <th class="py-3 px-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800/60">
            <tr v-if="recentLogs.length === 0">
              <td colspan="5" class="py-6 text-center text-gray-500">No audit events recorded yet.</td>
            </tr>
            <tr v-for="log in recentLogs" :key="log.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              <td class="py-3 px-3 font-semibold text-gray-900 dark:text-gray-100">
                <span class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 font-mono text-[11px]">
                  {{ log.action }}
                </span>
              </td>
              <td class="py-3 px-3 text-gray-600 dark:text-gray-300 font-mono">{{ log.entity }}</td>
              <td class="py-3 px-3 text-gray-600 dark:text-gray-300">{{ log.userEmail || 'System' }}</td>
              <td class="py-3 px-3">
                <UBadge :color="log.status === 'SUCCESS' ? 'success' : 'error'" variant="soft" size="xs">
                  {{ log.status }}
                </UBadge>
              </td>
              <td class="py-3 px-3 text-right font-mono text-gray-500">{{ formatDate(log.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
