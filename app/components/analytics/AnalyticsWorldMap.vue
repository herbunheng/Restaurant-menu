<script setup lang="ts">
const props = defineProps<{
  primaryViewMode: 'map' | 'chart';
  selectedPeriod: string;
  totalEvents: number;
  successCount: number;
  failedCount: number;
  chartBars: Array<{ label: string; value: number; height: number }>;
  mapLocations: Array<{ code: string; name: string; flag: string; lat: number; lng: number }>;
  getMapLocationCount: (code: string) => number;
}>();

const emit = defineEmits<{
  (e: 'switchViewMode', mode: 'map' | 'chart'): void;
}>();

// Nuxt UI Color Mode integration - automatically syncs with Admin header toggle
const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

const mapContainer = ref<HTMLElement | null>(null);
let mapInstance: any = null;
let markersGroup: any = null;
let tileLayerInstance: any = null;
let LRef: any = null;

// Function to update or swap the active map tile layer dynamically
function updateTileLayer(L: any) {
  if (!mapInstance || !L) return;

  if (tileLayerInstance) {
    mapInstance.removeLayer(tileLayerInstance);
  }

  const dark = isDark.value;

  // Esri World Gray Canvas (100% Free, No API Key Required)
  const tileUrl = dark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

  tileLayerInstance = L.tileLayer(tileUrl, {
    maxZoom: 16,
    attribution: 'Tiles &copy; Esri',
  }).addTo(mapInstance);
}

// Function to render custom HTML markers & dark/light popups
function renderMarkers(L: any) {
  if (!mapInstance || !L) return;

  if (markersGroup) {
    markersGroup.clearLayers();
  } else {
    markersGroup = L.layerGroup().addTo(mapInstance);
  }

  const dark = isDark.value;

  props.mapLocations.forEach((loc) => {
    const visits = props.getMapLocationCount(loc.code);
    const markerHtml = `
      <div class="relative group cursor-pointer flex items-center justify-center">
        <span class="absolute w-8 h-8 rounded-full ${dark ? 'bg-emerald-500/30' : 'bg-emerald-600/30'} animate-ping"></span>
        <div class="relative flex items-center gap-1.5 px-2.5 py-1 ${
          dark
            ? 'bg-gray-950/90 border-emerald-500/60 text-white shadow-2xl'
            : 'bg-white/95 border-emerald-600/70 text-gray-900 shadow-md ring-1 ring-emerald-500/20'
        } border rounded-xl text-[11px] font-mono whitespace-nowrap backdrop-blur-md transition-all group-hover:scale-110">
          <span class="text-sm leading-none">${loc.flag}</span>
          <span class="font-extrabold ${dark ? 'text-emerald-400' : 'text-emerald-600'}">${visits > 0 ? visits : 1}</span>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'leaflet-custom-marker-wrapper',
      html: markerHtml,
      iconSize: [70, 32],
      iconAnchor: [35, 16],
    });

    const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(markersGroup);

    const popupHtml = `
      <div class="p-3 text-xs font-sans ${
        dark
          ? 'bg-gray-900/95 text-white border border-gray-800 backdrop-blur-md'
          : 'bg-white/95 text-gray-900 border border-gray-200 shadow-xl backdrop-blur-md'
      } rounded-xl">
        <div class="font-bold text-sm flex items-center gap-2 mb-1">
          <span class="text-base">${loc.flag}</span>
          <span>${loc.name}</span>
        </div>
        <div class="flex items-center gap-1.5 font-mono text-[11px] mt-1">
          <span class="w-2 h-2 rounded-full ${dark ? 'bg-emerald-400' : 'bg-emerald-500'} animate-pulse"></span>
          <span class="${dark ? 'text-emerald-400' : 'text-emerald-600'} font-bold">${visits > 0 ? visits : 1} Visitor Hits</span>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
  });
}

onMounted(async () => {
  if (!import.meta.client) return;

  try {
    let L: any;
    try {
      L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
    } catch (importErr) {
      console.warn('Npm leaflet package load fallback to CDN:', importErr);
      if (!(window as any).L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
      L = (window as any).L;
    }

    LRef = L;

    if (mapContainer.value && !mapInstance && L) {
      mapInstance = L.map(mapContainer.value, {
        center: [20, 95], // Centered near South-East Asia / Pacific
        zoom: 2.5,
        zoomControl: false,
        attributionControl: false,
      });

      updateTileLayer(L);
      renderMarkers(L);

      watch(() => props.mapLocations, () => {
        renderMarkers(L);
      }, { deep: true });

      // Automatically update map tiles and markers when header color mode changes
      watch(isDark, () => {
        if (LRef) {
          updateTileLayer(LRef);
          renderMarkers(LRef);
        }
      });
    }
  } catch (err) {
    console.error('Failed to load Leaflet map:', err);
  }
});

watch(() => props.primaryViewMode, (mode) => {
  if (mode === 'map') {
    nextTick(() => {
      if (mapInstance) {
        mapInstance.invalidateSize();
      }
    });
  }
});

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-3">
    <!-- Card Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-2.5">
      <div>
        <h3 class="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon :name="primaryViewMode === 'map' ? 'i-heroicons-globe-alt' : 'i-heroicons-chart-bar'"
            class="w-5 h-5 text-emerald-500" />
          {{ primaryViewMode === 'map' ? 'Visitor Geographic Map' : 'Traffic & Activity Volume' }}
        </h3>
        <p class="text-xs text-gray-500">
          {{ primaryViewMode === 'map' ? 'Interactive live global map with real-time visitor activity markers' :
            `Interval event distribution for selected period (${selectedPeriod})` }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Mode Switcher Buttons (Map View vs Chart View) -->
        <div
          class="flex items-center p-1 bg-gray-100 dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700/80 text-xs">
          <button type="button" @click="emit('switchViewMode', 'map')" :class="[
            'px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5',
            primaryViewMode === 'map'
              ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-extrabold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          ]">
            <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
            Map View
          </button>
          <button type="button" @click="emit('switchViewMode', 'chart')" :class="[
            'px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5',
            primaryViewMode === 'chart'
              ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-extrabold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          ]">
            <UIcon name="i-heroicons-chart-bar" class="w-4 h-4" />
            Chart View
          </button>
        </div>
      </div>
    </div>

    <!-- View 1: Leaflet Interactive Map Container -->
    <ClientOnly>
      <div v-show="primaryViewMode === 'map'"
        :class="[
          'relative rounded-xl overflow-hidden border shadow-xl h-[280px] z-0 transition-colors duration-300',
          isDark ? 'bg-gray-950 border-gray-800' : 'bg-slate-100 border-gray-200'
        ]">
        <div ref="mapContainer" class="w-full h-full z-0" />
      </div>
    </ClientOnly>

    <!-- View 2: Traffic & Activity Volume Bar Chart (Full 280px Height) -->
    <div v-show="primaryViewMode === 'chart'" class="h-[280px] flex flex-col justify-between">
      <div class="flex items-center justify-between text-xs font-mono px-1">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1.5 text-emerald-500 font-semibold">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Visitors
          </span>
          <span class="flex items-center gap-1.5 text-blue-500 font-semibold">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500" /> Authorized
          </span>
        </div>
        <span class="text-gray-400 font-semibold">Total Visits: {{ totalEvents }}</span>
      </div>

      <!-- Dynamic Visual Bar Chart -->
      <div
        class="flex-1 flex items-end justify-between gap-3 pt-2 px-1">
        <div v-for="(bar, idx) in chartBars" :key="idx"
          class="flex-1 flex flex-col items-center justify-end h-full group relative">
          <div
            class="absolute -top-8 hidden group-hover:block bg-gray-900 text-white text-[10px] py-1 px-2.5 rounded-lg font-mono z-20 whitespace-nowrap shadow-xl border border-gray-700">
            {{ bar.value }} visits
          </div>

          <div
            class="w-full bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-300 rounded-t-xl transition-all duration-500 group-hover:brightness-120 group-hover:scale-105"
            :style="{ height: `${bar.height}%` }" />

          <span class="text-[10px] text-gray-400 font-mono mt-1 truncate w-full text-center">{{ bar.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.leaflet-custom-marker-wrapper {
  background: transparent !important;
  border: none !important;
}
.leaflet-popup-content-wrapper {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 0.75rem !important;
}
.leaflet-popup-tip-container {
  display: none !important;
}
.leaflet-popup-content {
  margin: 0 !important;
}
</style>
