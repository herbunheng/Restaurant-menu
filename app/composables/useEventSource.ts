import { shallowRef, ref, onMounted, onUnmounted } from 'vue';

export interface UseEventSourceOptions<T> {
  onData?: (data: T) => void;
  onError?: (err: Event) => void;
}

export function useEventSource<T = unknown>(url: string, options: UseEventSourceOptions<T> = {}) {
  const data = shallowRef<T | null>(null);
  const events = shallowRef<T[]>([]);
  const isConnected = ref(false);
  const error = shallowRef<Event | null>(null);
  let eventSource: EventSource | null = null;

  function connect() {
    if (!import.meta.client) return;

    if (eventSource) {
      eventSource.close();
    }

    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      isConnected.value = true;
      error.value = null;
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as T;
        data.value = parsed;
        events.value = [parsed, ...events.value];
        options.onData?.(parsed);
      } catch {
        const fallback = event.data as unknown as T;
        data.value = fallback;
        events.value = [fallback, ...events.value];
      }
    };

    eventSource.onerror = (err) => {
      isConnected.value = false;
      error.value = err;
      options.onError?.(err);
    };
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      isConnected.value = false;
    }
  }

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    data,
    events,
    isConnected,
    error,
    connect,
    disconnect,
  };
}
