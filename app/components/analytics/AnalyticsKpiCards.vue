<script setup lang="ts">
defineProps<{
  totalEvents: number;
  activeSessions: number;
  topCountry: { name: string; flag: string; count: number };
  healthPercentage: number;
  failedCount: number;
}>();
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- KPI 1: Total Visitors -->
    <div class="p-5 bg-white dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800/80 rounded-2xl shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-emerald-500/50 transition-all">
      <div class="space-y-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">1. Total Visitors</p>
        <p class="text-3xl font-black tracking-tight text-gray-900 dark:text-white">{{ totalEvents }}</p>
        <p class="text-[11px] text-emerald-500 font-semibold font-mono flex items-center gap-1">
          <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5" /> +14.2% <span class="text-gray-400 font-normal">vs last window</span>
        </p>
      </div>
      <div class="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
        <UIcon name="i-heroicons-users" class="w-6 h-6" />
      </div>
    </div>

    <!-- KPI 2: Active Sessions -->
    <div class="p-5 bg-white dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800/80 rounded-2xl shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="space-y-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">2. Active Sessions</p>
        <p class="text-3xl font-black tracking-tight text-gray-900 dark:text-white">{{ activeSessions }}</p>
        <p class="text-[11px] text-blue-500 font-semibold font-mono flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Live Sessions
        </p>
      </div>
      <div class="p-3.5 rounded-2xl bg-blue-500/10 text-blue-500">
        <UIcon name="i-heroicons-signal" class="w-6 h-6" />
      </div>
    </div>

    <!-- KPI 3: Top Visitor Region -->
    <div class="p-5 bg-white dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800/80 rounded-2xl shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-purple-500/50 transition-all">
      <div class="space-y-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">3. Primary Region</p>
        <p class="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 truncate max-w-[150px]">
          <span>{{ topCountry.flag }}</span> {{ topCountry.name }}
        </p>
        <p class="text-[11px] text-purple-500 font-mono">{{ topCountry.count }} traffic events</p>
      </div>
      <div class="p-3.5 rounded-2xl bg-purple-500/10 text-purple-500">
        <UIcon name="i-heroicons-globe-alt" class="w-6 h-6" />
      </div>
    </div>

    <!-- KPI 4: Security Health Score -->
    <div class="p-5 bg-white dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800/80 rounded-2xl shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-amber-500/50 transition-all">
      <div class="space-y-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">4. Health Score</p>
        <p class="text-3xl font-black tracking-tight text-emerald-500">{{ healthPercentage }}%</p>
        <p class="text-[11px] text-gray-400 font-mono">{{ failedCount > 0 ? `${failedCount} Security Alerts` : '0 Security Threat' }}</p>
      </div>
      <div class="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500">
        <UIcon name="i-heroicons-shield-check" class="w-6 h-6" />
      </div>
    </div>
  </div>
</template>
