<script setup lang="ts">
defineProps<{
  selectedPeriod: string;
  isAutoRefreshEnabled: boolean;
  isLoading: boolean;
  timePeriodOptions: Array<{ label: string; value: string }>;
}>();

defineEmits<{
  (e: 'update:selectedPeriod', value: string): void;
  (e: 'update:isAutoRefreshEnabled', value: boolean): void;
  (e: 'refresh'): void;
  (e: 'exportCsv'): void;
}>();
</script>

<template>
  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
    <div>
      <h1 class="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
        <UIcon name="i-heroicons-chart-pie" class="w-7 h-7 text-emerald-500" />
        Analytics Overview
      </h1>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Real-time visitor traffic, top route acquisitions, user events, and geographic insights.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <!-- Live Auto Refresh Toggle -->
      <button
        @click="$emit('update:isAutoRefreshEnabled', !isAutoRefreshEnabled)"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs"
        :class="isAutoRefreshEnabled
          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
      >
        <span class="w-2 h-2 rounded-full" :class="isAutoRefreshEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'" />
        {{ isAutoRefreshEnabled ? 'Live Polling (10s)' : 'Auto Refresh Off' }}
      </button>

      <!-- Refresh Button -->
      <UButton
        icon="i-heroicons-arrow-path"
        color="neutral"
        variant="outline"
        size="xs"
        :loading="isLoading"
        @click="$emit('refresh')"
      >
        Refresh
      </UButton>

      <!-- Export CSV Button -->
      <UButton
        icon="i-heroicons-arrow-down-tray"
        color="primary"
        variant="subtle"
        size="xs"
        @click="$emit('exportCsv')"
      >
        Export CSV
      </UButton>

      <!-- Time Range Selector Pills -->
      <div class="inline-flex rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 shadow-xs text-xs font-mono">
        <button
          v-for="opt in timePeriodOptions"
          :key="opt.value"
          @click="$emit('update:selectedPeriod', opt.value)"
          class="px-2.5 py-1 rounded-lg font-bold transition-all"
          :class="selectedPeriod === opt.value
            ? 'bg-emerald-500 text-white shadow-xs'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  </div>
</template>
