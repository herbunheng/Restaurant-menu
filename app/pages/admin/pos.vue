<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  DEFAULT_EXCHANGE_RATE,
  formatRiel,
  convertUsdToKhr,
  convertKhrToUsd,
  formatKhrAmount,
} from '@restaurant-menu/shared';
import type { MenuItem, Category, Order, OrderItem, Staff, PaymentMethodConfig } from '@restaurant-menu/shared';

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

// 3. Fetch Staff Members for Waiter & Bill Collector
const { data: dbStaffData } = await useApiData<Staff[]>(
  'pos-staff-list',
  '/api/staff'
);

// 4. Fetch Active Payment Methods (ABA, ACLEDA, Cash, etc.)
const { data: dbPaymentMethodsData } = await useApiData<PaymentMethodConfig[]>(
  'pos-payment-methods',
  '/api/payment-methods/active'
);

// 5. Fetch Site Settings for Live Exchange Rate ($1 = ... ៛)
const { data: siteSettingsData, refresh: refreshSettings } = await useApiData<{ exchangeRate?: number }>(
  'pos-site-settings',
  '/api/settings'
);

const currentExchangeRate = computed(() => {
  return Number(siteSettingsData.value?.exchangeRate) || DEFAULT_EXCHANGE_RATE;
});

const activePaymentMethods = computed(() => {
  const methods = dbPaymentMethodsData.value || [];
  if (methods.length > 0) return methods;
  return [
    { id: 'pay_cash', name: 'សាច់ប្រាក់ (Cash)', code: 'cash', isEnabled: true, sortOrder: 1 },
    { id: 'pay_aba', name: 'ABA Bank', code: 'aba', isEnabled: true, sortOrder: 2 },
    { id: 'pay_acleda', name: 'ACLEDA Bank', code: 'acleda', isEnabled: true, sortOrder: 3 },
  ] as PaymentMethodConfig[];
});

const menuList = computed(() => (menuData.value || []).filter((i) => i.isAvailable));
const categoriesList = computed(() => categoriesData.value || []);
const activeOrders = computed(() => activeOrdersData.value || []);

// Quick Map: menuItemId -> MenuItem
const menuMap = computed(() => {
  const map = new Map<string, MenuItem>();
  for (const item of (menuData.value || [])) {
    map.set(item.id, item);
  }
  return map;
});

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
  'ខ្ចប់',
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

// Staff Tracking State (អ្នកកត់ Order និងអ្នកកាន់បុងទៅគិតលុយភ្ញៀវ)
const fallbackStaffList = ['សុខា', 'ដារ៉ា', 'ចាន់ណា', 'ពិសិដ្ឋ', 'កញ្ញា'];
const presetStaffList = computed(() => {
  const activeNames = (dbStaffData.value || [])
    .filter((s) => s.status === 'active')
    .map((s) => s.name);
  return activeNames.length > 0 ? activeNames : fallbackStaffList;
});
const selectedWaiterOption = ref('');
const customWaiterInput = ref('');
const activeWaiterName = computed(() => {
  if (selectedWaiterOption.value === 'custom') {
    return customWaiterInput.value.trim();
  }
  return selectedWaiterOption.value;
});

// Bill Collector Modal & Selection (អ្នកកាន់បុងទៅគិតលុយ)
const isBilledByModalOpen = ref(false);
const selectedBilledBy = ref('');
const customBilledByInput = ref('');
const activeBilledByName = computed(() => customBilledByInput.value.trim() || selectedBilledBy.value);

// Live Timer for Billed Orders Tracking
const nowTimestamp = ref(Date.now());
let timerInterval: any = null;

onMounted(() => {
  timerInterval = setInterval(() => {
    nowTimestamp.value = Date.now();
  }, 10000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

function getElapsedMinutes(timestamp: string | Date | undefined | null): number {
  if (!timestamp) return 0;
  const time = new Date(timestamp).getTime();
  if (isNaN(time)) return 0;
  return Math.max(0, Math.floor((nowTimestamp.value - time) / 60000));
}

// Synchronize cart when table selection changes
function syncTableOrder() {
  const existingOrder = currentActiveOrder.value;
  if (existingOrder) {
    // Occupied Table: Load existing items so cashier can append more or checkout
    cart.value = JSON.parse(JSON.stringify(existingOrder.items));
    discount.value = existingOrder.discount || 0;
    orderNote.value = existingOrder.note || '';
    paymentMethod.value = existingOrder.paymentMethod || 'cash';

    // Synchronize Waiter Name
    const w = existingOrder.waiterName || '';
    if (!w) {
      selectedWaiterOption.value = '';
      customWaiterInput.value = '';
    } else if (presetStaffList.value.includes(w)) {
      selectedWaiterOption.value = w;
      customWaiterInput.value = '';
    } else {
      selectedWaiterOption.value = 'custom';
      customWaiterInput.value = w;
    }
  } else {
    // Available Table: Fresh empty cart for new customer
    cart.value = [];
    discount.value = 0;
    orderNote.value = '';
    selectedWaiterOption.value = '';
    customWaiterInput.value = '';
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
const receiptMode = ref<'official' | 'pre_bill'>('official');
const isPrintingPreBill = ref(false);

// Payment Checkout Modal State (ជ្រើសរើសវិធីសាស្ត្រទូទាត់ពេលចុចគិតលុយ)
const isPaymentModalOpen = ref(false);
const checkoutPaymentMethod = ref<string>('cash');

// Dual Currency Cash Handling (ទទួលប្រាក់ជារៀល KHR ជាចម្បង & ជាដុល្លារ USD)
const checkoutReceivedCashKHR = ref<number | ''>('');
const checkoutReceivedCashUSD = ref<number | ''>('');

const quickCashKHRBanknotes = [10000, 20000, 50000, 100000, 200000];
const quickCashUSDBanknotes = [5, 10, 20, 50, 100];

const totalCashReceivedInKHR = computed(() => {
  const khr = Number(checkoutReceivedCashKHR.value) || 0;
  const usdInKhr = Math.round((Number(checkoutReceivedCashUSD.value) || 0) * currentExchangeRate.value);
  return khr + usdInKhr;
});

const checkoutChangeKHR = computed(() => {
  if (checkoutPaymentMethod.value !== 'cash') return 0;
  const diff = totalCashReceivedInKHR.value - totalAmountKHR.value;
  return diff > 0 ? diff : 0;
});

const checkoutChangeUSD = computed(() => {
  if (checkoutPaymentMethod.value !== 'cash') return 0;
  return Number((checkoutChangeKHR.value / currentExchangeRate.value).toFixed(2));
});

function setQuickCashKHR(amount: number) {
  checkoutReceivedCashKHR.value = amount;
  checkoutReceivedCashUSD.value = '';
}

function setQuickCashUSD(amount: number) {
  checkoutReceivedCashUSD.value = amount;
  checkoutReceivedCashKHR.value = '';
}

// Exchange Rate Modal State ($1 = ... ៛)
const isExchangeRateModalOpen = ref(false);
const tempExchangeRateInput = ref<number>(4000);
const isUpdatingRate = ref(false);

function openExchangeRateModal() {
  tempExchangeRateInput.value = currentExchangeRate.value;
  isExchangeRateModalOpen.value = true;
}

async function saveExchangeRate() {
  const rate = Math.round(Number(tempExchangeRateInput.value));
  if (!rate || rate <= 0) {
    toast.add({
      title: 'អត្រាប្តូរប្រាក់មិនត្រឹមត្រូវ',
      description: 'សូមបញ្ចូលលេខអត្រាប្តូរប្រាក់វិជ្ជមាន (ឧទាហរណ៍៖ 4000 ឬ 4100)',
      color: 'warning',
    });
    return;
  }

  isUpdatingRate.value = true;
  try {
    await $api('/api/settings', {
      method: 'PUT',
      body: {
        exchangeRate: rate,
      },
    });

    await refreshSettings();
    isExchangeRateModalOpen.value = false;

    if (isPaymentModalOpen.value && checkoutPaymentMethod.value === 'cash') {
      checkoutReceivedCashKHR.value = totalAmountKHR.value;
    }

    toast.add({
      title: 'បានផ្លាស់ប្តូរអត្រាប្តូរប្រាក់!',
      description: `អត្រាប្តូរប្រាក់ថ្មីគឺ $1 = ${rate.toLocaleString()} ៛`,
      color: 'success',
    });
  } catch (err: any) {
    toast.add({
      title: 'បរាជ័យក្នុងការកែប្រែអត្រា',
      description: err.message || 'Failed to update exchange rate',
      color: 'error',
    });
  } finally {
    isUpdatingRate.value = false;
  }
}

// Mixed Payment State (បង់ចម្រុះ៖ សាច់ប្រាក់ + Pay Online)
const mixedCashUSD = ref<number | ''>('');
const mixedOnlineUSD = ref<number | ''>('');
const mixedOnlineBank = ref<string>('aba');
const mixedNoteInput = ref<string>('');

const onlinePaymentMethods = computed(() => {
  return activePaymentMethods.value.filter((m) => m.code !== 'cash' && m.code !== 'card');
});

const currentSelectedMixedOnlineObj = computed(() => {
  return (
    activePaymentMethods.value.find((m) => m.code === mixedOnlineBank.value) ||
    onlinePaymentMethods.value[0] ||
    null
  );
});

function onMixedCashInput() {
  const cash = Number(mixedCashUSD.value) || 0;
  if (cash <= totalAmount.value) {
    mixedOnlineUSD.value = Number((totalAmount.value - cash).toFixed(2));
  } else {
    mixedOnlineUSD.value = 0;
  }
}

function onMixedOnlineInput() {
  const online = Number(mixedOnlineUSD.value) || 0;
  if (online <= totalAmount.value) {
    mixedCashUSD.value = Number((totalAmount.value - online).toFixed(2));
  } else {
    mixedCashUSD.value = 0;
  }
}

const mixedTotalPaid = computed(() => {
  return Number(((Number(mixedCashUSD.value) || 0) + (Number(mixedOnlineUSD.value) || 0)).toFixed(2));
});

const mixedRemainingUSD = computed(() => {
  const diff = totalAmount.value - mixedTotalPaid.value;
  return diff > 0 ? Number(diff.toFixed(2)) : 0;
});

const mixedChangeUSD = computed(() => {
  const cash = Number(mixedCashUSD.value) || 0;
  const online = Number(mixedOnlineUSD.value) || 0;
  if (cash + online > totalAmount.value && cash > 0) {
    return Number((cash + online - totalAmount.value).toFixed(2));
  }
  return 0;
});

const currentSelectedPaymentMethodObj = computed(() => {
  return activePaymentMethods.value.find((m) => m.code === checkoutPaymentMethod.value) || null;
});

function getPaymentMethodLabel(code: string | undefined | null): string {
  if (!code) return 'សាច់ប្រាក់';
  if (code === 'mixed') return 'បង់ចម្រុះ (សាច់ប្រាក់ + Pay Online)';
  const found = activePaymentMethods.value.find((m) => m.code === code);
  if (found) return found.name;
  if (code === 'cash') return 'សាច់ប្រាក់ (Cash)';
  if (code === 'aba') return 'ABA Bank';
  if (code === 'acleda') return 'ACLEDA Bank';
  if (code === 'wing') return 'Wing Bank';
  if (code === 'card') return 'កាតធនាគារ (Card)';
  if (code === 'khqr') return 'KHQR / Bakong';
  return code;
}

function openPaymentModal() {
  if (cart.value.length === 0) {
    toast.add({
      title: 'មិនទាន់មានមុខម្ហូប',
      description: 'សូមជ្រើសរើសមុខម្ហូបយ៉ាងហោចណាស់មួយមុនពេលគិតលុយ',
      color: 'warning',
    });
    return;
  }

  // Default to cash if active, or the first active payment method
  const hasCash = activePaymentMethods.value.some((m) => m.code === 'cash');
  checkoutPaymentMethod.value = hasCash ? 'cash' : (activePaymentMethods.value[0]?.code || 'cash');
  checkoutReceivedCashKHR.value = totalAmountKHR.value;
  checkoutReceivedCashUSD.value = '';

  // Initialize mixed payment defaults
  const halfCash = Number((totalAmount.value / 2).toFixed(2));
  mixedCashUSD.value = halfCash;
  mixedOnlineUSD.value = Number((totalAmount.value - halfCash).toFixed(2));
  mixedOnlineBank.value = onlinePaymentMethods.value[0]?.code || 'aba';
  mixedNoteInput.value = '';

  isPaymentModalOpen.value = true;
}

// Split Bill Modal State
const isSplitModalOpen = ref(false);
const splitItems = ref<{
  menuItemId: string;
  name: string;
  variantLabel: string;
  price: number;
  availableQty: number;
  qtyToPay: number;
  note: string;
}[]>([]);
const splitPaymentMethod = ref<'cash' | 'khqr' | 'card'>('cash');
const isSubmittingSplit = ref(false);

// Confirmation Dialog State (ជៀសវាងការច្រលំដៃពេល ដក រឺ បន្ថែមមុខម្ហូប)
interface ConfirmDialogState {
  isOpen: boolean;
  type: 'add' | 'remove' | 'hold';
  title: string;
  message: string;
  confirmText?: string;
  details?: {
    name: string;
    subtext?: string;
  };
  onConfirm: () => void;
}

const confirmDialog = ref<ConfirmDialogState>({
  isOpen: false,
  type: 'hold',
  title: '',
  message: '',
  confirmText: 'យល់ព្រម',
  onConfirm: () => { },
});

function openConfirmDialog(options: {
  type: 'add' | 'remove' | 'hold';
  title: string;
  message: string;
  confirmText?: string;
  details?: {
    name: string;
    subtext?: string;
  };
  onConfirm: () => void;
}) {
  confirmDialog.value = {
    isOpen: true,
    type: options.type,
    title: options.title,
    message: options.message,
    confirmText: options.confirmText || 'យល់ព្រម',
    details: options.details,
    onConfirm: options.onConfirm,
  };
}

function handleConfirmDialogAction(confirmed: boolean) {
  if (confirmed && confirmDialog.value.onConfirm) {
    confirmDialog.value.onConfirm();
  }
  confirmDialog.value.isOpen = false;
}

function openSplitModal() {
  if (!isCurrentTableOccupied.value || cart.value.length === 0) return;

  // Initialize split items with qtyToPay: 0
  splitItems.value = cart.value.map((it) => ({
    menuItemId: it.menuItemId,
    name: it.name,
    variantLabel: it.variantLabel || '',
    price: it.price,
    availableQty: it.quantity,
    qtyToPay: 0,
    note: it.note || '',
  }));

  splitPaymentMethod.value = paymentMethod.value || 'cash';
  isSplitModalOpen.value = true;
}

const splitTotalUSD = computed(() => {
  const sum = splitItems.value.reduce((acc, curr) => acc + (curr.price * curr.qtyToPay), 0);
  return Number(sum.toFixed(2));
});

const splitSelectedCount = computed(() => {
  return splitItems.value.reduce((acc, curr) => acc + curr.qtyToPay, 0);
});

function updateSplitQty(index: number, delta: number) {
  const it = splitItems.value[index];
  if (!it) return;
  const newQty = it.qtyToPay + delta;
  if (newQty >= 0 && newQty <= it.availableQty) {
    it.qtyToPay = newQty;
  }
}

async function handleConfirmSplitPay() {
  const itemsToPay = splitItems.value
    .filter((it) => it.qtyToPay > 0)
    .map((it) => ({
      menuItemId: it.menuItemId,
      name: it.name,
      variantLabel: it.variantLabel,
      price: it.price,
      quantity: it.qtyToPay,
      subtotal: Number((it.price * it.qtyToPay).toFixed(2)),
      note: it.note,
    }));

  if (itemsToPay.length === 0) {
    toast.add({
      title: 'សូមជ្រើសរើសមុខម្ហូប',
      description: 'សូមជ្រើសរើសមុខម្ហូបយ៉ាងហោចណាស់មួយដើម្បីគិតលុយបំបែក',
      color: 'warning',
    });
    return;
  }

  if (!currentActiveOrder.value) return;

  isSubmittingSplit.value = true;
  try {
    const res: any = await $api(`/api/orders/${currentActiveOrder.value.id}/split-pay`, {
      method: 'POST',
      body: {
        itemsToPay,
        paymentMethod: splitPaymentMethod.value,
        cashierName: 'Cashier 01',
      },
    });

    const data = res?.data || res;
    lastSavedOrder.value = data.paidOrder;
    receiptMode.value = 'official';
    isSplitModalOpen.value = false;
    isReceiptModalOpen.value = true;

    // Update current cart to remaining items
    if (data.remainingOrder && data.remainingOrder.paymentStatus === 'pending') {
      cart.value = JSON.parse(JSON.stringify(data.remainingOrder.items));
    } else {
      // Table fully paid
      cart.value = [];
    }

    await refreshActiveOrders();

    toast.add({
      title: 'គិតលុយបំបែកជោគជ័យ!',
      description: `បានគិតលុយ $${splitTotalUSD.value.toFixed(2)} សម្រាប់ ${itemsToPay.length} មុខ`,
      color: 'success',
    });
  } catch (err: any) {
    toast.add({
      title: 'បរាជ័យក្នុងការគិតលុយបំបែក',
      description: err.message || 'Failed to process split payment',
      color: 'error',
    });
  } finally {
    isSubmittingSplit.value = false;
  }
}

// Calculations
const subtotal = computed(() => {
  return Number(cart.value.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2));
});

const totalAmount = computed(() => {
  return Math.max(0, Number((subtotal.value - (discount.value || 0)).toFixed(2)));
});

const totalAmountKHR = computed(() => {
  return convertUsdToKhr(totalAmount.value, currentExchangeRate.value);
});

function formatRielPrice(usd: number): string {
  return formatRiel(usd, currentExchangeRate.value);
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
  const table = currentSelectedTableName.value;

  if (isCurrentTableOccupied.value) {
    // តុដែលបានរក្សាទុក (Hold / តុជាប់) ត្រូវសួរបញ្ជាក់សិនដើម្បីជៀសវាងច្រលំដៃ
    openConfirmDialog({
      type: 'add',
      title: 'បញ្ជាក់ការបន្ថែមមុខម្ហូប',
      message: `តើអ្នកពិតជាចង់បន្ថែមមុខម្ហូប "${name}" ចូលក្នុង ${table} មែនទេ?`,
      confirmText: 'យល់ព្រមបន្ថែម',
      details: {
        name: name + (variantLabel ? ` (${variantLabel})` : ''),
        subtext: `តម្លៃ៖ $${price.toFixed(2)} • តុ៖ ${table}`,
      },
      onConfirm: () => {
        executeAddItemToCart(menuItemId, name, variantLabel, price);
      },
    });
    return;
  }

  executeAddItemToCart(menuItemId, name, variantLabel, price);
}

function executeAddItemToCart(menuItemId: string, name: string, variantLabel: string, price: number) {
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

  const table = currentSelectedTableName.value;

  if (isCurrentTableOccupied.value) {
    // ករណីតុដែលបានរក្សាទុក (Hold) ត្រូវសួរបញ្ជាក់សិនដើម្បីជៀសវាងច្រលំដៃ
    if (delta < 0) {
      // ករណីដក / បន្ថយ
      const isWillDelete = item.quantity + delta <= 0;
      openConfirmDialog({
        type: 'remove',
        title: isWillDelete ? 'បញ្ជាក់ការដកមុខម្ហូបចេញ' : 'បញ្ជាក់ការបន្ថយចំនួន',
        message: isWillDelete
          ? `តើអ្នកពិតជាចង់ដកមុខម្ហូប "${item.name}" ចេញពី ${table} មែនទេ?`
          : `តើអ្នកពិតជាចង់បន្ថយចំនួន "${item.name}" ពី ${item.quantity} មកនៅត្រឹម ${item.quantity + delta} សម្រាប់ ${table} មែនទេ?`,
        confirmText: isWillDelete ? 'យល់ព្រមដកចេញ' : 'យល់ព្រមបន្ថយ',
        details: {
          name: item.name + (item.variantLabel ? ` (${item.variantLabel})` : ''),
          subtext: `តុ៖ ${table} • បរិមាណបច្ចុប្បន្ន៖ ${item.quantity}`,
        },
        onConfirm: () => {
          executeQuantityChange(index, delta);
        },
      });
      return;
    } else if (delta > 0) {
      // ករណីបន្ថែមចំនួន
      openConfirmDialog({
        type: 'add',
        title: 'បញ្ជាក់ការបន្ថែមចំនួន',
        message: `តើអ្នកពិតជាចង់បន្ថែមចំនួន "${item.name}" ពី ${item.quantity} ទៅ ${item.quantity + delta} សម្រាប់ ${table} មែនទេ?`,
        confirmText: 'យល់ព្រមបន្ថែម',
        details: {
          name: item.name + (item.variantLabel ? ` (${item.variantLabel})` : ''),
          subtext: `តុ៖ ${table} • បរិមាណថ្មី៖ ${item.quantity + delta}`,
        },
        onConfirm: () => {
          executeQuantityChange(index, delta);
        },
      });
      return;
    }
  }

  executeQuantityChange(index, delta);
}

function executeQuantityChange(index: number, delta: number) {
  const item = cart.value[index];
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart.value.splice(index, 1);
  } else {
    item.subtotal = Number((item.price * item.quantity).toFixed(2));
  }
}

function handleRemoveItem(index: number) {
  const item = cart.value[index];
  if (!item) return;

  const table = currentSelectedTableName.value;

  if (isCurrentTableOccupied.value) {
    openConfirmDialog({
      type: 'remove',
      title: 'បញ្ជាក់ការដកមុខម្ហូបចេញ',
      message: `តើអ្នកពិតជាចង់ដកមុខម្ហូប "${item.name}" ចេញពី ${table} មែនទេ?`,
      confirmText: 'យល់ព្រមដកចេញ',
      details: {
        name: item.name + (item.variantLabel ? ` (${item.variantLabel})` : ''),
        subtext: `តុ៖ ${table} • បរិមាណ៖ ${item.quantity}`,
      },
      onConfirm: () => {
        cart.value.splice(index, 1);
      },
    });
    return;
  }

  cart.value.splice(index, 1);
}

function clearCart() {
  if (cart.value.length === 0) return;

  const table = currentSelectedTableName.value;
  openConfirmDialog({
    type: 'remove',
    title: 'សម្អាតបញ្ជីកុម្ម៉ង់',
    message: isCurrentTableOccupied.value
      ? `តើអ្នកពិតជាចង់លុបសម្អាតមុខម្ហូបទាំងអស់ចេញពីកន្ត្រកនៃ ${table} មែនទេ?`
      : 'តើអ្នកពិតជាចង់សម្អាតមុខម្ហូបទាំងអស់ក្នុងកន្ត្រកនេះមែនទេ?',
    confirmText: 'យល់ព្រមសម្អាត',
    details: {
      name: `${cart.value.length} មុខម្ហូបសរុប`,
      subtext: `តម្លៃសរុប៖ $${subtotal.value.toFixed(2)} • តុ៖ ${table}`,
    },
    onConfirm: () => {
      cart.value = [];
      discount.value = 0;
      orderNote.value = '';
    },
  });
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

  const table = currentSelectedTableName.value;
  const isOccupied = isCurrentTableOccupied.value;

  openConfirmDialog({
    type: isOccupied ? 'add' : 'hold',
    title: isOccupied ? 'បញ្ជាក់ការថែមម្ហូបចូលតុ' : 'បញ្ជាក់ការរក្សាទុកតុ',
    message: isOccupied
      ? `តើអ្នកពិតជាចង់រក្សាទុកការបន្ថែមមុខម្ហូបចូលក្នុង ${table} និងផ្ញើទៅផ្ទះបាយមែនទេ?`
      : `តើអ្នកពិតជាចង់រក្សាទុកការកុម្ម៉ង់សម្រាប់ ${table} មែនទេ?`,
    confirmText: isOccupied ? 'យល់ព្រមថែមម្ហូប' : 'យល់ព្រមរក្សាទុកតុ',
    details: {
      name: `មុខម្ហូប ${cart.value.length} មុខ (${cart.value.reduce((a, b) => a + b.quantity, 0)} ចាន)`,
      subtext: `តម្លៃសរុប៖ $${subtotal.value.toFixed(2)} • តុ៖ ${table}`,
    },
    onConfirm: () => {
      executeSavePendingOrder();
    },
  });
}

async function executeSavePendingOrder() {
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
          waiterName: activeWaiterName.value || currentActiveOrder.value.waiterName || '',
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
          waiterName: activeWaiterName.value || '',
          note: orderNote.value.trim() || '',
        },
      });

      toast.add({
        title: 'បានបើកតុ & កត់ Order!',
        description: `បានកត់ត្រា Order ដំបូងសម្រាប់ ${table}${activeWaiterName.value ? ` (កត់ដោយ៖ ${activeWaiterName.value})` : ''}`,
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

// 2. ACTION: PRINT PRE-BILL (ចេញបុងបណ្ដោះអាសន្នឱ្យភ្ញៀវមើល - មិនទាន់គិតលុយ)
function handlePrintPreBill() {
  if (!isCurrentTableOccupied.value || !currentActiveOrder.value) {
    toast.add({
      title: 'មិនទាន់មានតុ',
      description: 'សូមជ្រើសរើសតុដែលមានភ្ញៀវសិនមុននឹងចេញបុងមើល',
      color: 'warning',
    });
    return;
  }

  if (cart.value.length === 0) {
    toast.add({
      title: 'មិនទាន់មានមុខម្ហូប',
      description: 'តុនេះមិនទាន់មានមុខម្ហូបណាមួយត្រូវបានកុម្ម៉ង់នៅឡើយទេ',
      color: 'warning',
    });
    return;
  }

  // Pre-fill bill collector: existing billedBy or order waiter or first preset staff
  const initialCollector = currentActiveOrder.value.billedBy || activeWaiterName.value || presetStaffList.value[0] || '';
  if (presetStaffList.value.includes(initialCollector)) {
    selectedBilledBy.value = initialCollector;
    customBilledByInput.value = '';
  } else {
    selectedBilledBy.value = '';
    customBilledByInput.value = initialCollector;
  }

  isBilledByModalOpen.value = true;
}

// Confirm Collector & Execute Pre-Bill
async function confirmBilledByAndPrint() {
  const staff = activeBilledByName.value;
  if (!staff) {
    toast.add({
      title: 'សូមបញ្ជាក់ឈ្មោះអ្នកកាន់បុង',
      description: 'សូមជ្រើសរើស ឬវាយបញ្ចូលឈ្មោះបុគ្គលិកដែលកាន់បុងទៅជួបភ្ញៀវ',
      color: 'warning',
    });
    return;
  }

  isPrintingPreBill.value = true;
  const table = currentSelectedTableName.value;

  try {
    const res: any = await $api(`/api/orders/${currentActiveOrder.value!.id}`, {
      method: 'PUT',
      body: {
        items: cart.value,
        discount: Number(discount.value) || 0,
        paymentStatus: 'billed',
        waiterName: activeWaiterName.value || currentActiveOrder.value!.waiterName || '',
        billedBy: staff,
        billedAt: new Date().toISOString(),
        note: orderNote.value.trim() || '',
      },
    });

    const saved = res?.data || res;
    lastSavedOrder.value = saved;
    receiptMode.value = 'pre_bill';
    isBilledByModalOpen.value = false;
    isReceiptModalOpen.value = true;

    await refreshActiveOrders();

    toast.add({
      title: 'បានចេញបុងបណ្ដោះអាសន្ន!',
      description: `តុ ${table} បានប្តូរទៅ "សុំមើលបុង" (កាន់ដោយ៖ ${staff})`,
      color: 'success',
    });
  } catch (err: any) {
    toast.add({
      title: 'បរាជ័យក្នុងការចេញបុងមើល',
      description: err.message || 'Failed to print pre-bill',
      color: 'error',
    });
  } finally {
    isPrintingPreBill.value = false;
  }
}

// 3. ACTION: EXECUTE CHECKOUT & CLOSE TABLE (គិតលុយ & បិទតុ)
async function executeCheckout() {
  if (cart.value.length === 0) {
    toast.add({
      title: 'មិនទាន់មានមុខម្ហូប',
      description: 'សូមជ្រើសរើសមុខម្ហូបយ៉ាងហោចណាស់មួយមុនពេលគិតលុយ',
      color: 'warning',
    });
    return;
  }

  if (checkoutPaymentMethod.value === 'cash' && totalCashReceivedInKHR.value < totalAmountKHR.value) {
    const missing = totalAmountKHR.value - totalCashReceivedInKHR.value;
    toast.add({
      title: 'ទឹកប្រាក់ទទួលមិនទាន់គ្រប់ចំនួន',
      description: `នៅខ្វះ ${missing.toLocaleString()} ៛ (≈ $${(missing / currentExchangeRate.value).toFixed(2)}) ដើម្បីគ្រប់ចំនួន`,
      color: 'warning',
    });
    return;
  }

  if (checkoutPaymentMethod.value === 'mixed' && mixedTotalPaid.value < totalAmount.value) {
    toast.add({
      title: 'ទឹកប្រាក់មិនទាន់គ្រប់ចំនួន',
      description: `ទឹកប្រាក់បង់ចម្រុះខ្វះ $${mixedRemainingUSD.value.toFixed(2)} ដើម្បីគ្រប់ចំនួន`,
      color: 'warning',
    });
    return;
  }

  isSubmitting.value = true;
  const table = currentSelectedTableName.value;

  let finalNote = orderNote.value.trim();
  if (checkoutPaymentMethod.value === 'cash') {
    const khr = Number(checkoutReceivedCashKHR.value) || 0;
    const usd = Number(checkoutReceivedCashUSD.value) || 0;
    let cashNote = '';
    if (khr > 0 && usd > 0) {
      cashNote = `ទទួល៖ ${khr.toLocaleString()} ៛ + $${usd.toFixed(2)}`;
    } else if (khr > 0) {
      cashNote = `ទទួល៖ ${khr.toLocaleString()} ៛`;
    } else if (usd > 0) {
      cashNote = `ទទួល៖ $${usd.toFixed(2)}`;
    }
    if (checkoutChangeKHR.value > 0) {
      cashNote += ` • អាប់៖ ${checkoutChangeKHR.value.toLocaleString()} ៛ ($${checkoutChangeUSD.value.toFixed(2)})`;
    }
    if (cashNote) {
      finalNote = finalNote ? `${finalNote} • ${cashNote}` : cashNote;
    }
  } else if (checkoutPaymentMethod.value === 'mixed') {
    const bankName = currentSelectedMixedOnlineObj.value?.name || 'KHQR';
    const mixedDetail = `បង់ចម្រុះ៖ សាច់ប្រាក់ $${Number(mixedCashUSD.value).toFixed(2)} + ${bankName} $${Number(mixedOnlineUSD.value).toFixed(2)}${mixedNoteInput.value.trim() ? ` (${mixedNoteInput.value.trim()})` : ''}`;
    finalNote = finalNote ? `${finalNote} • ${mixedDetail}` : mixedDetail;
  }

  try {
    let saved: Order;

    if (isCurrentTableOccupied.value && currentActiveOrder.value) {
      // Final Checkout for an occupied table
      const res: any = await $api(`/api/orders/${currentActiveOrder.value.id}`, {
        method: 'PUT',
        body: {
          items: cart.value,
          discount: Number(discount.value) || 0,
          paymentMethod: checkoutPaymentMethod.value,
          paymentStatus: 'paid',
          waiterName: activeWaiterName.value || currentActiveOrder.value.waiterName || '',
          note: finalNote,
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
          paymentMethod: checkoutPaymentMethod.value,
          paymentStatus: 'paid',
          cashierName: 'Cashier 01',
          waiterName: activeWaiterName.value || '',
          note: finalNote,
        },
      });
      saved = res?.data || res;
    }

    lastSavedOrder.value = saved;
    receiptMode.value = 'official';
    isPaymentModalOpen.value = false;
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
    <div
      class="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs overflow-hidden">
      <!-- Top Bar: Table Selector with Live Occupied Badges -->
      <div class="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3 shrink-0">
        <!-- Title and Table Selector Buttons -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-calculator" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <span>កន្លែងគិតលុយ</span>
            </h1>

            <div class="flex items-center gap-2 text-xs">
              <!-- Live Exchange Rate Switcher Button -->
              <button
                type="button"
                class="py-1 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:text-emerald-600 shadow-2xs group"
                title="ចុចដើម្បីកែប្រែអត្រាប្តូរប្រាក់ $1 = ... ៛"
                @click="openExchangeRateModal"
              >
                <UIcon name="i-heroicons-arrows-right-left" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:rotate-180 transition-transform duration-300" />
                <span class="font-mono text-emerald-700 dark:text-emerald-300">$1 = {{ currentExchangeRate.toLocaleString() }} ៛</span>
                <span class="text-[10px] text-gray-400 font-normal group-hover:text-emerald-600 underline">កែប្រែ</span>
              </button>

              <span class="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> តុទំនេរ
              </span>
              <span class="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> កំពុងញ៉ាំ
              </span>
              <span class="inline-flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400">
                <span class="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> សុំមើលបុង
              </span>
            </div>
          </div>

          <!-- Table Buttons with Live Status -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button v-for="t in tableOptions" :key="t" type="button"
              class="px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border"
              :class="[
                currentSelectedTableName === t && !customTableInput
                  ? activeTablesMap.get(t)?.paymentStatus === 'billed'
                    ? getElapsedMinutes(activeTablesMap.get(t)?.billedAt) >= 10
                      ? 'border-rose-600 bg-rose-600 text-white shadow-xs scale-[1.02]'
                      : 'border-purple-600 bg-purple-600 text-white shadow-xs scale-[1.02]'
                    : activeTablesMap.get(t)?.paymentStatus === 'pending'
                      ? 'border-amber-600 bg-amber-600 text-white shadow-xs scale-[1.02]'
                      : 'border-primary-600 bg-primary-600 text-white shadow-xs scale-[1.02]'
                  : activeTablesMap.get(t)?.paymentStatus === 'billed'
                    ? getElapsedMinutes(activeTablesMap.get(t)?.billedAt) >= 10
                      ? 'border-rose-400 dark:border-rose-800 bg-rose-100 dark:bg-rose-950/60 text-rose-950 dark:text-rose-200 animate-pulse'
                      : 'border-purple-300 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 hover:bg-purple-100'
                    : activeTablesMap.get(t)?.paymentStatus === 'pending'
                      ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100'
                      : 'border-gray-200 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100',
              ]" @click="handleSelectTable(t)">
              <span>{{ t }}</span>
              <!-- Occupied / Billed indicator -->
              <span v-if="activeTablesMap.has(t)"
                class="px-1.5 py-0.2 rounded-md text-[9px] font-black flex items-center gap-0.5" :class="[
                  currentSelectedTableName === t
                    ? 'bg-black/30 text-white'
                    : activeTablesMap.get(t)?.paymentStatus === 'billed'
                      ? getElapsedMinutes(activeTablesMap.get(t)?.billedAt) >= 10
                        ? 'bg-rose-600 text-white'
                        : 'bg-purple-600 text-white'
                      : 'bg-amber-500 text-white',
                ]">
                <template v-if="activeTablesMap.get(t)?.paymentStatus === 'billed'">
                  <span v-if="getElapsedMinutes(activeTablesMap.get(t)?.billedAt) >= 10">⚠️</span>
                  <span>{{ activeTablesMap.get(t)?.billedBy ? `${activeTablesMap.get(t)?.billedBy}
                    (${getElapsedMinutes(activeTablesMap.get(t)?.billedAt)}ន)` : 'មើលបុង' }}</span>
                </template>
                <template v-else>
                  {{ `${activeTablesMap.get(t)?.items.length} មុខ` }}
                </template>
              </span>
            </button>

            <!-- Custom Table input -->
            <input v-model="customTableInput" type="text" placeholder="តុផ្សេង..."
              class="w-20 px-2 py-1 text-xs rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-1 focus:ring-primary-500 font-bold shrink-0" />
          </div>
        </div>

        <!-- Search & Categories Bar -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <div class="relative flex-1">
            <UIcon name="i-heroicons-magnifying-glass"
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input v-model="searchQuery" type="text" placeholder="ស្វែងរកមុខម្ហូប..."
              class="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500" />
          </div>

          <!-- Category Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer" :class="[
                selectedCategory === 'all'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-2xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]" @click="selectedCategory = 'all'">
              ទាំងអស់
            </button>
            <button v-for="cat in categoriesList" :key="cat.id" type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer" :class="[
                selectedCategory === cat.id
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-2xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]" @click="selectedCategory = cat.id">
              {{ cat.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Menu Items Grid (Scrollable) -->
      <div class="flex-1 p-4 overflow-y-auto">
        <div v-if="filteredItems.length > 0"
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <div v-for="item in filteredItems" :key="item.id"
            class="group p-2.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-500 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between select-none"
            @click="handleClickDish(item)">
            <!-- Dish Image -->
            <div class="relative w-full aspect-4/3 rounded-xl bg-gray-200 dark:bg-gray-700 overflow-hidden mb-2">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                <UIcon name="i-heroicons-photo" class="w-6 h-6" />
              </div>

              <!-- Multiple Prices Indicator Badge -->
              <span v-if="item.hasVariants"
                class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white backdrop-blur-md shadow-xs">
                {{ item.variants?.length ?? 0 }} ទំហំ
              </span>
            </div>

            <!-- Title & Price -->
            <div class="space-y-1">
              <h3
                class="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {{ item.name }}
              </h3>

              <div class="flex items-baseline justify-between gap-1">
                <span class="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  <template v-if="item.hasVariants && item.variants && item.variants.length > 0">
                    {{ formatRiel(Math.min(...item.variants.map((v) => Number(v.price)))) }} ៛+
                  </template>
                  <template v-else>
                    {{ formatRiel(Number(item.price)) }} ៛
                  </template>
                </span>
                <span class="text-[10px] text-gray-400 font-mono shrink-0">
                  <template v-if="item.hasVariants && item.variants && item.variants.length > 0">
                    ${{ Math.min(...item.variants.map((v) => Number(v.price))).toFixed(2) }}+
                  </template>
                  <template v-else>
                    ${{ Number(item.price).toFixed(2) }}
                  </template>
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
    <div
      class="w-full lg:w-96 flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs overflow-hidden shrink-0">
      <!-- Order Header with Clear Active/New Mode Indicator and Action Buttons -->
      <div class="p-4 border-b transition-colors flex items-center justify-between shrink-0" :class="[
        !isCurrentTableOccupied
          ? 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/60'
          : currentActiveOrder?.paymentStatus === 'billed'
            ? 'bg-purple-500/10 border-purple-200 dark:border-purple-900/60'
            : 'bg-amber-500/10 border-amber-200 dark:border-amber-900/60',
      ]">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xs"
            :class="[
              !isCurrentTableOccupied
                ? 'bg-emerald-600'
                : currentActiveOrder?.paymentStatus === 'billed'
                  ? 'bg-purple-600'
                  : 'bg-amber-500',
            ]">
            {{ currentSelectedTableName.replace('តុ ', 'T') }}
          </div>

          <div>


            <p class="text-[11px] text-gray-500 font-mono mt-0.5">
              <template v-if="isCurrentTableOccupied">
                កុម្ម៉ង់លេខ #{{ currentActiveOrder?.orderNumber }} • {{ cart.length }} មុខ
                <span v-if="currentActiveOrder?.waiterName"
                  class="text-primary-600 dark:text-primary-400 font-bold ml-1">
                  (កត់៖ {{ currentActiveOrder.waiterName }})
                </span>
                <span v-if="currentActiveOrder?.paymentStatus === 'billed'"
                  class="text-purple-600 dark:text-purple-400 font-bold ml-1">
                  • រង់ចាំលុយ
                </span>
              </template>
              <template v-else>
                តុទំនេរ • ចុចរើសម្ហូបដំបូង
              </template>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <!-- Pre-Bill Button (Only when occupied and has items) -->
          <button v-if="isCurrentTableOccupied && cart.length > 0" type="button"
            :disabled="isPrintingPreBill || isSubmitting"
            class="px-2 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="ចេញបុងបណ្ដោះអាសន្នឱ្យភ្ញៀវមើល" @click="handlePrintPreBill">
            <UIcon v-if="isPrintingPreBill" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            <UIcon v-else name="i-heroicons-document-text" class="w-3.5 h-3.5" />
            <span>មើលបុង</span>
          </button>

          <!-- Split Bill Button (Only when occupied and has items) -->
          <button v-if="isCurrentTableOccupied && cart.length > 0" type="button"
            class="px-2 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            title="គិតលុយបំបែកមុខម្ហូប" @click="openSplitModal">
            <UIcon name="i-heroicons-scissors" class="w-3.5 h-3.5" />
            <span>បំបែកបុង</span>
          </button>

          <button type="button"
            class="p-1.5 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="សម្អាតបញ្ជីកុម្ម៉ង់" :disabled="cart.length === 0"
            :class="{ 'opacity-30 cursor-not-allowed': cart.length === 0 }" @click="clearCart">
            <UIcon name="i-heroicons-trash" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Fraud Protection Alert Banner: Billed Table Status & Delay Warning -->
      <div v-if="isCurrentTableOccupied && currentActiveOrder?.paymentStatus === 'billed'"
        class="px-3.5 py-2.5 border-b text-xs flex items-center justify-between gap-2 transition-all"
        :class="getElapsedMinutes(currentActiveOrder?.billedAt) >= 10
          ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
          : 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200'">
        <div class="flex items-center gap-2 min-w-0">
          <UIcon
            :name="getElapsedMinutes(currentActiveOrder?.billedAt) >= 10 ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-document-text'"
            class="w-4 h-4 shrink-0"
            :class="getElapsedMinutes(currentActiveOrder?.billedAt) >= 10 ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-purple-600 dark:text-purple-400'" />
          <div class="min-w-0">
            <p class="truncate font-bold">
              អ្នកកាន់បុង៖ <span class="underline decoration-purple-400 font-black">{{ currentActiveOrder?.billedBy ||
                'មិនទាន់បញ្ជាក់' }}</span>
            </p>
            <p v-if="getElapsedMinutes(currentActiveOrder?.billedAt) >= 10"
              class="text-[10px] text-rose-700 dark:text-rose-300 font-bold leading-tight">
              ⚠️ យូរជាង ១០ នាទីហើយ មិនទាន់ឃើញលុយមក Cashier!
            </p>
          </div>
        </div>

        <span class="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 shadow-2xs"
          :class="getElapsedMinutes(currentActiveOrder?.billedAt) >= 10 ? 'bg-rose-600 text-white animate-pulse' : 'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200'">
          {{ getElapsedMinutes(currentActiveOrder?.billedAt) }} នាទីមុន
        </span>
      </div>

      <!-- Waiter Selector (អ្នកកត់ Order) using Select Dropdown -->
      <div
        class="px-3.5 py-2 bg-gray-50/90 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 text-xs">
        <label for="pos-waiter-select"
          class="flex items-center gap-1 shrink-0 text-gray-700 dark:text-gray-300 font-bold">
          <UIcon name="i-heroicons-user" class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          <span>អ្នកកត់ Order៖</span>
        </label>

        <div class="flex items-center gap-1.5 flex-1 justify-end min-w-0">
          <select id="pos-waiter-select" v-model="selectedWaiterOption"
            class="py-1 px-2.5 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-gray-200 cursor-pointer shadow-2xs transition-all w-full max-w-[160px]">
            <option value="">-- ជ្រើសរើសអ្នកកត់ --</option>
            <option v-for="staff in presetStaffList" :key="staff" :value="staff">
              {{ staff }}
            </option>
            <option value="custom">✍️ វាយឈ្មោះផ្សេង...</option>
          </select>

          <!-- Input for Custom Name when 'custom' is selected -->
          <input v-if="selectedWaiterOption === 'custom'" v-model="customWaiterInput" type="text"
            placeholder="វាយឈ្មោះ..." autofocus
            class="w-24 px-2 py-1 text-xs rounded-xl bg-white dark:bg-gray-900 border border-primary-500 dark:border-primary-500 focus:outline-hidden focus:ring-1 focus:ring-primary-500 font-bold text-gray-800 dark:text-gray-200 animate-in fade-in shrink-0" />
        </div>
      </div>

      <!-- Order Items List (Scrollable) -->
      <div class="flex-1 p-3 overflow-y-auto space-y-2 bg-gray-50/50 dark:bg-gray-950/30">
        <div v-if="cart.length > 0" class="space-y-2.5">
          <div v-for="(item, idx) in cart" :key="idx"
            class="p-3 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200/90 dark:border-gray-700/80 hover:border-primary-400 dark:hover:border-primary-500/70 shadow-2xs hover:shadow-xs transition-all space-y-2.5 group">
            <!-- Top Row: Thumbnail + Item Info + Delete Button -->
            <div class="flex items-start gap-2.5">
              <!-- Dish Thumbnail Image or Fallback Badge -->
              <div
                class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700/80 overflow-hidden shrink-0 border border-gray-200/70 dark:border-gray-700 flex items-center justify-center relative shadow-2xs">
                <img v-if="menuMap.get(item.menuItemId)?.imageUrl" :src="menuMap.get(item.menuItemId)?.imageUrl"
                  :alt="item.name"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div v-else
                  class="w-full h-full flex items-center justify-center bg-linear-to-br from-primary-500/10 to-primary-600/20 text-primary-600 dark:text-primary-400 font-black text-xs">
                  {{ item.name.slice(0, 2) }}
                </div>
                <!-- Index badge -->
                <span
                  class="absolute top-0.5 left-0.5 px-1 py-0.2 rounded-md bg-black/60 backdrop-blur-xs text-[8px] font-black text-white">
                  #{{ idx + 1 }}
                </span>
              </div>

              <!-- Item Details -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-1">
                  <h4
                    class="text-xs font-black text-gray-900 dark:text-white truncate leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {{ item.name }}
                  </h4>
                  <!-- Direct Remove Button -->
                  <button type="button"
                    class="p-1 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                    title="ដកមុខម្ហូបនេះចេញ" @click="handleRemoveItem(idx)">
                    <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
                  </button>
                </div>

                <!-- Variant Badge & Unit Price -->
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span v-if="item.variantLabel"
                    class="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/60">
                    {{ item.variantLabel }}
                  </span>
                  <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {{ formatRiel(item.price) }} ៛
                  </span>
                  <span class="text-[10px] text-gray-400 font-mono">
                    (${{ item.price.toFixed(2) }})
                  </span>
                </div>
              </div>
            </div>

            <!-- Middle Row: Quantity Stepper & Subtotal -->
            <div
              class="flex items-center justify-between pt-1.5 border-t border-dashed border-gray-100 dark:border-gray-700/60">
              <!-- Stepper -->
              <div
                class="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl p-0.5 border border-gray-200/80 dark:border-gray-600/50">
                <button type="button"
                  class="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-2xs transition-all cursor-pointer text-xs font-bold active:scale-90"
                  title="បន្ថយចំនួន" @click="updateQuantity(idx, -1)">
                  -
                </button>
                <span class="w-7 text-center text-xs font-black font-mono text-gray-900 dark:text-white">
                  {{ item.quantity }}
                </span>
                <button type="button"
                  class="w-6 h-6 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-gray-700 shadow-2xs transition-all cursor-pointer text-xs font-bold active:scale-90"
                  title="បន្ថែមចំនួន" @click="updateQuantity(idx, 1)">
                  +
                </button>
              </div>

              <!-- Item Subtotal (បង្ហាញលុយរៀលជាចម្បង) -->
              <div class="text-right">
                <span class="text-[10px] text-gray-400 mr-1 font-medium">សរុប:</span>
                <span class="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {{ formatRiel(item.subtotal) }} ៛
                </span>
                <span class="text-[10px] text-gray-400 font-mono ml-1">
                  (${{ item.subtotal.toFixed(2) }})
                </span>
              </div>
            </div>

            <!-- Bottom Row: Note Input -->
            <div class="relative flex items-center">
              <UIcon name="i-heroicons-pencil-square"
                class="w-3.5 h-3.5 text-gray-400 absolute left-2 pointer-events-none" />
              <input v-model="item.note" type="text" placeholder="ចំណាំបន្ថែម (ស្ករតិច, មិនប៊ីចេង, ខ្ចប់...)"
                class="w-full pl-7 pr-2.5 py-1 text-[10px] rounded-lg bg-gray-50/90 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/70 focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-gray-900 transition-colors text-gray-700 dark:text-gray-300 placeholder:text-gray-400" />
            </div>
          </div>
        </div>

        <div v-else class="h-full flex flex-col items-center justify-center text-gray-400 py-16 space-y-3">
          <div
            class="w-16 h-16 rounded-3xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 flex items-center justify-center text-gray-400 dark:text-gray-500 shadow-2xs">
            <UIcon name="i-heroicons-shopping-bag" class="w-8 h-8 opacity-60 text-primary-500" />
          </div>
          <div class="text-center space-y-1">
            <p class="text-xs font-bold text-gray-700 dark:text-gray-300">មិនទាន់មានមុខម្ហូបក្នុងការកុម្ម៉ង់នេះទេ</p>
            <span class="text-[11px] text-gray-400">ចុចលើមុខម្ហូបនៅខាងឆ្វេងដើម្បីកត់ត្រា</span>
          </div>
        </div>
      </div>

      <!-- Order Calculations & Dual Action Buttons (Hold / Checkout) -->
      <div
        class="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 space-y-3 shrink-0">
        <!-- Subtotal and Discount -->
        <div class="space-y-1.5 text-xs">
          <div class="flex justify-between text-gray-500">
            <span>សរុបដើម:</span>
            <span class="font-mono font-bold text-gray-700 dark:text-gray-300">${{ subtotal.toFixed(2) }}</span>
          </div>

          <div class="flex items-center justify-between text-gray-500">
            <span>ចុះថ្លៃ ($):</span>
            <div class="w-20 relative">
              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input v-model.number="discount" type="number" step="0.5" min="0"
                class="w-full pl-5 pr-1.5 py-0.5 text-xs text-right rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono font-bold" />
            </div>
          </div>

          <!-- Total Highlight -->
          <div class="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-baseline justify-between">
            <span class="text-sm font-black text-gray-900 dark:text-white">ទឹកប្រាក់សរុប:</span>
            <div class="text-right">
              <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono leading-none">
                {{ formatRiel(totalAmount) }} ៛
              </span>
              <span class="block text-[11px] font-bold text-gray-500 font-mono mt-0.5">
                ≈ ${{ totalAmount.toFixed(2) }} ($1=4,000៛)
              </span>
            </div>
          </div>
        </div>

        <!-- ACTIONS: OCCUPIED (Save / Pre-Bill / Checkout) vs NEW (Hold / Checkout) -->
        <div v-if="isCurrentTableOccupied" class="grid grid-cols-3 gap-1.5 pt-1">
          <!-- Button 1: Save / Append Items -->
          <button type="button" :disabled="cart.length === 0 || isSubmitting || isPrintingPreBill"
            class="py-2.5 px-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="រក្សាទុកការបន្ថែមមុខម្ហូបទៅផ្ទះបាយ" @click="handleSavePendingOrder">
            <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            <UIcon v-else name="i-heroicons-plus-circle" class="w-4 h-4" />
            <span>ថែមម្ហូប</span>
          </button>

          <!-- Button 2: Pre-Bill -->
          <button type="button" :disabled="cart.length === 0 || isSubmitting || isPrintingPreBill"
            class="py-2.5 px-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white border border-purple-700 shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="ចេញបុងបណ្ដោះអាសន្នឱ្យភ្ញៀវផ្ទៀងផ្ទាត់ (Pre-Bill)" @click="handlePrintPreBill">
            <UIcon v-if="isPrintingPreBill" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            <UIcon v-else name="i-heroicons-document-text" class="w-4 h-4" />
            <span>មើលបុង</span>
          </button>

          <!-- Button 3: Checkout -->
          <button type="button" :disabled="cart.length === 0 || isSubmitting || isPrintingPreBill"
            class="py-2.5 px-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="គិតលុយគ្រប់ចំនួន និងបិទតុ" @click="openPaymentModal">
            <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            <UIcon v-else name="i-heroicons-check-circle" class="w-4 h-4" />
            <span>គិតលុយ</span>
          </button>
        </div>

        <div v-else class="grid grid-cols-2 gap-2 pt-1">
          <!-- Button 1: Hold Table -->
          <button type="button" :disabled="cart.length === 0 || isSubmitting"
            class="py-2.5 px-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            @click="handleSavePendingOrder">
            <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            <UIcon v-else name="i-heroicons-arrow-down-on-square" class="w-4 h-4 text-primary-500" />
            <span>រក្សាទុកតុ</span>
          </button>

          <!-- Button 2: Pay & Close Table -->
          <button type="button" :disabled="cart.length === 0 || isSubmitting"
            class="py-2.5 px-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            @click="openPaymentModal">
            <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
            <UIcon v-else name="i-heroicons-check-circle" class="w-4 h-4" />
            <span>គិតលុយ</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 1: VARIANT / SIZE SELECTION POPUP -->
    <div v-if="isVariantModalOpen && activeItemForVariant"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-extrabold text-base text-gray-900 dark:text-white">
              {{ activeItemForVariant.name }}
            </h3>
            <p class="text-xs text-gray-500">សូមជ្រើសរើសទំហំ ឬជម្រើសលក់:</p>
          </div>
          <button type="button"
            class="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer" @click="
              isVariantModalOpen = false;
            activeItemForVariant = null;
            ">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Variant Options Grid -->
        <div class="space-y-2">
          <button v-for="(v, vIdx) in activeItemForVariant.variants" :key="vIdx" type="button"
            class="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/40 transition-all flex items-center justify-between group cursor-pointer text-left"
            @click="selectVariantAndAdd(v.label, Number(v.price))">
            <div>
              <span
                class="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {{ v.label }}
              </span>
              <span class="block text-[11px] text-gray-400 font-mono">
                ${{ Number(v.price).toFixed(2) }}
              </span>
            </div>

            <span class="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {{ formatRiel(Number(v.price)) }} ៛
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 2: RECEIPT POPUP / PRINT VIEW -->
    <div v-if="isReceiptModalOpen && lastSavedOrder"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4">
        <!-- Receipt Content -->
        <div id="receipt-print-area" class="space-y-4 text-center">
          <div>
            <h2 class="text-lg font-black text-gray-900 dark:text-white">វិក្កយបត្រភោជនីយដ្ឋាន</h2>

            <!-- Pre-Bill vs Official Header Badge -->
            <div class="mt-2">
              <div v-if="receiptMode === 'pre_bill'"
                class="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 space-y-0.5">
                <div class="flex items-center justify-center gap-1 font-black text-xs uppercase tracking-wider">
                  <UIcon name="i-heroicons-document-magnifying-glass"
                    class="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>វិក្កយបត្របណ្តោះអាសន្ន</span>
                </div>
                <p class="text-[10px] text-purple-600 dark:text-purple-300 font-semibold">
                  (មិនទាន់ទូទាត់ប្រាក់ • សម្រាប់ភ្ញៀវផ្ទៀងផ្ទាត់)
                </p>
              </div>

              <div v-else
                class="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 space-y-0.5">
                <div class="flex items-center justify-center gap-1 font-black text-xs uppercase tracking-wider">
                  <UIcon name="i-heroicons-check-badge" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>វិក្កយបត្រផ្លូវការ</span>
                </div>
                <p class="text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold">
                  (បានទូទាត់ប្រាក់រួចរាល់)
                </p>
              </div>
            </div>

            <p class="text-[11px] text-gray-500 font-mono mt-2">
              លេខកុម្ម៉ង់ #{{ lastSavedOrder.orderNumber }} • {{ lastSavedOrder.tableNumber }}
            </p>
            <p class="text-[10px] text-gray-400 font-mono">
              កាលបរិច្ឆេទ៖ {{ new Date(lastSavedOrder.createdAt || Date.now()).toLocaleString() }}
            </p>

            <!-- Staff Tracking details on Receipt -->
            <div
              class="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-800 text-left text-[11px] space-y-1">
              <div class="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span class="flex items-center gap-1 font-semibold">
                  <UIcon name="i-heroicons-user" class="w-3.5 h-3.5 text-primary-500" />
                  <span>អ្នកកត់ Order (Waiter)៖</span>
                </span>
                <span class="font-bold text-gray-900 dark:text-white">{{ lastSavedOrder.waiterName || 'Cashier'
                }}</span>
              </div>

              <div v-if="lastSavedOrder.billedBy"
                class="flex items-center justify-between text-purple-700 dark:text-purple-300">
                <span class="flex items-center gap-1 font-semibold">
                  <UIcon name="i-heroicons-document-text" class="w-3.5 h-3.5" />
                  <span>អ្នកកាន់បុងទៅភ្ញៀវ៖</span>
                </span>
                <span class="font-bold underline decoration-dotted">{{ lastSavedOrder.billedBy }}</span>
              </div>

              <div v-if="lastSavedOrder.billedAt"
                class="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>ម៉ោងចេញបុង៖</span>
                <span>{{ new Date(lastSavedOrder.billedAt).toLocaleTimeString() }}</span>
              </div>

              <div class="flex items-center justify-between text-[10px] text-gray-400">
                <span>បេឡាករ (Cashier)៖</span>
                <span class="font-mono">{{ lastSavedOrder.cashierName || 'Cashier 01' }}</span>
              </div>
            </div>
          </div>

          <div class="border-t border-b border-dashed border-gray-300 dark:border-gray-700 py-3 space-y-2 text-left">
            <div v-for="(it, itIdx) in lastSavedOrder.items" :key="itIdx"
              class="flex items-start justify-between text-xs">
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
              <span>សរុបដើម:</span>
              <span class="font-mono font-bold">${{ lastSavedOrder.subtotal.toFixed(2) }}</span>
            </div>
            <div v-if="lastSavedOrder.discount" class="flex justify-between text-gray-500">
              <span>ចុះថ្លៃ:</span>
              <span class="font-mono font-bold">-${{ lastSavedOrder.discount.toFixed(2) }}</span>
            </div>
            <div
              class="flex justify-between items-baseline text-base font-black text-emerald-600 dark:text-emerald-400 pt-1.5 border-t border-gray-200 dark:border-gray-700">
              <span>សរុប (រៀល):</span>
              <span class="font-mono text-lg">{{ formatRiel(lastSavedOrder.totalAmount) }} ៛</span>
            </div>
            <div class="flex justify-between text-xs text-gray-500 font-medium">
              <span>សរុប (ដុល្លារ):</span>
              <span class="font-mono font-bold">${{ lastSavedOrder.totalAmount.toFixed(2) }} ($1 = 4,000 ៛)</span>
            </div>
          </div>

          <!-- Footer Notice for Pre-bill vs Official -->
          <div v-if="receiptMode === 'pre_bill'"
            class="pt-2 text-center text-[10px] text-gray-500 dark:text-gray-400 space-y-1">
            <p class="font-bold text-purple-700 dark:text-purple-400">
              * សូមពិនិត្យមើលមុខម្ហូប និងចំនួនទឹកប្រាក់
            </p>
            <p>វិក្កយបត្រនេះមិនទាន់ជាបង្កាន់ដៃទទួលប្រាក់ឡើយ</p>
            <p v-if="lastSavedOrder.billedBy" class="text-purple-600 dark:text-purple-400 font-bold text-[10px]">
              បុគ្គលិកទទួលបន្ទុកកាន់បុង៖ {{ lastSavedOrder.billedBy }}
            </p>
          </div>

          <div v-else class="pt-2 text-center text-[11px] text-gray-400 space-y-1">
            <p>ការទូទាត់៖ <span class="font-bold text-gray-700 dark:text-gray-300">{{
              getPaymentMethodLabel(lastSavedOrder.paymentMethod) }}</span></p>
            <p v-if="lastSavedOrder.note"
              class="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40 p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/50">
              {{ lastSavedOrder.note }}
            </p>
            <p class="mt-1 font-bold text-emerald-600 dark:text-emerald-400">សូមអរគុណ និងសូមអញ្ជើញមកពិសាម្តងទៀត!</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button"
            class="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
            @click="
              isReceiptModalOpen = false;
            lastSavedOrder = null;
            ">
            បិទ
          </button>
          <button type="button"
            class="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 shadow-sm cursor-pointer"
            :class="receiptMode === 'pre_bill' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-primary-600 hover:bg-primary-500'"
            @click="handlePrint">
            <UIcon name="i-heroicons-printer" class="w-4 h-4" />
            <span>{{ receiptMode === 'pre_bill' ? 'ព្រីនបុងមើល' : 'ព្រីនវិក្កយបត្រ' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 3: SPLIT BILL POPUP (ផ្ទាំងគិតលុយបំបែកមុខម្ហូប) -->
    <div v-if="isSplitModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="flex items-start justify-between pb-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h3 class="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
              <UIcon name="i-heroicons-scissors" class="w-5 h-5 text-amber-500" />
              <span>គិតលុយបំបែក - {{ currentSelectedTableName }}</span>
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              ជ្រើសរើសមុខម្ហូប និងចំនួនដែលមិត្តភក្តិគាត់សុំគិតលុយមុន
            </p>
          </div>
          <button type="button"
            class="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            @click="isSplitModalOpen = false">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Items with Stepper to Pay Now (Scrollable) -->
        <div class="flex-1 overflow-y-auto space-y-2.5 pr-1 divide-y divide-gray-100 dark:divide-gray-800">
          <div v-for="(it, itIdx) in splitItems" :key="itIdx" class="pt-2 flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold text-gray-900 dark:text-white truncate">
                {{ it.name }}
              </p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span v-if="it.variantLabel"
                  class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {{ it.variantLabel }}
                </span>
                <span class="text-[11px] text-gray-400 font-mono">
                  ${{ it.price.toFixed(2) }} (តុមាន {{ it.availableQty }})
                </span>
              </div>
            </div>

            <!-- Qty to pay stepper -->
            <div class="flex items-center gap-2 shrink-0">
              <div
                class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
                <button type="button"
                  class="w-6 h-6 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 font-bold text-xs cursor-pointer"
                  @click="updateSplitQty(itIdx, -1)">
                  -
                </button>
                <span class="w-6 text-center text-xs font-black font-mono"
                  :class="it.qtyToPay > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'">
                  {{ it.qtyToPay }}
                </span>
                <button type="button"
                  class="w-6 h-6 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 font-bold text-xs cursor-pointer"
                  @click="updateSplitQty(itIdx, 1)">
                  +
                </button>
              </div>

              <!-- Subtotal for this item -->
              <span class="w-14 text-right text-xs font-bold font-mono text-gray-900 dark:text-white">
                ${{ (it.price * it.qtyToPay).toFixed(2) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Total Calculation for Split Items -->
        <div
          class="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3 shrink-0 bg-gray-50/70 dark:bg-gray-800/40 p-3 rounded-2xl">
          <div class="flex items-baseline justify-between text-xs">
            <span class="font-bold text-gray-700 dark:text-gray-300">
              សរុបមុខម្ហូបដែលគិតមុន ({{ splitSelectedCount }} មុខ):
            </span>
            <div class="text-right">
              <span class="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {{ formatRiel(splitTotalUSD) }} ៛
              </span>
              <span class="block text-[11px] font-bold text-gray-500 font-mono">
                ≈ ${{ splitTotalUSD.toFixed(2) }}
              </span>
            </div>
          </div>

          <!-- Payment Method Toggle -->
          <div class="grid grid-cols-3 gap-1.5">
            <button type="button"
              class="py-1 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer"
              :class="splitPaymentMethod === 'cash' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'"
              @click="splitPaymentMethod = 'cash'">
              <UIcon name="i-heroicons-banknotes" class="w-3.5 h-3.5" />
              <span>សាច់ប្រាក់</span>
            </button>
            <button type="button"
              class="py-1 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer"
              :class="splitPaymentMethod === 'khqr' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'"
              @click="splitPaymentMethod = 'khqr'">
              <UIcon name="i-heroicons-qr-code" class="w-3.5 h-3.5" />
              <span>KHQR</span>
            </button>
            <button type="button"
              class="py-1 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer"
              :class="splitPaymentMethod === 'card' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'"
              @click="splitPaymentMethod = 'card'">
              <UIcon name="i-heroicons-credit-card" class="w-3.5 h-3.5" />
              <span>កាត</span>
            </button>
          </div>

          <!-- Confirm Button -->
          <button type="button" :disabled="splitSelectedCount === 0 || isSubmittingSplit"
            class="w-full py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            @click="handleConfirmSplitPay">
            <UIcon v-if="isSubmittingSplit" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <UIcon v-else name="i-heroicons-check" class="w-4 h-4" />
            <span>គិតលុយមុខម្ហូបទាំងនេះ (${{ splitTotalUSD.toFixed(2) }}) & ចេញវិក្កយបត្រ</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 4: CONFIRMATION POPUP (សម្រាប់បញ្ជាក់ការដក ឬបន្ថែម ជៀសវាងការច្រលំដៃ) -->
    <div v-if="confirmDialog.isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      @click.self="handleConfirmDialogAction(false)">
      <div
        class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
            :class="confirmDialog.type === 'remove' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'">
            <UIcon
              :name="confirmDialog.type === 'remove' ? 'i-heroicons-trash' : (confirmDialog.type === 'add' ? 'i-heroicons-plus-circle' : 'i-heroicons-arrow-down-on-square')"
              class="w-6 h-6" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-extrabold text-base text-gray-900 dark:text-white leading-snug">
              {{ confirmDialog.title }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              {{ confirmDialog.message }}
            </p>
          </div>
        </div>

        <!-- Details Box -->
        <div v-if="confirmDialog.details"
          class="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 text-xs space-y-1">
          <p class="font-bold text-gray-900 dark:text-white truncate">
            {{ confirmDialog.details.name }}
          </p>
          <p v-if="confirmDialog.details.subtext" class="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
            {{ confirmDialog.details.subtext }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button"
            class="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            @click="handleConfirmDialogAction(false)">
            បោះបង់
          </button>
          <button type="button"
            class="px-4 py-2 rounded-xl text-xs font-black text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            :class="confirmDialog.type === 'remove' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-500 hover:bg-amber-600'"
            @click="handleConfirmDialogAction(true)">
            <span>{{ confirmDialog.confirmText || 'យល់ព្រម' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 5: PAYMENT CHECKOUT MODAL (ផ្ទាំងជ្រើសរើសវិធីសាស្ត្រទូទាត់ប្រាក់ & គិតលុយ) -->
    <div v-if="isPaymentModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      @click.self="isPaymentModalOpen = false">
      <div
        class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4 max-h-[95vh] flex flex-col overflow-y-auto">
        <!-- Header -->
        <div class="flex items-start justify-between pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h3 class="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>គិតលុយ & ទូទាត់ប្រាក់</span>
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ currentSelectedTableName }} • {{ cart.length }} មុខម្ហូប ({{cart.reduce((a, b) => a + b.quantity, 0)
              }}
              ចាន)
            </p>
          </div>
          <button type="button"
            class="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            @click="isPaymentModalOpen = false">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Total Bill Card (បង្ហាញលុយខ្មែរ ៛ ធំចម្បង) -->
        <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
          <span
            class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">ទឹកប្រាក់សរុបត្រូវទូទាត់</span>
          <div class="flex items-baseline justify-center gap-2">
            <span class="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {{ formatRiel(totalAmount) }} ៛
            </span>
          </div>
          <div class="flex items-center justify-center gap-1.5">
            <span class="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">
              ≈ ${{ totalAmount.toFixed(2) }} (អត្រាប្តូរប្រាក់ $1 = {{ currentExchangeRate.toLocaleString() }} ៛)
            </span>
            <button
              type="button"
              class="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
              title="ចុចដើម្បីកែប្រែអត្រាប្តូរប្រាក់"
              @click="openExchangeRateModal"
            >
              [កែប្រែ]
            </button>
          </div>
          <p v-if="discount > 0" class="text-[11px] text-amber-600 font-semibold pt-1">
            (បានចុះថ្លៃបញ្ចុះតម្លៃ -${{ discount.toFixed(2) }} រួចរាល់)
          </p>
        </div>

        <!-- Payment Method Options (Dynamic Active Methods: Cash, ABA, ACLEDA, etc.) -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-gray-700 dark:text-gray-300 block">
              ជ្រើសរើសវិធីសាស្ត្រទូទាត់ប្រាក់៖
            </label>
            <NuxtLink to="/admin/payments" target="_blank"
              class="text-[10px] text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5 font-bold">
              <UIcon name="i-heroicons-cog-6-tooth" class="w-3 h-3" />
              <span>កំណត់ធនាគារ</span>
            </NuxtLink>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button v-for="method in activePaymentMethods" :key="method.id" type="button"
              class="p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group text-center"
              :class="[
                checkoutPaymentMethod === method.code
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500/30 font-bold shadow-xs'
                  : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              ]" @click="checkoutPaymentMethod = method.code">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                :class="checkoutPaymentMethod === method.code ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'">
                <UIcon :name="method.code === 'cash'
                  ? 'i-heroicons-banknotes'
                  : method.code === 'card'
                    ? 'i-heroicons-credit-card'
                    : 'i-heroicons-qr-code'
                  " class="w-4 h-4" />
              </div>
              <span class="text-xs font-bold truncate max-w-full">{{ method.name }}</span>
              <span class="text-[9px] text-gray-400 font-mono uppercase">{{ method.code }}</span>
            </button>

            <!-- Mixed Payment Button Option -->
            <button type="button"
              class="p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group text-center"
              :class="[
                checkoutPaymentMethod === 'mixed'
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30 font-bold shadow-xs'
                  : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              ]" @click="checkoutPaymentMethod = 'mixed'">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                :class="checkoutPaymentMethod === 'mixed' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'">
                <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4" />
              </div>
              <span class="text-xs font-bold truncate max-w-full">បង់ចម្រុះ</span>
              <span class="text-[9px] text-gray-400 font-mono uppercase">CASH + ONLINE</span>
            </button>
          </div>
        </div>

        <!-- Conditional details for Cash (ប្រាក់ទទួល & ប្រាក់អាប់ ជាលុយរៀលជាចម្បង) -->
        <div v-if="checkoutPaymentMethod === 'cash'"
          class="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/70 space-y-3.5">
          <!-- 1. KHR Cash Input (Primary) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                <UIcon name="i-heroicons-banknotes" class="w-4 h-4 text-emerald-600" />
                <span>១. ប្រាក់រៀលទទួលពីភ្ញៀវ (៛)៖</span>
              </span>
              <span class="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                ត្រូវបង់៖ {{ totalAmountKHR.toLocaleString() }} ៛
              </span>
            </div>

            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-emerald-600">៛</span>
              <input v-model.number="checkoutReceivedCashKHR" type="number" step="500" min="0" placeholder="0"
                class="w-full pl-8 pr-3 py-2 text-lg font-black font-mono rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white" />
            </div>

            <!-- Quick KHR Suggestions -->
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <button type="button"
                class="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer font-mono"
                @click="setQuickCashKHR(totalAmountKHR)">
                {{ totalAmountKHR.toLocaleString() }} ៛ (គ្រប់)
              </button>
              <button v-for="b in quickCashKHRBanknotes" :key="b" type="button"
                class="px-2 py-1 rounded-lg text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer font-mono"
                @click="setQuickCashKHR(b)">
                {{ b.toLocaleString() }} ៛
              </button>
            </div>
          </div>

          <!-- 2. Optional USD Cash Input -->
          <div class="space-y-1.5 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <span>២. ប្រាក់ដុល្លារ ($) បើភ្ញៀវហុចបន្ថែម ឬបង់ដុល្លារ៖</span>
              </span>
              <span class="text-gray-400 text-[10px] font-mono">($1 = 4,000 ៛)</span>
            </div>

            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">$</span>
                <input v-model.number="checkoutReceivedCashUSD" type="number" step="0.5" min="0" placeholder="0.00"
                  class="w-full pl-7 pr-3 py-1.5 text-sm font-bold font-mono rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white" />
              </div>

              <!-- Quick USD Buttons -->
              <div class="flex items-center gap-1">
                <button v-for="u in quickCashUSDBanknotes.slice(0, 3)" :key="u" type="button"
                  class="px-2 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 text-gray-700 dark:text-gray-300 font-mono cursor-pointer"
                  @click="setQuickCashUSD(u)">
                  ${{ u }}
                </button>
              </div>
            </div>
          </div>

          <!-- Total Received & Change calculation display -->
          <div class="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700 space-y-2">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-gray-500">សរុបប្រាក់ទទួល (គិតជារៀល)៖</span>
              <span class="font-bold text-gray-900 dark:text-white">{{ totalCashReceivedInKHR.toLocaleString() }} ៛ (≈ ${{ (totalCashReceivedInKHR / currentExchangeRate).toFixed(2) }})</span>
            </div>

            <!-- Missing Alert -->
            <div v-if="totalCashReceivedInKHR < totalAmountKHR"
              class="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-bold">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0" />
                <span>នៅខ្វះទឹកប្រាក់៖</span>
              </span>
              <span class="font-mono">{{ (totalAmountKHR - totalCashReceivedInKHR).toLocaleString() }} ៛</span>
            </div>

            <!-- Change Return (Primary in Riel) -->
            <div v-else
              class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between">
              <div>
                <span class="text-xs font-bold text-amber-900 dark:text-amber-200 block">ប្រាក់អាប់ជូនភ្ញៀវ (លុយរៀល)៖</span>
                <span class="text-[10px] text-amber-700 dark:text-amber-400 font-mono">≈ ${{ checkoutChangeUSD.toFixed(2) }}</span>
              </div>
              <span class="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                {{ checkoutChangeKHR.toLocaleString() }} ៛
              </span>
            </div>
          </div>
        </div>

        <!-- Conditional details for Mixed Payment (សាច់ប្រាក់ + Pay Online/KHQR) -->
        <div v-else-if="checkoutPaymentMethod === 'mixed'"
          class="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/60 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/50">
            <span class="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4 text-indigo-600" />
              <span>បែងចែកការបង់ប្រាក់ (សាច់ប្រាក់ + Pay Online)</span>
            </span>
            <span class="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
              សរុប៖ ${{ totalAmount.toFixed(2) }}
            </span>
          </div>

          <!-- Section 1: Cash Amount -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <label class="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <UIcon name="i-heroicons-banknotes" class="w-3.5 h-3.5 text-emerald-600" />
                <span>១. ចំនួនសាច់ប្រាក់ (Cash)៖</span>
              </label>
              <span class="text-gray-400 text-[10px] font-mono">≈ {{ formatRiel(Number(mixedCashUSD) || 0) }} ៛</span>
            </div>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">$</span>
              <input v-model.number="mixedCashUSD" type="number" step="0.5" min="0" placeholder="0.00"
                class="w-full pl-8 pr-3 py-2 text-sm font-black font-mono rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                @input="onMixedCashInput" />
            </div>
          </div>

          <!-- Section 2: Online / Bank Amount & Bank Choice -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <label class="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <UIcon name="i-heroicons-qr-code" class="w-3.5 h-3.5 text-sky-600" />
                <span>២. ចំនួន Pay Online / KHQR៖</span>
              </label>
              <span class="text-gray-400 text-[10px] font-mono">≈ {{ formatRiel(Number(mixedOnlineUSD) || 0) }} ៛</span>
            </div>

            <!-- Online Bank Selector -->
            <div v-if="onlinePaymentMethods.length > 1" class="flex flex-wrap gap-1.5">
              <button v-for="b in onlinePaymentMethods" :key="b.id" type="button"
                class="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1"
                :class="mixedOnlineBank === b.code
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-sky-400'"
                @click="mixedOnlineBank = b.code">
                <UIcon name="i-heroicons-qr-code" class="w-3 h-3" />
                <span>{{ b.name }}</span>
              </button>
            </div>

            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">$</span>
              <input v-model.number="mixedOnlineUSD" type="number" step="0.5" min="0" placeholder="0.00"
                class="w-full pl-8 pr-3 py-2 text-sm font-black font-mono rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                @input="onMixedOnlineInput" />
            </div>

            <!-- QR Preview for Mixed Online Portion if available -->
            <div v-if="currentSelectedMixedOnlineObj?.qrImageUrl && mixedOnlineUSD > 0"
              class="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-sky-200 dark:border-sky-900 flex items-center gap-3">
              <img :src="currentSelectedMixedOnlineObj.qrImageUrl" :alt="currentSelectedMixedOnlineObj.name"
                class="w-14 h-14 object-contain rounded-lg border border-gray-100 dark:border-gray-800 shrink-0" />
              <div class="min-w-0 flex-1 text-xs">
                <p class="font-bold text-sky-900 dark:text-sky-200 truncate">
                  ស្កេន {{ currentSelectedMixedOnlineObj.name }} ចំនួន ${{ Number(mixedOnlineUSD).toFixed(2) }}
                </p>
                <p v-if="currentSelectedMixedOnlineObj.accountName || currentSelectedMixedOnlineObj.accountNumber"
                  class="text-[11px] text-gray-500 truncate mt-0.5">
                  {{ currentSelectedMixedOnlineObj.accountName }} <span
                    v-if="currentSelectedMixedOnlineObj.accountNumber">•
                    {{ currentSelectedMixedOnlineObj.accountNumber }}</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Section 3: Calculation & Status Indicator -->
          <div
            class="p-3 rounded-xl bg-white dark:bg-gray-900 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2 text-xs">
            <div class="flex items-center justify-between font-mono">
              <span class="text-gray-500">សរុបបានបង់ (Cash + Online)៖</span>
              <span class="font-bold text-gray-900 dark:text-white">${{ mixedTotalPaid.toFixed(2) }}</span>
            </div>

            <!-- Status Alert -->
            <div v-if="mixedRemainingUSD > 0"
              class="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-between text-rose-700 dark:text-rose-300 font-bold">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0" />
                <span>នៅខ្វះទឹកប្រាក់៖</span>
              </span>
              <span class="font-mono">${{ mixedRemainingUSD.toFixed(2) }}</span>
            </div>

            <div v-else-if="mixedChangeUSD > 0"
              class="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 flex items-center justify-between text-amber-700 dark:text-amber-300 font-bold">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-banknotes" class="w-4 h-4 shrink-0" />
                <span>ប្រាក់អាប់ជូនភ្ញៀវ (ពីសាច់ប្រាក់)៖</span>
              </span>
              <span class="font-mono">${{ mixedChangeUSD.toFixed(2) }} (≈ {{ formatRiel(mixedChangeUSD) }} ៛)</span>
            </div>

            <div v-else
              class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-bold">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-check-circle" class="w-4 h-4 shrink-0" />
                <span>ទូទាត់គ្រប់ចំនួន ១០០%</span>
              </span>
              <span class="font-mono font-black">${{ mixedTotalPaid.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Section 4: Extra Note for Mixed Payment -->
          <div class="space-y-1 text-xs">
            <label class="font-medium text-gray-500 dark:text-gray-400 block">
              ចំណាំបន្ថែមលើការបង់ចម្រុះ (ស្រេចចិត្ត)៖
            </label>
            <input v-model="mixedNoteInput" type="text" placeholder="ឧ. ភ្ញៀវបង់លុយសុទ្ធ $10 នៅសល់ $15 វេរ ABA"
              class="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-800 dark:text-gray-200" />
          </div>
        </div>

        <!-- Conditional details for Card -->
        <div v-else-if="checkoutPaymentMethod === 'card'"
          class="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <UIcon name="i-heroicons-credit-card" class="w-6 h-6" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-blue-900 dark:text-blue-200">ទូទាត់តាមកាតធនាគារ</p>
            <p class="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5 leading-relaxed">
              សូមឆូតកាតតាមម៉ាស៊ីន POS Terminal ចំនួន <strong class="font-mono text-sm text-blue-950 dark:text-blue-100">{{ formatRiel(totalAmount) }} ៛</strong> (≈ ${{ totalAmount.toFixed(2) }}) មុននឹងចុចបញ្ជាក់។
            </p>
          </div>
        </div>

        <!-- Conditional details for Bank / KHQR (ABA, ACLEDA, Wing...) -->
        <div v-else
          class="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60 space-y-3">
          <!-- QR Code Preview if uploaded -->
          <div v-if="currentSelectedPaymentMethodObj?.qrImageUrl" class="text-center space-y-2">
            <div class="inline-block p-2 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <img :src="currentSelectedPaymentMethodObj.qrImageUrl" :alt="currentSelectedPaymentMethodObj.name"
                class="max-h-48 w-auto object-contain rounded-xl mx-auto" />
            </div>
            <p class="text-xs font-bold text-sky-800 dark:text-sky-300">
              ស្កេនទូទាត់ទឹកប្រាក់ <span class="font-mono text-base font-black text-sky-950 dark:text-sky-100">{{ formatRiel(totalAmount) }} ៛</span> (≈ ${{ totalAmount.toFixed(2) }})
            </p>
          </div>

          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
              <UIcon name="i-heroicons-qr-code" class="w-6 h-6" />
            </div>
            <div class="min-w-0 flex-1 text-xs">
              <p class="font-bold text-sky-900 dark:text-sky-200">
                ទូទាត់តាម {{ currentSelectedPaymentMethodObj?.name || 'KHQR' }}
              </p>
              <div v-if="currentSelectedPaymentMethodObj?.accountName || currentSelectedPaymentMethodObj?.accountNumber"
                class="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5 font-medium">
                <span v-if="currentSelectedPaymentMethodObj?.accountName">ឈ្មោះ៖ <strong>{{
                  currentSelectedPaymentMethodObj.accountName }}</strong></span>
                <span v-if="currentSelectedPaymentMethodObj?.accountNumber" class="ml-2 font-mono">លេខ៖ <strong>{{
                  currentSelectedPaymentMethodObj.accountNumber }}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button"
            class="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            @click="isPaymentModalOpen = false">
            បោះបង់
          </button>
          <button type="button"
            :disabled="isSubmitting || (checkoutPaymentMethod === 'cash' && totalCashReceivedInKHR < totalAmountKHR) || (checkoutPaymentMethod === 'mixed' && mixedTotalPaid < totalAmount)"
            class="flex-2 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            :class="checkoutPaymentMethod === 'cash' ? 'bg-emerald-600 hover:bg-emerald-500' : (checkoutPaymentMethod === 'mixed' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-primary-600 hover:bg-primary-500')"
            @click="executeCheckout">
            <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <UIcon v-else name="i-heroicons-check-circle" class="w-4 h-4" />
            <span>បញ្ជាក់ការបង់ប្រាក់ ({{ totalAmountKHR.toLocaleString() }} ៛) & ចេញវិក្កយបត្រ</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 6: SELECT BILL COLLECTOR (អ្នកកាន់បុងទៅគិតលុយ) -->
    <div v-if="isBilledByModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4">
        <!-- Header -->
        <div class="flex items-start justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 class="font-black text-base text-gray-900 dark:text-white flex items-center gap-1.5">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-purple-600" />
              <span>ចេញបុងបណ្ដោះអាសន្ន - {{ currentSelectedTableName }}</span>
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              តើបុគ្គលិកណាជាអ្នកយកបុងទៅជូនភ្ញៀវ និងប្រមូលលុយ?
            </p>
          </div>
          <button type="button"
            class="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            @click="isBilledByModalOpen = false">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Quick Staff Selection Buttons -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-gray-700 dark:text-gray-300">
            ជ្រើសរើសបុគ្គលិកកាន់បុង (ចុច ១ ភ្លែត)៖
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="staff in presetStaffList" :key="staff" type="button"
              class="py-2.5 px-2 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-1 cursor-pointer"
              :class="activeBilledByName === staff
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm scale-102'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-purple-50 hover:border-purple-300'"
              @click="selectedBilledBy = staff; customBilledByInput = ''">
              <UIcon name="i-heroicons-user" class="w-3.5 h-3.5" />
              <span>{{ staff }}</span>
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button"
            class="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
            @click="isBilledByModalOpen = false">
            បោះបង់
          </button>
          <button type="button" :disabled="!activeBilledByName || isPrintingPreBill"
            class="flex-2 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40"
            @click="confirmBilledByAndPrint">
            <UIcon v-if="isPrintingPreBill" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <UIcon v-else name="i-heroicons-printer" class="w-4 h-4" />
            <span>បញ្ជាក់ចេញបុង ({{ activeBilledByName || 'ជ្រើសរើស' }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 7: EXCHANGE RATE SWITCHER MODAL (ផ្ទាំងកែប្រែអត្រាប្តូរប្រាក់ $ ➔ ៛) -->
    <div v-if="isExchangeRateModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      @click.self="isExchangeRateModalOpen = false">
      <div class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4">
        <!-- Header -->
        <div class="flex items-start justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 class="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5 text-emerald-600" />
              <span>កែប្រែអត្រាប្តូរប្រាក់ ($ ➔ ៛)</span>
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              កំណត់តម្លៃ ១ ដុល្លារ ($) ស្មើនឹងប៉ុន្មានរៀល (៛) សម្រាប់ហាង
            </p>
          </div>
          <button type="button" class="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            @click="isExchangeRateModalOpen = false">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Input -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-gray-700 dark:text-gray-300">
            តម្លៃ ១ ដុល្លារ ($1.00) =
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600">៛</span>
            <input
              v-model.number="tempExchangeRateInput"
              type="number"
              step="10"
              min="1000"
              placeholder="4000"
              class="w-full pl-8 pr-12 py-2.5 text-lg font-black font-mono rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
              @keydown.enter="saveExchangeRate"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">រៀល</span>
          </div>

          <!-- Quick Presets -->
          <div class="space-y-1 pt-1">
            <span class="text-[11px] font-medium text-gray-400">អត្រាទូទៅពេញនិយម៖</span>
            <div class="grid grid-cols-4 gap-1.5">
              <button
                v-for="r in [4000, 4050, 4100, 4150]"
                :key="r"
                type="button"
                class="py-1 px-2 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer text-center"
                :class="tempExchangeRateInput === r
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-400'"
                @click="tempExchangeRateInput = r"
              >
                {{ r.toLocaleString() }} ៛
              </button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            @click="isExchangeRateModalOpen = false"
          >
            បោះបង់
          </button>
          <button
            type="button"
            :disabled="isUpdatingRate || !tempExchangeRateInput || tempExchangeRateInput <= 0"
            class="flex-2 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            @click="saveExchangeRate"
          >
            <UIcon v-if="isUpdatingRate" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <UIcon v-else name="i-heroicons-check" class="w-4 h-4" />
            <span>រក្សាទុកអត្រាថ្មី ({{ tempExchangeRateInput?.toLocaleString() || 4000 }} ៛)</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  body * {
    visibility: hidden;
  }

  #receipt-print-area,
  #receipt-print-area * {
    visibility: visible;
  }

  #receipt-print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
  }
}
</style>
