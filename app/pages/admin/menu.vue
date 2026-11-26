<script setup lang="ts">
import { ref, computed } from 'vue';
import type { MenuItem, Category } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

const { $api } = useApi();
const toast = useToast();

// Fetch Menu Items & Categories
const { data: menuData, status: menuStatus, refresh: refreshMenu } = await useApiData<MenuItem[]>(
  'admin-menu-list',
  '/api/menu'
);

const { data: categoriesData, status: catStatus, refresh: refreshCategories } = await useApiData<Category[]>(
  'admin-categories-list',
  '/api/categories'
);

const menuList = computed(() => menuData.value || []);
const categoriesList = computed(() => categoriesData.value || []);
const isLoading = computed(() => menuStatus.value === 'pending' || catStatus.value === 'pending');

// View Tab
const activeTab = ref<'items' | 'categories'>('items');

// Filter & Search
const searchQuery = ref('');
const selectedCategoryFilter = ref<string>('all');

const filteredItems = computed(() => {
  return menuList.value.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.value.toLowerCase()));
    const matchesCat =
      selectedCategoryFilter.value === 'all' || item.categoryId === selectedCategoryFilter.value;
    return matchesSearch && matchesCat;
  });
});

// Stats
const totalItems = computed(() => menuList.value.length);
const availableItems = computed(() => menuList.value.filter((i) => i.isAvailable).length);
const totalCategories = computed(() => categoriesList.value.length);
const avgPrice = computed(() => {
  if (!menuList.value.length) return 0;
  const sum = menuList.value.reduce((acc, curr) => acc + (curr.price || 0), 0);
  return (sum / menuList.value.length).toFixed(2);
});

// Item Modal State (Create / Edit)
const isItemModalOpen = ref(false);
const isEditing = ref(false);
const editingItemId = ref<string | null>(null);
const isSubmitting = ref(false);

const itemForm = ref({
  name: '',
  categoryId: '',
  price: 0,
  currency: 'USD',
  imageUrl: '',
  description: '',
  isAvailable: true,
});

function openCreateItemModal() {
  isEditing.value = false;
  editingItemId.value = null;
  itemForm.value = {
    name: '',
    categoryId: categoriesList.value[0]?.id || '',
    price: 0,
    currency: 'USD',
    imageUrl: '',
    description: '',
    isAvailable: true,
  };
  isItemModalOpen.value = true;
}

function openEditItemModal(item: MenuItem) {
  isEditing.value = true;
  editingItemId.value = item.id;
  itemForm.value = {
    name: item.name,
    categoryId: item.categoryId ?? '',
    price: item.price,
    currency: item.currency ?? 'USD',
    imageUrl: item.imageUrl ?? '',
    description: item.description ?? '',
    isAvailable: item.isAvailable ?? true,
  };
  isItemModalOpen.value = true;
}

async function handleSaveItem() {
  if (!itemForm.value.name.trim()) {
    toast.add({
      title: 'សូមបញ្ចូលឈ្មោះមុខម្ហូប',
      description: 'Item name is required',
      color: 'warning',
    });
    return;
  }

  if (itemForm.value.price < 0 || isNaN(itemForm.value.price)) {
    toast.add({
      title: 'តម្លៃមិនត្រឹមត្រូវ',
      description: 'Price must be 0 or greater',
      color: 'warning',
    });
    return;
  }

  isSubmitting.value = true;
  try {
    if (isEditing.value && editingItemId.value) {
      await $api(`/api/menu/${editingItemId.value}`, {
        method: 'PUT',
        body: itemForm.value,
      });
      toast.add({
        title: 'បានកែប្រែជោគជ័យ',
        description: `Updated "${itemForm.value.name}" successfully`,
        color: 'success',
      });
    } else {
      await $api('/api/menu', {
        method: 'POST',
        body: itemForm.value,
      });
      toast.add({
        title: 'បានបង្កើតមុខម្ហូបថ្មី',
        description: `Added "${itemForm.value.name}" successfully`,
        color: 'success',
      });
    }

    isItemModalOpen.value = false;
    await refreshMenu();
  } catch (err: any) {
    toast.add({
      title: 'មានបញ្ហាក្នុងការរក្សាទុក',
      description: err.message || 'Failed to save item',
      color: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDeleteItem(id: string, name: string) {
  if (!confirm(`តើអ្នកពិតជាចង់លុបមុខម្ហូប "${name}" មែនទេ?`)) return;

  try {
    await $api(`/api/menu/${id}`, { method: 'DELETE' });
    toast.add({
      title: 'បានលុបជោគជ័យ',
      description: `Deleted "${name}"`,
      color: 'success',
    });
    await refreshMenu();
  } catch (err: any) {
    toast.add({
      title: 'មិនអាចលុបបានទេ',
      description: err.message || 'Failed to delete item',
      color: 'error',
    });
  }
}

async function handleToggleAvailability(item: MenuItem) {
  const newStatus = !item.isAvailable;
  try {
    await $api(`/api/menu/${item.id}`, {
      method: 'PUT',
      body: { isAvailable: newStatus },
    });
    item.isAvailable = newStatus;
    toast.add({
      title: newStatus ? 'បានបើកលក់វិញ' : 'បានបិទការលក់',
      description: `Status updated for "${item.name}"`,
      color: 'neutral',
    });
  } catch (err: any) {
    toast.add({
      title: 'បរាជ័យក្នុងការផ្លាស់ប្តូរស្ថានភាព',
      description: err.message || 'Failed to toggle status',
      color: 'error',
    });
  }
}

// Category Management State
const newCatName = ref('');
const newCatDesc = ref('');
const isSubmittingCat = ref(false);

async function handleCreateCategory() {
  if (!newCatName.value.trim()) {
    toast.add({
      title: 'សូមបញ្ចូលឈ្មោះប្រភេទ',
      description: 'Category name is required',
      color: 'warning',
    });
    return;
  }

  isSubmittingCat.value = true;
  try {
    await $api('/api/categories', {
      method: 'POST',
      body: {
        name: newCatName.value.trim(),
        description: newCatDesc.value.trim(),
      },
    });
    toast.add({
      title: 'បានបង្កើតប្រភេទថ្មី',
      description: `Category "${newCatName.value}" created`,
      color: 'success',
    });
    newCatName.value = '';
    newCatDesc.value = '';
    await refreshCategories();
  } catch (err: any) {
    toast.add({
      title: 'មានបញ្ហាក្នុងការបង្កើតប្រភេទ',
      description: err.message || 'Failed to create category',
      color: 'error',
    });
  } finally {
    isSubmittingCat.value = false;
  }
}

async function handleDeleteCategory(cat: Category) {
  if (!confirm(`តើអ្នកពិតជាចង់លុបប្រភេទ "${cat.name}" មែនទេ?`)) return;

  try {
    await $api(`/api/categories/${cat.id}`, { method: 'DELETE' });
    toast.add({
      title: 'បានលុបប្រភេទជោគជ័យ',
      description: `Category "${cat.name}" deleted`,
      color: 'success',
    });
    await refreshCategories();
    await refreshMenu();
  } catch (err: any) {
    toast.add({
      title: 'មិនអាចលុបបានទេ',
      description: err.message || 'Failed to delete category',
      color: 'error',
    });
  }
}

function formatRiel(usd: number): string {
  return (usd * 4100).toLocaleString('en-US');
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
          <UIcon name="i-heroicons-book-open" class="w-7 h-7 text-primary-600 dark:text-primary-400" />
          <span>Menu & Categories Management</span>
        </h1>
        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          គ្រប់គ្រងមុខម្ហូប (Item Name, Category, Price, និង Cloudinary Image) សម្រាប់ភោជនីយដ្ឋាន
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- New Item Button -->
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-primary-600 hover:bg-primary-500 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          @click="openCreateItemModal"
        >
          <UIcon name="i-heroicons-plus-circle" class="w-5 h-5" />
          <span>+ Add New Dish</span>
        </button>
      </div>
    </div>

    <!-- Quick Stats Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-2xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Total Items (មុខម្ហូប)</span>
          <UIcon name="i-heroicons-cake" class="w-4 h-4 text-primary-500" />
        </div>
        <p class="text-2xl font-black mt-2 text-gray-900 dark:text-white">{{ totalItems }}</p>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-2xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Available (មានលក់)</span>
          <UIcon name="i-heroicons-check-badge" class="w-4 h-4 text-emerald-500" />
        </div>
        <p class="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">{{ availableItems }}</p>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-2xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Categories (ប្រភេទ)</span>
          <UIcon name="i-heroicons-tag" class="w-4 h-4 text-amber-500" />
        </div>
        <p class="text-2xl font-black mt-2 text-gray-900 dark:text-white">{{ totalCategories }}</p>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-2xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Avg Price (តម្លៃមធ្យម)</span>
          <UIcon name="i-heroicons-currency-dollar" class="w-4 h-4 text-blue-500" />
        </div>
        <p class="text-2xl font-black mt-2 text-gray-900 dark:text-white">${{ avgPrice }}</p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-gray-200 dark:border-gray-800">
      <button
        type="button"
        class="flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors"
        :class="[
          activeTab === 'items'
            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="activeTab = 'items'"
      >
        <UIcon name="i-heroicons-list-bullet" class="w-4 h-4" />
        <span>Menu Items (បញ្ជីមុខម្ហូប)</span>
        <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800">{{ totalItems }}</span>
      </button>

      <button
        type="button"
        class="flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors"
        :class="[
          activeTab === 'categories'
            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="activeTab = 'categories'"
      >
        <UIcon name="i-heroicons-rectangle-stack" class="w-4 h-4" />
        <span>Categories (ប្រភេទមុខម្ហូប)</span>
        <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800">{{ totalCategories }}</span>
      </button>
    </div>

    <!-- TAB 1: MENU ITEMS LIST -->
    <div v-if="activeTab === 'items'" class="space-y-4">
      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
        <div class="relative flex-1">
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះម្ហូប (Search dish name...)"
            class="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 shrink-0">Filter:</span>
          <select
            v-model="selectedCategoryFilter"
            class="px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Categories</option>
            <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Items Grid View -->
      <div v-if="filteredItems.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="group rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
        >
          <!-- Image Header with Availability Tag -->
          <div class="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <UIcon name="i-heroicons-photo" class="w-8 h-8" />
              <span class="text-xs mt-1">No Image</span>
            </div>

            <!-- Category Badge -->
            <span
              v-if="item.categoryName"
              class="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/60 text-white backdrop-blur-md"
            >
              {{ item.categoryName }}
            </span>

            <!-- Status Pill -->
            <button
              type="button"
              class="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
              :class="[
                item.isAvailable
                  ? 'bg-emerald-500/90 text-white hover:bg-emerald-600'
                  : 'bg-rose-500/90 text-white hover:bg-rose-600',
              ]"
              @click="handleToggleAvailability(item)"
            >
              {{ item.isAvailable ? '✓ In Stock' : '✗ Sold Out' }}
            </button>
          </div>

          <!-- Body Info -->
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div class="space-y-1.5">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-bold text-base text-gray-900 dark:text-white leading-tight">
                  {{ item.name }}
                </h3>
                <div class="text-right shrink-0">
                  <span class="text-lg font-black text-primary-600 dark:text-primary-400">
                    ${{ Number(item.price).toFixed(2) }}
                  </span>
                  <span class="block text-[11px] text-gray-400 font-mono">
                    ~{{ formatRiel(Number(item.price)) }} ៛
                  </span>
                </div>
              </div>

              <p v-if="item.description" class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {{ item.description }}
              </p>
            </div>

            <!-- Footer Action Buttons -->
            <div class="pt-4 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span class="text-[11px] text-gray-400 font-mono">
                ID: {{ item.id }}
              </span>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Edit Dish"
                  @click="openEditItemModal(item)"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 text-primary-500" />
                </button>
                <button
                  type="button"
                  class="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
                  title="Delete Dish"
                  @click="handleDeleteItem(item.id, item.name)"
                >
                  <UIcon name="i-heroicons-trash" class="w-4 h-4 text-rose-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="py-16 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 space-y-3"
      >
        <div class="w-14 h-14 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center">
          <UIcon name="i-heroicons-book-open" class="w-7 h-7" />
        </div>
        <h3 class="text-base font-bold text-gray-900 dark:text-white">មិនទាន់មានមុខម្ហូបនៅឡើយទេ</h3>
        <p class="text-xs text-gray-500 max-w-sm mx-auto">
          សូមចុចប៊ូតុងខាងក្រោមដើម្បីបង្កើតមុខម្ហូបថ្មីដំបូងរបស់អ្នក រួមជាមួយការបញ្ចូលរូបភាព Cloudinary។
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-500 shadow-sm"
          @click="openCreateItemModal"
        >
          <UIcon name="i-heroicons-plus-circle" class="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>
    </div>

    <!-- TAB 2: CATEGORIES MANAGEMENT -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Create Category Form Card -->
      <div class="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-plus-circle" class="w-5 h-5 text-primary-500" />
            <span>Add New Category</span>
          </h2>
          <p class="text-xs text-gray-500 mt-1">បង្កើតប្រភេទមុខម្ហូបថ្មី (e.g. ភេសជ្ជៈ, ស៊ុប, ម្ហូបចៀន)</p>
        </div>

        <form @submit.prevent="handleCreateCategory" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Category Name (ឈ្មោះប្រភេទ) *
            </label>
            <input
              v-model="newCatName"
              type="text"
              placeholder="e.g. Appetizers (ម្ហូបកូរ)"
              class="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Description (ការពិពណ៌នាសង្ខេប)
            </label>
            <textarea
              v-model="newCatDesc"
              rows="3"
              placeholder="Short description of this category..."
              class="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            ></textarea>
          </div>

          <button
            type="submit"
            :disabled="isSubmittingCat"
            class="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <UIcon v-if="isSubmittingCat" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span>Create Category</span>
          </button>
        </form>
      </div>

      <!-- Categories List Table -->
      <div class="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-rectangle-stack" class="w-5 h-5 text-primary-500" />
            <span>Category List (បញ្ជីប្រភេទមុខម្ហូប)</span>
          </h2>
          <p class="text-xs text-gray-500 mt-1">ប្រភេទទាំងអស់ដែលត្រូវបានប្រើប្រាស់សម្រាប់ចាត់ថ្នាក់មុខម្ហូប</p>
        </div>

        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-for="cat in categoriesList"
            :key="cat.id"
            class="py-3.5 flex items-center justify-between gap-4"
          >
            <div>
              <p class="font-bold text-sm text-gray-900 dark:text-white">{{ cat.name }}</p>
              <p v-if="cat.description" class="text-xs text-gray-500 mt-0.5">{{ cat.description }}</p>
            </div>

            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-lg text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {{ menuList.filter((m) => m.categoryId === cat.id).length }} dishes
              </span>
              <button
                type="button"
                class="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Delete Category"
                @click="handleDeleteCategory(cat)"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CREATE / EDIT MENU ITEM MODAL -->
    <div
      v-if="isItemModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div class="relative w-full max-w-xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">
              {{ isEditing ? 'Edit Dish (កែប្រែមុខម្ហូប)' : 'Add New Dish (បង្កើតមុខម្ហូបថ្មី)' }}
            </h2>
            <p class="text-xs text-gray-500">បញ្ចូលឈ្មោះម្ហូប, ប្រភេទ, តម្លៃ និងរូបភាព Cloudinary</p>
          </div>
          <button
            type="button"
            class="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="isItemModalOpen = false"
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Form Body -->
        <div class="p-6 overflow-y-auto space-y-5">
          <!-- 1. Item Name -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Dish / Item Name (ឈ្មោះមុខម្ហូប) *
            </label>
            <input
              v-model="itemForm.name"
              type="text"
              placeholder="e.g. ឡុកឡាក់សាច់គោ (Beef Lok Lak)"
              class="w-full px-3.5 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium"
              required
            />
          </div>

          <!-- 2. Category & Price row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Category select -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Category (ប្រភេទមុខម្ហូប)
              </label>
              <select
                v-model="itemForm.categoryId"
                class="w-full px-3.5 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- No Category --</option>
                <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <!-- Price Input -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Price in USD ($) *
                </label>
                <span class="text-[11px] text-gray-400 font-mono">
                  ≈ {{ formatRiel(itemForm.price || 0) }} ៛
                </span>
              </div>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  v-model.number="itemForm.price"
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="0.00"
                  class="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-bold text-primary-600 dark:text-primary-400"
                  required
                />
              </div>
            </div>
          </div>

          <!-- 3. Image Upload (+ img 1) using Reka UI Component -->
          <div class="space-y-1.5">
            <UploadImageUploader
              v-model="itemForm.imageUrl"
              folder="menu"
              label="Dish Photo (រូបភាពមុខម្ហូប)"
              hint="PNG, JPG, WEBP ទៅកាន់ Cloudinary"
              aspect-ratio="video"
            />
          </div>

          <!-- 4. Description -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Description (ការពិពណ៌នាសង្ខេប)
            </label>
            <textarea
              v-model="itemForm.description"
              rows="2"
              placeholder="ព័ត៌មានបន្ថែមអំពីគ្រឿងផ្សំ ឬរសជាតិ..."
              class="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            ></textarea>
          </div>

          <!-- 5. Availability Switch -->
          <div class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">Is Available (មានលក់)</p>
              <p class="text-xs text-gray-500">បើកឱ្យភ្ញៀវអាចកុម្ម៉ង់មុខម្ហូបនេះបាន</p>
            </div>
            <input
              v-model="itemForm.isAvailable"
              type="checkbox"
              class="w-5 h-5 rounded-md text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 cursor-pointer"
            />
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            @click="isItemModalOpen = false"
          >
            Cancel
          </button>

          <button
            type="button"
            :disabled="isSubmitting"
            class="px-5 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-2"
            @click="handleSaveItem"
          >
            <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span>{{ isEditing ? 'Save Changes' : 'Create Dish' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
