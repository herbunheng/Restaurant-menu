<script setup lang="ts">
const { user, token, isLoggedIn, fetchMe, loginWithGoogle } = useAuth();
const { publicConfig, fetchPublicConfig } = usePublicConfig();
const runtimeConfig = useRuntimeConfig();

async function initGoogleOneTap() {
  if (!import.meta.client) return;

  // Try session hydration if token exists but user state is unpopulated
  if (!user.value && token.value) {
    try {
      await fetchMe();
    } catch {
      // Token expired or invalid
    }
  }

  // If user is already logged in, cancel any active prompt and skip
  if (isLoggedIn.value) {
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.cancel();
    }
    return;
  }

  // Try fetching public config from backend API if available
  await fetchPublicConfig().catch(() => {});

  const clientId =
    publicConfig.value?.googleClientId ||
    runtimeConfig.public.googleClientId ||
    '399693072826-klk5l3aq1p1ie42qvnrakc9kk08jg75o.apps.googleusercontent.com';

  if (!clientId) {
    console.warn('[GoogleOneTap] Skipped initialization: Missing Google Client ID.');
    return;
  }

  // Load Google Identity Services script dynamically if not present
  if (!(window as any).google?.accounts?.id) {
    await new Promise<void>((resolve) => {
      const existingScript = document.getElementById('google-gsi-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  const googleObj = (window as any).google;
  if (!googleObj?.accounts?.id) return;

  // Initialize Google One Tap Prompt
  googleObj.accounts.id.initialize({
    client_id: clientId,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: false,
  });

  // Display the native Google Gmail login popup prompt
  googleObj.accounts.id.prompt((notification: any) => {
    if (notification.isNotDisplayed()) {
      console.log('[GoogleOneTap] Not displayed:', notification.getNotDisplayedReason());
    } else if (notification.isSkippedMoment()) {
      console.log('[GoogleOneTap] Skipped moment:', notification.getSkippedReason());
    } else if (notification.isDismissedMoment()) {
      console.log('[GoogleOneTap] Dismissed reason:', notification.getDismissedReason());
    }
  });
}

async function handleCredentialResponse(response: { credential?: string }) {
  if (!response?.credential) return;

  try {
    const authResult = await loginWithGoogle({ credential: response.credential });
    const toast = useToast();
    toast.add({
      title: 'Google Sign-In Successful',
      description: `Welcome back, ${authResult.user.name || authResult.user.email}!`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    });
  } catch (err: any) {
    console.error('[GoogleOneTap] Auth error:', err);
    const toast = useToast();
    toast.add({
      title: 'Google Sign-In Failed',
      description: err?.message || 'Failed to authenticate with Google.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  }
}

onMounted(() => {
  initGoogleOneTap();
});

watch(isLoggedIn, (loggedIn) => {
  if (!loggedIn) {
    initGoogleOneTap();
  } else if ((window as any).google?.accounts?.id) {
    (window as any).google.accounts.id.cancel();
  }
});
</script>

<template>
  <!-- Invisible mount element: Google Identity Services renders native One Tap overlay directly -->
  <div id="g_id_onload" class="hidden" />
</template>
