<script setup lang="ts">
const route = useRoute()
const router = useRouter()

// Ensure SSR returns a 404 HTTP status code for crawlers & search engines
if (import.meta.server) {
  const event = useNuxtApp().ssrContext?.event
  if (event) {
    setResponseStatus(event, 404, 'Page Not Found')
  }
}

useSeoMeta({
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist or has been moved.',
  robots: 'noindex, nofollow'
})

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const quickLinks = [
  { title: 'Home', description: 'Return to the main landing page', icon: 'i-lucide-home', to: '/' },
  { title: 'Explore', description: 'Discover features and integrations', icon: 'i-lucide-compass', to: '/explore' },
  { title: 'Pricing', description: 'View plans and pricing options', icon: 'i-lucide-credit-card', to: '/pricing' },
  { title: 'Admin Portal', description: 'Access system management', icon: 'i-lucide-shield-check', to: '/admin' }
]
</script>

<template>
  <div class="min-h-[75vh] flex items-center justify-center py-12 px-4">
    <div class="max-w-3xl w-full text-center space-y-8">
      <!-- Top Decorative Badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 dark:bg-primary-400/10 text-primary-600 dark:text-primary-400 text-xs font-semibold tracking-wide uppercase border border-primary-500/20">
        <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 animate-pulse" />
        <span>Error 404 • Page Not Found</span>
      </div>

      <!-- Glowing 404 Display -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center justify-center blur-3xl opacity-20 dark:opacity-30 -z-10 pointer-events-none">
          <div class="w-72 h-72 bg-gradient-to-tr from-primary-500 to-emerald-400 rounded-full" />
        </div>
        <h1 class="text-8xl sm:text-9xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-gray-900 via-gray-700 to-gray-400 dark:from-white dark:via-gray-200 dark:to-gray-600 select-none">
          404
        </h1>
      </div>

      <!-- Text Content -->
      <div class="space-y-3 max-w-lg mx-auto">
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Looks like you've wandered off map
        </h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed">
          The page you requested <code class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400 font-mono text-xs">{{ route.path }}</code> doesn't exist, was moved, or is temporarily unavailable.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
        <UButton
          size="lg"
          color="primary"
          icon="i-lucide-arrow-left"
          @click="goBack"
        >
          Go Back
        </UButton>

        <UButton
          size="lg"
          color="neutral"
          variant="outline"
          icon="i-lucide-home"
          to="/"
        >
          Back to Home
        </UButton>
      </div>

      <!-- Quick Navigation Cards -->
      <div class="pt-8 border-t border-gray-200 dark:border-gray-800/80">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
          Popular Destinations
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <NuxtLink
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="group p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800/80 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all duration-200 shadow-xs hover:shadow-md flex items-start gap-3"
          >
            <div class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-500/10 group-hover:text-primary-600 dark:group-hover:text-primary-400 text-gray-500 transition-colors">
              <UIcon :name="link.icon" class="w-5 h-5" />
            </div>
            <div>
              <div class="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1">
                {{ link.title }}
                <UIcon name="i-lucide-chevron-right" class="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ link.description }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
