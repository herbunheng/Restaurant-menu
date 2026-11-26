<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PaymentMethodConfig } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

const { $api } = useApi();
const toast = useToast();

// 1. Fetch Payment Methods
const { data: paymentMethodsData, status: fetchStatus, refresh: fetchPaymentMethods } = await useApiData<PaymentMethodConfig[]>(
  'admin-payment-methods',
  '/api/payment-methods'
);

const paymentMethodsList = computed(() => paymentMethodsData.value || []);
const isLoading = computed(() => fetchStatus.value === 'pending');

// Stats
const totalCount = computed(() => paymentMethodsList.value.length);
const activeCount = computed(() => paymentMethodsList.value.filter((m) => m.isEnabled).length);
const qrCount = computed(() => paymentMethodsList.value.filter((m) => m.qrImageUrl).length);

// Modal State: Add / Edit
const isMethodModalOpen = ref(false);
const isEditing = ref(false);
const editingMethodId = ref<string | null>(null);
const isSubmitting = ref(false);

const methodForm = ref<{
  name: string;
  code: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string;
  isEnabled: boolean;
  sortOrder: number;
  description: string;
}>({
  name: '',
  code: '',
  accountName: '',
  accountNumber: '',
  qrImageUrl: '',
  isEnabled: true,
  sortOrder: 0,
  description: '',
});

// Preset bank options helper for 1-click filling
const bankPresets = [
  { name: 'ABA Bank', code: 'aba', description: 'ស្កេនទូទាត់តាម ABA Mobile ឬ Bakong KHQR', icon: 'i-heroicons-qr-code' },
  { name: 'ACLEDA Bank', code: 'acleda', description: 'ស្កេនទូទាត់តាម ACLEDA Mobile ឬ Bakong KHQR', icon: 'i-heroicons-qr-code' },
  { name: 'សាច់ប្រាក់ (Cash)', code: 'cash', description: 'ទូទាត់ជាក្រដាសប្រាក់ដុល្លារ ($) ឬប្រាក់រៀល (៛)', icon: 'i-heroicons-banknotes' },
  { name: 'Wing Bank', code: 'wing', description: 'ស្កេនទូទាត់តាម Wing Bank App ឬ KHQR', icon: 'i-heroicons-qr-code' },
  { name: 'Canadia Bank', code: 'canadia', description: 'ស្កេនទូទាត់តាម Canadia Bank App', icon: 'i-heroicons-qr-code' },
  { name: 'កាតធនាគារ (Card)', code: 'card', description: 'ឆូតកាតតាមម៉ាស៊ីន POS Terminal', icon: 'i-heroicons-credit-card' },
];

function applyPreset(preset: typeof bankPresets[0]) {
  methodForm.value.name = preset.name;
  methodForm.value.code = preset.code;
  methodForm.value.description = preset.description;
}

function openAddModal() {
  isEditing.value = false;
  editingMethodId.value = null;
  methodForm.value = {
    name: '',
    code: '',
    accountName: '',
    accountNumber: '',
    qrImageUrl: '',
    isEnabled: true,
    sortOrder: paymentMethodsList.value.length + 1,
    description: '',
  };
  isMethodModalOpen.value = true;
}

function openEditModal(method: PaymentMethodConfig) {
  isEditing.value = true;
  editingMethodId.value = method.id;
  methodForm.value = {
    name: method.name,
    code: method.code,
    accountName: method.accountName || '',
    accountNumber: method.accountNumber || '',
    qrImageUrl: method.qrImageUrl || '',
    isEnabled: method.isEnabled,
    sortOrder: method.sortOrder,
    description: method.description || '',
  };
  isMethodModalOpen.value = true;
}

async function handleSaveMethod() {
  const name = methodForm.value.name.trim();
  const code = methodForm.value.code.trim().toLowerCase();

  if (!name || !code) {
    toast.add({
      title: 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់',
      description: 'ឈ្មោះ និងកូដសម្គាល់វិធីសាស្ត្រទូទាត់ត្រូវតែមាន',
      color: 'warning',
    });
    return;
  }

  isSubmitting.value = true;

  try {
    if (isEditing.value && editingMethodId.value) {
      await $api(`/api/payment-methods/${editingMethodId.value}`, {
        method: 'PUT',
        body: methodForm.value,
      });

      toast.add({
        title: 'កែប្រែជោគជ័យ!',
        description: `បានកែប្រែវិធីសាស្ត្រទូទាត់ "${name}" រួចរាល់`,
        color: 'success',
      });
    } else {
      await $api('/api/payment-methods', {
        method: 'POST',
        body: methodForm.value,
      });

      toast.add({
        title: 'បន្ថែមជោគជ័យ!',
        description: `បានបន្ថែមវិធីសាស្ត្រទូទាត់ "${name}" ទៅក្នុងប្រព័ន្ធ`,
        color: 'success',
      });
    }

    await fetchPaymentMethods();
    isMethodModalOpen.value = false;
  } catch (err: any) {
    toast.add({
      title: 'មានបញ្ហាក្នុងការរក្សាទុក',
      description: err.message || 'Failed to save payment method',
      color: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
}

// Quick 1-click Toggle Enable/Disable
async function toggleMethodEnabled(method: PaymentMethodConfig) {
  const newStatus = !method.isEnabled;
  try {
    await $api(`/api/payment-methods/${method.id}`, {
      method: 'PUT',
      body: { isEnabled: newStatus },
    });

    toast.add({
      title: newStatus ? 'បានបើកដំណើរការ' : 'បានបិទដំណើរការ',
      description: `វិធីសាស្ត្រ "${method.name}" ត្រូវបាន${newStatus ? 'បើកឱ្យប្រើ' : 'បិទមិនឱ្យប្រើ'}ក្នុង POS`,
      color: 'success',
    });

    await fetchPaymentMethods();
  } catch (err: any) {
    toast.add({
      title: 'មានបញ្ហាក្នុងការប្តូរស្ថានភាព',
      description: err.message || 'Failed to toggle status',
      color: 'error',
    });
  }
}

// Delete Confirmation Modal State
const isDeleteModalOpen = ref(false);
const methodToDelete = ref<PaymentMethodConfig | null>(null);
const isDeleting = ref(false);

function openDeleteModal(method: PaymentMethodConfig) {
  methodToDelete.value = method;
  isDeleteModalOpen.value = true;
}

async function handleConfirmDelete() {
  if (!methodToDelete.value) return;

  isDeleting.value = true;
  const name = methodToDelete.value.name;

  try {
    await $api(`/api/payment-methods/${methodToDelete.value.id}`, {
      method: 'DELETE',
    });

    toast.add({
      title: 'បានលុបជោគជ័យ!',
      description: `បានលុបវិធីសាស្ត្រទូទាត់ "${name}" ចេញពីប្រព័ន្ធ`,
      color: 'success',
    });

    await fetchPaymentMethods();
    isDeleteModalOpen.value = false;
    methodToDelete.value = null;
  } catch (err: any) {
    toast.add({
      title: 'បរាជ័យក្នុងការលុប',
      description: err.message || 'Failed to delete payment method',
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
}

// Preview QR Modal
const previewQrUrl = ref<string | null>(null);
const isQrPreviewModalOpen = ref(false);

function openQrPreview(url: string) {
  previewQrUrl.value = url;
  isQrPreviewModalOpen.value = true;
}

function getMethodBadgeColor(code: string) {
  switch (code.toLowerCase()) {
    case 'cash':
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'aba':
      return 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-800';
    case 'acleda':
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800';
    case 'wing':
      return 'bg-lime-50 dark:bg-lime-950/60 text-lime-800 dark:text-lime-200 border-lime-300 dark:border-lime-800';
    default:
      return 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800';
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Breadcrumbs and Add Button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-credit-card" class="w-7 h-7 text-primary-600 dark:text-primary-400" />
          <span>ការគ្រប់គ្រងវិធីសាស្ត្រទូទាត់ (Payment Methods)</span>
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          បើក ឬបិទធនាគារ (ABA, ACLEDA, Cash...) ដាក់រូប QR សម្រាប់ភ្ញៀវស្កេន និងងាយស្រួលគ្រប់គ្រងលុយ
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          class="px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
          @click="openAddModal"
        >
          <UIcon name="i-heroicons-plus" class="w-4 h-4" />
          <span>បន្ថែមវិធីសាស្ត្រថ្មី</span>
        </button>
      </div>
    </div>

    <!-- Explainer Tip Banner -->
    <div class="p-4 rounded-3xl bg-linear-to-r from-primary-500/10 via-amber-500/10 to-transparent border border-primary-200/60 dark:border-primary-800/40 flex items-start gap-3">
      <div class="w-9 h-9 rounded-2xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
        <UIcon name="i-heroicons-light-bulb" class="w-5 h-5" />
      </div>
      <div class="space-y-1 text-xs">
        <p class="font-extrabold text-gray-900 dark:text-white">
          គន្លឹះគ្រប់គ្រងលុយងាយស្រួល និងលឿនរហ័ស
        </p>
        <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
          លោកអ្នកអាច <strong>បើកដំណើរការតែ ២ ឬ ៣ ជម្រើស</strong> ដែលហាងរបស់លោកអ្នកប្រើប្រាស់ជាប្រចាំ (ឧទាហរណ៍៖ សាច់ប្រាក់, ABA, និង ACLEDA)។ ជម្រើសណាដែលបិទ (Inactive) នឹងមិនបង្ហាញក្នុងផ្ទាំងគិតលុយ POS ឡើយ ដើម្បីជៀសវាងការច្រឡំដៃ។
        </p>
      </div>
    </div>

    <!-- Summary Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-credit-card" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 block">វិធីសាស្ត្រសរុប</span>
          <span class="text-xl font-black text-gray-900 dark:text-white font-mono">{{ totalCount }} ប្រភេទ</span>
        </div>
      </div>

      <div class="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-check-circle" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 block">កំពុងបើកដំណើរការ (Active)</span>
          <span class="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{{ activeCount }} ប្រភេទ</span>
        </div>
      </div>

      <div class="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-qr-code" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 block">មានរូបភាព QR Code</span>
          <span class="text-xl font-black text-sky-600 dark:text-sky-400 font-mono">{{ qrCount }} ធនាគារ</span>
        </div>
      </div>
    </div>

    <!-- Payment Methods Cards Grid -->
    <div v-if="isLoading" class="p-12 text-center text-gray-400 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
      <p class="text-xs">កំពុងទាញយកវិធីសាស្ត្រទូទាត់...</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="method in paymentMethodsList"
        :key="method.id"
        class="rounded-3xl border transition-all p-5 flex flex-col justify-between shadow-2xs relative overflow-hidden"
        :class="[
          method.isEnabled
            ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-primary-400 dark:hover:border-primary-500/60'
            : 'bg-gray-50/70 dark:bg-gray-950/40 border-gray-200/60 dark:border-gray-800/60 opacity-75'
        ]"
      >
        <!-- Top Row: Icon + Title + Toggle Switch -->
        <div>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <!-- Method Icon -->
              <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-2xs border"
                :class="getMethodBadgeColor(method.code)"
              >
                <UIcon
                  :name="
                    method.code === 'cash'
                      ? 'i-heroicons-banknotes'
                      : method.code === 'card'
                      ? 'i-heroicons-credit-card'
                      : 'i-heroicons-qr-code'
                  "
                  class="w-6 h-6"
                />
              </div>

              <div>
                <h3 class="text-sm font-extrabold text-gray-900 dark:text-white leading-tight">
                  {{ method.name }}
                </h3>
                <span class="text-[10px] font-mono text-gray-400 block mt-0.5 uppercase tracking-wider">
                  កូដ៖ {{ method.code }}
                </span>
              </div>
            </div>

            <!-- 1-Click Toggle Switch -->
            <button
              type="button"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden"
              :class="method.isEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'"
              :title="method.isEnabled ? 'ចុចដើម្បីបិទ' : 'ចុចដើម្បីបើក'"
              @click="toggleMethodEnabled(method)"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                :class="method.isEnabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Description -->
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">
            {{ method.description || 'មិនមានការពិពណ៌នា' }}
          </p>

          <!-- Account Details Card (For Bank / KHQR) -->
          <div
            v-if="method.code !== 'cash'"
            class="mt-4 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs space-y-1.5"
          >
            <div class="flex items-center justify-between text-gray-500">
              <span class="text-[11px]">ឈ្មោះគណនី៖</span>
              <span class="font-bold text-gray-800 dark:text-gray-200">{{ method.accountName || '-' }}</span>
            </div>
            <div class="flex items-center justify-between text-gray-500">
              <span class="text-[11px]">លេខគណនី៖</span>
              <span class="font-bold font-mono text-gray-900 dark:text-white">{{ method.accountNumber || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- Bottom: QR Code Thumbnail Preview & Actions -->
        <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2">
          <!-- QR Thumbnail Button if exists -->
          <div v-if="method.qrImageUrl" class="flex items-center gap-2">
            <button
              type="button"
              class="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0 group cursor-pointer relative shadow-2xs hover:scale-105 transition-transform"
              title="ចុចដើម្បីមើលរូបភាព QR Code ពេញលេញ"
              @click="openQrPreview(method.qrImageUrl)"
            >
              <img :src="method.qrImageUrl" alt="QR" class="w-full h-full object-cover" />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5" />
              </div>
            </button>
            <span class="text-[11px] font-bold text-sky-600 dark:text-sky-400">
              មានរូប QR Standee
            </span>
          </div>
          <div v-else class="text-[11px] text-gray-400 italic">
            {{ method.code === 'cash' ? '💵 ទូទាត់សាច់ប្រាក់' : 'គ្មានរូប QR Code' }}
          </div>

          <!-- Edit & Delete Buttons -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              class="p-2 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer"
              title="កែប្រែព័ត៌មាន"
              @click="openEditModal(method)"
            >
              <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
            </button>

            <button
              type="button"
              class="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="លុបវិធីសាស្ត្រនេះ"
              @click="openDeleteModal(method)"
            >
              <UIcon name="i-heroicons-trash" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD / EDIT PAYMENT METHOD -->
    <div
      v-if="isMethodModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div
        class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <!-- Modal Header -->
        <div class="flex items-start justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 class="font-black text-base text-gray-900 dark:text-white flex items-center gap-1.5">
              <UIcon
                :name="isEditing ? 'i-heroicons-pencil-square' : 'i-heroicons-credit-card'"
                class="w-5 h-5 text-primary-600"
              />
              <span>{{ isEditing ? 'កែប្រែវិធីសាស្ត្រទូទាត់' : 'បន្ថែមវិធីសាស្ត្រទូទាត់ថ្មី' }}</span>
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              កំណត់គណនីធនាគារ ឈ្មោះ និងដាក់រូបភាព QR Code
            </p>
          </div>
          <button
            type="button"
            class="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            @click="isMethodModalOpen = false"
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Quick 1-Click Bank Presets (Only when Adding New) -->
        <div v-if="!isEditing" class="space-y-1.5 pb-2 border-b border-gray-100 dark:border-gray-800">
          <label class="block text-[11px] font-bold text-gray-500">
            ចុចជ្រើសរើសប្រភេទធនាគារស្រាប់ (១ ភ្លែត)៖
          </label>
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="p in bankPresets"
              :key="p.code"
              type="button"
              class="px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1"
              :class="methodForm.code === p.code
                ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'"
              @click="applyPreset(p)"
            >
              <span>{{ p.name }}</span>
            </button>
          </div>
        </div>

        <!-- Form Fields -->
        <form @submit.prevent="handleSaveMethod" class="space-y-3.5">
          <!-- Name Field -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              ឈ្មោះវិធីសាស្ត្រទូទាត់ <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="methodForm.name"
              type="text"
              required
              placeholder="ឧទាហរណ៍៖ ABA Bank, ACLEDA, សាច់ប្រាក់..."
              class="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-bold"
            />
          </div>

          <!-- Code Field -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              កូដសម្គាល់ (Code) <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="methodForm.code"
              type="text"
              required
              placeholder="ឧទាហរណ៍៖ aba, acleda, cash, wing, card"
              class="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono font-bold"
            />
          </div>

          <!-- Account Name Field -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              ឈ្មោះម្ចាស់គណនី (Account Name)
            </label>
            <input
              v-model="methodForm.accountName"
              type="text"
              placeholder="ឧទាហរណ៍៖ HENG SOKHA (ឬឈ្មោះហាង)"
              class="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-bold"
            />
          </div>

          <!-- Account Number Field -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              លេខគណនីធនាគារ (Account Number)
            </label>
            <input
              v-model="methodForm.accountNumber"
              type="text"
              placeholder="ឧទាហរណ៍៖ 001 234 567"
              class="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono font-bold"
            />
          </div>

          <!-- QR Code Image Upload Component -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              រូបភាព QR Code / KHQR Standee (សម្រាប់ភ្ញៀវស្កេន)
            </label>
            <UploadImageUploader
              v-model="methodForm.qrImageUrl"
              folder="payment_qr"
              label="ជ្រើសរើស ឬទម្លាក់រូបភាព QR Code នៅទីនេះ"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              ការពិពណ៌នា / ការណែនាំ
            </label>
            <input
              v-model="methodForm.description"
              type="text"
              placeholder="ឧទាហរណ៍៖ ស្កេនទូទាត់តាម ABA Mobile ឬ Bakong KHQR"
              class="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          <!-- Status Switch -->
          <div class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div>
              <span class="text-xs font-bold text-gray-900 dark:text-white block">
                បើកឱ្យដំណើរការក្នុង POS
              </span>
              <span class="text-[10px] text-gray-500 dark:text-gray-400">
                បើបើក Cashier អាចរើសវិធីសាស្ត្រនេះពេលគិតលុយបាន
              </span>
            </div>

            <button
              type="button"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden"
              :class="methodForm.isEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'"
              @click="methodForm.isEnabled = !methodForm.isEnabled"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                :class="methodForm.isEnabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              class="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
              @click="isMethodModalOpen = false"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex-2 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40"
            >
              <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
              <UIcon v-else name="i-heroicons-check" class="w-4 h-4" />
              <span>{{ isEditing ? 'រក្សាទុកការកែប្រែ' : 'បន្ថែមវិធីសាស្ត្រ' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: DELETE CONFIRMATION -->
    <div
      v-if="isDeleteModalOpen && methodToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div
        class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4"
      >
        <div class="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <UIcon name="i-heroicons-trash" class="w-6 h-6" />
        </div>

        <div class="text-center space-y-1">
          <h3 class="font-extrabold text-base text-gray-900 dark:text-white">
            បញ្ជាក់ការលុបវិធីសាស្ត្រទូទាត់
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            តើអ្នកពិតជាចង់លុប <strong class="text-gray-900 dark:text-white">"{{ methodToDelete.name }}"</strong> ចេញពីប្រព័ន្ធមែនទេ?
          </p>
        </div>

        <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
            @click="isDeleteModalOpen = false"
          >
            បោះបង់
          </button>
          <button
            type="button"
            :disabled="isDeleting"
            class="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40"
            @click="handleConfirmDelete"
          >
            <UIcon v-if="isDeleting" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <UIcon v-else name="i-heroicons-trash" class="w-4 h-4" />
            <span>យល់ព្រមលុប</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: QR FULL PREVIEW -->
    <div
      v-if="isQrPreviewModalOpen && previewQrUrl"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      @click="isQrPreviewModalOpen = false"
    >
      <div
        class="relative max-w-sm bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl text-center space-y-3"
        @click.stop
      >
        <div class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <h4 class="font-extrabold text-sm text-gray-900 dark:text-white">រូបភាព QR Code Standee</h4>
          <button
            type="button"
            class="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            @click="isQrPreviewModalOpen = false"
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <div class="p-2 bg-white rounded-2xl border border-gray-200 shadow-inner flex items-center justify-center">
          <img :src="previewQrUrl" alt="QR Preview" class="max-h-72 w-auto object-contain rounded-xl" />
        </div>

        <p class="text-xs text-gray-500">
          រូបភាពនេះនឹងបង្ហាញលើផ្ទាំង Checkout ពេល Cashier ជ្រើសរើសទូទាត់តាមធនាគារនេះ។
        </p>
      </div>
    </div>
  </div>
</template>
