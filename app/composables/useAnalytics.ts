import type { TrackCustomEvent } from '@restaurant-menu/shared';

export function useAnalytics() {
  const { $api } = useApi();
  const route = useRoute();

  /**
   * Retrieves or initializes a unique session ID for the active browser session
   */
  function getSessionId(): string {
    if (!import.meta.client) return '';
    try {
      let sessionId = sessionStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('analytics_session_id', sessionId);
      }
      return sessionId;
    } catch {
      return '';
    }
  }

  /**
   * Sends a custom interaction event to the backend analytics engine
   */
  async function trackEvent(
    eventName: string,
    options: Omit<TrackCustomEvent, 'eventName'> = {}
  ) {
    if (!import.meta.client) return;

    const payload: TrackCustomEvent = {
      eventName,
      eventCategory: options.eventCategory || 'general',
      eventLabel: options.eventLabel,
      eventValue: options.eventValue,
      path: options.path || route.path,
      sessionId: getSessionId(),
      metadata: options.metadata,
    };

    try {
      await $api('/api/metrics/event', {
        method: 'POST',
        body: payload,
      });
    } catch (err) {
      console.warn('Custom event tracking error:', err);
    }
  }

  /**
   * Shortcut for tracking button clicks or link interactions
   */
  async function trackClick(label: string, category: string = 'engagement') {
    return trackEvent('button_click', {
      eventCategory: category,
      eventLabel: label,
    });
  }

  /**
   * Shortcut for tracking goal conversions (e.g. purchases, signups)
   */
  async function trackConversion(goalName: string, value?: number) {
    return trackEvent('conversion', {
      eventCategory: 'goal',
      eventLabel: goalName,
      eventValue: value,
    });
  }

  return {
    getSessionId,
    trackEvent,
    trackClick,
    trackConversion,
  };
}
