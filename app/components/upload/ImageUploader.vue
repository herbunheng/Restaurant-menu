<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  ProgressRoot,
  ProgressIndicator,
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
} from 'reka-ui';
import type { CloudinaryUploadResponse } from '@restaurant-menu/shared';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    folder?: string;
    label?: string;
    hint?: string;
    maxSizeMB?: number;
    disabled?: boolean;
    aspectRatio?: 'square' | 'video' | 'auto';
  }>(),
  {
    modelValue: '',
    folder: 'menu',
    label: 'Upload Image',
    hint: 'PNG, JPG, WEBP, or GIF up to 10MB',
    maxSizeMB: 10,
    disabled: false,
    aspectRatio: 'square',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', url: string): void;
  (e: 'success', data: CloudinaryUploadResponse): void;
  (e: 'error', message: string): void;
}>();

const { uploadFile, isUploading, progress, error } = useUpload();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref<boolean>(false);
const previewUrl = ref<string>(props.modelValue || '');
const copied = ref<boolean>(false);
const isPreviewOpen = ref<boolean>(false);
const uploadMeta = ref<CloudinaryUploadResponse | null>(null);

// Sync with prop when changed externally
watch(
  () => props.modelValue,
  (val) => {
    if (val !== previewUrl.value) {
      previewUrl.value = val || '';
    }
  }
);

function triggerFileInput() {
  if (props.disabled || isUploading.value) return;
  fileInputRef.value?.click();
}

async function handleFile(file: File) {
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    const msg = 'Please select a valid image file (PNG, JPG, WEBP, GIF)';
    emit('error', msg);
    return;
  }

  // Validate size
  const maxBytes = props.maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    const msg = `Image size exceeds the maximum limit of ${props.maxSizeMB}MB`;
    emit('error', msg);
    return;
  }

  // Create temporary local preview
  const localPreview = URL.createObjectURL(file);
  previewUrl.value = localPreview;

  try {
    const res = await uploadFile(file, {
      folder: props.folder,
      field: 'image',
    });

    uploadMeta.value = res;
    previewUrl.value = res.url;
    emit('update:modelValue', res.url);
    emit('success', res);
  } catch (err: any) {
    emit('error', err.message || 'Image upload failed');
  } finally {
    // Revoke object URL
    URL.revokeObjectURL(localPreview);
  }
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    handleFile(target.files[0]);
  }
  // Reset input value so same file can be re-selected if needed
  if (target) target.value = '';
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  if (props.disabled || isUploading.value) return;
  isDragging.value = true;
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
  if (props.disabled || isUploading.value) return;

  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    handleFile(e.dataTransfer.files[0]);
  }
}

function removeImage() {
  previewUrl.value = '';
  uploadMeta.value = null;
  emit('update:modelValue', '');
}

async function copyUrl() {
  if (!previewUrl.value) return;
  try {
    await navigator.clipboard.writeText(previewUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {}
}

const aspectRatioClass = computed(() => {
  switch (props.aspectRatio) {
    case 'square':
      return 'aspect-square';
    case 'video':
      return 'aspect-video';
    default:
      return 'min-h-[220px]';
  }
});
</script>

<template>
  <TooltipProvider :delay-duration="150">
    <div class="w-full flex flex-col gap-2">
      <!-- Label & Hint -->
      <div v-if="label" class="flex items-center justify-between">
        <label class="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {{ label }}
        </label>
        <span v-if="hint && !previewUrl" class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ hint }}
        </span>
      </div>

      <!-- Main Uploader Box -->
      <div
        class="relative w-full rounded-2xl border-2 transition-all duration-200 overflow-hidden flex flex-col items-center justify-center p-4 bg-neutral-50/50 dark:bg-neutral-900/40"
        :class="[
          aspectRatioClass,
          isDragging
            ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/20 scale-[0.99]'
            : 'border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ]"
        @click="!previewUrl && triggerFileInput()"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <!-- Hidden file input -->
        <input
          ref="fileInputRef"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          class="hidden"
          :disabled="disabled || isUploading"
          @change="onFileSelected"
        />

        <!-- Image Preview State (When image is uploaded or selected) -->
        <div v-if="previewUrl" class="absolute inset-0 w-full h-full group">
          <img
            :src="previewUrl"
            alt="Uploaded Preview"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <!-- Dark Overlay on Hover -->
          <div
            class="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-xs p-3"
          >
            <!-- Preview Dialog Trigger -->
            <DialogRoot v-model:open="isPreviewOpen">
              <TooltipRoot>
                <TooltipTrigger as-child>
                  <DialogTrigger as-child>
                    <button
                      type="button"
                      class="p-2.5 rounded-xl bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-all hover:scale-110 active:scale-95"
                    >
                      <UIcon name="i-lucide-maximize-2" class="w-4 h-4" />
                    </button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent
                    side="top"
                    class="rounded-lg bg-neutral-900 text-white text-xs px-2.5 py-1.5 shadow-lg select-none z-50"
                  >
                    View Full Image
                  </TooltipContent>
                </TooltipPortal>
              </TooltipRoot>

              <!-- Reka UI Dialog Portal & Content -->
              <DialogPortal>
                <DialogOverlay
                  class="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in"
                />
                <DialogContent
                  class="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-4xl w-[90vw] max-h-[85vh] p-2 bg-neutral-900/90 rounded-2xl border border-neutral-800 shadow-2xl flex flex-col items-center justify-center overflow-hidden"
                >
                  <div class="w-full flex items-center justify-between px-3 py-2">
                    <DialogTitle class="text-sm font-semibold text-neutral-200 truncate">
                      Cloudinary Preview
                    </DialogTitle>
                    <DialogClose as-child>
                      <button
                        type="button"
                        class="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                      >
                        <UIcon name="i-lucide-x" class="w-5 h-5" />
                      </button>
                    </DialogClose>
                  </div>
                  <div class="w-full h-full flex items-center justify-center p-2 overflow-auto">
                    <img
                      :src="previewUrl"
                      alt="Full Preview"
                      class="max-w-full max-h-[70vh] object-contain rounded-xl"
                    />
                  </div>
                </DialogContent>
              </DialogPortal>
            </DialogRoot>

            <!-- Copy URL Button -->
            <TooltipRoot>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="p-2.5 rounded-xl bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-all hover:scale-110 active:scale-95"
                  @click.stop="copyUrl"
                >
                  <UIcon
                    :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                    class="w-4 h-4"
                    :class="copied ? 'text-emerald-600' : ''"
                  />
                </button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  side="top"
                  class="rounded-lg bg-neutral-900 text-white text-xs px-2.5 py-1.5 shadow-lg select-none z-50"
                >
                  {{ copied ? 'Copied URL!' : 'Copy Cloudinary URL' }}
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>

            <!-- Replace Image Button -->
            <TooltipRoot>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="p-2.5 rounded-xl bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-all hover:scale-110 active:scale-95"
                  @click.stop="triggerFileInput"
                >
                  <UIcon name="i-lucide-refresh-cw" class="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  side="top"
                  class="rounded-lg bg-neutral-900 text-white text-xs px-2.5 py-1.5 shadow-lg select-none z-50"
                >
                  Change Image
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>

            <!-- Remove Button -->
            <TooltipRoot>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="p-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all hover:scale-110 active:scale-95"
                  @click.stop="removeImage"
                >
                  <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  side="top"
                  class="rounded-lg bg-neutral-900 text-white text-xs px-2.5 py-1.5 shadow-lg select-none z-50"
                >
                  Remove
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
          </div>
        </div>

        <!-- Upload Progress Indicator (Using Reka UI Progress) -->
        <div
          v-if="isUploading"
          class="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 gap-3 z-20"
        >
          <div class="flex items-center gap-2 text-white font-medium text-sm">
            <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-primary-400" />
            <span>Uploading to Cloudinary... {{ progress }}%</span>
          </div>

          <!-- Reka UI Progress Root & Indicator -->
          <ProgressRoot
            :model-value="progress"
            class="relative overflow-hidden bg-neutral-700/60 rounded-full w-48 h-2.5"
          >
            <ProgressIndicator
              class="bg-linear-to-r from-primary-500 to-emerald-400 h-full w-full flex-1 transition-transform duration-300 ease-in-out"
              :style="`transform: translateX(-${100 - progress}%)`"
            />
          </ProgressRoot>
        </div>

        <!-- Empty Placeholder State -->
        <div
          v-if="!previewUrl && !isUploading"
          class="flex flex-col items-center justify-center text-center gap-3 p-4 select-none pointer-events-none"
        >
          <div
            class="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-xs transition-transform group-hover:scale-110"
          >
            <UIcon name="i-lucide-cloud-upload" class="w-6 h-6" />
          </div>

          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              <span class="text-primary-600 dark:text-primary-400 underline underline-offset-2">
                Click to upload
              </span>
              or drag & drop
            </p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              Folder: <code class="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono">{{ folder }}</code>
            </p>
          </div>
        </div>
      </div>

      <!-- Error alert -->
      <div
        v-if="error"
        class="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs"
      >
        <UIcon name="i-lucide-alert-circle" class="w-4 h-4 shrink-0" />
        <span class="flex-1">{{ error }}</span>
      </div>
    </div>
  </TooltipProvider>
</template>
