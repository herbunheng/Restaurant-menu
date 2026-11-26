<script setup lang="ts">
import { ref, computed } from 'vue';
import type { MenuItem, Category, MenuItemVariant } from '@restaurant-menu/shared';

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
  if (!menuList.value.length) return '0.00';
  const sum = menuList.value.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  return (sum / menuList.value.length).toFixed(2);
});

// Item Modal State (Create / Edit)
const isItemModalOpen = ref(false);
const isEditing = ref(false);
const editingItemId = ref<string | null>(null);
const isSubmitting = ref(false);

const itemForm = ref<{
  name: string;
  categoryId: string;
  price: number;
  currency: string;
  imageUrl: string;
  description: string;
  isAvailable: boolean;
  hasVariants: boolean;
  variants: MenuItemVariant[];
}>({
  name: '',
  categoryId: '',
  price: 0,
  currency: 'USD',
  imageUrl: '',
  description: '',
  isAvailable: true,
  hasVariants: false,
  variants: [],
});

function openCreateItemModal() {
  isEditing.value = false;
  editingItemId.value = null;
  itemForm.value = {
    name: '',
    categoryId: categoriesList.value[0]?.id ?? '',
    price: 0,
    currency: 'USD',
    imageUrl: '',
    description: '',
    isAvailable: true,
    hasVariants: false,
    variants: [
      { label: 'ចានតូច (Small)', price: 3.5 },
      { label: 'ចានធំ (Large)', price: 5.0 },
    ],
  };
  isItemModalOpen.value = true;
}

function openEditItemModal(item: MenuItem) {
  isEditing.value = true;
  editingItemId.value = item.id;
  itemForm.value = {
    name: item.name,
    categoryId: item.categoryId ?? '',
    price: Number(item.price) || 0,
    currency: item.currency ?? 'USD',
    imageUrl: item.imageUrl ?? '',
    description: item.description ?? '',
    isAvailable: item.isAvailable ?? true,
    hasVariants: Boolean(item.hasVariants),
    variants:
      item.variants && item.variants.length > 0
        ? JSON.parse(JSON.stringify(item.variants))
        : [
          { label: 'ចានតូច (Small)', price: Number(item.price) || 0 },
          { label: 'ចានធំ (Large)', price: (Number(item.price) || 0) + 1.5 },
        ],
  };
  isItemModalOpen.value = true;
}

function addVariantOption() {
  const currentLength = itemForm.value.variants.length;
  itemForm.value.variants.push({
    label: `ជម្រើស ${currentLength + 1} (Option ${currentLength + 1})`,
    price: itemForm.value.price || 0,
  });
}

function removeVariantOption(index: number) {
  itemForm.value.variants.splice(index, 1);
}

function applyPreset(presetType: 'sizes' | 'drinks' | 'beer_units' | 'beer_draught') {
  itemForm.value.hasVariants = true;
  const base = itemForm.value.price || (presetType === 'sizes' ? 3.5 : presetType === 'beer_units' ? 0.75 : 1.5);

  if (presetType === 'sizes') {
    itemForm.value.variants = [
      { label: 'ចានតូច (Small)', price: Number(base.toFixed(2)) },
      { label: 'ចានកណ្តាល (Medium)', price: Number((base * 1.35).toFixed(2)) },
      { label: 'ចានធំ (Large)', price: Number((base * 1.7).toFixed(2)) },
    ];
  } else if (presetType === 'drinks') {
    itemForm.value.variants = [
      { label: 'Hot (ក្តៅ)', price: Number(base.toFixed(2)) },
      { label: 'Iced (ត្រជាក់)', price: Number((base + 0.5).toFixed(2)) },
      { label: 'Frappe (ក្រឡុក)', price: Number((base + 1.25).toFixed(2)) },
    ];
  } else if (presetType === 'beer_units') {
    itemForm.value.variants = [
      { label: '1 កំប៉ុង (1 Can)', price: 0.75 }, // ~3,000 ៛
      { label: '1 ដប (1 Bottle)', price: 2.5 },   // ~10,000 ៛
      { label: '1 កេស (Case 24 Cans)', price: 16.0 }, // ~65,000 ៛
    ];
  } else if (presetType === 'beer_draught') {
    itemForm.value.variants = [
      { label: '1 កែវ (Glass)', price: 1.0 },     // ~4,100 ៛
      { label: '1 ថូ (Pitcher)', price: 3.5 },    // ~14,000 ៛
      { label: '1 ប៉ោត/ធុង (Tower 3L)', price: 10.0 }, // ~41,000 ៛
    ];
  }
}

function getItemPriceInfo(item: MenuItem) {
  if (item.hasVariants && item.variants && item.variants.length > 0) {
    const validPrices = item.variants
      .map((v) => Number(v.price))
      .filter((p) => !isNaN(p));

    if (validPrices.length > 0) {
      const min = Math.min(...validPrices);
      const max = Math.max(...validPrices);
      if (min === max) {
        return {
          formatted: `$${min.toFixed(2)}`,
          riel: `~${formatRiel(min)} ៛`,
          min,
          max,
          isRange: false,
        };
      }
      return {
        formatted: `$${min.toFixed(2)} - $${max.toFixed(2)}`,
        riel: `~${formatRiel(min)} - ${formatRiel(max)} ៛`,
        min,
        max,
        isRange: true,
      };
    }
  }

  const p = Number(item.price) || 0;
  return {
    formatted: `$${p.toFixed(2)}`,
    riel: `~${formatRiel(p)} ៛`,
    min: p,
    max: p,
    isRange: false,
  };
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

  if (itemForm.value.hasVariants) {
    if (!itemForm.value.variants || itemForm.value.variants.length === 0) {
      toast.add({
        title: 'សូមបន្ថែមជម្រើសទំហំ/តម្លៃ',
        description: 'Please add at least one variant option',
        color: 'warning',
      });
      return;
    }

    const hasEmptyLabel = itemForm.value.variants.some((v) => !v.label.trim());
    if (hasEmptyLabel) {
      toast.add({
        title: 'សូមបញ្ចូលឈ្មោះជម្រើសឱ្យបានពេញលេញ',
        description: 'All variant options must have a valid label',
        color: 'warning',
      });
      return;
    }

    const hasInvalidPrice = itemForm.value.variants.some((v) => isNaN(v.price) || v.price < 0);
    if (hasInvalidPrice) {
      toast.add({
        title: 'តម្លៃទំហំមិនត្រឹមត្រូវ',
        description: 'Variant price must be 0 or greater',
        color: 'warning',
      });
      return;
    }

    // Set base price to lowest variant price
    const minPrice = Math.min(...itemForm.value.variants.map((v) => Number(v.price)));
    itemForm.value.price = minPrice;
  } else {
    if (itemForm.value.price < 0 || isNaN(itemForm.value.price)) {
      toast.add({
        title: 'តម្លៃមិនត្រឹមត្រូវ',
        description: 'Price must be 0 or greater',
        color: 'warning',
      });
      return;
    }
    itemForm.value.variants = [];
  }

  isSubmitting.value = true;
  try {
    const payload = {
      name: itemForm.value.name.trim(),
      categoryId: itemForm.value.categoryId || null,
      price: Number(itemForm.value.price),
      currency: itemForm.value.currency || 'USD',
      imageUrl: itemForm.value.imageUrl || null,
      description: itemForm.value.description ? itemForm.value.description.trim() : null,
      isAvailable: Boolean(itemForm.value.isAvailable),
      hasVariants: Boolean(itemForm.value.hasVariants),
      variants: itemForm.value.hasVariants ? itemForm.value.variants : [],
    };

    if (isEditing.value && editingItemId.value) {
      await $api(`/api/menu/${editingItemId.value}`, {
        method: 'PUT',
        body: payload,
      });
      toast.add({
        title: 'បានកែប្រែជោគជ័យ',
        description: `Updated "${itemForm.value.name}" successfully`,
        color: 'success',
      });
    } else {
      await $api('/api/menu', {
        method: 'POST',
        body: payload,
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
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
          <UIcon name="i-heroicons-book-open" class="w-7 h-7 text-primary-600 dark:text-primary-400" />
          <span>Menu & Categories Management</span>
        </h1>
        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          គ្រប់គ្រងមុខម្ហូប (Item Name, Category, Price & Multi-Sizes, និង Cloudinary Image) សម្រាប់ភោជនីយដ្ឋាន
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- New Item Button -->
        <button type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-primary-600 hover:bg-primary-500 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          @click="openCreateItemModal">
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
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Avg Base Price</span>
          <UIcon name="i-heroicons-currency-dollar" class="w-4 h-4 text-blue-500" />
        </div>
        <p class="text-2xl font-black mt-2 text-gray-900 dark:text-white">${{ avgPrice }}</p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-gray-200 dark:border-gray-800">
      <button type="button"
        class="flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer"
        :class="[
          activeTab === 'items'
            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
        ]" @click="activeTab = 'items'">
        <UIcon name="i-heroicons-list-bullet" class="w-4 h-4" />
        <span>Menu Items (បញ្ជីមុខម្ហូប)</span>
        <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800">{{ totalItems }}</span>
      </button>

      <button type="button"
        class="flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer"
        :class="[
          activeTab === 'categories'
            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
        ]" @click="activeTab = 'categories'">
        <UIcon name="i-heroicons-rectangle-stack" class="w-4 h-4" />
        <span>Categories (ប្រភេទមុខម្ហូប)</span>
        <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800">{{ totalCategories }}</span>
      </button>
    </div>

    <!-- TAB 1: MENU ITEMS LIST -->
    <div v-if="activeTab === 'items'" class="space-y-4">
      <!-- Search & Filters -->
      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
        <div class="relative flex-1">
          <UIcon name="i-heroicons-magnifying-glass"
            class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="searchQuery" type="text" placeholder="ស្វែងរកតាមឈ្មោះម្ហូប (Search dish name...)"
            class="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500" />
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 shrink-0">Filter:</span>
          <select v-model="selectedCategoryFilter"
            class="px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 cursor-pointer">
            <option value="all">All Categories</option>
            <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Items Grid View -->
      <div v-if="filteredItems.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="item in filteredItems" :key="item.id"
          class="group rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <!-- Image Header with Availability Tag -->
          <div class="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <UIcon name="i-heroicons-photo" class="w-8 h-8" />
              <span class="text-xs mt-1">No Image</span>
            </div>

            <!-- Category Badge -->
            <span v-if="item.categoryName"
              class="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/60 text-white backdrop-blur-md">
              {{ item.categoryName }}
            </span>

            <!-- Status Pill -->
            <button type="button"
              class="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
              :class="[
                item.isAvailable
                  ? 'bg-emerald-500/90 text-white hover:bg-emerald-600'
                  : 'bg-rose-500/90 text-white hover:bg-rose-600',
              ]" @click="handleToggleAvailability(item)">
              {{ item.isAvailable ? '✓ In Stock' : '✗ Sold Out' }}
            </button>
          </div>

          <!-- Body Info -->
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-bold text-base text-gray-900 dark:text-white leading-tight">
                  {{ item.name }}
                </h3>
                <div class="text-right shrink-0">
                  <span class="text-base sm:text-lg font-black text-primary-600 dark:text-primary-400">
                    {{ getItemPriceInfo(item).formatted }}
                  </span>
                  <span class="block text-[11px] text-gray-400 font-mono">
                    {{ getItemPriceInfo(item).riel }}
                  </span>
                </div>
              </div>

              <p v-if="item.description" class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {{ item.description }}
              </p>

              <!-- Variant Badges (Options & Sizes) -->
              <div v-if="item.hasVariants && item.variants && item.variants.length > 0"
                class="pt-1 flex flex-wrap gap-1.5">
                <span v-for="(v, vIdx) in item.variants" :key="vIdx"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-primary-50/80 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/60 shadow-2xs">
                  <span class="text-gray-600 dark:text-gray-300">{{ v.label }}:</span>
                  <span class="font-bold font-mono text-primary-700 dark:text-primary-300">${{
                    Number(v.price).toFixed(2) }}</span>
                </span>
              </div>
            </div>

            <!-- Footer Action Buttons -->
            <div class="pt-4 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span v-if="item.hasVariants"
                  class="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  {{ item.variants?.length ?? 0 }} Sizes
                </span>
                <span v-else class="text-[11px] text-gray-400 font-mono">
                  ID: {{ item.id }}
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <button type="button"
                  class="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Edit Dish" @click="openEditItemModal(item)">
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 text-primary-500" />
                </button>
                <button type="button"
                  class="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Delete Dish" @click="handleDeleteItem(item.id, item.name)">
                  <UIcon name="i-heroicons-trash" class="w-4 h-4 text-rose-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else
        class="py-16 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 space-y-3">
        <div
          class="w-14 h-14 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center">
          <UIcon name="i-heroicons-book-open" class="w-7 h-7" />
        </div>
        <h3 class="text-base font-bold text-gray-900 dark:text-white">មិនទាន់មានមុខម្ហូបនៅឡើយទេ</h3>
        <p class="text-xs text-gray-500 max-w-sm mx-auto">
          សូមចុចប៊ូតុងខាងក្រោមដើម្បីបង្កើតមុខម្ហូបថ្មីដំបូងរបស់អ្នក រួមជាមួយការបញ្ចូលរូបភាព Cloudinary។
        </p>
        <button type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-500 shadow-sm cursor-pointer"
          @click="openCreateItemModal">
          <UIcon name="i-heroicons-plus-circle" class="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>
    </div>

    <!-- TAB 2: CATEGORIES MANAGEMENT -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Create Category Form Card -->
      <div
        class="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-4">
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
            <input v-model="newCatName" type="text" placeholder="e.g. Appetizers (ម្ហូបកូរ)"
              class="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              required />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Description (ការពិពណ៌នាសង្ខេប)
            </label>
            <textarea v-model="newCatDesc" rows="3" placeholder="Short description of this category..."
              class="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"></textarea>
          </div>

          <button type="submit" :disabled="isSubmittingCat"
            class="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <UIcon v-if="isSubmittingCat" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span>Create Category</span>
          </button>
        </form>
      </div>

      <!-- Categories List Table -->
      <div
        class="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs space-y-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-rectangle-stack" class="w-5 h-5 text-primary-500" />
            <span>Category List (បញ្ជីប្រភេទមុខម្ហូប)</span>
          </h2>
          <p class="text-xs text-gray-500 mt-1">ប្រភេទទាំងអស់ដែលត្រូវបានប្រើប្រាស់សម្រាប់ចាត់ថ្នាក់មុខម្ហូប</p>
        </div>

        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div v-for="cat in categoriesList" :key="cat.id" class="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p class="font-bold text-sm text-gray-900 dark:text-white">{{ cat.name }}</p>
              <p v-if="cat.description" class="text-xs text-gray-500 mt-0.5">{{ cat.description }}</p>
            </div>

            <div class="flex items-center gap-2">
              <span
                class="px-2.5 py-1 rounded-lg text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {{menuList.filter((m) => m.categoryId === cat.id).length}} dishes
              </span>
              <button type="button"
                class="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Delete Category" @click="handleDeleteCategory(cat)">
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CREATE / EDIT MENU ITEM MODAL -->
    <div v-if="isItemModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        class="relative w-full max-w-xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">
              {{ isEditing ? 'Edit Dish (កែប្រែមុខម្ហូប)' : 'Add New Dish (បង្កើតមុខម្ហូបថ្មី)' }}
            </h2>
            <p class="text-xs text-gray-500">បញ្ចូលឈ្មោះម្ហូប, ប្រភេទ, តម្លៃ/ទំហំ និងរូបភាព Cloudinary</p>
          </div>
          <button type="button"
            class="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            @click="isItemModalOpen = false">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Form Body -->
        <div class="p-6 overflow-y-auto space-y-5">
          <!-- 1. Item Name & Category (Flex in 1 container) -->
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1 space-y-1.5">
              <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Dish / Item Name (ឈ្មោះមុខម្ហូប) *
              </label>
              <input v-model="itemForm.name" type="text" placeholder="e.g. ឡុកឡាក់សាច់គោ (Beef Lok Lak)"
                class="w-full px-3.5 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium"
                required />
            </div>

            <div class="sm:w-5/12 space-y-1.5">
              <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Category (ប្រភេទមុខម្ហូប)
              </label>
              <select v-model="itemForm.categoryId"
                class="w-full px-3.5 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 cursor-pointer">
                <option value="">-- No Category --</option>
                <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- 3. Pricing & Variants Section -->
          <div
            class="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 space-y-4">
            <div class="flex items-center justify-between">
              <p class="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <UIcon name="i-heroicons-tag" class="w-4 h-4 text-primary-500" />
                <span>ទម្រង់តម្លៃ (Pricing Structure)</span>
              </p>

              <!-- Switch -->
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="itemForm.hasVariants" type="checkbox" class="sr-only peer" />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600">
                </div>
                <span class="ml-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {{ itemForm.hasVariants ? 'ច្រើនតម្លៃ (Variants)' : 'តម្លៃទោល (Single)' }}
                </span>
              </label>
            </div>

            <!-- If Single Price -->
            <div v-if="!itemForm.hasVariants" class="space-y-1.5 pt-1">
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
                <input v-model.number="itemForm.price" type="number" step="0.25" min="0" placeholder="0.00"
                  class="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-bold text-primary-600 dark:text-primary-400"
                  required />
              </div>
            </div>

            <!-- If Multiple Prices / Variants -->
            <div v-else class="space-y-3 pt-1">
              <!-- Quick Presets -->
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[11px] text-gray-500 font-medium">គំរូទូទៅ (Presets):</span>
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                  @click="applyPreset('sizes')"
                >
                  <UIcon name="i-heroicons-scale" class="w-3.5 h-3.5 text-primary-500" />
                  <span>🍽️ S / M / L (តូច/កណ្តាល/ធំ)</span>
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                  @click="applyPreset('drinks')"
                >
                  <UIcon name="i-heroicons-beaker" class="w-3.5 h-3.5 text-primary-500" />
                  <span>☕ ក្តៅ / ត្រជាក់ / ក្រឡុក</span>
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                  @click="applyPreset('beer_units')"
                >
                  <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5 text-amber-500" />
                  <span>🍺 កំប៉ុង / ដប / កេស</span>
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                  @click="applyPreset('beer_draught')"
                >
                  <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-amber-500" />
                  <span>🍻 កែវ / ថូ / ធុង Tower</span>
                </button>
              </div>

              <!-- Variant Rows -->
              <div class="space-y-2">
                <div
                  v-for="(variant, vIdx) in itemForm.variants"
                  :key="vIdx"
                  class="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/90 dark:border-gray-700/80 shadow-2xs"
                >
                  <div class="flex-1">
                    <input
                      v-model="variant.label"
                      type="text"
                      placeholder="e.g. 1 កំប៉ុង (Can), 1 ដប (Bottle), 1 កេស (Case)..."
                      class="w-full px-3 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-1 focus:ring-primary-500 font-medium"
                      required
                    />
                  </div>

                  <div class="w-36 flex flex-col items-end">
                    <div class="w-full relative">
                      <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">$</span>
                      <input
                        v-model.number="variant.price"
                        type="number"
                        step="0.05"
                        min="0"
                        placeholder="0.00"
                        class="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-1 focus:ring-primary-500 font-bold text-primary-600 dark:text-primary-400 font-mono text-right"
                        required
                      />
                    </div>
                    <span class="text-[10px] text-gray-400 font-mono pr-1 mt-0.5">
                      ≈ {{ formatRiel(variant.price || 0) }} ៛
                    </span>
                  </div>

                  <button
                    type="button"
                    class="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Remove variant"
                    :disabled="itemForm.variants.length <= 1"
                    :class="{ 'opacity-30 cursor-not-allowed': itemForm.variants.length <= 1 }"
                    @click="removeVariantOption(vIdx)"
                  >
                    <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Add Variant Button -->
              <div class="flex items-center justify-between pt-1">
                <button type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 border border-primary-200/70 dark:border-primary-800/70 transition-colors cursor-pointer"
                  @click="addVariantOption">
                  <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
                  <span>+ Add Variant / Size Option</span>
                </button>

                <span class="text-[11px] text-gray-400 font-mono">
                  {{ itemForm.variants.length }} options
                </span>
              </div>
            </div>
          </div>

          <!-- 4. Image Upload (+ img 1) using Reka UI Component -->
          <div class="space-y-1.5">
            <UploadImageUploader v-model="itemForm.imageUrl" folder="menu" label="Dish Photo (រូបភាពមុខម្ហូប)"
              hint="PNG, JPG, WEBP ទៅកាន់ Cloudinary" aspect-ratio="video" />
          </div>

          <!-- 5. Description -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Description (ការពិពណ៌នាសង្ខេប)
            </label>
            <textarea v-model="itemForm.description" rows="2" placeholder="ព័ត៌មានបន្ថែមអំពីគ្រឿងផ្សំ ឬរសជាតិ..."
              class="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"></textarea>
          </div>

          <!-- 6. Availability Switch -->
          <div
            class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">Is Available (មានលក់)</p>
              <p class="text-xs text-gray-500">បើកឱ្យភ្ញៀវអាចកុម្ម៉ង់មុខម្ហូបនេះបាន</p>
            </div>
            <input v-model="itemForm.isAvailable" type="checkbox"
              class="w-5 h-5 rounded-md text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 cursor-pointer" />
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
          <button type="button"
            class="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            @click="isItemModalOpen = false">
            Cancel
          </button>

          <button type="button" :disabled="isSubmitting"
            class="px-5 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            @click="handleSaveItem">
            <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span>{{ isEditing ? 'Save Changes' : 'Create Dish' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
