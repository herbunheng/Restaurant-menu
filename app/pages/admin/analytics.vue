<script setup lang="ts">
import type { AuditLog, VisitorAnalyticsSummary, PathMetric, CountryMetric } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

// Controls State
const selectedPeriod = ref('1M'); // Default to 30 Days view
const selectedLimit = ref('100');
const isAutoRefreshEnabled = ref(false);
const primaryViewMode = ref<'map' | 'chart'>('map');
let autoRefreshTimer: NodeJS.Timeout | null = null;

function switchViewMode(mode: 'map' | 'chart') {
  primaryViewMode.value = mode;
}

const timePeriodOptions = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: 'ALL', value: 'ALL' },
];

const { data: logsData, status, error, refresh: fetchAnalyticsData } = await useApiData<AuditLog[]>(
  'admin-analytics-logs',
  () => `/api/audit-logs?limit=${selectedLimit.value}&period=${selectedPeriod.value}`,
  {
    watch: [selectedPeriod, selectedLimit],
  }
);

const { data: visitorSummaryData, refresh: fetchVisitorSummary } = await useApiData<VisitorAnalyticsSummary>(
  'admin-visitor-analytics-summary',
  '/api/metrics/summary'
);

function fetchAllAnalytics() {
  fetchAnalyticsData();
  fetchVisitorSummary();
}

const toast = useToast();

const logsList = computed(() => logsData.value || []);
const recentCustomEvents = computed(() => visitorSummaryData.value?.recentEvents || []);
const isLoading = computed(() => status.value === 'pending');

watch(error, (newErr) => {
  if (newErr?.message) {
    toast.add({
      title: 'Analytics Error',
      description: newErr.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  }
}, { immediate: true });

// Dynamically compute Map Locations directly from Real D1 Database visitor records & GPS coordinates
const mapLocations = computed(() => {
  const recentVisits = (visitorSummaryData.value?.recentVisits || []) as Array<{
    country?: string | null;
    latitude?: string | null;
    longitude?: string | null;
  }>;
  const topCountries = visitorSummaryData.value?.topCountries || [];

  const locationMap = new Map<string, { code: string; name: string; flag: string; lat: number; lng: number }>();

  // 1. First priority: Exact GPS coordinates from recent visits
  recentVisits.forEach((visit) => {
    const code = (visit.country || 'unknown').toUpperCase();
    if (code === 'UNKNOWN') return;

    const lat = parseFloat(visit.latitude || '');
    const lng = parseFloat(visit.longitude || '');

    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      if (!locationMap.has(code)) {
        locationMap.set(code, {
          code,
          name: getCountryName(code),
          flag: getCountryFlag(code),
          lat,
          lng,
        });
      }
    }
  });

  // 2. Second priority: Country center coordinates for all top countries in DB
  topCountries.forEach((item: CountryMetric) => {
    const code = (item.country || 'unknown').toUpperCase();
    if (code === 'UNKNOWN') return;

    if (!locationMap.has(code)) {
      const coords = getCountryCoordinates(code);
      locationMap.set(code, {
        code,
        name: getCountryName(code),
        flag: getCountryFlag(code),
        lat: coords.lat,
        lng: coords.lng,
      });
    }
  });

  return Array.from(locationMap.values());
});

// Auto-Refresh Polling Handler
watch(isAutoRefreshEnabled, (enabled) => {
  if (enabled) {
    autoRefreshTimer = setInterval(() => {
      fetchAllAnalytics();
    }, 10000);
  } else if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }
});

onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
});

// Real Database Metrics & Aggregations
const realTotalVisits = computed(() => visitorSummaryData.value?.totalVisits || visitorSummaryData.value?.recentVisits?.length || 0);
const totalEvents = computed(() => Math.max(realTotalVisits.value, logsList.value.length));
const successCount = computed(() => logsList.value.filter((l) => l.status === 'SUCCESS').length);
const failedCount = computed(() => logsList.value.filter((l) => l.status === 'FAILED').length);

const healthPercentage = computed(() => {
  const total = logsList.value.length || realTotalVisits.value;
  if (total === 0) return 100;
  return Math.round((successCount.value / Math.max(1, total)) * 100);
});

const activeSessions = computed(() => {
  const recentVisitsCount = visitorSummaryData.value?.recentVisits?.length || 0;
  return Math.max(recentVisitsCount, logsList.value.length > 0 ? Math.round(logsList.value.length / 3) : 0);
});

// Page Views Breakdown (Pure Real D1 Metrics)
const pageViewsBreakdown = computed(() => {
  const map = new Map<string, number>();

  const topPaths = visitorSummaryData.value?.topPaths || [];
  topPaths.forEach((item: PathMetric) => {
    if (item.path) {
      map.set(item.path, (map.get(item.path) || 0) + (Number(item.count) || 1));
    }
  });

  logsList.value.forEach((log) => {
    const route = log.route || (log.entity === 'pages' ? log.entityId : null);
    if (route) {
      map.set(route, (map.get(route) || 0) + 1);
    }
  });

  let grandTotal = 0;
  map.forEach((count) => {
    grandTotal += count;
  });
  const total = grandTotal || 1;

  return Array.from(map.entries())
    .map(([route, count]) => ({
      route,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
});

// User Action Breakdown
const actionsBreakdown = computed(() => {
  const map = new Map<string, number>();
  logsList.value.forEach((log) => {
    const act = log.action || 'PAGE_VIEW';
    map.set(act, (map.get(act) || 0) + 1);
  });
  const total = logsList.value.length || 1;
  return Array.from(map.entries())
    .map(([action, count]) => ({
      action,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
});

// Country Breakdown (Pure Real D1 Metrics)
const countryBreakdown = computed(() => {
  const map = new Map<string, number>();

  const topCountries = visitorSummaryData.value?.topCountries || [];
  topCountries.forEach((item: CountryMetric) => {
    if (item.country) {
      map.set(item.country, (map.get(item.country) || 0) + (Number(item.count) || 1));
    }
  });

  logsList.value.forEach((log) => {
    if (log.country) {
      map.set(log.country, (map.get(log.country) || 0) + 1);
    }
  });

  let grandTotal = 0;
  map.forEach((count) => {
    grandTotal += count;
  });
  const total = grandTotal || 1;

  return Array.from(map.entries())
    .map(([country, count]) => ({
      country,
      name: getCountryName(country),
      flag: getCountryFlag(country),
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
});

const topCountry = computed(() => countryBreakdown.value[0] || { name: 'N/A', flag: '🌐', count: 0 });

function getMapLocationCount(code: string): number {
  const item = countryBreakdown.value.find((c) => c.country.toUpperCase() === code.toUpperCase());
  return item ? item.count : 0;
}


// Dynamic Bar Chart Intervals
const chartBars = computed(() => {
  if (logsList.value.length === 0) {
    return Array.from({ length: 8 }, (_, i) => ({ label: `T${i + 1}`, value: 0, height: 10 }));
  }

  const bins = Array.from({ length: 8 }, () => 0);
  const now = Date.now();
  const times = logsList.value.map((l) => (l.createdAt ? new Date(l.createdAt).getTime() : now));
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times, now);
  const range = maxTime - minTime || 1;

  times.forEach((t) => {
    const binIdx = Math.min(7, Math.floor(((t - minTime) / range) * 8));
    bins[binIdx] = (bins[binIdx] ?? 0) + 1;
  });

  const maxVal = Math.max(...bins, 1);
  return bins.map((val, idx) => ({
    label: `Interval ${idx + 1}`,
    value: val,
    height: Math.max(12, Math.round((val / maxVal) * 100)),
  }));
});

// CSV Export Handler
function exportAnalyticsCSV() {
  if (logsList.value.length === 0) return;
  const headers = ['Timestamp', 'Action', 'Route', 'User', 'IP', 'Country', 'City', 'Status'];
  const rows = logsList.value.map((l) => [
    l.createdAt ? new Date(l.createdAt).toISOString() : '',
    l.action,
    l.route || '/admin/dashboard',
    l.userEmail || 'System',
    l.ipAddress || '127.0.0.1',
    getCountryName(l.country),
    l.city || l.region || 'Unknown',
    l.status,
  ]);
  downloadCSV(`analytics_report_${selectedPeriod.value}`, headers, rows);
}
</script>

<template>
  <div class="space-y-6 text-gray-900 dark:text-gray-100 font-sans max-w-7xl mx-auto pb-10">
    <!-- Header Controls -->
    <AnalyticsHeader v-model:selected-period="selectedPeriod" v-model:is-auto-refresh-enabled="isAutoRefreshEnabled"
      :is-loading="isLoading" :time-period-options="timePeriodOptions" @refresh="fetchAllAnalytics()"
      @export-csv="exportAnalyticsCSV()" />

    <!-- Executive KPI Cards -->
    <AnalyticsKpiCards :total-events="totalEvents" :active-sessions="activeSessions" :top-country="topCountry"
      :health-percentage="healthPercentage" :failed-count="failedCount" />

    <!-- Main Visual Switcher & User Page Acquisition -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2">
        <AnalyticsWorldMap :primary-view-mode="primaryViewMode" :selected-period="selectedPeriod"
          :total-events="totalEvents" :success-count="successCount" :failed-count="failedCount" :chart-bars="chartBars"
          :map-locations="mapLocations" :get-map-location-count="getMapLocationCount"
          @switch-view-mode="switchViewMode" />
      </div>

      <AnalyticsAcquisition :page-views-breakdown="pageViewsBreakdown" />
    </div>

    <!-- Deep Insights Grid with Embedded Custom Events Feed -->
    <AnalyticsGeoBreakdown :actions-breakdown="actionsBreakdown" :country-breakdown="countryBreakdown"
      :events-list="recentCustomEvents" />
  </div>
</template>
