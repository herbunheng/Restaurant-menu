<script setup lang="ts">
import { ref, computed } from 'vue';
import type { DailyReport, Order } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

const todayStr = new Date().toISOString().slice(0, 10);
const selectedDate = ref(todayStr);
const selectedOrderDetail = ref<Order | null>(null);

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
  exchangeRate: 4000,
  totalOrders: 0,
  totalRevenueUSD: 0,
  totalRevenueKHR: 0,
  unpaidOrdersUSD: 0,
  unpaidOrdersKHR: 0,
  receivableUSD: 0,
  receivableKHR: 0,
  payableUSD: 0,
  payableKHR: 0,
  repaymentUSD: 0,
  repaymentKHR: 0,
  ownerMealCount: 0,
  ownerMealUSD: 0,
  ownerMealKHR: 0,
  paymentBreakdown: { cashUSD: 0, khqrUSD: 0, cardUSD: 0 },
  paymentMethodBreakdown: [],
  topSellingItems: [],
  categoryBreakdown: [],
  ledgerEntries: [],
  orders: [],
});

const isLoading = computed(() => reportStatus.value === 'pending');

function formatRiel(usd: number): string {
  const rate = report.value.exchangeRate || 4000;
  return Math.round(usd * rate).toLocaleString('en-US');
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
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
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
        <div
          class="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-2xs">
          <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            :class="selectedDate === todayStr ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
            @click="setDatePreset('today')">
            ថ្ងៃនេះ
          </button>
          <input v-model="selectedDate" type="date"
            class="px-2 py-1 text-xs font-medium bg-transparent text-gray-700 dark:text-gray-300 focus:outline-hidden" />
        </div>

        <button type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-sm transition-all cursor-pointer"
          @click="handlePrint">
          <UIcon name="i-heroicons-printer" class="w-4 h-4" />
          <span>ព្រីនរបាយការណ៍</span>
        </button>
      </div>
    </div>

    <!-- Printable Report Container -->
    <div id="daily-report-printable" class="space-y-6">
      <!-- Bank / Payment Breakdown (in Riel) & Debts Summary -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Bank & Cash Breakdown (2 Columns) -->
        <div
          class="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-building-library" class="w-4 h-4 text-primary-500" />
              <span>ចំណូលតាមសាច់ប្រាក់ & ធនាគារ (ប្រាក់រៀល)</span>
            </h2>
            <span class="text-[11px] text-gray-400 font-mono">
              $1 = {{ (report.exchangeRate || 4000).toLocaleString('en-US') }} ៛
            </span>
          </div>

          <div v-if="(report.paymentMethodBreakdown || []).length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div v-for="pm in report.paymentMethodBreakdown" :key="pm.code"
              class="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700/60 flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs font-bold text-gray-900 dark:text-white truncate">{{ pm.name }}</p>
                <p class="text-[10px] text-gray-400 font-mono">{{ pm.totalOrders }} បុង • ${{ pm.totalUSD.toFixed(2) }}</p>
              </div>
              <span class="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                {{ pm.totalKHR.toLocaleString('en-US') }} ៛
              </span>
            </div>
          </div>

          <div v-else class="text-center py-4 text-xs text-gray-400">
            មិនទាន់មានទិន្នន័យទូទាត់តាមធនាគារ ឬសាច់ប្រាក់នៅថ្ងៃនេះទេ
          </div>
        </div>

        <!-- Receivable (គេជំពាក់), Payable (ជំពាក់គេ), Repayment (សងគេ), Owner Meal (មេហូប) -->
        <div
          class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-3">
          <h2 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-scale" class="w-4 h-4 text-amber-500" />
            <span>សង្ខេបបំណុល & មេហូប (រៀល)</span>
          </h2>

          <div class="space-y-2">
            <div
              class="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 flex items-center justify-between gap-2">
              <div>
                <p class="text-xs font-bold text-amber-900 dark:text-amber-200">លុយគេជំពាក់ (មិនទាន់បង់)</p>
                <p class="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-mono">
                  ≈ ${{ (report.receivableUSD || 0).toFixed(2) }}
                </p>
              </div>
              <span class="text-sm font-black font-mono text-amber-600 dark:text-amber-400 shrink-0">
                {{ (report.receivableKHR || 0).toLocaleString('en-US') }} ៛
              </span>
            </div>

            <div
              class="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 flex items-center justify-between gap-2">
              <div>
                <p class="text-xs font-bold text-rose-900 dark:text-rose-200">លុយជំពាក់គេ</p>
                <p class="text-[10px] text-rose-700/80 dark:text-rose-400/80 font-mono">
                  ≈ ${{ (report.payableUSD || 0).toFixed(2) }}
                </p>
              </div>
              <span class="text-sm font-black font-mono text-rose-600 dark:text-rose-400 shrink-0">
                {{ (report.payableKHR || 0).toLocaleString('en-US') }} ៛
              </span>
            </div>

            <div
              class="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between gap-2">
              <div>
                <p class="text-xs font-bold text-emerald-900 dark:text-emerald-200">លុយសងគេ</p>
                <p class="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-mono">
                  ≈ ${{ (report.repaymentUSD || 0).toFixed(2) }}
                </p>
              </div>
              <span class="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                {{ (report.repaymentKHR || 0).toLocaleString('en-US') }} ៛
              </span>
            </div>

            <div
              class="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 flex items-center justify-between gap-2">
              <div>
                <p class="text-xs font-bold text-indigo-900 dark:text-indigo-200">មេហូប (អត់គិតលុយ)</p>
                <p class="text-[10px] text-indigo-700/80 dark:text-indigo-400/80 font-mono">
                  {{ report.ownerMealCount || 0 }} លើក • សម្រាប់ Report
                </p>
              </div>
              <span class="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 shrink-0">
                {{ (report.ownerMealKHR || 0).toLocaleString('en-US') }} ៛
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sales by Category & Daily Orders Table (2 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- LEFT: Sales by Category (1 Column) -->
        <div
          class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-4">
          <div>
            <h2 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-rectangle-stack" class="w-4 h-4 text-primary-500" />
              <span>ចំណូលតាមប្រភេទមុខម្ហូប</span>
            </h2>
            <p class="text-xs text-gray-500">សរុបចំនួនលក់ និងទឹកប្រាក់តាមប្រភេទនីមួយៗ</p>
          </div>

          <div v-if="(report.categoryBreakdown || []).length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
            <div v-for="(cat, idx) in report.categoryBreakdown" :key="cat.categoryId || idx"
              class="py-3 flex items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-2.5 min-w-0">
                <span
                  class="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
                  {{ idx + 1 }}
                </span>
                <div class="min-w-0">
                  <p class="font-bold text-gray-900 dark:text-white truncate">{{ cat.categoryName }}</p>
                  <p class="text-[11px] text-gray-400 font-mono">
                    លក់បាន {{ cat.totalQuantity }} មុខ
                  </p>
                </div>
              </div>

              <div class="text-right shrink-0 font-mono">
                <span class="font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                  {{ cat.totalRevenueKHR.toLocaleString('en-US') }} ៛
                </span>
                <span class="block text-[11px] text-gray-500 dark:text-gray-400">
                  ${{ cat.totalRevenueUSD.toFixed(2) }}
                </span>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-400 text-xs">
            មិនទាន់មានទិន្នន័យលក់តាមប្រភេទនៅថ្ងៃនេះទេ
          </div>
        </div>

        <!-- RIGHT: Detailed Orders Table (2 Columns) -->
        <div
          class="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-primary-500" />
                <span>បញ្ជីវិក្កយបត្រលម្អិត</span>
              </h2>
              <p class="text-xs text-gray-500">រាល់ Order ទាំងអស់ដែល Cashier បានកត់ត្រា</p>
            </div>
            <span
              class="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {{ report.orders.length }} វិក្កយបត្រ
            </span>
          </div>

          <div v-if="report.orders.length > 0" class="overflow-x-auto lg:overflow-visible">
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
                <tr v-for="ord in report.orders" :key="ord.id"
                  class="group/row hover:bg-gray-50/70 dark:hover:bg-gray-800/40 align-top cursor-pointer transition-colors"
                  @click="selectedOrderDetail = ord">
                  <td class="relative py-3 px-3 font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    <span>#{{ ord.orderNumber }}</span>

                    <!-- Hover Popover: Service Order & Service គិតលុយ -->
                    <div
                      class="pointer-events-none opacity-0 invisible group-hover/row:opacity-100 group-hover/row:visible transition-all duration-150 absolute left-2 top-full mt-1 z-30 w-60 rounded-2xl bg-gray-900 dark:bg-gray-800 text-white p-3 shadow-xl border border-gray-700/80 font-sans font-normal text-[11px] space-y-1.5">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-gray-400">អ្នកកត់ Order (Service)</span>
                        <span class="font-bold text-emerald-400 truncate">{{ ord.waiterName || 'Cashier' }}</span>
                      </div>
                      <div v-if="ord.billedBy" class="flex items-center justify-between gap-2">
                        <span class="text-gray-400">អ្នកកាន់បុងគិតលុយ</span>
                        <span class="font-bold text-purple-300 truncate">{{ ord.billedBy }}</span>
                      </div>
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-gray-400">អ្នកគិតលុយ (Cashier)</span>
                        <span class="font-mono font-bold text-sky-300 truncate">{{ ord.cashierName || 'Cashier 01' }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-3 whitespace-nowrap">
                    <span
                      class="px-2 py-0.5 rounded text-[11px] font-bold bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400">
                      {{ ord.tableNumber }}
                    </span>
                  </td>
                  <td class="py-3 px-3 min-w-[220px]">
                    <ul class="space-y-1">
                      <li v-for="(it, iIdx) in ord.items" :key="iIdx"
                        class="flex items-start justify-between gap-2 text-[11px] leading-snug">
                        <span class="text-gray-800 dark:text-gray-200">
                          <span class="font-mono font-bold text-primary-600 dark:text-primary-400">{{ it.quantity }}x</span>
                          {{ it.name }}
                          <span v-if="it.variantLabel" class="text-gray-400">({{ it.variantLabel }})</span>
                        </span>
                        <span class="font-mono text-gray-500 dark:text-gray-400 shrink-0">
                          ${{ Number(it.subtotal).toFixed(2) }}
                        </span>
                      </li>
                    </ul>
                  </td>
                  <td class="py-3 px-3 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono" :class="[
                      ord.paymentMethod === 'khqr'
                        ? 'bg-rose-50 dark:bg-rose-950 text-rose-600'
                        : ord.paymentMethod === 'card'
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600'
                          : ord.paymentMethod === 'mixed'
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-600'
                            : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600',
                    ]">
                      {{ ord.paymentMethod === 'cash' ? 'សាច់ប្រាក់' : (ord.paymentMethod === 'khqr' ? 'KHQR' :
                        (ord.paymentMethod === 'mixed' ? 'បង់ចម្រុះ' : (ord.paymentMethod === 'card' ? 'កាត' : (ord.paymentMethod || 'សាច់ប្រាក់').toUpperCase()))) }}
                    </span>
                  </td>
                  <td class="py-3 px-3 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1" :class="[
                      ord.paymentStatus === 'paid'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50'
                        : ord.paymentStatus === 'billed'
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/50'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50',
                    ]">
                      <span class="w-1.5 h-1.5 rounded-full" :class="[
                        ord.paymentStatus === 'paid'
                          ? 'bg-emerald-500'
                          : ord.paymentStatus === 'billed'
                            ? 'bg-purple-500'
                            : 'bg-amber-500',
                      ]"></span>
                      {{ ord.paymentStatus === 'paid' ? 'បានបង់' : ord.paymentStatus === 'billed' ? 'សុំមើលបុង' :
                        'កំពុងញ៉ាំ' }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-right whitespace-nowrap">
                    <span class="font-black font-mono text-gray-900 dark:text-white">
                      {{ formatRiel(Number(ord.totalAmount)) }} ៛
                    </span>
                    <span class="block text-[10px] text-gray-400 font-mono">
                      ${{ Number(ord.totalAmount).toFixed(2) }}
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

    <!-- ORDER DETAIL MODAL -->
    <div v-if="selectedOrderDetail"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="selectedOrderDetail = null">
      <div
        class="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 class="font-black text-base text-gray-900 dark:text-white">
              ព័ត៌មានលម្អិតវិក្កយបត្រ #{{ selectedOrderDetail.orderNumber }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ selectedOrderDetail.tableNumber }} • {{ new Date(selectedOrderDetail.createdAt || Date.now()).toLocaleString() }}
            </p>
          </div>
          <button type="button"
            class="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            @click="selectedOrderDetail = null">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5 space-y-4">
          <div class="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-3.5 text-xs space-y-1.5">
            <div class="flex justify-between">
              <span class="text-gray-500">អ្នកកត់ Order (Waiter)</span>
              <span class="font-bold text-gray-900 dark:text-white">{{ selectedOrderDetail.waiterName || 'Cashier' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">បេឡាករ (Cashier)</span>
              <span class="font-mono font-semibold text-gray-800 dark:text-gray-200">{{ selectedOrderDetail.cashierName || 'Cashier 01' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">វិធីទូទាត់</span>
              <span class="font-bold uppercase">{{ selectedOrderDetail.paymentMethod }}</span>
            </div>
          </div>

          <div class="divide-y divide-gray-100 dark:divide-gray-800">
            <div v-for="(it, idx) in selectedOrderDetail.items" :key="idx"
              class="py-2.5 flex items-start justify-between gap-3 text-xs">
              <div>
                <p class="font-bold text-gray-900 dark:text-white">
                  <span class="font-mono text-primary-600 dark:text-primary-400">{{ it.quantity }}x</span>
                  {{ it.name }}
                </p>
                <p v-if="it.variantLabel || it.note" class="text-[11px] text-gray-500 mt-0.5">
                  <span v-if="it.variantLabel">{{ it.variantLabel }}</span>
                  <span v-if="it.note"> • {{ it.note }}</span>
                </p>
              </div>
              <div class="text-right font-mono shrink-0">
                <p class="font-bold text-gray-900 dark:text-white">{{ formatRiel(Number(it.subtotal)) }} ៛</p>
                <p class="text-[10px] text-gray-400">${{ Number(it.subtotal).toFixed(2) }}</p>
              </div>
            </div>
          </div>

          <div v-if="selectedOrderDetail.note"
            class="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-xs text-indigo-700 dark:text-indigo-300">
            {{ selectedOrderDetail.note }}
          </div>

          <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300">សរុបត្រូវទូទាត់</span>
            <div class="text-right font-mono">
              <p class="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {{ formatRiel(Number(selectedOrderDetail.totalAmount)) }} ៛
              </p>
              <p class="text-xs text-gray-500">${{ Number(selectedOrderDetail.totalAmount).toFixed(2) }}</p>
            </div>
          </div>
        </div>

        <div class="px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900">
          <button type="button"
            class="w-full py-2.5 rounded-xl text-xs font-bold bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer"
            @click="selectedOrderDetail = null">
            បិទ
          </button>
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
