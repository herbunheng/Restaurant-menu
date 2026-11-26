---
name: cloudinary-upload
description: >-
  Use this skill when handling media, image, or document uploads to Cloudinary via external API services
  configured through environment variables (NUXT_API_UPLOAD_IMG, API_KEY), implementing Reka UI image
  uploaders, or integrating Cloudinary file storage in Nuxt 4 applications.
---

# Cloudinary Upload & Media Management Skill

This skill documents how to integrate, configure, and use Cloudinary media upload services within this full-stack Nuxt 4 project. It covers API specifications, environment variable bindings (`NUXT_API_UPLOAD_IMG`), composable workflows, and Reka UI upload components.

---

## 1. Environment Configuration

The upload service URL and API credentials must be declared in `.env`:

```env
# Cloudinary Upload API Base URL
NUXT_API_UPLOAD_IMG=https://api-upload-image-8ym9.onrender.com

# Upload API Authentication Secret (Header: x-api-key)
API_KEY=crypten-api-key
API_BYPASS_KEY=crypten-bypass-secret
```

In `nuxt.config.ts`, these values are exposed through `runtimeConfig`:

```ts
runtimeConfig: {
  apiUploadImg: process.env.NUXT_API_UPLOAD_IMG || "",
  apiUploadKey: process.env.API_KEY || "",
  public: {
    apiUploadImg: process.env.NUXT_API_UPLOAD_IMG || "",
    apiUploadKey: process.env.API_KEY || "",
  },
}
```

---

## 2. API Contract & Endpoints

Based on `app/lib/upload/README.md`, the backend API provides:

### A. Upload Media
- **Endpoint**: `POST /api/:folder?` (e.g. `/api/uploads`, `/api/menu`, `/api/avatars`)
- **Headers**:
  - `x-api-key: <API_KEY>`
- **Form-Data Fields**:
  - `image`: Images (converts to optimized WebP by default)
  - `file`: Documents / raw files (JSON, CSV, DOCX, ZIP)
  - `pdf`: PDF files
  - `video`: Videos (MP4, MOV, WEBM)

**Success Response (`200 OK`)**:
```json
{
  "publicId": "menu/dish_abc123",
  "url": "https://res.cloudinary.com/cloud_name/image/upload/v1722850000/menu/dish_abc123.webp",
  "resourceType": "image",
  "width": 1200,
  "height": 800,
  "format": "webp",
  "bytes": 245678,
  "createdAt": "2026-08-05T10:00:00Z"
}
```

### B. Delete Media
- **Endpoint**: `DELETE /api/images/*` or `DELETE /api/files/*`
- **Headers**: `x-api-key: <API_KEY>`

---

## 3. Composable Usage (`useUpload`)

Path: `app/composables/useUpload.ts`

```vue
<script setup lang="ts">
const { uploadFile, isUploading, progress, error } = useUpload();

async function handleUpload(file: File) {
  try {
    const result = await uploadFile(file, {
      folder: 'menu',      // target folder in Cloudinary
      field: 'image',     // 'image' | 'file' | 'pdf' | 'video'
      onProgress: (pct) => {
        console.log(`Upload progress: ${pct}%`);
      },
    });

    console.log('Uploaded Cloudinary URL:', result.url);
  } catch (err) {
    console.error('Upload failed:', err);
  }
}
</script>
```

---

## 4. Reka UI Upload Component (`ImageUploader`)

Path: `app/components/upload/ImageUploader.vue`

This component leverages **Reka UI** primitives for accessibility and UI polish:
- `ProgressRoot` & `ProgressIndicator`: Smooth percentage-based upload progress bar
- `DialogRoot`, `DialogOverlay`, `DialogContent`: Full-resolution image preview lightbox modal
- `TooltipProvider`, `TooltipRoot`, `TooltipTrigger`: Interactive tooltips for action buttons

### Usage in Pages / Forms:

```vue
<template>
  <div class="max-w-md">
    <!-- Two-way binding for menu dish image -->
    <UploadImageUploader
      v-model="dishImageUrl"
      folder="menu"
      label="Dish Photo (រូបថតមុខម្ហូប)"
      hint="Supports PNG, JPG, or WEBP up to 10MB"
      aspect-ratio="square"
      @success="onUploadSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { CloudinaryUploadResponse } from '@restaurant-menu/shared';

const dishImageUrl = ref('');

function onUploadSuccess(data: CloudinaryUploadResponse) {
  console.log('Saved Cloudinary Public ID:', data.publicId);
  console.log('Saved Cloudinary WebP URL:', data.url);
}
</script>
```

---

## 5. Security & Best Practices

1. **Keep Secrets in `.env`**: Never hardcode `API_KEY` or `API_BYPASS_KEY` in git-tracked code.
2. **WebP Optimization**: Cloudinary automatically converts uploads into lightweight `.webp` format for high performance.
3. **Folder Organization**: Categorize uploads into distinct folders (e.g. `menu`, `categories`, `avatars`, `banners`) via the `folder` prop.
