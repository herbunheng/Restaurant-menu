/**
 * Helper to convert Base64 URL string to Uint8Array for VAPID applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let lastSeenBroadcastId: string | null = null;
let broadcastListenerTimer: NodeJS.Timeout | null = null;

export function useWebPush() {
  const { $api } = useApi();
  const config = useRuntimeConfig();

  /**
   * Requests notification permission, registers service worker,
   * creates push subscription, and sends subscription payload to backend API.
   */
  async function enablePushNotifications() {
    if (!import.meta.client) return null;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Web Push notifications are not supported in this browser.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was denied by user.');
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const { fetchPublicConfig } = usePublicConfig();
    const publicConfig = await fetchPublicConfig();
    const rawVapidKey = publicConfig?.vapidPublicKey || config.public.vapidPublicKey;
    const vapidKey = typeof rawVapidKey === 'string' ? rawVapidKey : String(rawVapidKey || '');

    if (!vapidKey || vapidKey === '[object Object]') {
      throw new Error('VAPID public key is missing. Please configure Notification VAPID Key in Super Admin Settings.');
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });

    // Send subscription payload to Hono Backend API
    await $api('/api/push/subscribe', {
      method: 'POST',
      body: subscription.toJSON(),
    });

    // Display immediate test notification banner on user's device
    if (registration) {
      registration.showNotification('Push Notifications Active 🔔', {
        body: 'You are now subscribed to instant broadcast updates from site admin.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { url: '/' },
      });
    }

    return subscription;
  }

  /**
   * Automatically prompts notification permission & registers push subscription on site load
   */
  async function autoInitPushNotifications() {
    if (!import.meta.client) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    if (Notification.permission === 'denied') return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const { fetchPublicConfig } = usePublicConfig();
        const publicConfig = await fetchPublicConfig();
        const rawVapidKey = publicConfig?.vapidPublicKey || config.public.vapidPublicKey;
        const vapidKey = typeof rawVapidKey === 'string' ? rawVapidKey : String(rawVapidKey || '');

        if (vapidKey && vapidKey !== '[object Object]') {
          const applicationServerKey = urlBase64ToUint8Array(vapidKey);
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as BufferSource,
          });

          await $api('/api/push/subscribe', {
            method: 'POST',
            body: subscription.toJSON(),
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[AutoWebPush] Automatic push initialization notice:', err);
    }
  }

  /**
   * Starts listening for live broadcast notifications from backend API
   */
  function startBroadcastListener() {
    if (!import.meta.client) return;
    if (broadcastListenerTimer) return;

    broadcastListenerTimer = setInterval(async () => {
      if (Notification.permission !== 'granted') return;

      try {
        const res = await $api<{ latestBroadcast?: { id: string; title: string; message: string; url: string } | null }>(
          '/api/push/latest',
          { method: 'GET' }
        );

        const b = res?.latestBroadcast;
        if (b && b.id && b.id !== lastSeenBroadcastId) {
          lastSeenBroadcastId = b.id;

          const registration = await navigator.serviceWorker.ready.catch(() => null);
          if (registration) {
            registration.showNotification(b.title || '📢 System Broadcast', {
              body: b.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              data: { url: b.url || '/' },
            });
          } else {
            new Notification(b.title || '📢 System Broadcast', {
              body: b.message,
              icon: '/favicon.ico',
              data: { url: b.url || '/' },
            });
          }
        }
      } catch {
        // Silently skip on network error
      }
    }, 4000);
  }

  return {
    enablePushNotifications,
    autoInitPushNotifications,
    startBroadcastListener,
  };
}
