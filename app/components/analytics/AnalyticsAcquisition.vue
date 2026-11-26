<script setup lang="ts">
defineProps<{
  pageViewsBreakdown: Array<{ route: string; count: number; percentage: number }>;
}>();
</script>

<template>
  <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/80 rounded-2xl p-6 shadow-sm space-y-4">
    <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
      <h3 class="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
        <UIcon name="i-heroicons-document-magnifying-glass" class="w-5 h-5 text-blue-500" />
        User Page Acquisition
      </h3>
      <span class="text-[11px] text-gray-400 font-mono">Views %</span>
    </div>

    <div v-if="pageViewsBreakdown.length === 0" class="text-center py-12 text-xs text-gray-400">
      No page view data available.
    </div>

    <div v-else class="space-y-4 pt-1">
      <div v-for="item in pageViewsBreakdown.slice(0, 5)" :key="item.route" class="space-y-1.5">
        <div class="flex justify-between text-xs font-mono">
          <span class="text-gray-800 dark:text-gray-200 font-semibold truncate max-w-[160px]">{{ item.route }}</span>
          <span class="text-gray-500 font-bold">{{ item.count }} views ({{ item.percentage }}%)</span>
        </div>
        <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
          <div class="bg-blue-500 h-full rounded-full transition-all duration-500" :style="{ width: `${item.percentage}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>
