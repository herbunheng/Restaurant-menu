export default defineNuxtRouteMiddleware(async (to) => {
  // Only apply guard to /admin routes
  if (!to.path.startsWith('/admin')) {
    return;
  }

  const { user, fetchMe } = useAuth();

  // Allow access to login page, redirect appropriately if already logged in
  if (to.path === '/auth/login') {
    if (!user.value) {
      try {
        await fetchMe();
      } catch {
        // Token was invalid or expired
      }
    }
    if (user.value) {
      const target = (user.value.role === 'super_admin' || user.value.role === 'admin') ? '/admin' : '/user';
      return navigateTo(target);
    }
    return;
  }

  // Attempt session hydration from backend if user state is empty
  if (!user.value) {
    try {
      await fetchMe();
    } catch {
      user.value = null;
      return navigateTo('/auth/login');
    }
  }

  // Redirect to login if user is not authenticated or not an admin
  if (!user.value || (user.value.role !== 'super_admin' && user.value.role !== 'admin')) {
    return navigateTo('/auth/login');
  }
});
