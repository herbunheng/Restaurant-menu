<script setup lang="ts">
import { ref, computed } from 'vue';
import type { DailyReport, Order } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

const todayStr = new Date().toISOString().slice(0, 10);
const selectedDate = ref(todayStr);

// Fetch Daily Report
const { data: reportData, status: reportStatus, refresh: refreshReport } = await useApiData<DailyReport>(
  'admin-daily-report',
  () => `/api/orders/daily-report?date=${selectedDate.value}`,
  {
    watch: [selectedDate],
  }
);

const report = computed(() => reportData.value || {
  date: selectedDate.value,
  totalOrders: 0,
  totalRevenueUSD: 0,
  totalRevenueKHR: 0,
  paymentBreakdown: { cashUSD: 0, khqrUSD: 0, cardUSD: 0 },
  topSellingItems: [],
  orders: [],
});

const isLoading = computed(() => reportStatus.value === 'pending');

const avgTicket = computed(() => {
  if (!report.value.totalOrders) return '0.00';
  return (report.value.totalRevenueUSD / report.value.totalOrders).toFixed(2);
});

function formatRiel(usd: number): string {
  return Math.round(usd * 4000).toLocaleString('en-US');
}

function handlePrint() {
  window.print();
}

function setDatePreset(type: 'today' | 'yesterday') {
  if (type === 'today') {
    selectedDate.value = todayStr;
  } else {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    selectedDate.value = yesterday.toISOString().slice(0, 10);
  }
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Header with Date Filter and Print Button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
          <UIcon name="i-heroicons-chart-bar-square" class="w-7 h-7 text-primary-600 dark:text-primary-400" />
          <span>Daily Closing Report (របាយការណ៍បិទហាង)</span>
        </h1>
        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          សង្ខេបចំណូលប្រចាំថ្ងៃ ចំនួនវិក្កយបត្រ និងមុខម្ហូបដែលលក់ដាច់ជាងគេមុនពេលបិទបញ្ជី
        </p>
      </div>

      <!-- Action & Date Picker -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-2xs">
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            :class="selectedDate === todayStr ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
            @click="setDatePreset('today')"
          >
            ថ្ងៃនេះ
          </button>
          <input
            v-model="selectedDate"
            type="date"
            class="px-2 py-1 text-xs font-medium bg-transparent text-gray-700 dark:text-gray-300 focus:outline-hidden"
          />
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-sm transition-all cursor-pointer"
          @click="handlePrint"
        >
          <UIcon name="i-heroicons-printer" class="w-4 h-4" />
          <span>ព្រីនរបាយការណ៍</span>
        </button>
      </div>
    </div>

    <!-- Printable Report Container -->
    <div id="daily-report-printable" class="space-y-6">
      <!-- 4 Key Metric Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Total USD -->
        <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-2xs space-y-2">
          <div class="flex items-center justify-between text-gray-500">
            <span class="text-xs font-semibold">ចំណូលសរុប (USD)</span>
            <div class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <UIcon name="i-heroicons-currency-dollar" class="w-5 h-5" />
            </div>
          </div>
          <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ${{ report.totalRevenueUSD.toFixed(2) }}
          </p>
          <p class="text-[11px] text-gray-400 font-mono">
            ចំណូលសរុបប្រចាំថ្ងៃជាដុល្លារ
          </p>
        </div>

        <!-- 2. Total KHR -->
        <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-2xs space-y-2">
          <div class="flex items-center justify-between text-gray-500">
            <span class="text-xs font-semibold">ចំណូលសរុប (រៀល)</span>
            <div class="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/50 text-primary-600">
              <UIcon name="i-heroicons-banknotes" class="w-5 h-5" />
            </div>
          </div>
          <p class="text-2xl font-black text-primary-600 dark:text-primary-400 font-mono">
            {{ report.totalRevenueKHR.toLocaleString('en-US') }} ៛
          </p>
          <p class="text-[11px] text-gray-400 font-mono">
            គិតជាប្រាក់រៀល (~4,100)
          </p>
        </div>

        <!-- 3. Total Orders -->
        <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-2xs space-y-2">
          <div class="flex items-center justify-between text-gray-500">
            <span class="text-xs font-semibold">Total Orders (វិក្កយបត្រ)</span>
            <div class="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <UIcon name="i-heroicons-receipt-percent" class="w-5 h-5" />
            </div>
          </div>
          <p class="text-2xl font-black text-gray-900 dark:text-white font-mono">
            {{ report.totalOrders }}
          </p>
          <p class="text-[11px] text-gray-400 font-mono">
            ចំនួនតុ / បុងដែលបានគិតលុយ
          </p>
        </div>

        <!-- 4. Avg Ticket -->
        <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-2xs space-y-2">
          <div class="flex items-center justify-between text-gray-500">
            <span class="text-xs font-semibold">Avg Ticket (មធ្យមភាគ)</span>
            <div class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <UIcon name="i-heroicons-scale" class="w-5 h-5" />
            </div>
          </div>
          <p class="text-2xl font-black text-gray-900 dark:text-white font-mono">
            ${{ avgTicket }}
          </p>
          <p class="text-[11px] text-gray-400 font-mono">
            តម្លៃមធ្យមក្នុងមួយតុ
          </p>
        </div>
      </div>

      <!-- Payment Breakdown Cards -->
      <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-3">
        <h2 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-credit-card" class="w-4 h-4 text-primary-500" />
          <span>ការទូទាត់តាមប្រភេទ</span>
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center font-bold">
                💵
              </div>
              <div>
                <p class="text-xs font-bold text-gray-900 dark:text-white">សាច់ប្រាក់</p>
                <p class="text-[10px] text-gray-400">ប្រាក់ដុល្លារ & រៀល</p>
              </div>
            </div>
            <span class="text-base font-black font-mono text-gray-900 dark:text-white">
              ${{ report.paymentBreakdown.cashUSD.toFixed(2) }}
            </span>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/70 text-rose-600 flex items-center justify-center font-bold">
                📱
              </div>
              <div>
                <p class="text-xs font-bold text-gray-900 dark:text-white">KHQR</p>
                <p class="text-[10px] text-gray-400">Bakong / ABA / Acleda</p>
              </div>
            </div>
            <span class="text-base font-black font-mono text-rose-600 dark:text-rose-400">
              ${{ report.paymentBreakdown.khqrUSD.toFixed(2) }}
            </span>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 flex items-center justify-center font-bold">
                💳
              </div>
              <div>
                <p class="text-xs font-bold text-gray-900 dark:text-white">កាតធនាគារ</p>
                <p class="text-[10px] text-gray-400">Visa / Mastercard</p>
              </div>
            </div>
            <span class="text-base font-black font-mono text-blue-600 dark:text-blue-400">
              ${{ report.paymentBreakdown.cardUSD.toFixed(2) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Top Selling Items & Daily Orders Table (2 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- LEFT: Top Selling Items (1 Column) -->
        <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-4">
          <div>
            <h2 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-fire" class="w-4 h-4 text-amber-500" />
              <span>មុខម្ហូបលក់ដាច់បំផុតទាំង ១០</span>
            </h2>
            <p class="text-xs text-gray-500">តម្រៀបតាមចំនួនចាន/កំប៉ុងដែលបានលក់</p>
          </div>

          <div v-if="report.topSellingItems.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
            <div
              v-for="(item, idx) in report.topSellingItems"
              :key="idx"
              class="py-2.5 flex items-center justify-between text-xs"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span
                  class="w-5 h-5 rounded-md flex items-center justify-center font-black text-[11px] shrink-0"
                  :class="[
                    idx === 0
                      ? 'bg-amber-400 text-gray-950 font-bold'
                      : idx === 1
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : idx === 2
                      ? 'bg-amber-700/60 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
                  ]"
                >
                  {{ idx + 1 }}
                </span>
                <div class="min-w-0">
                  <p class="font-bold text-gray-900 dark:text-white truncate">{{ item.name }}</p>
                  <p v-if="item.variantLabel" class="text-[10px] text-gray-400 font-mono">
                    {{ item.variantLabel }}
                  </p>
                </div>
              </div>

              <div class="text-right shrink-0">
                <span class="font-bold text-primary-600 dark:text-primary-400 font-mono">
                  x{{ item.totalQuantity }}
                </span>
                <span class="block text-[10px] text-gray-400 font-mono">
                  ${{ item.totalRevenue.toFixed(2) }}
                </span>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-400 text-xs">
            មិនទាន់មានទិន្នន័យមុខម្ហូបលក់ចេញនៅថ្ងៃនេះទេ
          </div>
        </div>

        <!-- RIGHT: Detailed Orders Table (2 Columns) -->
        <div class="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-primary-500" />
                <span>បញ្ជីវិក្កយបត្រលម្អិត</span>
              </h2>
              <p class="text-xs text-gray-500">រាល់ Order ទាំងអស់ដែល Cashier បានកត់ត្រា</p>
            </div>
            <span class="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {{ report.orders.length }} វិក្កយបត្រ
            </span>
          </div>

          <div v-if="report.orders.length > 0" class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="border-b border-gray-200 dark:border-gray-800 text-gray-500 font-medium">
                <tr>
                  <th class="py-2 px-3">លេខកុម្ម៉ង់</th>
                  <th class="py-2 px-3">តុ</th>
                  <th class="py-2 px-3">មុខម្ហូប</th>
                  <th class="py-2 px-3">វិធីទូទាត់</th>
                  <th class="py-2 px-3">ស្ថានភាព</th>
                  <th class="py-2 px-3 text-right">សរុប</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr v-for="ord in report.orders" :key="ord.id" class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td class="py-2.5 px-3 font-mono font-bold text-gray-900 dark:text-white">
                    #{{ ord.orderNumber }}
                  </td>
                  <td class="py-2.5 px-3">
                    <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400">
                      {{ ord.tableNumber }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 max-w-xs">
                    <p class="truncate text-gray-700 dark:text-gray-300">
                      {{ ord.items.map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity}`).join(', ') }}
                    </p>
                  </td>
                  <td class="py-2.5 px-3">
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono"
                      :class="[
                        ord.paymentMethod === 'khqr'
                          ? 'bg-rose-50 dark:bg-rose-950 text-rose-600'
                          : ord.paymentMethod === 'card'
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600'
                          : ord.paymentMethod === 'mixed'
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-600'
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600',
                      ]"
                    >
                      {{ ord.paymentMethod === 'cash' ? 'សាច់ប្រាក់' : (ord.paymentMethod === 'khqr' ? 'KHQR' : (ord.paymentMethod === 'mixed' ? 'បង់ចម្រុះ' : 'កាត')) }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3">
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"
                      :class="[
                        ord.paymentStatus === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50'
                          : ord.paymentStatus === 'billed'
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/50'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50',
                      ]"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        :class="[
                          ord.paymentStatus === 'paid'
                            ? 'bg-emerald-500'
                            : ord.paymentStatus === 'billed'
                            ? 'bg-purple-500'
                            : 'bg-amber-500',
                        ]"
                      ></span>
                      {{ ord.paymentStatus === 'paid' ? 'បានបង់' : ord.paymentStatus === 'billed' ? 'សុំមើលបុង' : 'កំពុងញ៉ាំ' }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-right">
                    <span class="font-black font-mono text-gray-900 dark:text-white">
                      ${{ Number(ord.totalAmount).toFixed(2) }}
                    </span>
                    <span class="block text-[10px] text-gray-400 font-mono">
                      ~{{ formatRiel(Number(ord.totalAmount)) }} ៛
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="text-center py-12 text-gray-400 text-xs">
            មិនមាន Order ណាមួយត្រូវបានកត់ត្រានៅកាលបរិច្ឆេទនេះទេ
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }
  #daily-report-printable,
  #daily-report-printable * {
    visibility: visible;
  }
  #daily-report-printable {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
</style>
