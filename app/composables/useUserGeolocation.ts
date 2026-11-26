/**
 * Browser Geolocation Composable (useUserGeolocation)
 * Prompts the user for GPS location permission (Latitude & Longitude)
 * and stores high-precision coordinates for analytics tracking.
 */
export function useUserGeolocation() {
  const latitude = ref<number | null>(null);
  const longitude = ref<number | null>(null);
  const isGranted = ref<boolean>(false);
  const isPending = ref<boolean>(false);
  const errorMsg = ref<string | null>(null);

  /**
   * Prompts the browser to ask user for Geolocation permission
   */
  async function requestUserLocation(): Promise<{ lat: number; lng: number } | null> {
    if (!import.meta.client) return null;
    if (!('geolocation' in navigator)) {
      errorMsg.value = 'Geolocation is not supported by your browser';
      return null;
    }

    isPending.value = true;
    errorMsg.value = null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          latitude.value = lat;
          longitude.value = lng;
          isGranted.value = true;
          isPending.value = false;

          // Cache in sessionStorage for subsequent page tracking requests (valid for 30 minutes)
          try {
            sessionStorage.setItem('user_gps_lat', String(lat));
            sessionStorage.setItem('user_gps_lng', String(lng));
            sessionStorage.setItem('user_gps_timestamp', String(Date.now()));
          } catch {}

          resolve({ lat, lng });
        },
        (err) => {
          isPending.value = false;
          isGranted.value = false;
          errorMsg.value = err.message || 'User denied location access';
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // Cache location for 5 minutes in browser
        }
      );
    });
  }

  const GPS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL

  /**
   * Clears cached GPS coordinates from sessionStorage
   */
  function clearCachedLocation() {
    if (!import.meta.client) return;
    try {
      sessionStorage.removeItem('user_gps_lat');
      sessionStorage.removeItem('user_gps_lng');
      sessionStorage.removeItem('user_gps_timestamp');
    } catch {}
  }

  /**
   * Retrieves cached GPS coordinates from sessionStorage if unexpired
   */
  function getCachedLocation(): { lat: number; lng: number } | null {
    if (!import.meta.client) return null;
    try {
      const cachedLat = sessionStorage.getItem('user_gps_lat');
      const cachedLng = sessionStorage.getItem('user_gps_lng');
      const cachedTimestamp = sessionStorage.getItem('user_gps_timestamp');

      if (cachedLat && cachedLng) {
        if (cachedTimestamp) {
          const age = Date.now() - parseInt(cachedTimestamp, 10);
          if (age > GPS_CACHE_TTL_MS) {
            clearCachedLocation();
            return null;
          }
        }
        const lat = parseFloat(cachedLat);
        const lng = parseFloat(cachedLng);
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
          return { lat, lng };
        }
      }
    } catch {}
    return null;
  }

  return {
    latitude,
    longitude,
    isGranted,
    isPending,
    errorMsg,
    requestUserLocation,
    getCachedLocation,
    clearCachedLocation,
  };
}
