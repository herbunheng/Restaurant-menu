export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter();
  const { $api } = useApi();
  const { requestUserLocation, getCachedLocation } = useUserGeolocation();

  function trackPage(path: string, force = false) {
    if (!import.meta.client) return;
    // Skip tracking api calls or static asset routes
    if (path.startsWith('/api/') || path.includes('.')) return;

    // Check if path has already been tracked in this browser session (unless forced after GPS acquisition)
    const storageKey = `tracked_page_${path}`;
    try {
      if (!force && sessionStorage.getItem(storageKey)) {
        return;
      }
      sessionStorage.setItem(storageKey, 'true');
    } catch {
      // Ignore sessionStorage access errors (e.g. strict privacy mode)
    }

    $api('/api/metrics/track', {
      method: 'POST',
      body: { path },
    }).catch((err) => {
      // On tracking failure, allow retrying by clearing key
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      // Non-blocking background analytics tracking error
      console.warn('Analytics pageview track error:', err?.message || err);
    });
  }

  // Track page view on initial app mount (silent IP-based detection by default)
  if (import.meta.client) {
    nuxtApp.hook('app:mounted', () => {
      trackPage(window.location.pathname);
    });
  }

  // Track page view on client-side route navigation
  router.afterEach((to) => {
    trackPage(to.path);
  });
});
