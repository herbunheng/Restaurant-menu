<script setup lang="ts">
import type { User, UserRole } from '@restaurant-menu/shared';

definePageMeta({
  layout: 'admin',
});

const { $api } = useApi();
const { data: usersData, status, error, refresh: fetchUsers } = await useApiData<User[]>(
  'admin-users-list',
  '/api/users'
);

const usersList = computed(() => usersData.value || []);
const isLoading = computed(() => status.value === 'pending');
const errorMessage = ref('');
const successMessage = ref('');

// Search & Filtering
const searchQuery = ref('');
const selectedRoleFilter = ref<string>('all');

const roleFilterOptions = [
  { label: 'All Roles', value: 'all' },
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Admin', value: 'admin' },
  { label: 'User', value: 'user' },
];

const newUserRoleOptions = [
  { label: 'Regular User', value: 'user' },
  { label: 'Administrator', value: 'admin' },
];

// Create User Modal State
const isAddUserModalOpen = ref(false);
const isSubmitting = ref(false);
const newUserForm = ref({
  name: '',
  email: '',
  role: 'user' as UserRole,
});

const filteredUsers = computed(() => {
  return usersList.value.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesRole =
      selectedRoleFilter.value === 'all' || u.role === selectedRoleFilter.value;
    return matchesSearch && matchesRole;
  });
});
// console.log("user: ", filteredUsers.value);

const toast = useToast();

async function handleCreateUser() {
  if (!newUserForm.value.name || !newUserForm.value.email) {
    const msg = 'Name and Email are required.';
    errorMessage.value = msg;
    toast.add({
      title: 'Validation Error',
      description: msg,
      color: 'warning',
      icon: 'i-heroicons-exclamation-circle',
    });
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const createdUser = await $api<User>('/api/users', {
      method: 'POST',
      body: newUserForm.value,
    });
    await fetchUsers();
    const msg = `User ${createdUser.name} created successfully!`;
    successMessage.value = msg;
    toast.add({
      title: 'User Created',
      description: msg,
      color: 'success',
      icon: 'i-heroicons-user-plus',
    });
    isAddUserModalOpen.value = false;

    // Reset form
    newUserForm.value = {
      name: '',
      email: '',
      role: 'user',
    };
  } catch (err: any) {
    const msg = err.message || 'Failed to create user.';
    errorMessage.value = msg;
    toast.add({
      title: 'Create Failed',
      description: msg,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    isSubmitting.value = false;
  }
}

function getRoleColor(role: UserRole) {
  switch (role) {
    case 'super_admin':
      return 'secondary';
    case 'admin':
      return 'primary';
    default:
      return 'neutral';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'error';
    default:
      return 'warning';
  }
}
</script>

<template>
  <div class="space-y-6 text-gray-900 dark:text-gray-100 font-sans">
    <!-- Header Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <!-- Tabs between Staff & Users -->
        <div class="flex items-center gap-2 mb-2">
          <NuxtLink
            to="/admin/staff"
            class="px-3 py-1 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
          >
            <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
            <span>បុគ្គលិកហាង (Staff)</span>
          </NuxtLink>
          <NuxtLink
            to="/admin/users"
            class="px-3 py-1 rounded-xl text-xs font-bold bg-primary-600 text-white shadow-xs flex items-center gap-1.5"
          >
            <UIcon name="i-heroicons-users" class="w-4 h-4" />
            <span>គណនីប្រព័ន្ធ (Users)</span>
          </NuxtLink>
        </div>

        <h1 class="text-2xl font-extrabold tracking-tight">អ្នកប្រើប្រាស់ និងសិទ្ធិប្រព័ន្ធ (Users)</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          គ្រប់គ្រងគណនីអ្នកប្រើប្រាស់ប្រព័ន្ធ និងកម្រិតសិទ្ធិចូលប្រើប្រាស់
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-path" color="neutral" variant="outline" size="sm" :loading="isLoading"
          @click="fetchUsers()">
          Refresh
        </UButton>

        <UButton icon="i-heroicons-user-plus" color="primary" size="sm" class="font-medium shadow-sm"
          @click="isAddUserModalOpen = true">
          Add New User
        </UButton>
      </div>
    </div>

    <!-- Alert Notifications -->
    <UAlert v-if="errorMessage" color="error" variant="soft" icon="i-heroicons-exclamation-triangle"
      :title="errorMessage" class="text-xs" close @close="errorMessage = ''" />

    <UAlert v-if="successMessage" color="success" variant="soft" icon="i-heroicons-check-circle" :title="successMessage"
      class="text-xs" close @close="successMessage = ''" />

    <!-- Filter & Search Toolbar -->
    <div
      class="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="relative w-full sm:w-80">
        <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass" placeholder="Search by name or email..."
          class="w-full" size="sm" />
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto">
        <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">Filter Role:</span>
        <USelect v-model="selectedRoleFilter" :items="roleFilterOptions" size="sm" class="w-36" />
      </div>
    </div>

    <!-- Users Data Table Card -->
    <div
      class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div v-if="isLoading" class="p-12 text-center text-gray-400 space-y-3">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
        <p class="text-sm">Fetching users from D1 database...</p>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="p-12 text-center text-gray-400 space-y-2">
        <UIcon name="i-heroicons-users" class="w-10 h-10 mx-auto text-gray-500" />
        <p class="text-base font-semibold text-gray-700 dark:text-gray-300">No users found</p>
        <p class="text-xs text-gray-500">Try clearing search filters or seed default users.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr
              class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
              <th class="py-3 px-4">User</th>
              <th class="py-3 px-4">Role</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Joined Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800/60">
            <tr v-for="u in filteredUsers" :key="u.id"
              class="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
              <td class="py-3.5 px-4 flex items-center gap-3">
                <UAvatar :src="u.avatarUrl || undefined" :alt="u.name" size="md"
                  class="rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 font-semibold" />
                <div>
                  <p class="font-semibold text-gray-900 dark:text-gray-100 text-sm">{{ u.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">{{ u.email }}</p>
                </div>
              </td>

              <td class="py-3.5 px-4">
                <UBadge :color="getRoleColor(u.role)" variant="soft" size="sm" class="capitalize font-medium">
                  {{ u.role.replace('_', ' ') }}
                </UBadge>
              </td>

              <td class="py-3.5 px-4">
                <UBadge :color="getStatusColor(u.status)" variant="soft" size="sm" class="capitalize font-medium">
                  {{ u.status }}
                </UBadge>
              </td>

              <td class="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
                {{ formatDate(u.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Showing <strong class="text-gray-900 dark:text-gray-100">{{ filteredUsers.length }}</strong> of <strong
            class="text-gray-900 dark:text-gray-100">{{ usersList.length }}</strong> users</span>
        <span class="font-mono text-[10px]">Cloudflare D1 Table: `users`</span>
      </div>
    </div>

    <!-- Create User Modal -->
    <UModal v-model:open="isAddUserModalOpen" title="Create New User Account">
      <template #content>
        <form @submit.prevent="handleCreateUser" class="p-6 space-y-4">
          <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Add New User</h3>

          <UFormField label="Full Name" size="sm">
            <UInput v-model="newUserForm.name" placeholder="John Doe" icon="i-heroicons-user" class="w-full" />
          </UFormField>

          <UFormField label="Email Address" size="sm">
            <UInput v-model="newUserForm.email" type="email" placeholder="john@example.com" icon="i-heroicons-envelope"
              class="w-full" />
          </UFormField>

          <UFormField label="Role Assignment" size="sm">
            <USelect v-model="newUserForm.role" :items="newUserRoleOptions" size="sm" class="w-full" />
          </UFormField>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton color="neutral" variant="ghost" size="sm" @click="isAddUserModalOpen = false">
              Cancel
            </UButton>
            <UButton type="submit" color="primary" size="sm" :loading="isSubmitting" icon="i-heroicons-check">
              Create User
            </UButton>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
