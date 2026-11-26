import type { ApiResponse } from '@restaurant-menu/shared';

/**
 * Reusable Typed API Client Composable ($api)
 * Automatically prepends NUXT_PUBLIC_API_BASE_URL, attaches JWT tokens,
 * and handles @restaurant-menu/shared response unwrapping & error formatting.
 */
export function useApi() {
  const config = useRuntimeConfig();
  const tokenCookie = useCookie<string | null>('auth_token');

  /**
   * Universal fetch wrapper for API calls returning typed data payload
   */
  async function apiFetch<T>(endpoint: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    const baseUrl = config.public.apiBaseUrl ?? '';
    const requestUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Attach JWT Authorization Bearer Token if present
    if (tokenCookie.value) {
      headers['Authorization'] = `Bearer ${tokenCookie.value}`;
    }

    // Attach Client GPS Coordinates if fresh and unexpired
    if (import.meta.client) {
      try {
        const { getCachedLocation } = useUserGeolocation();
        const cached = getCachedLocation();
        if (cached) {
          headers['x-user-latitude'] = String(cached.lat);
          headers['x-user-longitude'] = String(cached.lng);
        }
      } catch {}
    }

    try {
      const response = await $fetch<ApiResponse<T>>(requestUrl, {
        credentials: 'include',
        ...options,
        headers,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'API Request Failed');
      }

      return response.data as T;
    } catch (err: any) {
      const errorMessage = err?.data?.error?.message || err?.message || 'Network Communication Error';
      throw new Error(errorMessage);
    }
  }

  return {
    $api: apiFetch,
  };
}
