<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    streamUrl?: string
    title?: string
    maxItems?: number
  }>(),
  {
    streamUrl: '/api/stream',
    title: 'Live Real-Time Activity',
    maxItems: 15,
  }
)

const config = useRuntimeConfig()
const fullUrl = computed(() => {
  const base = config.public.apiBaseUrl ?? ''
  return `${base}${props.streamUrl.startsWith('/') ? '' : '/'}${props.streamUrl}`
})

interface StreamItem {
  count?: number
  message?: string
  timestamp?: string
  [key: string]: any
}

const { events, isConnected, connect, disconnect } = useEventSource<StreamItem>(fullUrl.value)

const displayEvents = computed(() => events.value.slice(0, props.maxItems))
</script>

<template>
  <UCard class="w-full">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-rss" class="w-5 h-5 text-primary-500 animate-pulse" />
          <h3 class="font-bold text-lg">{{ title }}</h3>
        </div>
        <div class="flex items-center gap-2">
          <UBadge :color="isConnected ? 'success' : 'neutral'" variant="soft">
            {{ isConnected ? 'Live Connected' : 'Disconnected' }}
          </UBadge>
          <UButton
            v-if="!isConnected"
            size="xs"
            color="primary"
            variant="ghost"
            icon="i-heroicons-arrow-path"
            @click="connect"
          >
            Reconnect
          </UButton>
          <UButton
            v-else
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-power"
            @click="disconnect"
          >
            Stop
          </UButton>
        </div>
      </div>
    </template>

    <div v-if="displayEvents.length === 0" class="py-8 text-center text-sm text-gray-500">
      Waiting for live events...
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="(item, index) in displayEvents"
        :key="index"
        class="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg flex items-center justify-between text-sm transition-all"
      >
        <div class="flex items-center gap-3">
          <UBadge size="xs" color="primary" variant="subtle">#{{ item.count || index + 1 }}</UBadge>
          <span>{{ item.message || JSON.stringify(item) }}</span>
        </div>
        <span class="text-xs text-gray-400 font-mono">{{ item.timestamp }}</span>
      </div>
    </div>
  </UCard>
</template>
