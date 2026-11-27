<script setup lang="ts">
import type { AuditLog } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

// Controls State
const selectedLimit = ref('50');
const searchQuery = ref('');
const selectedActionFilter = ref('all');
const selectedStatusFilter = ref('all');
const selectedDeviceFilter = ref('all');

const { data: logsData, status, error, refresh: fetchAuditLogs } = await useApiData<AuditLog[]>(
  'admin-audit-logs',
  () => `/api/audit-logs?limit=${selectedLimit.value}`,
  {
    watch: [selectedLimit],
  }
);

const logsList = computed(() => logsData.value || []);
const isLoading = computed(() => status.value === 'pending');
const isErrorDismissed = ref(false);
watch(error, () => {
  isErrorDismissed.value = false;
});
const errorMessage = computed(() => error.value?.message || '');

const availableActions = computed(() => {
  const actions = new Set(logsList.value.map(l => l.action).filter(Boolean));
  return Array.from(actions);
});

const actionOptions = computed(() => [
  { label: 'Filter: All Actions', value: 'all' },
  ...availableActions.value.map(act => ({ label: act, value: act })),
]);

const deviceOptions = [
  { label: 'Filter: All Devices', value: 'all' },
  { label: '💻 Desktop', value: 'Desktop' },
  { label: '📱 Mobile', value: 'Mobile' },
  { label: 'Tablet', value: 'Tablet' },
  { label: '🤖 Bot / Crawler', value: 'Bot' },
];

const limitOptions = [
  { label: 'Limit: 10 logs', value: '10' },
  { label: 'Limit: 25 logs', value: '25' },
  { label: 'Limit: 50 logs', value: '50' },
  { label: 'Limit: 100 logs', value: '100' },
];

// Table Filtering
const filteredLogs = computed(() => {
  return logsList.value.filter((log) => {
    const query = searchQuery.value.toLowerCase();
    const device = getDeviceType(log.userAgent);
    const country = getCountryName(log.country);
    const city = log.city || log.region || 'Unknown';

    const matchesSearch =
      (log.action || '').toLowerCase().includes(query) ||
      (log.entity || '').toLowerCase().includes(query) ||
      (log.userEmail || '').toLowerCase().includes(query) ||
      (log.ipAddress || '').toLowerCase().includes(query) ||
      (log.route || '').toLowerCase().includes(query) ||
      country.toLowerCase().includes(query) ||
      city.toLowerCase().includes(query) ||
      device.toLowerCase().includes(query);

    const matchesAction =
      selectedActionFilter.value === 'all' || log.action === selectedActionFilter.value;

    const matchesStatus =
      selectedStatusFilter.value === 'all' || log.status === selectedStatusFilter.value;

    const matchesDevice =
      selectedDeviceFilter.value === 'all' || device === selectedDeviceFilter.value;

    return matchesSearch && matchesAction && matchesStatus && matchesDevice;
  });
});

function getActionColor(action: string) {
  switch (action) {
    case 'LOGIN_SUCCESS':
    case 'GOOGLE_LOGIN_SUCCESS':
      return 'success';
    case 'LOGIN_FAILED':
      return 'error';
    case 'SETTING_CHANGE':
    case 'UPDATE_SETTING':
      return 'secondary';
    case 'CREATE':
    case 'SYSTEM_INIT':
      return 'primary';
    case 'DELETE':
      return 'error';
    default:
      return 'neutral';
  }
}
</script>

<template>
  <div class="space-y-6 text-gray-900 dark:text-gray-100 font-sans max-w-7xl mx-auto">
    <!-- Header Hero Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight">System Audit & Security Logs</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Monitor raw system activity, user logins, device usage, and administrative configuration events.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-path" color="neutral" variant="outline" size="sm" :loading="isLoading"
          @click="fetchAuditLogs()" class="border-gray-300 dark:border-gray-700">
          Refresh Logs
        </UButton>
      </div>
    </div>

    <!-- Error Alert -->
    <UAlert v-if="errorMessage && !isErrorDismissed" color="error" variant="soft" icon="i-heroicons-exclamation-triangle"
      :title="errorMessage" class="text-xs" close @close="isErrorDismissed = true" />

    <!-- Multi-Filter & Search Toolbar -->
    <div
      class="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <!-- Search Input -->
        <div class="lg:col-span-2">
          <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass"
            placeholder="Search by action, page, email, IP, country, city..." class="w-full" size="sm" />
        </div>

        <!-- Action Filter Dropdown -->
        <div>
          <USelect v-model="selectedActionFilter" :items="actionOptions" size="sm" class="w-full" />
        </div>

        <!-- Device Filter Dropdown -->
        <div>
          <USelect v-model="selectedDeviceFilter" :items="deviceOptions" size="sm" class="w-full" />
        </div>

        <!-- Limit Selector -->
        <div>
          <USelect v-model="selectedLimit" :items="limitOptions" size="sm" class="w-full" />
        </div>
      </div>
    </div>

    <!-- Audit Logs Data Table -->
    <div
      class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
      <div v-if="isLoading" class="p-12 text-center text-gray-400 space-y-3">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
        <p class="text-sm">Fetching audit logs from Cloudflare D1...</p>
      </div>

      <div v-else-if="filteredLogs.length === 0" class="p-12 text-center text-gray-400 space-y-2">
        <UIcon name="i-heroicons-document-text" class="w-10 h-10 mx-auto text-gray-500" />
        <p class="text-base font-semibold text-gray-700 dark:text-gray-300">No audit logs found</p>
        <p class="text-xs text-gray-500">Try adjusting your device or action filters.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr
              class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
              <th class="py-3 px-4">Timestamp</th>
              <th class="py-3 px-4">Action Event</th>
              <th class="py-3 px-4">Page Route / Entity</th>
              <th class="py-3 px-4">User</th>
              <th class="py-3 px-4">Device / IP</th>
              <th class="py-3 px-4">Location (Country & City)</th>
              <th class="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800/60">
            <tr v-for="log in filteredLogs" :key="log.id"
              class="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors text-xs">
              <td class="py-3 px-4 text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
                {{ formatDateTime(log.createdAt) }}
              </td>

              <td class="py-3 px-4 font-mono font-semibold">
                <UBadge :color="getActionColor(log.action)" variant="soft" size="sm">
                  {{ log.action }}
                </UBadge>
              </td>

              <td class="py-3 px-4 font-mono text-gray-700 dark:text-gray-300">
                <span class="font-semibold text-gray-900 dark:text-gray-100">{{ log.route || '/admin/logs' }}</span>
                <span v-if="log.entity" class="text-[10px] text-gray-500 block truncate">
                  Target: {{ log.entity }} <template v-if="log.entityId">#{{ log.entityId }}</template>
                </span>
              </td>

              <td class="py-3 px-4 font-mono text-gray-900 dark:text-gray-100">
                <div class="flex items-center gap-2">
                  <UAvatar :alt="log.userEmail || 'System'" size="2xs" />
                  <span class="truncate max-w-[140px]">{{ log.userEmail || 'System' }}</span>
                </div>
              </td>

              <td class="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                <div class="flex items-center gap-2">
                  <UBadge color="neutral" variant="soft" size="xs" class="gap-1">
                    <UIcon :name="getDeviceIcon(getDeviceType(log.userAgent))" class="w-3.5 h-3.5" />
                    {{ getDeviceType(log.userAgent) }}
                  </UBadge>
                  <span class="text-gray-400 text-[11px]">{{ log.ipAddress || '127.0.0.1' }}</span>
                </div>
              </td>

              <!-- Country & City Column -->
              <td class="py-3 px-4 font-mono text-gray-700 dark:text-gray-300">
                <div class="flex items-center gap-1.5">
                  <span class="text-base leading-none">{{ getCountryFlag(log.country) }}</span>
                  <span class="font-medium">{{ getCountryName(log.country) }}</span>
                  <span v-if="log.city || log.region" class="text-gray-400 text-[11px]">({{ log.city || log.region
                    }})</span>
                </div>
              </td>

              <td class="py-3 px-4">
                <UBadge :color="log.status === 'SUCCESS' ? 'success' : 'error'" variant="subtle" size="xs">
                  {{ log.status }}
                </UBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
