import type { AsyncDataOptions } from 'nuxt/app';

/**
 * Cached API Data Fetching Composable (useApiData)
 * Wraps useApi ($api) inside Nuxt's built-in useAsyncData payload cache.
 *
 * When users navigate between pages, Nuxt reuses cached data automatically
 * without re-fetching from the server unless refresh() is called or key changes.
 */
export function useApiData<T>(
  key: string,
  endpoint: string | (() => string),
  options: AsyncDataOptions<T> = {},
) {
  const { $api } = useApi();

  return useAsyncData<T>(
    key,
    () => {
      const url = typeof endpoint === "function" ? endpoint() : endpoint;
      return $api<T>(url);
    },
    {
      lazy: true,
      dedupe: "cancel",
      ...options,
    },
  );
}
