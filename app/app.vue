<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Project Starter - Fullstack Template'
const description = 'Modern Nuxt 4 + Hono Cloudflare Worker full-stack application template.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
})

const { autoInitPushNotifications, startBroadcastListener } = useWebPush()

onMounted(() => {
  if (import.meta.client) {
    // Start background broadcast listener immediately
    startBroadcastListener()

    // Delay prompting the user for notification permission by 2 minutes (120,000 ms)
    setTimeout(() => {
      autoInitPushNotifications()
    }, 2 * 60 * 1000)
  }
})
</script>

<template>
  <UApp :toaster="{ position: 'top-right', max: 1 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <GoogleOneTap />
  </UApp>
</template>
