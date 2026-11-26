<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error?: NuxtError
}>()

const is404 = computed(() => props.error?.statusCode === 404 || props.error?.statusCode === '404')

const title = computed(() => is404.value ? 'Page Not Found' : 'An Error Occurred')
const description = computed(() => is404.value
  ? "The page you are looking for doesn't exist or has been moved."
  : (props.error?.statusMessage || props.error?.message || 'Something went wrong while processing your request.'))

useHead({
  title: `${props.error?.statusCode || 404} - ${title.value}`
})

const handleClearError = () => {
  clearError({ redirect: '/' })
}

const handleGoBack = () => {
  if (import.meta.client && window.history.length > 1) {
    window.history.back()
  } else {
    clearError({ redirect: '/' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground flex flex-col justify-between">
    <!-- Header bar -->
    <header class="border-b border-gray-200 dark:border-gray-800 bg-background/80 backdrop-blur py-4 px-6 flex items-center justify-between">
      <NuxtLink to="/" class="font-bold text-xl text-primary-600 dark:text-primary-400 flex items-center gap-2">
        <UIcon name="i-heroicons-cube" class="w-6 h-6" />
        <span>AppBrand</span>
      </NuxtLink>
      <UColorModeButton />
    </header>

    <!-- Main Error Content -->
    <main class="flex-1 flex items-center justify-center p-6">
      <div class="max-w-2xl w-full text-center space-y-8">
        <!-- Error Badge -->
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 dark:bg-primary-400/10 text-primary-600 dark:text-primary-400 text-xs font-semibold tracking-wide uppercase border border-primary-500/20">
          <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 animate-pulse" />
          <span>Error {{ error?.statusCode || 404 }} • {{ title }}</span>
        </div>

        <!-- Animated Number Glow -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center justify-center blur-3xl opacity-20 dark:opacity-30 -z-10 pointer-events-none">
            <div class="w-72 h-72 bg-gradient-to-tr from-primary-500 to-emerald-400 rounded-full" />
          </div>
          <h1 class="text-8xl sm:text-9xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-gray-900 via-gray-700 to-gray-400 dark:from-white dark:via-gray-200 dark:to-gray-600 select-none">
            {{ error?.statusCode || 404 }}
          </h1>
        </div>

        <!-- Message -->
        <div class="space-y-3 max-w-md mx-auto">
          <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {{ is404 ? "Oops! Page not found" : "Something went wrong" }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed">
            {{ description }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
          <UButton
            size="lg"
            color="primary"
            icon="i-lucide-arrow-left"
            @click="handleGoBack"
          >
            Go Back
          </UButton>

          <UButton
            size="lg"
            color="neutral"
            variant="outline"
            icon="i-lucide-home"
            @click="handleClearError"
          >
            Return Home
          </UButton>
        </div>

        <!-- Development Stack / Details if non-404 and available -->
        <div v-if="!is404 && error?.stack" class="mt-8 text-left bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-xs font-mono max-h-48 border border-gray-800">
          <div class="text-red-400 font-bold mb-2">Error Stack Trace (Development view):</div>
          <pre>{{ error.stack }}</pre>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-200 dark:border-gray-800 py-4 px-6 text-center text-xs text-gray-500 dark:text-gray-400">
      © {{ new Date().getFullYear() }} AppBrand. All rights reserved.
    </footer>
  </div>
</template>
