import type { CloudinaryUploadResponse, UploadOptions } from '@restaurant-menu/shared';

/**
 * Composable for uploading media and files to Cloudinary via external API.
 * Uses NUXT_API_UPLOAD_IMG and API_KEY from runtime config.
 */
export function useUpload() {
  const config = useRuntimeConfig();

  const isUploading = ref<boolean>(false);
  const progress = ref<number>(0);
  const error = ref<string | null>(null);
  const uploadedData = ref<CloudinaryUploadResponse | null>(null);

  /**
   * Resolve target upload URL based on base URL and destination folder
   */
  function getUploadUrl(folder: string = 'uploads'): string {
    const rawBase = (config.public.apiUploadImg as string) || '';
    const cleanBase = rawBase.trim().replace(/\/+$/, '');

    if (!cleanBase) {
      throw new Error('Upload API URL is not configured in NUXT_API_UPLOAD_IMG');
    }

    // If base URL already includes /api, don't duplicate it
    if (cleanBase.endsWith('/api')) {
      return `${cleanBase}/${folder}`;
    }

    return `${cleanBase}/api/${folder}`;
  }

  /**
   * Upload file with genuine progress tracking using XMLHttpRequest
   */
  async function uploadFile(
    file: File,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResponse> {
    const folder = options.folder ?? 'uploads';
    const fieldName = options.field ?? 'image';
    const apiKey = options.apiKey || (config.public.apiUploadKey as string) || '';

    const targetUrl = getUploadUrl(folder);

    isUploading.value = true;
    progress.value = 0;
    error.value = null;

    const formData = new FormData();
    formData.append(fieldName, file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', targetUrl, true);

      if (apiKey) {
        xhr.setRequestHeader('x-api-key', apiKey);
      }

      // Track genuine upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          progress.value = percent;
          options.onProgress?.(percent);
        }
      };

      xhr.onload = () => {
        isUploading.value = false;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response: CloudinaryUploadResponse = JSON.parse(xhr.responseText);
            uploadedData.value = response;
            progress.value = 100;
            resolve(response);
          } catch {
            const err = 'Failed to parse upload server response JSON';
            error.value = err;
            reject(new Error(err));
          }
        } else {
          let errMsg = `Upload failed with status ${xhr.status}`;
          try {
            const errJson = JSON.parse(xhr.responseText);
            errMsg = errJson.message || errJson.error || errMsg;
          } catch {}
          error.value = errMsg;
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => {
        isUploading.value = false;
        const errMsg = 'Network error during file upload';
        error.value = errMsg;
        reject(new Error(errMsg));
      };

      xhr.onabort = () => {
        isUploading.value = false;
        const errMsg = 'Upload aborted';
        error.value = errMsg;
        reject(new Error(errMsg));
      };

      xhr.send(formData);
    });
  }

  /**
   * Delete uploaded media from Cloudinary
   */
  async function deleteFile(
    publicId: string,
    resourceType: 'images' | 'videos' | 'files' = 'images'
  ): Promise<boolean> {
    const rawBase = (config.public.apiUploadImg as string) || '';
    const cleanBase = rawBase.trim().replace(/\/+$/, '');
    const apiKey = (config.public.apiUploadKey as string) || '';

    if (!cleanBase) {
      throw new Error('Upload API URL is not configured in NUXT_API_UPLOAD_IMG');
    }

    const deleteEndpoint = cleanBase.endsWith('/api')
      ? `${cleanBase}/${resourceType}/${publicId}`
      : `${cleanBase}/api/${resourceType}/${publicId}`;

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    try {
      await $fetch(deleteEndpoint, {
        method: 'DELETE',
        headers,
      });
      return true;
    } catch (err: any) {
      error.value = err.message || 'Failed to delete file';
      return false;
    }
  }

  return {
    uploadFile,
    deleteFile,
    isUploading,
    progress,
    error,
    uploadedData,
  };
}
