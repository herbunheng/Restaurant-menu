<script setup lang="ts">
import type { CustomEventItem } from '@restaurant-menu/shared';

const props = defineProps<{
  eventsList: CustomEventItem[];
}>();

// Active View Mode: 'summary' (Aggregated count view) | 'stream' (Chronological feed view)
const activeTab = ref<'summary' | 'stream'>('summary');
const selectedCategory = ref<string>('ALL');

// Extract unique categories for filtering
const availableCategories = computed(() => {
  const categories = new Set<string>();
  props.eventsList.forEach((e) => {
    if (e.eventCategory) categories.add(e.eventCategory.toLowerCase());
  });
  return ['ALL', ...Array.from(categories)];
});

// Filter events by selected category
const filteredEvents = computed(() => {
  if (selectedCategory.value === 'ALL') return props.eventsList;
  return props.eventsList.filter(
    (e) => (e.eventCategory || '').toLowerCase() === selectedCategory.value.toLowerCase()
  );
});

// Aggregated Summary View Data (Groups duplicate events together)
const aggregatedEvents = computed(() => {
  const map = new Map<string, {
    eventName: string;
    eventCategory?: string | null;
    eventLabel?: string | null;
    latestPath: string;
    latestTime?: Date | string | null;
    count: number;
  }>();

  filteredEvents.value.forEach((event) => {
    const key = event.eventName;
    const existing = map.get(key);
    const eventTime = event.createdAt ?? null;
    if (existing) {
      existing.count += 1;
      if (new Date(event.createdAt || 0) > new Date(existing.latestTime || 0)) {
        existing.latestTime = eventTime;
        existing.latestPath = event.path;
      }
    } else {
      map.set(key, {
        eventName: event.eventName,
        eventCategory: event.eventCategory,
        eventLabel: event.eventLabel,
        latestPath: event.path,
        latestTime: eventTime,
        count: 1,
      });
    }
  });

  const totalHits = filteredEvents.value.length || 1;
  return Array.from(map.values())
    .map((item) => ({
      ...item,
      percentage: Math.round((item.count / totalHits) * 100),
    }))
    .sort((a, b) => b.count - a.count);
});

function getCategoryBadge(category?: string | null) {
  switch (category?.toLowerCase()) {
    case 'auth':
    case 'security':
      return { label: category || 'Auth', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    case 'billing':
    case 'goal':
    case 'conversion':
      return { label: category || 'Goal', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    case 'ui':
    case 'engagement':
      return { label: category || 'UI', class: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
    default:
      return { label: category || 'General', class: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
  }
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/80 rounded-2xl p-6 shadow-sm space-y-4">
    <!-- Header Title & Tab Controls -->
    <div class="space-y-3 border-b border-gray-100 dark:border-gray-800 pb-3">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="w-5 h-5 text-indigo-500" />
          Custom Events Activity
        </h3>
        <span class="text-[11px] text-gray-400 font-mono">Events</span>
      </div>

      <!-- Controls Row: Tab Switcher & Total Count -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-lg shrink-0">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1"
            :class="activeTab === 'summary' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'"
            @click="activeTab = 'summary'"
          >
            <UIcon name="i-heroicons-chart-bar" class="w-3.5 h-3.5 text-indigo-500" />
            Top Hits
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1"
            :class="activeTab === 'stream' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'"
            @click="activeTab = 'stream'"
          >
            <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 text-emerald-500" />
            Stream
          </button>
        </div>

        <span class="text-[11px] font-mono text-gray-400 font-semibold">
          {{ eventsList.length }} logged
        </span>
      </div>
    </div>

    <!-- Category Quick Filters (Only shown if multiple categories exist) -->
    <div v-if="availableCategories.length > 2" class="flex flex-wrap items-center gap-1.5 pt-0.5">
      <button v-for="cat in availableCategories" :key="cat" type="button"
        class="px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-all border uppercase tracking-wider"
        :class="selectedCategory === cat
          ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm font-semibold'
          : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300'" @click="selectedCategory = cat">
        {{ cat }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="eventsList.length === 0" class="text-center py-10 space-y-2">
      <UIcon name="i-heroicons-inbox" class="w-8 h-8 text-gray-400 mx-auto" />
      <p class="text-xs text-gray-500 italic">No custom interaction events recorded yet.</p>
    </div>

    <!-- 1. AGGREGATED SUMMARY VIEW (Easy to read, grouped by eventName) -->
    <div v-else-if="activeTab === 'summary'" class="space-y-3 max-h-[300px] overflow-y-auto pr-1">
      <div v-for="item in aggregatedEvents" :key="item.eventName"
        class="p-3 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-800/80 space-y-2 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 truncate">
            <span class="font-bold text-gray-900 dark:text-gray-100 font-mono">{{ item.eventName }}</span>
            <span class="px-2 py-0.5 text-[10px] font-semibold rounded-md border"
              :class="getCategoryBadge(item.eventCategory).class">
              {{ getCategoryBadge(item.eventCategory).label }}
            </span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span
              class="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
              {{ item.count }} {{ item.count === 1 ? 'hit' : 'hits' }}
            </span>
          </div>
        </div>

        <!-- Progress Bar & Path -->
        <div class="space-y-1">
          <div class="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div class="bg-indigo-500 h-full rounded-full transition-all duration-500"
              :style="{ width: `${item.percentage}%` }" />
          </div>

          <div class="flex items-center justify-between text-[11px] text-gray-500 font-mono">
            <span class="truncate">Latest: <strong class="text-gray-400">{{ item.latestPath }}</strong></span>
            <span class="shrink-0 text-gray-400">{{ formatRelativeTime(item.latestTime) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. CHRONOLOGICAL STREAM VIEW (Detailed line-by-line log feed) -->
    <div v-else class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
      <div v-for="event in filteredEvents" :key="event.id"
        class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-800/80 text-xs hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
        <div class="flex items-center gap-2.5 truncate">
          <div class="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5" />
          </div>

          <div class="truncate">
            <div class="flex items-center gap-2">
              <span class="font-bold text-gray-900 dark:text-gray-100 font-mono">{{ event.eventName }}</span>
              <span class="px-1.5 py-0.2 text-[9px] font-semibold rounded border"
                :class="getCategoryBadge(event.eventCategory).class">
                {{ getCategoryBadge(event.eventCategory).label }}
              </span>
            </div>
            <p class="text-[10px] text-gray-500 font-mono truncate">
              {{ event.path }} <span v-if="event.eventLabel" class="text-gray-400">• {{ event.eventLabel }}</span>
            </p>
          </div>
        </div>

        <div class="text-right shrink-0">
          <span class="text-[11px] font-mono text-gray-400">{{ formatRelativeTime(event.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
