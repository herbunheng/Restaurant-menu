<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Staff, StaffGender, StaffStatus } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

const { $api } = useApi();
const toast = useToast();

// 1. Fetch Staff List
const { data: staffData, status: fetchStatus, refresh: fetchStaff } = await useApiData<Staff[]>(
  'admin-staff-list',
  '/api/staff'
);

const staffList = computed(() => staffData.value || []);
const isLoading = computed(() => fetchStatus.value === 'pending');

// 2. Search & Filtering
const searchQuery = ref('');
const selectedRoleFilter = ref<string>('all');
const selectedGenderFilter = ref<string>('all');
const selectedStatusFilter = ref<string>('all');

const roleOptions = [
  { label: 'អ្នករត់តុ (Waiter)', value: 'waiter' },
  { label: 'បេឡាករ (Cashier)', value: 'cashier' },
  { label: 'ចុងភៅ (Chef)', value: 'chef' },
  { label: 'អ្នកគ្រប់គ្រង (Manager)', value: 'manager' },
  { label: 'អនាម័យ (Cleaner)', value: 'cleaner' },
  { label: 'ផ្សេងៗ (Other)', value: 'other' },
];

function getRoleLabel(roleValue: string): string {
  const found = roleOptions.find((r) => r.value === roleValue);
  return found ? found.label : roleValue;
}

const filteredStaff = computed(() => {
  return staffList.value.filter((s) => {
    const q = searchQuery.value.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.telegram && s.telegram.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.role && s.role.toLowerCase().includes(q));

    const matchesRole =
      selectedRoleFilter.value === 'all' || s.role === selectedRoleFilter.value;

    const matchesGender =
      selectedGenderFilter.value === 'all' || s.gender === selectedGenderFilter.value;

    const matchesStatus =
      selectedStatusFilter.value === 'all' || s.status === selectedStatusFilter.value;

    return matchesSearch && matchesRole && matchesGender && matchesStatus;
  });
});

// Summary Stats
const totalStaffCount = computed(() => staffList.value.length);
const waiterCount = computed(() => staffList.value.filter((s) => s.role === 'waiter').length);
const cashierCount = computed(() => staffList.value.filter((s) => s.role === 'cashier').length);
const activeCount = computed(() => staffList.value.filter((s) => s.status === 'active').length);

// Modal Add/Edit State
const isStaffModalOpen = ref(false);
const isEditing = ref(false);
const editingStaffId = ref<string | null>(null);
const isSubmitting = ref(false);

const staffForm = ref<{
  name: string;
  gender: StaffGender;
  role: string;
  telegram: string;
  phone: string;
  status: StaffStatus;
}>({
  name: '',
  gender: 'male',
  role: 'waiter',
  telegram: '',
  phone: '',
  status: 'active',
});

function openAddStaffModal() {
  isEditing.value = false;
  editingStaffId.value = null;
  staffForm.value = {
    name: '',
    gender: 'male',
    role: 'waiter',
    telegram: '',
    phone: '',
    status: 'active',
  };
  isStaffModalOpen.value = true;
}

function openEditStaffModal(staffMember: Staff) {
  isEditing.value = true;
  editingStaffId.value = staffMember.id;
  staffForm.value = {
    name: staffMember.name,
    gender: staffMember.gender,
    role: staffMember.role,
    telegram: staffMember.telegram || '',
    phone: staffMember.phone || '',
    status: staffMember.status,
  };
  isStaffModalOpen.value = true;
}

async function handleSaveStaff() {
  const name = staffForm.value.name.trim();
  if (!name) {
    toast.add({
      title: 'សូមបញ្ចូលឈ្មោះបុគ្គលិក',
      description: 'ឈ្មោះបុគ្គលិកមិនអាចទទេបានឡើយ',
      color: 'warning',
    });
    return;
  }

  isSubmitting.value = true;

  try {
    if (isEditing.value && editingStaffId.value) {
      // Update
      await $api(`/api/staff/${editingStaffId.value}`, {
        method: 'PUT',
        body: staffForm.value,
      });

      toast.add({
        title: 'កែប្រែជោគជ័យ!',
        description: `បានកែប្រែព័ត៌មានបុគ្គលិក "${name}" រួចរាល់`,
        color: 'success',
      });
    } else {
      // Create
      await $api('/api/staff', {
        method: 'POST',
        body: staffForm.value,
      });

      toast.add({
        title: 'បន្ថែមបុគ្គលិកជោគជ័យ!',
        description: `បានបញ្ចូលបុគ្គលិក "${name}" ទៅក្នុងប្រព័ន្ធ`,
        color: 'success',
      });
    }

    await fetchStaff();
    isStaffModalOpen.value = false;
  } catch (err: any) {
    toast.add({
      title: 'មានបញ្ហាក្នុងការរក្សាទុក',
      description: err.message || 'Failed to save staff member',
      color: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
}

// Delete Confirmation Modal State
const isDeleteModalOpen = ref(false);
const staffToDelete = ref<Staff | null>(null);
const isDeleting = ref(false);

function openDeleteModal(staffMember: Staff) {
  staffToDelete.value = staffMember;
  isDeleteModalOpen.value = true;
}

async function handleConfirmDelete() {
  if (!staffToDelete.value) return;

  isDeleting.value = true;
  const name = staffToDelete.value.name;

  try {
    await $api(`/api/staff/${staffToDelete.value.id}`, {
      method: 'DELETE',
    });

    toast.add({
      title: 'បានលុបបុគ្គលិក!',
      description: `បានលុបបុគ្គលិក "${name}" ចេញពីប្រព័ន្ធ`,
      color: 'success',
    });

    await fetchStaff();
    isDeleteModalOpen.value = false;
    staffToDelete.value = null;
  } catch (err: any) {
    toast.add({
      title: 'បរាជ័យក្នុងការលុប',
      description: err.message || 'Failed to delete staff member',
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
}

// Quick Toggle Status
async function toggleStaffStatus(staffMember: Staff) {
  const newStatus: StaffStatus = staffMember.status === 'active' ? 'inactive' : 'active';
  try {
    await $api(`/api/staff/${staffMember.id}`, {
      method: 'PUT',
      body: { status: newStatus },
    });

    toast.add({
      title: newStatus === 'active' ? 'បានបើកដំណើរការ' : 'បានផ្អាកដំណើរការ',
      description: `បុគ្គលិក ${staffMember.name} ត្រូវបានប្តូរទៅជា ${newStatus === 'active' ? 'សកម្ម' : 'ផ្អាក'}`,
      color: 'success',
    });

    await fetchStaff();
  } catch (err: any) {
    toast.add({
      title: 'មានបញ្ហាក្នុងការប្តូរស្ថានភាព',
      description: err.message || 'Failed to toggle status',
      color: 'error',
    });
  }
}

function getTelegramLink(tg: string | null | undefined): string {
  if (!tg) return '';
  const clean = tg.trim().replace(/^@/, '');
  return `https://t.me/${clean}`;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Breadcrumbs, Tabs and Action Button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <!-- Tabs between Staff & Users -->
        <div class="flex items-center gap-2 mb-2">
          <NuxtLink to="/admin/staff"
            class="px-3 py-1 rounded-xl text-xs font-bold bg-primary-600 text-white shadow-xs flex items-center gap-1.5">
            <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
            <span>បុគ្គលិកហាង (Staff)</span>
          </NuxtLink>
          <NuxtLink to="/admin/users"
            class="px-3 py-1 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5">
            <UIcon name="i-heroicons-users" class="w-4 h-4" />
            <span>គណនីប្រព័ន្ធ (Users)</span>
          </NuxtLink>
        </div>

        <h1 class="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-user-group" class="w-7 h-7 text-primary-600 dark:text-primary-400" />
          <span>ការគ្រប់គ្រងបុគ្គលិក</span>
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          គ្រប់គ្រងបញ្ជីឈ្មោះបុគ្គលិក តួនាទី ភេទ គណនី Telegram និងតាមដានវត្តមានបម្រើការងារ
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button type="button"
          class="px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
          @click="openAddStaffModal">
          <UIcon name="i-heroicons-plus" class="w-4 h-4" />
          <span>បន្ថែមបុគ្គលិកថ្មី</span>
        </button>
      </div>
    </div>

    <!-- Stats Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Total Staff -->
      <div
        class="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-user-group" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 block">បុគ្គលិកសរុប</span>
          <span class="text-xl font-black text-gray-900 dark:text-white font-mono">{{ totalStaffCount }} នាក់</span>
        </div>
      </div>

      <!-- Card 2: Waiters -->
      <div
        class="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-clipboard-document-list" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 block">អ្នករត់តុ (Waiter)</span>
          <span class="text-xl font-black text-gray-900 dark:text-white font-mono">{{ waiterCount }} នាក់</span>
        </div>
      </div>

      <!-- Card 3: Cashiers -->
      <div
        class="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-banknotes" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 block">បេឡាករ (Cashier)</span>
          <span class="text-xl font-black text-gray-900 dark:text-white font-mono">{{ cashierCount }} នាក់</span>
        </div>
      </div>

      <!-- Card 4: Active Staff -->
      <div
        class="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-check-badge" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 block">បុគ្គលិកសកម្ម</span>
          <span class="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{{ activeCount }}
            នាក់</span>
        </div>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div
      class="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-3">
      <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <!-- Search Input -->
        <div class="relative flex-1">
          <UIcon name="i-heroicons-magnifying-glass"
            class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="searchQuery" type="text" placeholder="ស្វែងរកតាមឈ្មោះ, Telegram (@user), តួនាទី..."
            class="w-full pl-9 pr-3 py-2 text-xs rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-gray-200 font-medium" />
        </div>

        <!-- Role Filter Select -->
        <div class="w-full sm:w-48">
          <select v-model="selectedRoleFilter"
            class="w-full py-2 px-3 text-xs font-bold rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-gray-200 cursor-pointer">
            <option value="all">តួនាទីទាំងអស់</option>
            <option v-for="r in roleOptions" :key="r.value" :value="r.value">
              {{ r.label }}
            </option>
          </select>
        </div>

        <!-- Gender Filter Select -->
        <div class="w-full sm:w-36">
          <select v-model="selectedGenderFilter"
            class="w-full py-2 px-3 text-xs font-bold rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-gray-200 cursor-pointer">
            <option value="all">ភេទទាំងអស់</option>
            <option value="male">👨 ប្រុស</option>
            <option value="female">👩 ស្រី</option>
            <option value="other">ផ្សេងៗ</option>
          </select>
        </div>

        <!-- Status Filter Select -->
        <div class="w-full sm:w-36">
          <select v-model="selectedStatusFilter"
            class="w-full py-2 px-3 text-xs font-bold rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-gray-200 cursor-pointer">
            <option value="all">ស្ថានភាពទាំងអស់</option>
            <option value="active">🟢 សកម្ម</option>
            <option value="inactive">⚪ ផ្អាក</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Staff Table Container -->
    <div
      class="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="p-12 text-center text-gray-400">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
        <p class="text-xs">កំពុងទាញយកទិន្នន័យបុគ្គលិក...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredStaff.length === 0" class="p-12 text-center text-gray-400">
        <UIcon name="i-heroicons-user-group" class="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p class="text-sm font-bold text-gray-600 dark:text-gray-300">មិនមានទិន្នន័យបុគ្គលិកឡើយ</p>
        <p class="text-xs text-gray-400 mt-1">សូមសាកល្បងស្វែងរកម្ដងទៀត ឬចុចប៊ូតុងខាងលើដើម្បីបន្ថែមបុគ្គលិកថ្មី</p>
      </div>

      <!-- Staff Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead
            class="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
            <tr>
              <th scope="col" class="px-5 py-3.5">ឈ្មោះបុគ្គលិក</th>
              <th scope="col" class="px-4 py-3.5">ភេទ</th>
              <th scope="col" class="px-4 py-3.5">តួនាទី</th>
              <th scope="col" class="px-4 py-3.5">Telegram</th>
              <th scope="col" class="px-4 py-3.5">លេខទូរស័ព្ទ</th>
              <th scope="col" class="px-4 py-3.5 text-center">ស្ថានភាព</th>
              <th scope="col" class="px-5 py-3.5 text-right">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
            <tr v-for="staffMember in filteredStaff" :key="staffMember.id"
              class="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
              <!-- Name & Avatar -->
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs"
                    :class="staffMember.gender === 'female' ? 'bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300'">
                    {{ staffMember.name.slice(0, 2) }}
                  </div>
                  <div>
                    <span class="font-extrabold text-sm text-gray-900 dark:text-white block">
                      {{ staffMember.name }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- Gender -->
              <td class="px-4 py-3.5">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold" :class="[
                  staffMember.gender === 'female'
                    ? 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800'
                    : staffMember.gender === 'male'
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                ]">
                  <span v-if="staffMember.gender === 'female'">👩 ស្រី</span>
                  <span v-else-if="staffMember.gender === 'male'">👨 ប្រុស</span>
                  <span v-else>ផ្សេងៗ</span>
                </span>
              </td>

              <!-- Role -->
              <td class="px-4 py-3.5">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold" :class="[
                  staffMember.role === 'waiter'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                    : staffMember.role === 'cashier'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                      : staffMember.role === 'chef'
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                        : staffMember.role === 'manager'
                          ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                ]">
                  <UIcon :name="staffMember.role === 'waiter'
                      ? 'i-heroicons-clipboard-document-list'
                      : staffMember.role === 'cashier'
                        ? 'i-heroicons-banknotes'
                        : staffMember.role === 'chef'
                          ? 'i-heroicons-fire'
                          : staffMember.role === 'manager'
                            ? 'i-heroicons-shield-check'
                            : 'i-heroicons-user'
                    " class="w-3.5 h-3.5" />
                  <span>{{ getRoleLabel(staffMember.role) }}</span>
                </span>
              </td>

              <!-- Telegram -->
              <td class="px-4 py-3.5">
                <a v-if="staffMember.telegram" :href="getTelegramLink(staffMember.telegram)" target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 transition-colors">
                  <UIcon name="i-heroicons-paper-airplane" class="w-3.5 h-3.5 text-sky-500" />
                  <span>{{ staffMember.telegram }}</span>
                </a>
                <span v-else class="text-gray-400 text-xs italic">-</span>
              </td>

              <!-- Phone -->
              <td class="px-4 py-3.5 text-gray-600 dark:text-gray-300 font-mono">
                <span v-if="staffMember.phone" class="flex items-center gap-1">
                  <UIcon name="i-heroicons-phone" class="w-3.5 h-3.5 text-gray-400" />
                  <span>{{ staffMember.phone }}</span>
                </span>
                <span v-else class="text-gray-400 text-xs italic">-</span>
              </td>

              <!-- Status Toggle -->
              <td class="px-4 py-3.5 text-center">
                <button type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-all border"
                  :class="[
                    staffMember.status === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200'
                  ]" @click="toggleStaffStatus(staffMember)">
                  <span class="w-1.5 h-1.5 rounded-full"
                    :class="staffMember.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'" />
                  <span>{{ staffMember.status === 'active' ? 'សកម្ម' : 'ផ្អាក' }}</span>
                </button>
              </td>

              <!-- Actions -->
              <td class="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                <!-- Edit button -->
                <button type="button"
                  class="p-1.5 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer"
                  title="កែប្រែព័ត៌មាន" @click="openEditStaffModal(staffMember)">
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                </button>

                <!-- Delete button -->
                <button type="button"
                  class="p-1.5 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="លុបបុគ្គលិក" @click="openDeleteModal(staffMember)">
                  <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL: ADD / EDIT STAFF -->
    <div v-if="isStaffModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="flex items-start justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 class="font-black text-base text-gray-900 dark:text-white flex items-center gap-1.5">
              <UIcon :name="isEditing ? 'i-heroicons-pencil-square' : 'i-heroicons-user-plus'"
                class="w-5 h-5 text-primary-600" />
              <span>{{ isEditing ? 'កែប្រែព័ត៌មានបុគ្គលិក' : 'បន្ថែមបុគ្គលិកថ្មី' }}</span>
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              សូមបំពេញព័ត៌មានបុគ្គលិកឱ្យបានត្រឹមត្រូវ
            </p>
          </div>
          <button type="button"
            class="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            @click="isStaffModalOpen = false">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Form Fields -->
        <form @submit.prevent="handleSaveStaff" class="space-y-3.5">
          <!-- Name Field -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              ឈ្មោះបុគ្គលិក <span class="text-rose-500">*</span>
            </label>
            <input v-model="staffForm.name" type="text" required placeholder="ឧទាហរណ៍៖ សុខា, ដារ៉ា..."
              class="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-bold" />
          </div>

          <!-- Gender Field -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              ភេទ <span class="text-rose-500">*</span>
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button type="button"
                class="py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer"
                :class="staffForm.gender === 'male'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'"
                @click="staffForm.gender = 'male'">
                <span>👨 ប្រុស (Male)</span>
              </button>

              <button type="button"
                class="py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer"
                :class="staffForm.gender === 'female'
                  ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'"
                @click="staffForm.gender = 'female'">
                <span>👩 ស្រី (Female)</span>
              </button>

              <button type="button"
                class="py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer"
                :class="staffForm.gender === 'other'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'"
                @click="staffForm.gender = 'other'">
                <span>ផ្សេងៗ</span>
              </button>
            </div>
          </div>

          <!-- Role Field -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              តួនាទី / មុខតំណែង <span class="text-rose-500">*</span>
            </label>
            <select v-model="staffForm.role"
              class="w-full py-2 px-3 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-gray-200 cursor-pointer">
              <option v-for="r in roleOptions" :key="r.value" :value="r.value">
                {{ r.label }}
              </option>
            </select>
          </div>

          <!-- Telegram Field -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              គណនី Telegram (Username ឬ លេខទូរស័ព្ទ)
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">@</span>
              <input v-model="staffForm.telegram" type="text" placeholder="username_telegram (ឧ. sokha_service)"
                class="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium" />
            </div>
            <p class="text-[10px] text-gray-400 mt-0.5">
              សម្រាប់ផ្ញើសារ ឬទាក់ទងការងារតាម Telegram ផ្ទាល់
            </p>
          </div>

          <!-- Phone Field -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              លេខទូរស័ព្ទ (Phone Number)
            </label>
            <input v-model="staffForm.phone" type="text" placeholder="ឧទាហរណ៍៖ 012 345 678"
              class="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono font-medium" />
          </div>

          <!-- Status Field -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              ស្ថានភាពបម្រើការងារ
            </label>
            <div class="flex items-center gap-4 pt-1">
              <label
                class="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <input v-model="staffForm.status" type="radio" value="active"
                  class="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                <span>🟢 សកម្ម (កំពុងធ្វើការ)</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-500">
                <input v-model="staffForm.status" type="radio" value="inactive"
                  class="w-4 h-4 text-gray-500 focus:ring-gray-400" />
                <span>⚪ ផ្អាក (ឈប់សម្រាក)</span>
              </label>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button type="button"
              class="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
              @click="isStaffModalOpen = false">
              បោះបង់
            </button>
            <button type="submit" :disabled="isSubmitting"
              class="flex-2 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40">
              <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
              <UIcon v-else name="i-heroicons-check" class="w-4 h-4" />
              <span>{{ isEditing ? 'រក្សាទុកការកែប្រែ' : 'បញ្ចូលបុគ្គលិក' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: DELETE CONFIRMATION -->
    <div v-if="isDeleteModalOpen && staffToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4">
        <div
          class="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <UIcon name="i-heroicons-trash" class="w-6 h-6" />
        </div>

        <div class="text-center space-y-1">
          <h3 class="font-extrabold text-base text-gray-900 dark:text-white">
            បញ្ជាក់ការលុបបុគ្គលិក
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            តើអ្នកពិតជាចង់លុបបុគ្គលិក <strong class="text-gray-900 dark:text-white">"{{ staffToDelete.name }}"</strong>
            ចេញពីប្រព័ន្ធមែនទេ?
          </p>
        </div>

        <div class="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 text-xs space-y-1">
          <div class="flex justify-between text-gray-500">
            <span>តួនាទី៖</span>
            <span class="font-bold text-gray-800 dark:text-gray-200">{{ getRoleLabel(staffToDelete.role) }}</span>
          </div>
          <div v-if="staffToDelete.telegram" class="flex justify-between text-gray-500">
            <span>Telegram៖</span>
            <span class="font-mono text-sky-600">{{ staffToDelete.telegram }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button"
            class="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
            @click="isDeleteModalOpen = false">
            បោះបង់
          </button>
          <button type="button" :disabled="isDeleting"
            class="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40"
            @click="handleConfirmDelete">
            <UIcon v-if="isDeleting" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <UIcon v-else name="i-heroicons-trash" class="w-4 h-4" />
            <span>យល់ព្រមលុប</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
