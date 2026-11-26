<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MenuItem, Category, Order, OrderItem } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

const { $api } = useApi();
const toast = useToast();

// 1. Fetch Menu & Categories
const { data: menuData, status: menuStatus } = await useApiData<MenuItem[]>(
  'pos-menu-list',
  '/api/menu'
);

const { data: categoriesData } = await useApiData<Category[]>(
  'pos-categories-list',
  '/api/categories'
);

// 2. Fetch Active Pending Orders (Occupied Tables)
const { data: activeOrdersData, refresh: refreshActiveOrders } = await useApiData<Order[]>(
  'pos-active-orders',
  '/api/orders/active'
);

const menuList = computed(() => (menuData.value || []).filter((i) => i.isAvailable));
const categoriesList = computed(() => categoriesData.value || []);
const activeOrders = computed(() => activeOrdersData.value || []);

// Active Tables Dictionary: tableNumber -> Order
const activeTablesMap = computed(() => {
  const map = new Map<string, Order>();
  for (const o of activeOrders.value) {
    map.set(o.tableNumber, o);
  }
  return map;
});

// Table selection
const tableOptions = [
  'តុ 1',
  'តុ 2',
  'តុ 3',
  'តុ 4',
  'តុ 5',
  'តុ 6',
  'តុ 7',
  'តុ 8',
  'តុ 9',
  'តុ 10',
  'ខ្ចប់ (Takeaway)',
];
const selectedTable = ref('តុ 1');
const customTableInput = ref('');

const currentSelectedTableName = computed(() => {
  return customTableInput.value.trim() || selectedTable.value;
});

const currentActiveOrder = computed(() => {
  return activeTablesMap.value.get(currentSelectedTableName.value) || null;
});

const isCurrentTableOccupied = computed(() => Boolean(currentActiveOrder.value));

// Filter & Search
const selectedCategory = ref<string>('all');
const searchQuery = ref('');

const filteredItems = computed(() => {
  return menuList.value.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.value.toLowerCase()));
    const matchesCat =
      selectedCategory.value === 'all' || item.categoryId === selectedCategory.value;
    return matchesSearch && matchesCat;
  });
});

// Cart / Order Slip State
const cart = ref<OrderItem[]>([]);
const discount = ref<number>(0);
const paymentMethod = ref<'cash' | 'khqr' | 'card'>('cash');
const orderNote = ref('');
const isSubmitting = ref(false);

// Synchronize cart when table selection changes
function syncTableOrder() {
  const existingOrder = currentActiveOrder.value;
  if (existingOrder) {
    // Occupied Table: Load existing items so cashier can append more or checkout
    cart.value = JSON.parse(JSON.stringify(existingOrder.items));
    discount.value = existingOrder.discount || 0;
    orderNote.value = existingOrder.note || '';
    paymentMethod.value = existingOrder.paymentMethod || 'cash';
  } else {
    // Available Table: Fresh empty cart for new customer
    cart.value = [];
    discount.value = 0;
    orderNote.value = '';
  }
}

watch([currentSelectedTableName, activeOrders], () => {
  syncTableOrder();
}, { immediate: true });

function handleSelectTable(t: string) {
  selectedTable.value = t;
  customTableInput.value = '';
}

// Variant Selection Modal State
const isVariantModalOpen = ref(false);
const activeItemForVariant = ref<MenuItem | null>(null);

// Receipt Modal State
const isReceiptModalOpen = ref(false);
const lastSavedOrder = ref<Order | null>(null);

// Calculations
const subtotal = computed(() => {
  return Number(cart.value.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2));
});

const totalAmount = computed(() => {
  return Math.max(0, Number((subtotal.value - (discount.value || 0)).toFixed(2)));
});

function formatRiel(usd: number): string {
  return Math.round(usd * 4100).toLocaleString('en-US');
}

// Add Item Handlers
function handleClickDish(item: MenuItem) {
  if (item.hasVariants && item.variants && item.variants.length > 0) {
    activeItemForVariant.value = item;
    isVariantModalOpen.value = true;
  } else {
    addItemToCart(item.id, item.name, '', Number(item.price) || 0);
  }
}

function selectVariantAndAdd(label: string, price: number) {
  if (!activeItemForVariant.value) return;
  addItemToCart(activeItemForVariant.value.id, activeItemForVariant.value.name, label, price);
  isVariantModalOpen.value = false;
  activeItemForVariant.value = null;
}

function addItemToCart(menuItemId: string, name: string, variantLabel: string, price: number) {
  const existing = cart.value.find(
    (it) => it.menuItemId === menuItemId && it.variantLabel === variantLabel
  );

  if (existing) {
    existing.quantity += 1;
    existing.subtotal = Number((existing.price * existing.quantity).toFixed(2));
  } else {
    cart.value.push({
      menuItemId,
      name,
      variantLabel,
      price,
      quantity: 1,
      subtotal: price,
      note: '',
    });
  }
}

function updateQuantity(index: number, delta: number) {
  const item = cart.value[index];
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart.value.splice(index, 1);
  } else {
    item.subtotal = Number((item.price * item.quantity).toFixed(2));
  }
}

function clearCart() {
  if (cart.value.length === 0) return;
  if (confirm('តើអ្នកពិតជាចង់សម្អាតបញ្ជីកុម្ម៉ង់នេះមែនទេ? (Clear order)')) {
    cart.value = [];
    discount.value = 0;
    orderNote.value = '';
  }
}

// 1. ACTION: HOLD / APPEND ORDER (ទុកតុ / Order បន្ថែម - មិនទាន់គិតលុយ)
async function handleSavePendingOrder() {
  if (cart.value.length === 0) {
    toast.add({
      title: 'មិនទាន់មានមុខម្ហូប',
      description: 'សូមជ្រើសរើសមុខម្ហូបយ៉ាងហោចណាស់មួយ',
      color: 'warning',
    });
    return;
  }

  isSubmitting.value = true;
  const table = currentSelectedTableName.value;

  try {
    if (isCurrentTableOccupied.value && currentActiveOrder.value) {
      // Append / Update Existing Table Order
      await $api(`/api/orders/${currentActiveOrder.value.id}`, {
        method: 'PUT',
        body: {
          items: cart.value,
          discount: Number(discount.value) || 0,
          note: orderNote.value.trim() || '',
        },
      });

      toast.add({
        title: 'បានបន្ថែមមុខម្ហូបជោគជ័យ!',
        description: `បានបន្ថែមមុខម្ហូបចូល ${table} រួចរាល់`,
        color: 'success',
      });
    } else {
      // New Order for Table
      await $api('/api/orders', {
        method: 'POST',
        body: {
          tableNumber: table,
          items: cart.value,
          discount: Number(discount.value) || 0,
          paymentMethod: paymentMethod.value,
          paymentStatus: 'pending',
          cashierName: 'Cashier 01',
          note: orderNote.value.trim() || '',
        },
      });

      toast.add({
        title: 'បានបើកតុ & កត់ Order!',
        description: `បានកត់ត្រា Order ដំបូងសម្រាប់ ${table}`,
        color: 'success',
      });
    }

    await refreshActiveOrders();
  } catch (err: any) {
    toast.add({
      title: 'មានបញ្ហាក្នុងការរក្សាទុក',
      description: err.message || 'Failed to save order',
      color: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
}

// 2. ACTION: CHECKOUT & CLOSE TABLE (គិតលុយ & បិទតុ)
async function handleCheckout() {
  if (cart.value.length === 0) {
    toast.add({
      title: 'មិនទាន់មានមុខម្ហូប',
      description: 'សូមជ្រើសរើសមុខម្ហូបយ៉ាងហោចណាស់មួយមុនពេលគិតលុយ',
      color: 'warning',
    });
    return;
  }

  isSubmitting.value = true;
  const table = currentSelectedTableName.value;

  try {
    let saved: Order;

    if (isCurrentTableOccupied.value && currentActiveOrder.value) {
      // Final Checkout for an occupied table
      const res: any = await $api(`/api/orders/${currentActiveOrder.value.id}`, {
        method: 'PUT',
        body: {
          items: cart.value,
          discount: Number(discount.value) || 0,
          paymentMethod: paymentMethod.value,
          paymentStatus: 'paid',
          note: orderNote.value.trim() || '',
        },
      });
      saved = res?.data || res;
    } else {
      // Instant Direct Payment for a new walk-in / takeaway
      const res: any = await $api('/api/orders', {
        method: 'POST',
        body: {
          tableNumber: table,
          items: cart.value,
          discount: Number(discount.value) || 0,
          paymentMethod: paymentMethod.value,
          paymentStatus: 'paid',
          cashierName: 'Cashier 01',
          note: orderNote.value.trim() || '',
        },
      });
      saved = res?.data || res;
    }

    lastSavedOrder.value = saved;
    isReceiptModalOpen.value = true;

    // Reset Cart
    cart.value = [];
    discount.value = 0;
    orderNote.value = '';

    await refreshActiveOrders();

    toast.add({
      title: 'គិតលុយជោគជ័យ!',
      description: `បានបិទតុ ${table} និងចេញវិក្កយបត្ររួចរាល់`,
      color: 'success',
    });
  } catch (err: any) {
    toast.add({
      title: 'បរាជ័យក្នុងការគិតលុយ',
      description: err.message || 'Failed to checkout',
      color: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
}

function handlePrint() {
  window.print();
}
</script>

<template>
  <div class="h-[calc(100vh-5.5rem)] flex flex-col lg:flex-row gap-4 overflow-hidden">
    <!-- LEFT SIDE: MENU & DISH PICKER (65% width on desktop) -->
    <div class="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs overflow-hidden">
      <!-- Top Bar: Table Selector with Live Occupied Badges -->
      <div class="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3 shrink-0">
        <!-- Title and Table Selector Buttons -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-calculator" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <span>Cashier POS</span>
            </h1>

            <div class="flex items-center gap-2 text-xs">
              <span class="inline-flex items-center gap-1 font-bold text-emerald-600">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> តុទំនេរ (New)
              </span>
              <span class="inline-flex items-center gap-1 font-bold text-amber-600">
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> តុជាប់ (ថែមមុខម្ហូប)
              </span>
            </div>
          </div>

          <!-- Table Buttons with Live Status -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              v-for="t in tableOptions"
              :key="t"
              type="button"
              class="px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border"
              :class="[
                currentSelectedTableName === t && !customTableInput
                  ? 'border-primary-600 bg-primary-600 text-white shadow-xs scale-[1.02]'
                  : activeTablesMap.has(t)
                  ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100'
                  : 'border-gray-200 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100',
              ]"
              @click="handleSelectTable(t)"
            >
              <span>{{ t }}</span>
              <!-- Occupied indicator -->
              <span
                v-if="activeTablesMap.has(t)"
                class="px-1.5 py-0.2 rounded-md text-[9px] font-black"
                :class="currentSelectedTableName === t ? 'bg-black/30 text-white' : 'bg-amber-500 text-white'"
              >
                {{ activeTablesMap.get(t)?.items.length }} មុខ
              </span>
            </button>

            <!-- Custom Table input -->
            <input
              v-model="customTableInput"
              type="text"
              placeholder="តុផ្សេង..."
              class="w-20 px-2 py-1 text-xs rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-1 focus:ring-primary-500 font-bold shrink-0"
            />
          </div>
        </div>

        <!-- Search & Categories Bar -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <div class="relative flex-1">
            <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="ស្វែងរកម្ហូប (Search dish name)..."
              class="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <!-- Category Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer"
              :class="[
                selectedCategory === 'all'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-2xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]"
              @click="selectedCategory = 'all'"
            >
              ទាំងអស់ (All)
            </button>
            <button
              v-for="cat in categoriesList"
              :key="cat.id"
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer"
              :class="[
                selectedCategory === cat.id
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-2xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]"
              @click="selectedCategory = cat.id"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Menu Items Grid (Scrollable) -->
      <div class="flex-1 p-4 overflow-y-auto">
        <div v-if="filteredItems.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="group p-2.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-500 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between select-none"
            @click="handleClickDish(item)"
          >
            <!-- Dish Image -->
            <div class="relative w-full aspect-4/3 rounded-xl bg-gray-200 dark:bg-gray-700 overflow-hidden mb-2">
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                <UIcon name="i-heroicons-photo" class="w-6 h-6" />
              </div>

              <!-- Multiple Prices Indicator Badge -->
              <span
                v-if="item.hasVariants"
                class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white backdrop-blur-md shadow-xs"
              >
                {{ item.variants?.length ?? 0 }} ទំហំ
              </span>
            </div>

            <!-- Title & Price -->
            <div class="space-y-1">
              <h3 class="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {{ item.name }}
              </h3>

              <div class="flex items-baseline justify-between">
                <span class="text-sm font-black text-primary-600 dark:text-primary-400">
                  <template v-if="item.hasVariants && item.variants && item.variants.length > 0">
                    ${{ Math.min(...item.variants.map((v) => Number(v.price))).toFixed(2) }}+
                  </template>
                  <template v-else>
                    ${{ Number(item.price).toFixed(2) }}
                  </template>
                </span>
                <span class="text-[10px] text-gray-400 font-mono">
                  ~{{ formatRiel(Number(item.price)) }} ៛
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty Filter State -->
        <div v-else class="h-full flex flex-col items-center justify-center text-gray-400 py-12 space-y-2">
          <UIcon name="i-heroicons-magnifying-glass" class="w-10 h-10 opacity-40" />
          <p class="text-xs font-semibold">មិនមានមុខម្ហូបដែលត្រូវនឹងការស្វែងរកនេះទេ</p>
        </div>
      </div>
    </div>

    <!-- RIGHT SIDE: LIVE ORDER BILL / SLIP (35% width on desktop) -->
    <div class="w-full lg:w-96 flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs overflow-hidden shrink-0">
      <!-- Order Header with Clear Active/New Mode Indicator -->
      <div
        class="p-4 border-b transition-colors flex items-center justify-between shrink-0"
        :class="[
          isCurrentTableOccupied
            ? 'bg-amber-500/10 border-amber-200 dark:border-amber-900/60'
            : 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/60',
        ]"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xs"
            :class="isCurrentTableOccupied ? 'bg-amber-500' : 'bg-emerald-600'"
          >
            {{ currentSelectedTableName.replace('តុ ', 'T') }}
          </div>

          <div>
            <div class="flex items-center gap-1.5">
              <h2 class="text-sm font-extrabold text-gray-900 dark:text-white leading-tight">
                {{ currentSelectedTableName }}
              </h2>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-black uppercase"
                :class="[
                  isCurrentTableOccupied
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white',
                ]"
              >
                {{ isCurrentTableOccupied ? 'ថែមម្ហូប (Add Items)' : 'New Order' }}
              </span>
            </div>

            <p class="text-[11px] text-gray-500 font-mono mt-0.5">
              <template v-if="isCurrentTableOccupied">
                Order #{{ currentActiveOrder?.orderNumber }} • {{ cart.length }} items
              </template>
              <template v-else>
                តុទំនេរ • ចុចរើសម្ហូបដំបូង
              </template>
            </p>
          </div>
        </div>

        <button
          type="button"
          class="p-1.5 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="Clear order"
          :disabled="cart.length === 0"
          :class="{ 'opacity-30 cursor-not-allowed': cart.length === 0 }"
          @click="clearCart"
        >
          <UIcon name="i-heroicons-trash" class="w-4 h-4" />
        </button>
      </div>

      <!-- Order Items List (Scrollable) -->
      <div class="flex-1 p-3 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
        <div v-if="cart.length > 0" class="space-y-2">
          <div
            v-for="(item, idx) in cart"
            :key="idx"
            class="py-2.5 flex items-start justify-between gap-2"
          >
            <!-- Left Info -->
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold text-gray-900 dark:text-white truncate">
                {{ item.name }}
              </p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span
                  v-if="item.variantLabel"
                  class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50"
                >
                  {{ item.variantLabel }}
                </span>
                <span class="text-[11px] text-gray-400 font-mono">
                  ${{ item.price.toFixed(2) }} ea
                </span>
              </div>

              <!-- Note input optional -->
              <input
                v-model="item.note"
                type="text"
                placeholder="ចំណាំ (Note: ស្ករតិច, មិនប៊ីចេង...)"
                class="w-full mt-1.5 px-2 py-0.5 text-[10px] rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden"
              />
            </div>

            <!-- Right: Quantity Stepper & Subtotal -->
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span class="text-xs font-black text-gray-900 dark:text-white font-mono">
                ${{ item.subtotal.toFixed(2) }}
              </span>

              <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200/60 dark:border-gray-700/60">
                <button
                  type="button"
                  class="w-5 h-5 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer text-xs font-bold"
                  @click="updateQuantity(idx, -1)"
                >
                  -
                </button>
                <span class="w-5 text-center text-xs font-bold font-mono">
                  {{ item.quantity }}
                </span>
                <button
                  type="button"
                  class="w-5 h-5 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer text-xs font-bold"
                  @click="updateQuantity(idx, 1)"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="h-full flex flex-col items-center justify-center text-gray-400 py-16 space-y-2">
          <UIcon name="i-heroicons-shopping-bag" class="w-10 h-10 opacity-30" />
          <p class="text-xs">មិនទាន់មានមុខម្ហូបក្នុង Order នេះទេ</p>
          <span class="text-[11px] text-gray-400">ចុចលើមុខម្ហូបនៅខាងឆ្វេងដើម្បីកត់ត្រា</span>
        </div>
      </div>

      <!-- Order Calculations & Dual Action Buttons (Hold / Checkout) -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 space-y-3 shrink-0">
        <!-- Subtotal and Discount -->
        <div class="space-y-1.5 text-xs">
          <div class="flex justify-between text-gray-500">
            <span>Subtotal (សរុបដើម):</span>
            <span class="font-mono font-bold text-gray-700 dark:text-gray-300">${{ subtotal.toFixed(2) }}</span>
          </div>

          <div class="flex items-center justify-between text-gray-500">
            <span>Discount (ចុះថ្លៃ $):</span>
            <div class="w-20 relative">
              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                v-model.number="discount"
                type="number"
                step="0.5"
                min="0"
                class="w-full pl-5 pr-1.5 py-0.5 text-xs text-right rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono font-bold"
              />
            </div>
          </div>

          <!-- Total Highlight -->
          <div class="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-baseline justify-between">
            <span class="text-sm font-black text-gray-900 dark:text-white">សរុប (Grand Total):</span>
            <div class="text-right">
              <span class="text-xl font-black text-primary-600 dark:text-primary-400 font-mono">
                ${{ totalAmount.toFixed(2) }}
              </span>
              <span class="block text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                ≈ {{ formatRiel(totalAmount) }} ៛
              </span>
            </div>
          </div>
        </div>

        <!-- Payment Method Selector -->
        <div class="grid grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            class="py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all border cursor-pointer"
            :class="[
              paymentMethod === 'cash'
                ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
            ]"
            @click="paymentMethod = 'cash'"
          >
            <UIcon name="i-heroicons-banknotes" class="w-3.5 h-3.5" />
            <span>Cash</span>
          </button>

          <button
            type="button"
            class="py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all border cursor-pointer"
            :class="[
              paymentMethod === 'khqr'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
            ]"
            @click="paymentMethod = 'khqr'"
          >
            <UIcon name="i-heroicons-qr-code" class="w-3.5 h-3.5" />
            <span>KHQR</span>
          </button>

          <button
            type="button"
            class="py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all border cursor-pointer"
            :class="[
              paymentMethod === 'card'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
            ]"
            @click="paymentMethod = 'card'"
          >
            <UIcon name="i-heroicons-credit-card" class="w-3.5 h-3.5" />
            <span>Card</span>
          </button>
        </div>

        <!-- DUAL ACTIONS: 1. SAVE/HOLD TABLE vs 2. CHECKOUT & CLOSE TABLE -->
        <div class="grid grid-cols-2 gap-2 pt-1">
          <!-- Button 1: Hold Table / Append Items -->
          <button
            type="button"
            :disabled="cart.length === 0 || isSubmitting"
            class="py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :class="[
              isCurrentTableOccupied
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
            ]"
            @click="handleSavePendingOrder"
          >
            <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            <UIcon v-else-if="isCurrentTableOccupied" name="i-heroicons-plus-circle" class="w-4 h-4" />
            <UIcon v-else name="i-heroicons-arrow-down-on-square" class="w-4 h-4 text-primary-500" />
            <span>{{ isCurrentTableOccupied ? 'ថែមម្ហូប (Save)' : 'រក្សាទុកតុ (Hold)' }}</span>
          </button>

          <!-- Button 2: Pay & Close Table -->
          <button
            type="button"
            :disabled="cart.length === 0 || isSubmitting"
            class="py-2.5 px-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            @click="handleCheckout"
          >
            <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            <UIcon v-else name="i-heroicons-check-circle" class="w-4 h-4" />
            <span>គិតលុយ (Checkout)</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 1: VARIANT / SIZE SELECTION POPUP -->
    <div
      v-if="isVariantModalOpen && activeItemForVariant"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-extrabold text-base text-gray-900 dark:text-white">
              {{ activeItemForVariant.name }}
            </h3>
            <p class="text-xs text-gray-500">សូមជ្រើសរើសទំហំ ឬជម្រើសលក់ (Select Size / Unit):</p>
          </div>
          <button
            type="button"
            class="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            @click="
              isVariantModalOpen = false;
              activeItemForVariant = null;
            "
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Variant Options Grid -->
        <div class="space-y-2">
          <button
            v-for="(v, vIdx) in activeItemForVariant.variants"
            :key="vIdx"
            type="button"
            class="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/40 transition-all flex items-center justify-between group cursor-pointer text-left"
            @click="selectVariantAndAdd(v.label, Number(v.price))"
          >
            <div>
              <span class="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {{ v.label }}
              </span>
              <span class="block text-[11px] text-gray-400 font-mono">
                ~{{ formatRiel(Number(v.price)) }} ៛
              </span>
            </div>

            <span class="text-base font-black text-primary-600 dark:text-primary-400 font-mono">
              ${{ Number(v.price).toFixed(2) }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 2: RECEIPT POPUP / PRINT VIEW -->
    <div
      v-if="isReceiptModalOpen && lastSavedOrder"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4">
        <!-- Receipt Content -->
        <div id="receipt-print-area" class="space-y-4 text-center">
          <div>
            <h2 class="text-lg font-black text-gray-900 dark:text-white">RESTAURANT MENU</h2>
            <p class="text-[11px] text-gray-500">Official Dining Invoice</p>
            <p class="text-[11px] text-gray-400 font-mono mt-1">
              Order #{{ lastSavedOrder.orderNumber }} • {{ lastSavedOrder.tableNumber }}
            </p>
            <p class="text-[10px] text-gray-400 font-mono">
              {{ new Date(lastSavedOrder.createdAt || Date.now()).toLocaleString() }}
            </p>
          </div>

          <div class="border-t border-b border-dashed border-gray-300 dark:border-gray-700 py-3 space-y-2 text-left">
            <div
              v-for="(it, itIdx) in lastSavedOrder.items"
              :key="itIdx"
              class="flex items-start justify-between text-xs"
            >
              <div class="flex-1">
                <p class="font-bold text-gray-900 dark:text-white">{{ it.name }}</p>
                <p v-if="it.variantLabel" class="text-[10px] text-gray-500 font-mono">
                  {{ it.variantLabel }} x {{ it.quantity }}
                </p>
              </div>
              <span class="font-black font-mono text-gray-900 dark:text-white">
                ${{ it.subtotal.toFixed(2) }}
              </span>
            </div>
          </div>

          <!-- Total Calculation -->
          <div class="space-y-1 text-xs">
            <div class="flex justify-between text-gray-500">
              <span>Subtotal:</span>
              <span class="font-mono font-bold">${{ lastSavedOrder.subtotal.toFixed(2) }}</span>
            </div>
            <div v-if="lastSavedOrder.discount" class="flex justify-between text-gray-500">
              <span>Discount:</span>
              <span class="font-mono font-bold">-${{ lastSavedOrder.discount.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
              <span>TOTAL (USD):</span>
              <span class="font-mono text-primary-600 dark:text-primary-400">${{ lastSavedOrder.totalAmount.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>TOTAL (KHR):</span>
              <span class="font-mono">≈ {{ formatRiel(lastSavedOrder.totalAmount) }} ៛</span>
            </div>
          </div>

          <div class="pt-2 text-center text-[11px] text-gray-400">
            <p>Payment: {{ lastSavedOrder.paymentMethod.toUpperCase() }}</p>
            <p class="mt-1 font-bold">សូមអរគុណ! Thank You!</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            class="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
            @click="
              isReceiptModalOpen = false;
              lastSavedOrder = null;
            "
          >
            Close (បិទ)
          </button>
          <button
            type="button"
            class="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center gap-1 shadow-sm cursor-pointer"
            @click="handlePrint"
          >
            <UIcon name="i-heroicons-printer" class="w-4 h-4" />
            <span>Print Slip (ព្រីន)</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
