<script setup lang="ts">
import { ref } from 'vue';
import type { CloudinaryUploadResponse } from '@restaurant-menu/shared';

const menuImageUrl = ref<string>('');
const selectedFolder = ref<string>('menu');
const lastUploadResult = ref<CloudinaryUploadResponse | null>(null);

function handleUploadSuccess(result: CloudinaryUploadResponse) {
  lastUploadResult.value = result;
}
</script>

<template>
  <div class="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-neutral-50 dark:bg-neutral-950">
    <div class="max-w-2xl mx-auto space-y-8">
      <!-- Header -->
      <div class="text-center space-y-2">
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-xs font-medium">
          <UIcon name="i-lucide-sparkles" class="w-3.5 h-3.5" />
          <span>Cloudinary + Reka UI Integration</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Upload Image to Cloudinary
        </h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          សាកល្បង Upload រូបភាពមុខម្ហូប (Dish Image) ទៅកាន់ Cloudinary ដោយប្រើ Reka UI Component
        </p>
      </div>

      <!-- Main Card -->
      <div
        class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
        <!-- Target Folder Selector -->
        <div class="flex items-center justify-between gap-4">
          <label class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Target Cloudinary Folder:
          </label>
          <div class="flex gap-2">
            <button v-for="folder in ['menu', 'categories', 'avatars', 'banners']" :key="folder" type="button"
              class="px-3 py-1 text-xs font-medium rounded-lg transition-colors" :class="[
                selectedFolder === folder
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700',
              ]" @click="selectedFolder = folder">
              {{ folder }}
            </button>
          </div>
        </div>

        <!-- Reka UI Image Uploader Component -->
        <UploadImageUploader v-model="menuImageUrl" :folder="selectedFolder" label="រូបភាពមុខម្ហូប (Menu Item Photo)"
          hint="PNG, JPG, ឬ WEBP (ទំហំអតិបរមា 10MB)" aspect-ratio="video" @success="handleUploadSuccess" />

        <!-- Result Details if Uploaded -->
        <div v-if="lastUploadResult"
          class="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <UIcon name="i-lucide-check-circle" class="w-4 h-4" />
              Upload ជោគជ័យ (WebP Optimized)
            </span>
            <span class="text-xs text-neutral-500 font-mono">
              {{ (lastUploadResult.bytes / 1024).toFixed(1) }} KB
            </span>
          </div>

          <div class="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-mono">
            <div class="flex items-center justify-between">
              <span>Public ID:</span>
              <span class="text-neutral-900 dark:text-neutral-200">{{ lastUploadResult.publicId }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Format / Size:</span>
              <span class="text-neutral-900 dark:text-neutral-200">
                {{ lastUploadResult.format.toUpperCase() }} ({{ lastUploadResult.width }}x{{ lastUploadResult.height
                }}px)
              </span>
            </div>
            <div class="truncate pt-1">
              <span class="block text-neutral-500 mb-0.5">Cloudinary URL:</span>
              <a :href="lastUploadResult.url" target="_blank" rel="noopener"
                class="text-primary-600 dark:text-primary-400 hover:underline break-all">
                {{ lastUploadResult.url }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
