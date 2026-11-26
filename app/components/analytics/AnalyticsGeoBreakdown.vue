<script setup lang="ts">
import type { CustomEventItem } from '@restaurant-menu/shared';

defineProps<{
  actionsBreakdown: Array<{ action: string; count: number; percentage: number }>;
  countryBreakdown: Array<{ country: string; name: string; flag: string; count: number; percentage: number }>;
  eventsList: CustomEventItem[];
}>();
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
    <!-- User Actions Breakdown -->
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/80 rounded-2xl p-6 shadow-sm space-y-4">
      <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <h3 class="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-amber-500" />
          Action Event Distribution
        </h3>
        <span class="text-[11px] text-gray-400 font-mono">Actions</span>
      </div>

      <div class="space-y-4 pt-1">
        <div v-for="act in actionsBreakdown.slice(0, 5)" :key="act.action" class="space-y-1.5">
          <div class="flex justify-between text-xs font-mono">
            <span class="text-gray-800 dark:text-gray-200 font-semibold">{{ act.action }}</span>
            <span class="text-gray-500 font-bold">{{ act.count }} ({{ act.percentage }}%)</span>
          </div>
          <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div class="bg-amber-500 h-full rounded-full transition-all duration-500" :style="{ width: `${act.percentage}%` }" />
          </div>
        </div>
      </div>
    </div>

    <!-- Visitors by Country -->
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/80 rounded-2xl p-6 shadow-sm space-y-4">
      <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <h3 class="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-purple-500" />
          Visitor Country Breakdown
        </h3>
        <span class="text-[11px] text-gray-400 font-mono">GeoIP</span>
      </div>

      <div class="space-y-4 pt-1">
        <div v-for="c in countryBreakdown.slice(0, 5)" :key="c.country" class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
              <span class="text-lg leading-none">{{ c.flag }}</span> {{ c.name }}
            </span>
            <span class="font-mono text-gray-500 font-bold">{{ c.count }} visits ({{ c.percentage }}%)</span>
          </div>
          <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div class="bg-purple-500 h-full rounded-full transition-all duration-500" :style="{ width: `${c.percentage}%` }" />
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Interaction Events Feed -->
    <div class="md:col-span-2 lg:col-span-1">
      <AnalyticsEventFeed :events-list="eventsList" />
    </div>
  </div>
</template>
